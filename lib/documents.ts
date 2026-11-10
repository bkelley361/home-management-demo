import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Tables, TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/**
 * Upload + delete for attached documents.
 * Screens never touch Supabase Storage directly — the path is security-critical
 * and built here in exactly one place.
 */

export const DOC_TYPES = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'manual', label: 'Manual' },
  { value: 'registration', label: 'Registration' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
] as const;

export type DocType = (typeof DOC_TYPES)[number]['value'];

export function docTypeLabel(value?: string | null): string {
  if (!value) return 'Other';
  return DOC_TYPES.find((d) => d.value === value)?.label ?? value;
}

/** Normalised result from any of the three pickers. */
export type PickedFile = {
  uri: string;
  fileName: string;
  contentType?: string;
  size?: number;
};

/**
 * Strip anything that would make a messy or ambiguous storage path.
 *
 * Separators become `-`, so a traversal-looking name can't introduce path
 * segments — the result is always a single flat filename under the caller's
 * prefix. Runs of dots collapse for the same reason.
 */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'file';
}

/** Build a private Supabase Storage path scoped to the authenticated uploader. */
export function buildStoragePath(
  userId: string,
  homeId: string,
  fileName: string,
  now: number = Date.now()
): string {
  if (!userId) throw new Error('buildStoragePath: userId (auth.id) is required.');
  if (!homeId) throw new Error('buildStoragePath: homeId is required.');
  return `${userId}/homes/${homeId}/${now}-${sanitizeFileName(fileName)}`;
}

export type UploadDocumentParams = {
  file: PickedFile;
  /** Authenticated Supabase user ID; document blobs remain uploader-private. */
  userId: string;
  homeId: string;
  profileId: string;
  docType: DocType;
  title?: string;
  /** Unified asset row id; exactly one asset link is required. */
  assetId: string;
};

/** Upload a private object first, then create its home-scoped metadata row. */
export async function uploadDocument({
  file,
  userId,
  homeId,
  profileId,
  docType,
  title,
  assetId,
}: UploadDocumentParams): Promise<{ documentId: string; storagePath: string }> {
  if (!assetId) {
    throw new Error('A document must be linked to one asset.');
  }
  const storagePath = buildStoragePath(userId, homeId, file.fileName);
  let uploadPayload: Blob | File;
  if (Platform.OS === 'web') {
    const res = await fetch(file.uri);
    uploadPayload = await res.blob();
  } else {
    uploadPayload = new File(file.uri);
  }
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, uploadPayload, {
      contentType: file.contentType,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const row: TablesInsert<'documents'> = {
    home_id: homeId,
    uploaded_by_id: profileId,
    asset_id: assetId,
    title: title?.trim() || file.fileName,
    doc_type: docType,
    content_type: file.contentType ?? null,
    size_bytes: file.size ?? null,
    storage_path: storagePath,
    uploaded_at: Date.now(),
  };

  try {
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert(row)
      .select('id')
      .single();
    if (insertError) throw insertError;
    return { documentId: data.id, storagePath };
  } catch (insertError) {
    const { error: cleanupError } = await supabase.storage.from('documents').remove([storagePath]);
    if (cleanupError)
      throw new AggregateError(
        [insertError, cleanupError],
        'Document metadata failed and uploaded file cleanup also failed.'
      );
    throw insertError;
  }
}

/** Create a signed URL only for the user who owns the object. */
export async function signedDocumentUrl(
  storagePath: string,
  uploadedById: string | null,
  userId: string | undefined
): Promise<string | null> {
  if (!userId || uploadedById !== userId) return null;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Delete the uploader-private blob before removing its metadata row. */
export async function deleteDocument(
  documentId: string,
  storagePath: string,
  homeId: string
): Promise<void> {
  const { error: storageError } = await supabase.storage.from('documents').remove([storagePath]);
  if (storageError) throw storageError;

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('home_id', homeId);
  if (deleteError) throw deleteError;
}

/** True for content types that can render as an image thumbnail. */
export function isImageContentType(contentType?: string | null): boolean {
  return !!contentType && contentType.startsWith('image/');
}

/** Human-readable file size, e.g. 1536 → '1.5 KB'. */
export function formatFileSize(bytes?: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
