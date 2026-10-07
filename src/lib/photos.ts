import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
export async function preparePhoto(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1200 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.75,
    base64: Platform.OS === 'web',
  });
  return Platform.OS === 'web' ? `data:image/jpeg;base64,${result.base64}` : result.uri;
}
export async function keepPhoto(uri: string | undefined, id: string): Promise<string | undefined> {
  if (!uri || uri.startsWith('sample:') || Platform.OS === 'web') return uri;
  const directory = new Directory(Paths.document, 'carbsy-photos');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${id}.jpg`);
  if (uri === file.uri) return uri;
  new File(uri).copy(file);
  return file.uri;
}
export function removePhoto(uri?: string) {
  if (
    Platform.OS === 'web' ||
    !uri ||
    !uri.startsWith(new Directory(Paths.document, 'carbsy-photos').uri)
  )
    return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* Metadata deletion already succeeded; stale files can be removed later. */
  }
}
export async function photoBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:image/jpeg;base64,')) return uri.split(',')[1];
  if (Platform.OS !== 'web') return new File(uri).base64();
  throw new Error('Please import this photo again.');
}
