import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Repeat2,
  Save,
  ScanLine,
  Trash2,
  Wand2,
  X,
} from 'lucide-react-native';
import {
  FoodItem,
  Meal,
  MealType,
  newMeal,
  round,
  mealSourceLabel,
  sourceLabel,
  totalCarbs,
  uid,
  validateMeal,
} from '../lib/model';
import { analyzeMeal, analysisUrl, ScanInput, scanTimeoutMs } from '../lib/analysis';
import { colors as c, fonts as f, radius, shadow } from '../lib/theme';
import { Button, Card, Chip, Field, IconButton, Type } from './ui';
import { PressableScale } from './PressableScale';
import { CountUp } from './kit';
import { Scanner } from './Scanner';
import { FoodCard } from './meal/FoodCard';
import { MealHero } from './meal/MealHero';
import { nextQuestion, QuickCheck } from './meal/QuickCheck';
import { AddFood } from './meal/AddFood';
import { useApp } from '../state/AppProvider';

const scanInput = (meal: Meal, hint?: string): ScanInput | null =>
  meal.photo && !meal.photo.startsWith('sample:')
    ? { photo: meal.photo, hint }
    : meal.prompt
      ? { text: meal.prompt, hint }
      : null;
const wantsScan = (meal: Meal, existing: boolean) =>
  !existing && !!analysisUrl && meal.source === 'manual' && !!scanInput(meal);

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.pill, selected && s.pillActive]}
    >
      <Type style={{ fontSize: 13, fontFamily: f.bold, color: selected ? c.white : c.inkSoft }}>
        {label}
      </Type>
    </PressableScale>
  );
}

