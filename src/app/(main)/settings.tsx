import React, { useState } from 'react';
import { Platform, Share, StyleSheet, Switch, View } from 'react-native';
import { Download, Heart, Save, ShieldCheck, ScanLine } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { analysisUrl } from '../../lib/analysis';
import { colors as c, fonts as f } from '../../lib/theme';
import { PageHeading } from '../../components/Shell';
import { Button, Chip, Field, Type } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
export default function SettingsScreen() {
  const { settings, meals, updateSettings, notify } = useApp();
  const [name, setName] = useState(settings.name);
  const [goal, setGoal] = useState(settings.goal === null ? '' : String(settings.goal));
  const [haptics, setHaptics] = useState(settings.haptics);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const value = goal.trim() ? Number(goal.replace(',', '.')) : null;
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 2000)) {
      setError('Enter a reference between 1 and 2,000 g, or leave it blank.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSettings({ name: name.trim(), goal: value, haptics });
      notify('A little more you. Preferences saved ✦');
    } catch {
      setError('Couldn’t save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const check = async () => {
    if (!analysisUrl) return;
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${analysisUrl}/health`, { signal: controller.signal });
      const result = await response.json();
      setStatus(
        result.configured
          ? 'Photo estimates are connected. New snaps and imports scan automatically.'
          : 'The service is running, but photo estimates still need to be configured.',
      );
    } catch {
      setStatus('Couldn’t reach photo estimates. Your local journal still works.');
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  };
  const exportDetails = async () => {
    const text = JSON.stringify(
      {
        app: 'Carbsy',
        exportedAt: new Date().toISOString(),
        meals: meals.map(({ photo, ...meal }) => meal),
      },
      null,
      2,
    );
    try {
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'carbsy-meal-details.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ message: text, title: 'My Carbsy meal details' });
    } catch {
      notify('Couldn’t export your details. Please try again.');
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="A HAPPY LITTLE SPACE ✦"
        title="A little more you."
        subtitle="Keep things comfortable, simple, and on your terms."
      />
      <View style={{ maxWidth: 750, gap: 22 }}>
        <View style={s.card}>
          <View style={s.heading}>
            <Heart size={20} color={c.purple} />
            <Type style={{ fontFamily: f.displayBold, fontSize: 21, flexShrink: 1 }}>
              Your everyday
            </Type>
          </View>
          <Field
            label="What should we call you?"
            placeholder="Your first name (optional)"
            value={name}
            onChangeText={setName}
            maxLength={35}
          />
          <View style={{ gap: 8 }}>
            <Field
              label="Daily carb reference (optional)"
              value={goal}
              onChangeText={setGoal}
              placeholder="Leave blank to just keep track"
              keyboardType="decimal-pad"
            />
            <Type kind="small">
              Set your own reference if you have one. Carbsy doesn’t choose a target for you.
            </Type>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Type style={{ fontFamily: f.medium }}>A little tap of delight</Type>
              <Type kind="small">Gentle haptics when you snap and save.</Type>
            </View>
            <Switch
              accessibilityLabel="Enable haptics"
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: '#DED7E9', true: '#B7A1E4' }}
              thumbColor={haptics ? c.purple : '#F5F2F8'}
            />
          </View>
          {error && (
            <Type accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>
              {error}
            </Type>
          )}
          <Button
            label="Save preferences"
            icon={Save}
            busy={saving}
            onPress={() => void save()}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
        <View style={s.card}>
          <View style={s.heading}>
            <ShieldCheck size={21} color={c.purple} />
            <Type style={{ fontFamily: f.displayBold, fontSize: 21, flexShrink: 1 }}>
              Your memories belong to you.
            </Type>
          </View>
          <Type style={{ color: c.muted, fontSize: 14 }}>
            Photos, notes, and carb details are saved on this device. No account needed. You can
            remove a memory by opening its card.
          </Type>
          <Type kind="small">
            Clearing browser data or uninstalling the app removes your local journal. Exported meal
            details include portions and notes; photos stay on this device.
          </Type>
          <Button
            label="Export meal details"
            icon={Download}
            variant="ghost"
            onPress={() => void exportDetails()}
            disabled={!meals.length}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
        <View style={s.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <View style={s.heading}>
              <ScanLine size={22} color={c.purple} />
              <Type style={{ fontFamily: f.displayBold, fontSize: 21, flexShrink: 1 }}>
                A closer look at your plate
              </Type>
            </View>
            <Chip>{analysisUrl ? 'AUTO SCAN' : 'LOCAL MODE'}</Chip>
          </View>
          <Type style={{ color: c.muted, fontSize: 14 }}>
            {analysisUrl
              ? 'New snaps and imported photos are sent automatically to your analysis service and Google Gemini to estimate calories, carbs and portions. Review or edit the details before saving. Photos can’t reveal exact portions, recipes, or hidden ingredients.'
              : 'You can save photos and enter carbs and calories from a nutrition label right now. Connect photo estimates to fill in new snaps automatically.'}
          </Type>
          {analysisUrl && (
            <Button
              label="Check photo estimates"
              variant="secondary"
              busy={checking}
              onPress={() => void check()}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
          {status && (
            <Type accessibilityRole="alert" kind="small">
              {status}
            </Type>
          )}
          <Type kind="small">
            Carbsy tracks total carbohydrate. Photo estimates need review and shouldn’t be used
            alone for medication decisions.
          </Type>
        </View>
        <View style={s.about}>
          <Mascot size={82} happy />
          <View style={{ flex: 1 }}>
            <Type style={{ fontFamily: f.displayBold, fontSize: 24 }}>
              Little snaps. A little more clarity.
            </Type>
            <Type kind="small" style={{ marginTop: 5 }}>
              Carbsy · version 1.0 · Made for the way you live.
            </Type>
          </View>
        </View>
      </View>
    </>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 25,
    backgroundColor: c.white,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: c.line,
    gap: 23,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  about: {
    padding: 24,
    backgroundColor: '#EEE8F8',
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});
