import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useApp } from '../state/AppProvider';
import { MealEditor } from '../components/MealEditor';
import { Button, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { colors as c } from '../lib/theme';

export default function ReviewScreen() {
  const { draft } = useApp();
  if (!draft)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 30,
          gap: 14,
          backgroundColor: c.bg,
        }}
      >
        <Mascot size={96} />
        <Type kind="title" style={{ textAlign: 'center', marginTop: 8 }}>
          A fresh little snap?
        </Type>
        <Type kind="small" style={{ textAlign: 'center', maxWidth: 300 }}>
          Your unsaved snap is no longer here. Let’s take another.
        </Type>
        <Button
          label="Back to camera"
          icon={Camera}
          onPress={() => router.replace('/')}
          style={{ marginTop: 10 }}
        />
      </View>
    );
  return <MealEditor initial={draft} key={draft.id} />;
}
