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
import { colors as c, fonts as f, radius, shadow } from '../lib/theme';
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
  const [focused, setFocused] = useState(false);
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
          <Type kind="heading">Describe it</Type>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Mascot size={84} happy />
            <Type kind="title" style={{ textAlign: 'center' }}>
              What did you eat?
            </Type>
            <Type kind="small" style={{ textAlign: 'center', maxWidth: 380, fontSize: 14 }}>
              Amounts help the most: “1 cup”, “2 slices”, “a can”. Carbsy matches each food to the
              USDA database.
            </Type>
          </View>
          <TextInput
            accessibilityLabel="Describe your meal"
            placeholder="e.g. a turkey sandwich on wheat and an apple"
            placeholderTextColor={c.faint}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={600}
            multiline
            autoFocus
            style={[s.input, focused && { borderColor: c.purple }]}
          />
          <View style={{ gap: 10 }}>
            <Type kind="eyebrow" style={{ color: c.muted }}>
              Try one
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
                  hoverStyle={{ backgroundColor: c.lavender }}
                >
                  <Type style={{ fontSize: 13, lineHeight: 18, fontFamily: f.medium }}>
                    {example}
                  </Type>
                </PressableScale>
              ))}
            </View>
          </View>
          {!analysisUrl && (
            <Type kind="caption" style={{ color: c.error }}>
              Connect the Carbsy service to turn descriptions into carbs.
            </Type>
          )}
          <Button
            label="Work out the carbs"
            icon={Wand2}
            size="lg"
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: { padding: 22, gap: 22, maxWidth: 620, width: '100%', alignSelf: 'center' },
  input: {
    minHeight: 140,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: c.white,
    padding: 18,
    fontFamily: f.medium,
    fontSize: 17,
    lineHeight: 24,
    color: c.ink,
    textAlignVertical: 'top',
    ...shadow.card,
  },
  example: {
    backgroundColor: c.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
    ...shadow.soft,
  },
});
