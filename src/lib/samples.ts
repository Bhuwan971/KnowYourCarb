import { Meal, uid } from './model';
export const photos = {
  bowl: require('../../assets/bowl.jpg'),
  toast: require('../../assets/toast.jpg'),
  berries: require('../../assets/berries.jpg'),
};
export const samplePhoto = (key: string) =>
  key === 'sample:toast' ? photos.toast : key === 'sample:berries' ? photos.berries : photos.bowl;
export function sampleMeal(kind: 'bowl' | 'toast' | 'berries' = 'bowl'): Meal {
  const data = {
    bowl: {
      title: 'A bowl of good things',
      mealType: 'Lunch' as const,
      items: [
        { name: 'Cooked quinoa', portion: '½ cup', carbs: 20, servings: 1 },
        { name: 'Chickpeas', portion: '¼ cup', carbs: 11, servings: 1 },
        { name: 'Veggies & avocado', portion: '1 cup', carbs: 9, servings: 1 },
      ],
    },
    toast: {
      title: 'The toast with the most',
      mealType: 'Breakfast' as const,
      items: [
        { name: 'Sourdough toast', portion: '1 slice', carbs: 23, servings: 1 },
        { name: 'Avocado & toppings', portion: '½ avocado', carbs: 6, servings: 1 },
      ],
    },
    berries: {
      title: 'A berry little break',
      mealType: 'Snack' as const,
      items: [{ name: 'Mixed berries', portion: '1 cup', carbs: 17, servings: 1 }],
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
      'Illustrative values for trying the app. This sample is excluded from your daily totals.',
  };
}
