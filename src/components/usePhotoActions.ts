import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { preparePhoto } from '../lib/photos';
import { newMeal } from '../lib/model';
import { useApp } from '../state/AppProvider';
export function usePhotoActions() {
  const [busy, setBusy] = useState(false);
  const { setDraft, notify } = useApp();
  const accept = async (uri: string) => {
    setBusy(true);
    try {
      setDraft(newMeal(await preparePhoto(uri)));
      router.navigate('/review');
    } catch {
      notify('Couldn’t open that photo. Please try another one.');
    } finally {
      setBusy(false);
    }
  };
  const pick = async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled) await accept(result.assets[0].uri);
    } catch {
      notify('Photos couldn’t be opened. Check your photo permissions and try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, pick, accept };
}
