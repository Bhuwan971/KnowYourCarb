import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { MealEditor } from '../components/MealEditor';
import { Button, Type } from '../components/ui';
export default function ReviewScreen() {
  const { draft } = useApp();
  if (!draft)
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 18 }}
      >
        <Type kind="title">A fresh little snap?</Type>
        <Type>Your unsaved snap is no longer here. Let’s take another.</Type>
        <Button label="Back to camera" onPress={() => router.replace('/')} />
      </View>
    );
  return <MealEditor initial={draft} key={draft.id} />;
}
