import {
  carbConfidence,
  FoodItem,
  FoodRecord,
  itemFromFood,
  Meal,
  Portion,
  round,
  uid,
} from './model';
export const photos = {
  bowl: require('../../assets/bowl.jpg'),
  toast: require('../../assets/toast.jpg'),
  berries: require('../../assets/berries.jpg'),
};
export const samplePhoto = (key: string) =>
  key === 'sample:toast' ? photos.toast : key === 'sample:berries' ? photos.berries : photos.bowl;

// Real USDA FoodData Central records (per 100 g), so samples show exactly what a scan produces.
const usda: Record<string, FoodRecord> = {
  quinoa: {
    id: 168917,
    description: 'Quinoa, cooked',
    dataset: 'sr',
    per100g: { carbs: 21.3, calories: 120, protein: 4.4, fat: 1.92, sugar: 0.87, fiber: 2.8 },
    portions: [{ label: '1 cup', grams: 185 }],
  },
  chickpeas: {
    id: 2707414,
    description: 'Chickpeas, NFS',
    dataset: 'fndds',
    per100g: { carbs: 25.5, calories: 211, protein: 8.23, fat: 8.91, sugar: 4.46, fiber: 7.1 },
    portions: [
      { label: '1 cup', grams: 185 },
      { label: 'quantity not specified', grams: 92 },
    ],
  },
  avocado: {
    id: 2709223,
    description: 'Avocado, raw',
    dataset: 'fndds',
    per100g: { carbs: 8.53, calories: 160, protein: 2, fat: 14.7, sugar: 0.66, fiber: 6.7 },
    portions: [
      { label: '1 slice', grams: 15 },
      { label: '1 fruit', grams: 150 },
      { label: '1 cup', grams: 150 },
    ],
  },
  toast: {
    id: 2707592,
    description: 'Bread, NS as to major flour, toasted',
    dataset: 'fndds',
    per100g: { carbs: 54.1, calories: 293, protein: 10.4, fat: 3.94, sugar: 5.87, fiber: 2.5 },
    portions: [
      { label: '1 small or thin/very thin slice', grams: 22 },
      { label: '1 medium or regular slice', grams: 25 },
      { label: '1 large or thick slice', grams: 39 },
    ],
  },
  strawberries: {
    id: 2709283,
    description: 'Strawberries, raw',
    dataset: 'fndds',
    per100g: { carbs: 7.96, calories: 36, protein: 0.64, fat: 0.22, sugar: 4.86, fiber: 1.8 },
    portions: [
      { label: '1 fruit', grams: 18 },
      { label: '1 cup', grams: 150 },
    ],
  },
  blueberries: {
    id: 2709275,
    description: 'Blueberries, raw',
    dataset: 'fndds',
    per100g: { carbs: 14.6, calories: 64, protein: 0.7, fat: 0.31, sugar: 9.36, fiber: 2.4 },
    portions: [
      { label: '1 berry', grams: 2 },
      { label: '1 cup', grams: 150 },
    ],
  },
};

// Like a photo scan: a USDA match with an assumed amount and an honest interval around it.
function seen(
  name: string,
  food: FoodRecord,
  portion: Portion,
  quantity: number,
  spread: number,
): FoodItem {
  const item = itemFromFood(food, portion, quantity);
  item.name = name;
  item.carbsRange = {
    min: round(item.carbs * (1 - spread)),
    max: round(item.carbs * (1 + spread)),
  };
  item.confidence = carbConfidence(item.carbs, item.carbsRange);
  item.visibility = spread > 0.2 ? 'partial' : 'clear';
  return item;
}

export function sampleMeal(kind: 'bowl' | 'toast' | 'berries' = 'bowl'): Meal {
  const cup = (food: FoodRecord) => food.portions.find((p) => p.label === '1 cup')!;
  const data = {
    bowl: {
      title: 'A bowl of good things',
      mealType: 'Lunch' as const,
      items: [
        seen('Cooked quinoa', usda.quinoa, cup(usda.quinoa), 0.75, 0.4),
        seen('Chickpeas', usda.chickpeas, cup(usda.chickpeas), 0.25, 0.3),
        seen('Avocado', usda.avocado, usda.avocado.portions[1], 0.5, 0.15),
      ],
    },
    toast: {
      title: 'The toast with the most',
      mealType: 'Breakfast' as const,
      items: [
        seen('Toasted sourdough', usda.toast, usda.toast.portions[2], 1, 0.15),
        seen('Avocado', usda.avocado, usda.avocado.portions[1], 0.5, 0.2),
      ],
    },
    berries: {
      title: 'A berry little break',
      mealType: 'Snack' as const,
      items: [
        seen('Strawberries', usda.strawberries, cup(usda.strawberries), 0.5, 0.25),
        seen('Blueberries', usda.blueberries, cup(usda.blueberries), 0.5, 0.25),
      ],
    },
  }[kind];
  return {
    ...data,
    id: uid(),
    photo: `sample:${kind}`,
    createdAt: new Date().toISOString(),
    items: data.items.map((i) => ({ ...i, id: uid() })),
    note: '',
    source: 'sample',
    reviewed: false,
    uncertainty:
      'A sample built from real USDA records with assumed amounts. It is excluded from your daily totals.',
  };
}
