import React, { useState } from 'react';
import { Platform, Share, StyleSheet, Switch, View } from 'react-native';
import { Download, Save, Vibrate } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { analysisUrl } from '../../lib/analysis';
import { colors as c, fonts as f, radius } from '../../lib/theme';
import { PageHeading } from '../../components/Shell';
import { Button, Card, Chip, Field, Type } from '../../components/ui';

function Head({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={s.head}>
      <Type kind="heading" style={{ flex: 1 }}>
        {title}
      </Type>
      {trailing}
    </View>
  );
}

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
      notify('Preferences saved.');
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
      const foods = Number(result.foods) || 0;
      setStatus(
        [
          result.configured
            ? 'Photo estimates are connected. New snaps and imports scan automatically.'
            : 'The service is running, but photo estimates still need an AI key.',
          foods
            ? `USDA database: ${foods.toLocaleString()} foods ready for matching and search.`
            : 'The USDA database file is missing on the service.',
          result.branded
            ? 'USDA Branded Foods is connected for barcodes.'
            : 'Barcodes use Open Food Facts. Add USDA_API_KEY for USDA Branded Foods too.',
        ].join(' '),
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
      <PageHeading title="Settings" />
      <View style={{ maxWidth: 720, gap: 16 }}>
        <Card padding={22} style={{ gap: 20 }}>
          <Head title="Preferences" />
          <Field
            label="What should we call you?"
            placeholder="Your first name (optional)"
            value={name}
            onChangeText={setName}
            maxLength={35}
          />
          <Field
            label="Daily carb reference (optional)"
            value={goal}
            onChangeText={setGoal}
            placeholder="Leave blank to just keep track"
            keyboardType="decimal-pad"
          />
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Vibrate size={16} color={c.purpleDeep} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Type style={{ fontFamily: f.bold, fontSize: 14 }}>Haptic feedback</Type>
            </View>
            <Switch
              accessibilityLabel="Enable haptics"
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: c.lavenderDeep, true: c.purple }}
              thumbColor={c.white}
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
        </Card>
        <Card padding={22} style={{ gap: 16 }}>
          <Head title="Your data" />
          <Type kind="small" style={{ fontSize: 14, lineHeight: 21 }}>
            Meals and photos are saved on this device. No account needed.
          </Type>
          <Type kind="caption">
            Exports include meal details without photos. Clearing app or browser data removes your
            journal.
          </Type>
          <Button
            label="Export meal details"
            icon={Download}
            variant="secondary"
            onPress={() => void exportDetails()}
            disabled={!meals.length}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
        <Card padding={22} style={{ gap: 16 }}>
          <Head
            title="Photo estimates"
            trailing={
              <Chip
                color={analysisUrl ? c.limeSoft : c.lavender}
                textColor={analysisUrl ? c.limeInk : c.purpleDeep}
              >
                {analysisUrl ? 'AUTO SCAN' : 'LOCAL MODE'}
              </Chip>
            }
          />
          <Type kind="small" style={{ fontSize: 14, lineHeight: 21 }}>
            {analysisUrl
              ? 'Photos go to your Carbsy service and AI provider to estimate foods and portions. Nutrition is matched to USDA data. Review estimates before saving.'
              : 'Photo estimates aren’t connected. Enter nutrition from a label to save a meal.'}
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
            <View style={s.status}>
              <Type accessibilityRole="alert" kind="small" style={{ color: c.inkSoft }}>
                {status}
              </Type>
            </View>
          )}
          <Type kind="caption">
            Carbsy tracks total carbohydrate. Photo estimates need review and shouldn’t be used
            alone for medication decisions.
          </Type>
        </Card>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { padding: 14, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
});
