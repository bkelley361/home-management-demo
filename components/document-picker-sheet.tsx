import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Camera, FileUp, ImageIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { PickedFile } from '@/lib/documents';

type Props = {
  onPicked: (file: PickedFile) => void;
  disabled?: boolean;
};

/** Fallback name when a picker doesn't supply one (common for camera shots). */
function fallbackName(uri: string, prefix: string): string {
  const fromUri = uri.split('/').pop();
  if (fromUri && fromUri.includes('.')) return fromUri;
  return `${prefix}.jpg`;
}

/**
 * Three ways to pick a file, normalised to one shape.
 *
 * Permissions are requested on tap rather than on mount — asking for camera
 * access the moment a detail screen renders is the kind of prompt people deny
 * reflexively, and we only need it if they actually choose the camera.
 */
export function DocumentPickerSheet({ onPicked, disabled }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  async function handleCamera() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is needed to take a photo. You can enable it in Settings.');
      return;
    }

    setIsBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        fileName: asset.fileName ?? fallbackName(asset.uri, 'photo'),
        contentType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLibrary() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to choose an image. You can enable it in Settings.');
      return;
    }

    setIsBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        fileName: asset.fileName ?? fallbackName(asset.uri, 'image'),
        contentType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDocument() {
    setError(null);
    setIsBusy(true);
    try {
      // No permission gate on the document picker — it hands back only what the
      // user explicitly selects.
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        fileName: asset.name,
        contentType: asset.mimeType,
        size: asset.size,
      });
    } finally {
      setIsBusy(false);
    }
  }

  const busy = isBusy || disabled;

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 flex-row gap-2"
          disabled={busy}
          onPress={handleCamera}>
          <Icon as={Camera} className="size-4" />
          <Text>Photo</Text>
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex-row gap-2"
          disabled={busy}
          onPress={handleLibrary}>
          <Icon as={ImageIcon} className="size-4" />
          <Text>Library</Text>
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex-row gap-2"
          disabled={busy}
          onPress={handleDocument}>
          <Icon as={FileUp} className="size-4" />
          <Text>File</Text>
        </Button>
      </View>
      <FormError message={error} />
    </View>
  );
}
