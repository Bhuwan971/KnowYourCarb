import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { colors as c } from '../lib/theme';

export default function NotFound() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 30,
        backgroundColor: c.bg,
      }}
    >
      <Mascot size={100} />
      <Type kind="title" style={{ marginTop: 8 }}>
        A little lost?
      </Type>
      <Type kind="small" style={{ textAlign: 'center' }}>
        That page isn’t here. Your journal is, though.
      </Type>
      <Button
        label="Back to your happy little space"
        onPress={() => router.replace('/')}
        style={{ marginTop: 10 }}
      />
    </View>
  );
}
