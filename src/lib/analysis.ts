import { photoBase64 } from './photos';
import { FoodItem, uid } from './model';
export const analysisUrl = process.env.EXPO_PUBLIC_ANALYSIS_URL?.replace(/\/$/, '');
export type Analysis = { title: string; items: FoodItem[]; uncertainty: string };
export async function analyzePhoto(uri: string, signal: AbortSignal): Promise<Analysis> {
  if (!analysisUrl)
    throw new Error(
      'Photo estimates aren’t connected yet. You can still add carbs from a label and save your snap.',
    );
  const image = await photoBase64(uri);
  const response = await fetch(`${analysisUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
    signal,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || 'Couldn’t estimate this photo. Add the carbs yourself or try again.',
    );
  if (
    typeof data.title !== 'string' ||
    typeof data.uncertainty !== 'string' ||
    !Array.isArray(data.items) ||
    !data.items.length ||
    data.items.some(
      (i: FoodItem) =>
        typeof i.name !== 'string' ||
        typeof i.portion !== 'string' ||
        typeof i.carbs !== 'number' ||
        !Number.isFinite(i.carbs) ||
        i.carbs < 0 ||
        i.carbs > 2000,
    )
  )
    throw new Error('The estimate was incomplete. Please try again or add your own values.');
  return {
    title: data.title,
    uncertainty: data.uncertainty,
    items: data.items.map((i: FoodItem) => ({
      id: uid(),
      name: i.name,
      portion: i.portion,
      carbs: i.carbs,
      servings: 1,
    })),
  };
}