export function MealEditor({ initial, existing = false }: { initial: Meal; existing?: boolean }) {
  const [meal, setMeal] = useState<Meal>({
    ...initial,
    items: initial.items.map((i) => ({ ...i })),
  });
  const [scanning, setScanning] = useState(
    initial.source === 'sample' ? !existing : wantsScan(initial, existing),
  );
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  // Nothing will fill this in automatically: open the fields for typing right away.
  const typing = !existing && initial.source === 'manual' && !wantsScan(initial, existing);
  const [details, setDetails] = useState(typing);
  const [expanded, setExpanded] = useState<string | null>(
    typing ? (initial.items[0]?.id ?? null) : null,
  );
  const [adding, setAdding] = useState(false);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(0);
  const [hint, setHint] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const { meals, saveMeal, deleteMeal, setDraft, notify, tap } = useApp();
  const insets = useSafeAreaInsets();
  const split = useWindowDimensions().width >= 900;
  const firstId = initial.items[0]?.id ?? null;
  const analyze = useCallback(
    async (input: ScanInput) => {
      if (abort.current) return;
      setScanError(null);
      setScanning(true);
      const controller = new AbortController();
      abort.current = controller;
      const timeout = setTimeout(() => controller.abort('timeout'), scanTimeoutMs);
      try {
        const result = await analyzeMeal(input, controller.signal);
        if (mounted.current && !controller.signal.aborted && abort.current === controller) {
          setMeal((m) => ({ ...m, ...result, source: 'ai' }));
          setAsked(new Set());
          setAnswered(0);
          setExpanded(null);
          setRevealed(true);
          setRefining(false);
          setHint('');
        }
      } catch (e) {
        if (
          mounted.current &&
          abort.current === controller &&
          controller.signal.reason !== 'cancelled'
        ) {
          // Nothing came back to review: open the fields so typing it in is one step away.
          setDetails(true);
          setExpanded((current) => current ?? firstId);
          setScanError(
            controller.signal.aborted
              ? 'That estimate took too long. Try again, or enter the nutrition yourself.'
              : e instanceof Error
                ? e.message
                : 'Couldn’t estimate this meal.',
          );
        }
      } finally {
        clearTimeout(timeout);
        if (abort.current === controller) {
          abort.current = null;
          if (mounted.current) setScanning(false);
        }
      }
    },
    [firstId],
  );
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!existing && initial.source === 'sample')
      timer = setTimeout(() => {
        setScanning(false);
        setRevealed(true);
      }, 2100);
    else if (wantsScan(initial, existing)) {
      const input = scanInput(initial)!;
      timer = setTimeout(() => void analyze(input), 0);
    }
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
      abort.current?.abort('cancelled');
      abort.current = null;
    };
    // The scan starts once per opened draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, initial.id, analyze]);
  const patch = (values: Partial<Meal>) => setMeal((m) => ({ ...m, ...values }));
  const replaceItem = (next: FoodItem) =>
    setMeal((m) => ({ ...m, items: m.items.map((item) => (item.id === next.id ? next : item)) }));
  const close = () => {
    if (saving) return;
    abort.current?.abort('cancelled');
    setDraft(null);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const save = async () => {
    if (saving) return;
    const problem = validateMeal(meal);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveMeal(meal);
      setDraft(null);
      notify(
        existing
          ? 'Your memory has a little update ✦'
          : meal.source === 'sample'
            ? 'Sample saved ✦ Your daily total stays the same.'
            : `${round(totalCarbs(meal.items))} g carbs, saved ✦`,
      );
      router.replace('/memories');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save this memory. Please try again.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await deleteMeal(meal.id);
      notify('Memory removed. A fresh little start.');
      router.replace('/memories');
    } catch {
      setError('Couldn’t remove this memory. Please try again.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  const again = () => {
    tap();
    const fresh = newMeal(meal.photo);
    setDraft({
      ...meal,
      id: fresh.id,
      createdAt: fresh.createdAt,
      mealType: fresh.mealType,
      reviewed: false,
      items: meal.items.map((item) => ({ ...item, id: uid() })),
    });
    router.push('/review');
  };
  const total = totalCarbs(meal.items);
  const problem = validateMeal(meal);
  const question = nextQuestion(meal.items, asked);
  const markAsked = (key: string) => setAsked((current) => new Set(current).add(key));
  const canRescan = !!analysisUrl && meal.source !== 'sample' && !!scanInput(meal);
  const results = (
    <View style={{ gap: 14 }}>
      {!scanning && (meal.source === 'ai' || meal.source === 'sample' || existing) && (
        <QuickCheck
          question={question}
          answered={answered}
          onAnswer={(next, key) => {
            tap();
            replaceItem(next);
            markAsked(key);
            setAnswered((n) => n + 1);
          }}
          onSkip={markAsked}
        />
      )}
      <View style={s.sectionRow}>
        <Type kind="heading">
          {meal.items.length} {meal.items.length === 1 ? 'food' : 'foods'}
        </Type>
        {meal.title ? (
          <Type kind="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            {meal.title}
          </Type>
        ) : null}
      </View>
      {meal.items.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={revealed ? FadeInDown.duration(240).delay(index * 60) : undefined}
        >
          <FoodCard
            item={item}
            index={index}
            expanded={expanded === item.id}
            onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
            onChange={replaceItem}
            onRemove={() => {
              tap();
              patch({ items: meal.items.filter((i) => i.id !== item.id) });
            }}
            tap={tap}
          />
        </Animated.View>
      ))}
      {adding ? (
        <AddFood
          meals={meals}
          onClose={() => setAdding(false)}
          onAdd={(item, expand) => {
            tap();
            setMeal((m) => ({
              ...m,
              // Replace the blank starter row instead of stacking another empty one.
              items: [...m.items.filter((i) => i.name.trim() || Number.isFinite(i.carbs)), item],
            }));
            setExpanded(expand ? item.id : null);
            setAdding(false);
          }}
        />
      ) : (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add another food"
          onPress={() => {
            tap();
            setAdding(true);
          }}
          style={s.add}
          hoverStyle={{ backgroundColor: c.lavenderDeep }}
        >
          <View style={s.addIcon}>
            <Plus size={16} color={c.white} strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Type style={{ fontFamily: f.bold, fontSize: 14, color: c.purpleDeep }}>
              Add a food
            </Type>
            <Type kind="caption" style={{ color: c.purpleDeep, opacity: 0.8 }}>
              Search USDA, brands or your foods
            </Type>
          </View>
        </PressableScale>
      )}
      {canRescan &&
        (refining ? (
          <Card padding={16} style={{ gap: 10 }}>
            <Type kind="label">Tell Carbsy what it missed</Type>
            <TextInput
              accessibilityLabel="Note for the rescan"
              placeholder="e.g. brown rice, about half eaten, diet soda"
              placeholderTextColor={c.faint}
              value={hint}
              onChangeText={setHint}
              maxLength={300}
              style={s.refineInput}
              multiline
            />
            <Type kind="caption">Rescanning replaces the foods above.</Type>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label="Rescan with note"
                icon={ScanLine}
                onPress={() => {
                  tap();
                  void analyze(scanInput(meal, hint.trim() || undefined)!);
                }}
                style={{ flex: 1 }}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setRefining(false)} />
            </View>
          </Card>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={
              meal.source === 'ai' ? 'Not quite right? Rescan with a note' : 'Retry scan'
            }
            onPress={() => {
              if (meal.source === 'ai') setRefining(true);
              else {
                tap();
                void analyze(scanInput(meal)!);
              }
            }}
            style={s.refineLink}
          >
            <Wand2 size={15} color={c.purple} strokeWidth={2.2} />
            <Type style={{ fontSize: 13, color: c.purple, fontFamily: f.bold }}>
              {meal.source === 'ai' ? 'Not quite right? Rescan with a note' : 'Retry scan'}
            </Type>
          </PressableScale>
        ))}
      {!analysisUrl && meal.photo && meal.source !== 'sample' && meal.source !== 'ai' && (
        <Type kind="small">Add nutrition from a label.</Type>
      )}
      {scanError && (
        <Type accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>
          {scanError}
        </Type>
      )}
      <Card padding={16}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={details ? 'Hide meal details' : 'Edit meal details'}
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails(!details)}
          scaleTo={0.99}
          style={s.detailsHead}
        >
          <Type style={{ fontFamily: f.bold, fontSize: 15 }}>Name, meal & note</Type>
          <View style={[s.chevron, details && { backgroundColor: c.ink }]}>
            <ChevronDown
              size={15}
              color={details ? c.white : c.muted}
              strokeWidth={2.4}
              style={{ transform: [{ rotate: details ? '180deg' : '0deg' }] }}
            />
          </View>
        </PressableScale>
        {details && (
          <View style={{ gap: 16, marginTop: 14 }}>
            <Field
              label="Memory name"
              value={meal.title}
              onChangeText={(title) => patch({ title })}
              placeholder="Something delicious…"
              maxLength={100}
            />
            <View style={{ gap: 9 }}>
              <Type kind="label">Meal</Type>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((type) => (
                  <Pill
                    key={type}
                    label={type}
                    selected={meal.mealType === type}
                    onPress={() => patch({ mealType: type })}
                  />
                ))}
              </View>
            </View>
            {meal.source !== 'sample' && meal.source !== 'ai' && (
              <View style={{ gap: 9 }}>
                <Type kind="label">Source</Type>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['manual', 'label'] as const).map((source) => (
                    <Pill
                      key={source}
                      label={sourceLabel[source]}
                      selected={meal.source === source}
                      onPress={() => patch({ source })}
                    />
                  ))}
                </View>
              </View>
            )}
            <Field
              label="A note to remember (optional)"
              value={meal.note}
              onChangeText={(note) => patch({ note })}
              placeholder="That little café around the corner…"
              multiline
              maxLength={1000}
              style={{ minHeight: 84, textAlignVertical: 'top' }}
            />
          </View>
        )}
      </Card>
      {existing && (
        <View style={{ gap: 10 }}>
          <Button label="Had this again" icon={Repeat2} variant="secondary" onPress={again} />
          {confirmDelete ? (
            <View style={s.confirm}>
              <Type style={{ fontSize: 14, fontFamily: f.medium, color: c.pinkInk }}>
                Remove this photo and its details from your journal?
              </Type>
              <Button
                label="Yes, remove this memory"
                icon={Trash2}
                variant="danger"
                busy={saving}
                onPress={() => void remove()}
              />
              <Button
                label="Keep my memory"
                variant="ghost"
                onPress={() => setConfirmDelete(false)}
                disabled={saving}
              />
            </View>
          ) : (
            <Button
              label="Remove memory"
              icon={Trash2}
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          )}
        </View>
      )}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.top}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            <IconButton
              label={existing ? 'Back to memories' : 'Discard snap'}
              icon={existing ? ArrowLeft : X}
              onPress={close}
              disabled={saving}
            />
            <Type kind="heading">
              {scanning ? 'Reading your plate' : existing ? 'Your memory' : 'Your meal'}
            </Type>
          </View>
          <Chip
            color={scanning ? c.limeSoft : c.lavender}
            textColor={scanning ? c.limeInk : c.purpleDeep}
          >
            {scanning ? 'SCANNING' : mealSourceLabel(meal).toUpperCase()}
          </Chip>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {scanning ? (
            <>
              <Scanner
                photo={meal.photo}
                prompt={meal.photo ? undefined : meal.prompt}
                sample={meal.source === 'sample'}
              />
              <Button
                label="Cancel and review manually"
                variant="ghost"
                onPress={() => {
                  abort.current?.abort('cancelled');
                  abort.current = null;
                  setScanning(false);
                  setDetails(true);
                  setExpanded(meal.items[0]?.id ?? null);
                }}
                style={{ alignSelf: 'center', marginTop: 12 }}
              />
            </>
          ) : (
            <View style={{ flexDirection: split ? 'row' : 'column', gap: 22 }}>
              <View style={{ flex: split ? 1 : undefined }}>
                <MealHero meal={meal} revealed={revealed} />
              </View>
              <View style={{ flex: split ? 1 : undefined }}>{results}</View>
            </View>
          )}
        </ScrollView>
        {!scanning && (
          <Animated.View
            entering={FadeInDown.duration(220)}
            style={[s.saveBar, { paddingBottom: Math.max(insets.bottom, 14) }]}
          >
            <View style={{ flex: 1 }}>
              {error ? (
                <Type
                  accessibilityRole="alert"
                  style={{ color: c.error, fontSize: 12, lineHeight: 17 }}
                >
                  {error}
                </Type>
              ) : problem ? (
                <Type kind="caption" style={{ lineHeight: 17 }}>
                  {problem}
                </Type>
              ) : (
                <View>
                  <Type kind="caption">Total carbs</Type>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <CountUp
                      value={Number.isFinite(total) ? total : null}
                      decimals={1}
                      style={s.barTotal}
                    />
                    <Type style={{ fontFamily: f.display, color: c.muted, fontSize: 15 }}> g</Type>
                  </View>
                </View>
              )}
            </View>
            <Button
              label={existing ? 'Save changes' : 'Save memory'}
              icon={Save}
              busy={saving}
              disabled={!!problem}
              onPress={() => void save()}
            />
          </Animated.View>
        )}
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
    gap: 10,
  },
  content: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 60,
    borderRadius: radius.lg,
    backgroundColor: c.lavender,
  },
  addIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineInput: {
    minHeight: 68,
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
    padding: 13,
    fontFamily: f.medium,
    fontSize: 14,
    color: c.ink,
    textAlignVertical: 'top',
  },
  refineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    alignSelf: 'flex-start',
  },
  detailsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: c.surfaceAlt,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  pillActive: { backgroundColor: c.ink },
  confirm: { gap: 9, padding: 16, borderRadius: radius.lg, backgroundColor: c.pink },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: c.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.float,
  },
  barTotal: { fontFamily: f.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -1 },
});
