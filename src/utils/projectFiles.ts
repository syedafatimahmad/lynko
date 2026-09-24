import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/** Keep inspection evidence out of the OS's disposable cache. */
export async function keepProjectFile(uri: string, extension = 'jpg'): Promise<string> {
  if (Platform.OS === 'web') return uri;
  if (!FileSystem.documentDirectory) throw new Error('Device storage is unavailable.');
  const directory = `${FileSystem.documentDirectory}inspections/`;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('This attachment is no longer on this device. Please add it again.');
  if (uri.startsWith(directory)) return uri;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const suffix = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]{2,5})$/)?.[1] || extension;
  const destination = `${directory}${Date.now()}_${Math.random().toString(36).slice(2)}.${suffix}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (e) {
    // If Android print spooler or scoped storage denies copyAsync, return the valid source URI
    return uri;
  }
}
