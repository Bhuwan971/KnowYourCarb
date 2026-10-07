import { photoBase64 } from './photos';
import { FoodItem, nutrientFields, uid } from './model';
import { withAbort } from './abort';
export const analysisUrl = process.env.EXPO_PUBLIC_ANALYSIS_URL?.replace(/\/$/, '');
export const scanTimeoutMs = 45_000;
export type Analysis = { title: string; items: FoodItem[]; uncertainty: string };
export function analyzePhoto(uri: string, signal: AbortSignal): Promise<Analysis> {
  return withAbort(signal, () => requestAnalysis(uri, signal));
}
async function requestAnalysis(uri: string, signal: AbortSignal): Promise<Analysis> {
  if (!analysisUrl)
    throw new Error(
      'Photo estimates aren’t connected yet. You can still add carbs from a label and save your snap.',
    );
  const image = await photoBase64(uri);
  if (signal.aborted) throw new Error('Photo scan cancelled.');
  let response: Response;
  try {
    response = await fetch(`${analysisUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      'Couldn’t reach the AI service. Try again when you’re connected, or enter the nutrition yourself.',
    );
  }
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
        !i ||
        typeof i.name !== 'string' ||
        typeof i.portion !== 'string' ||
        typeof i.carbs !== 'number' ||
        !Number.isFinite(i.carbs) ||
        i.carbs < 0 ||
        i.carbs > 2000 ||
        typeof i.calories !== 'number' ||
        !Number.isFinite(i.calories) ||
        i.calories < 0 ||
        i.calories > 20000 ||
        nutrientFields.some(
          ({ key, max }) =>
            i[key] != null &&
            (typeof i[key] !== 'number' ||
              !Number.isFinite(i[key]) ||
              i[key]! < 0 ||
              i[key]! > max),
        ) ||
        (i.portionGrams != null &&
          (!Number.isFinite(i.portionGrams) || i.portionGrams <= 0 || i.portionGrams > 10000)) ||
        (i.carbsRange != null &&
          (!Number.isFinite(i.carbsRange.min) ||
            !Number.isFinite(i.carbsRange.max) ||
            i.carbsRange.min < 0 ||
            i.carbsRange.max > 2000 ||
            i.carbsRange.min > i.carbs ||
            i.carbsRange.max < i.carbs)),
    )
  )
    throw new Error('The estimate was incomplete. Please try again or add your own values.');
  return {
    title: data.title,
    uncertainty: data.uncertainty,
    items: data.items.map((i: FoodItem) => ({
      ...Object.fromEntries(
        nutrientFields.flatMap(({ key }) => (typeof i[key] === 'number' ? [[key, i[key]]] : [])),
      ),
      portionGrams: i.portionGrams ?? undefined,
      carbsRange: i.carbsRange ?? undefined,
      nutritionBasis: i.nutritionBasis,
      referenceId: i.referenceId,
      referenceDescription: i.referenceDescription,
      fdcId: i.fdcId,
      nutritionPer100g: i.nutritionPer100g,
      id: uid(),
      name: i.name,
      portion: i.portion,
      carbs: i.carbs,
      calories: i.calories,
      servings: 1,
    })),
  };
}
