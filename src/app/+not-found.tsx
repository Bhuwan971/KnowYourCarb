import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 30 }}>
      <Mascot size={100} />
      <Type kind="title">A little lost?</Type>
      <Button label="Back to your happy little space" onPress={() => router.replace('/')} />
    </View>
  );
}
