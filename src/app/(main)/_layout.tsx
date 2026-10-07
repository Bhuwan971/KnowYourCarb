import React from 'react';
import { Slot } from 'expo-router';
import { Shell } from '../../components/Shell';
export default function MainLayout() {
  return (
    <Shell>
      <Slot />
    </Shell>
  );
}
