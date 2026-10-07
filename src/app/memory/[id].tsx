import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../state/AppProvider';
import { MealEditor } from '../../components/MealEditor';
import { Button, Type } from '../../components/ui';
export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meals } = useApp();
  const meal = meals.find((m) => m.id === id);
  if (!meal)
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, padding: 30 }}
      >
        <Type kind="title">This memory wandered off.</Type>
        <Button label="Back to memories" onPress={() => router.replace('/memories')} />
      </View>
    );
  return <MealEditor key={meal.id} initial={meal} existing />;
}
