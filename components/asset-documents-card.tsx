import { Image } from 'expo-image';
import { FileText, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';

import { DocumentPickerSheet } from '@/components/document-picker-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  DOC_TYPES,
  deleteDocument,
  docTypeLabel,
  formatFileSize,
  isImageContentType,
  uploadDocument,
  type DocType,
  type PickedFile,
} from '@/lib/documents';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';

export type AssetDocument = {
  id: string;
  title: string;
  doc_type: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: number;
  storage_path: string;
  url: string | null;
  uploaded_by: { display_name: string | null } | null;
};

type Props = {
  assetType: 'vehicle' | 'general';
  assetId: string;
  categoryName: string;
  documents: AssetDocument[];
  /** Authenticated Supabase user ID; blobs are visible only to their uploader. */
  userId?: string;
  homeId?: string;
  profileId?: string;
};

/**
 * Photos and documents attached to one asset.
 *
 * Storage is uploader-scoped. Co-members can read document metadata but cannot
 * open another member's object, so those rows render as a shared-by placeholder.
 */
export function AssetDocumentsCard({
  assetType,
  assetId,
  categoryName,
  documents,
  userId,
  homeId,
  profileId,
}: Props) {
  const [pending, setPending] = React.useState<PickedFile | null>(null);
  const [docType, setDocType] = React.useState<DocType>('photo');
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canUpload = !!userId && !!homeId && !!profileId;

  async function handleUpload() {
    if (!pending || !userId || !homeId || !profileId) return;

    setIsUploading(true);
    setError(null);
    try {
      await uploadDocument({
        file: pending,
        userId,
        homeId,
        profileId,
        assetId,
        docType,
      });
      setPending(null);
      setDocType('photo');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  const sorted = [...documents].sort((a, b) => b.uploaded_at - a.uploaded_at);

  return (
    <Card className="pb-4">
      <CardHeader className="gap-2">
        <CardTitle>Documents &amp; photos</CardTitle>
        <CardDescription>
          Keep receipts, manuals, and warranty paperwork with the{' '}
          {assetType === 'vehicle' ? 'vehicle' : categoryName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {canUpload ? (
          pending ? (
            <View className="gap-3 rounded-md bg-muted p-3">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {pending.fileName}
              </Text>
              <Text className="text-sm text-muted-foreground">What kind of document is this?</Text>
              <RadioGroup value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                {DOC_TYPES.map((option) => (
                  <RadioOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    nativeID={`doc-type-${option.value}`}
                    onSelect={() => setDocType(option.value)}
                  />
                ))}
              </RadioGroup>
              <View className="flex-row gap-2">
                <Button size="sm" disabled={isUploading} onPress={handleUpload}>
                  <Text>{isUploading ? 'Uploading…' : 'Upload'}</Text>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUploading}
                  onPress={() => setPending(null)}>
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : (
            <DocumentPickerSheet onPicked={setPending} />
          )
        ) : null}

        <FormError message={error} />

        {sorted.length === 0 ? (
          <Text className="text-sm text-muted-foreground">Nothing attached yet.</Text>
        ) : (
          <View className="gap-3">
            {sorted.map((doc, index) => {
              const url = doc.url;
              const size = formatFileSize(doc.size_bytes);
              const showImage = !!url && isImageContentType(doc.content_type);

              return (
                <Animated.View
                  key={doc.id}
                  layout={LinearTransition.duration(220)}
                  entering={FadeInDown.duration(200)}
                  exiting={FadeOutRight.duration(180)}
                  className="gap-2">
                  {index > 0 ? <Separator /> : null}
                  <View className="flex-row items-start gap-3 pt-1">
                    {showImage ? (
                      <Image
                        source={{ uri: url! }}
                        style={{ width: 56, height: 56, borderRadius: 8 }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View className="size-14 items-center justify-center rounded-lg bg-muted">
                        <Icon as={FileText} className="size-6 text-muted-foreground" />
                      </View>
                    )}

                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-medium" numberOfLines={1}>
                        {doc.title}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                        {size ? ` · ${size}` : ''}
                      </Text>
                      {/* Expected when a co-member uploaded it — see the note above. */}
                      {!url ? (
                        <Text className="text-xs text-muted-foreground">
                          Added by{' '}
                          {doc.uploaded_by?.display_name
                            ? doc.uploaded_by.display_name
                            : 'someone else'}{' '}
                          — only they can open it
                        </Text>
                      ) : null}
                    </View>

                    <View className="flex-row items-center gap-1">
                      <Badge variant="outline">
                        <Text>{docTypeLabel(doc.doc_type)}</Text>
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Icon as={Trash2} className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{doc.title}&quot; will be permanently removed. This cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              <Text>Cancel</Text>
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onPress={() =>
                                homeId
                                  ? deleteDocument(doc.id, doc.storage_path, homeId)
                                  : undefined
                              }>
                              <Text>Delete</Text>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
