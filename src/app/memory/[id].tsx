import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../state/AppProvider';
import { MealEditor } from '../../components/MealEditor';
import { Button, Type } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { colors as c } from '../../lib/theme';

export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meals } = useApp();
  const meal = meals.find((m) => m.id === id);
  if (!meal)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          padding: 30,
          backgroundColor: c.bg,
        }}
      >
        <Mascot size={96} />
        <Type kind="title" style={{ textAlign: 'center', marginTop: 8 }}>
          This memory wandered off.
        </Type>
        <Button
          label="Back to memories"
          onPress={() => router.replace('/memories')}
          style={{ marginTop: 10 }}
        />
      </View>
    );
  return <MealEditor key={meal.id} initial={meal} existing />;
}
