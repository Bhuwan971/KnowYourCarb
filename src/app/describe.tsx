import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wand2, X } from 'lucide-react-native';
import { newMeal } from '../lib/model';
import { analysisUrl } from '../lib/analysis';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, IconButton, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { PressableScale } from '../components/PressableScale';
import { useApp } from '../state/AppProvider';

const examples = [
  '2 slices of pepperoni pizza and a regular coke',
  'Chicken burrito bowl with rice, black beans and salsa',
  'Bowl of oatmeal with a banana and a spoon of honey',
  '1 cup of white rice with dal and a chapati',
];

export default function DescribeScreen() {
  const [text, setText] = useState('');
  const { setDraft, tap } = useApp();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = () => {
    const prompt = text.trim();
    if (!prompt) return;
    tap();
    setDraft({ ...newMeal(), prompt, items: [] });
    router.replace('/review');
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.top}>
          <IconButton label="Close" icon={X} onPress={close} />
          <Type style={{ fontFamily: f.displayBold, fontSize: 20 }}>tell me about it.</Type>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Mascot size={86} happy />
            <Type kind="title" style={{ textAlign: 'center' }}>
              What did you eat?
            </Type>
            <Type style={{ color: c.muted, textAlign: 'center', maxWidth: 380 }}>
              Amounts help the most: “1 cup”, “2 slices”, “a can”. Carbsy matches each food to the
              USDA database.
            </Type>
          </View>
          <TextInput
            accessibilityLabel="Describe your meal"
            placeholder="e.g. a turkey sandwich on wheat and an apple"
            placeholderTextColor={c.muted}
            value={text}
            onChangeText={setText}
            maxLength={600}
            multiline
            autoFocus
            style={s.input}
          />
          <View style={{ gap: 8 }}>
            <Type kind="label" style={{ color: c.muted }}>
              TRY ONE
            </Type>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {examples.map((example) => (
                <PressableScale
                  key={example}
                  accessibilityRole="button"
                  accessibilityLabel={`Use example: ${example}`}
                  onPress={() => {
                    tap();
                    setText(example);
                  }}
                  style={s.example}
                  hoverStyle={{ borderColor: '#D3C5EE' }}
                >
                  <Type style={{ fontSize: 13, lineHeight: 18 }}>{example}</Type>
                </PressableScale>
              ))}
            </View>
          </View>
          {!analysisUrl && (
            <Type kind="small" style={{ color: c.error }}>
              Connect the Carbsy service to turn descriptions into carbs.
            </Type>
          )}
          <Button
            label="Work out the carbs"
            icon={Wand2}
            onPress={go}
            disabled={!text.trim() || !analysisUrl}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  content: { padding: 22, gap: 22, maxWidth: 620, width: '100%', alignSelf: 'center' },
  input: {
    minHeight: 130,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    padding: 17,
    fontFamily: f.medium,
    fontSize: 17,
    lineHeight: 24,
    color: c.ink,
    textAlignVertical: 'top',
  },
  example: {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '100%',
  },
});
