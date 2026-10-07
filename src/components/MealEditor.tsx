import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Save,
  ScanLine,
  Flame,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  Meal,
  FoodItem,
  MealType,
  sourceLabel,
  totalCarbs,
  totalCalories,
  uid,
  validateMeal,
} from '../lib/model';
import { analyzePhoto, analysisUrl } from '../lib/analysis';
import { colors as c, fonts as f } from '../lib/theme';
import { Button, Chip, Field, FoodPhoto, IconButton, Type } from './ui';
import { Scanner } from './Scanner';
import { useApp } from '../state/AppProvider';
export function MealEditor({ initial, existing = false }: { initial: Meal; existing?: boolean }) {
  const [meal, setMeal] = useState<Meal>({
    ...initial,
    items: initial.items.map((i) => ({ ...i })),
  });
  const [scanning, setScanning] = useState(
    !existing &&
      (initial.source === 'sample' ||
        (!!initial.photo && !!analysisUrl && initial.source !== 'ai')),
  );
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(existing || initial.source !== 'ai');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const { saveMeal, deleteMeal, setDraft, notify, tap } = useApp();
  const split = useWindowDimensions().width >= 800;
  const analyze = useCallback(async (photo: string) => {
    if (abort.current) return;
    setError(null);
    setScanning(true);
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    try {
      const result = await analyzePhoto(photo, controller.signal);
      if (mounted.current && !controller.signal.aborted && abort.current === controller) {
        setMeal((m) => ({ ...m, ...result, source: 'ai' }));
        setChecked(false);
      }
    } catch (e) {
      if (
        mounted.current &&
        abort.current === controller &&
        controller.signal.reason !== 'cancelled'
      )
        setError(
          controller.signal.aborted
            ? 'That estimate took too long. Try again, or enter the nutrition yourself.'
            : e instanceof Error
              ? e.message
              : 'Couldn’t estimate this photo.',
        );
    } finally {
      clearTimeout(timeout);
      if (abort.current === controller) {
        abort.current = null;
        if (mounted.current) setScanning(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let timer =
      !existing && initial.source === 'sample'
        ? setTimeout(() => setScanning(false), 2100)
        : undefined;
    if (
      !existing &&
      initial.photo &&
      analysisUrl &&
      initial.source !== 'sample' &&
      initial.source !== 'ai'
    )
      timer = setTimeout(() => void analyze(initial.photo!), 0);
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
      abort.current?.abort('cancelled');
      abort.current = null;
    };
  }, [existing, initial.source, initial.photo, analyze]);
  const patch = (values: Partial<Meal>) => setMeal((m) => ({ ...m, ...values }));
  const itemPatch = (id: string, values: Partial<FoodItem>) =>
    setMeal((m) => ({ ...m, items: m.items.map((i) => (i.id === id ? { ...i, ...values } : i)) }));
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
            : 'A little memory, saved ✦',
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
  const total = totalCarbs(meal.items);
  const calories = totalCalories(meal.items);
  const valid = validateMeal(meal) === null && checked;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.top}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconButton
              label={existing ? 'Back to memories' : 'Discard snap'}
              icon={existing ? ArrowLeft : X}
              onPress={close}
              disabled={saving}
            />
            <Type style={{ fontFamily: f.displayBold, fontSize: 20 }}>
              {scanning ? 'scanning your plate.' : existing ? 'a little memory.' : 'a little snap.'}
            </Type>
          </View>
          <Chip icon={ScanLine}>{scanning ? 'SCANNING' : sourceLabel[meal.source]}</Chip>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {scanning ? (
            <>
              <Scanner photo={meal.photo} sample={meal.source === 'sample'} />
              <Button
                label="Cancel and review manually"
                variant="ghost"
                onPress={() => {
                  abort.current?.abort('cancelled');
                  abort.current = null;
                  setScanning(false);
                }}
                style={{ alignSelf: 'center', marginTop: 15 }}
              />
            </>
          ) : (
            <>
              <View style={{ flexDirection: split ? 'row' : 'column', gap: split ? 35 : 24 }}>
                <View style={{ flex: split ? 1 : undefined }}>
                  <View style={[s.photo, { height: split ? 530 : 300 }]}>
                    <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
                    <View style={s.photoChip}>
                      <Chip color="rgba(255,255,255,0.95)" textColor={c.ink}>
                        {meal.mealType} ·{' '}
                        {new Date(meal.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Chip>
                    </View>
                    <View style={s.photoSticker}>
                      <Type
                        style={{
                          fontFamily: f.displayBold,
                          fontSize: 48,
                          lineHeight: 53,
                          letterSpacing: -2,
                        }}
                      >
                        {Number.isFinite(total) ? total : '—'}
                        <Type style={{ fontSize: 23 }}>g</Type>
                      </Type>
                      <Type style={{ fontSize: 12, color: c.muted }}>
                        total carbs · {sourceLabel[meal.source].toLowerCase()}
                      </Type>
                      <View
                        style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 8 }}
                      >
                        <Flame size={14} color={c.purple} />
                        <Type style={{ fontSize: 11, color: c.purple }}>
                          {calories === null ? 'Add calories below' : `${calories} kcal`}
                        </Type>
                      </View>
                    </View>
                  </View>
                  <Type kind="small" style={{ marginTop: 12, textAlign: 'center' }}>
                    {meal.source === 'sample'
                      ? 'Sample memories don’t count toward your daily totals.'
                      : 'The photo, the portions, the moment. All saved together.'}
                  </Type>
                </View>
                <View style={{ flex: split ? 1.1 : undefined, gap: 21 }}>
                  <View>
                    <Type
                      style={{
                        color: c.purple,
                        fontSize: 10,
                        letterSpacing: 1.7,
                        fontFamily: f.bold,
                        marginBottom: 6,
                      }}
                    >
                      THE LITTLE DETAILS
                    </Type>
                    <Type kind="title">
                      {existing
                        ? 'Remember this bite?'
                        : meal.source === 'ai'
                          ? 'Your scan is ready.'
                          : 'Make it yours.'}
                    </Type>
                    <Type kind="small" style={{ marginTop: 7 }}>
                      {meal.source === 'ai'
                        ? 'Calories, carbs and portions are filled in. Tap any detail to adjust it before saving.'
                        : 'Check the portions, carbs and calories before you save.'}
                    </Type>
                  </View>
                  {meal.photo && meal.source !== 'sample' && (
                    <View style={s.aiCard}>
                      <ScanLine size={22} color={c.purple} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Type style={{ fontSize: 13, fontFamily: f.bold }}>
                          {analysisUrl
                            ? meal.source === 'ai'
                              ? 'Estimated from your photo'
                              : 'Try another scan'
                            : 'Your photo is ready to keep'}
                        </Type>
                        <Type kind="small">
                          {analysisUrl
                            ? 'Photo scans use Google Gemini. You can edit every value; portions and hidden ingredients may affect the estimate.'
                            : 'Automatic photo estimates aren’t connected yet. Add nutrition from a label below, or connect the photo service in the setup guide.'}
                        </Type>
                        {analysisUrl && (
                          <Button
                            label={meal.source === 'ai' ? 'Scan again' : 'Retry scan'}
                            variant="secondary"
                            icon={ScanLine}
                            onPress={() => {
                              tap();
                              if (meal.photo) void analyze(meal.photo);
                            }}
                          />
                        )}
                      </View>
                    </View>
                  )}
                  {meal.uncertainty && (
                    <View style={s.uncertainty}>
                      <Type kind="small" style={{ color: '#78674C' }}>
                        {meal.uncertainty}
                      </Type>
                    </View>
                  )}
                  <Field
                    label="Memory name"
                    value={meal.title}
                    onChangeText={(title) => patch({ title })}
                    placeholder="Something delicious…"
                    maxLength={100}
                  />
                  <View>
                    <Type kind="label" style={{ marginBottom: 9 }}>
                      A little moment for
                    </Type>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((type) => (
                        <Pressable
                          key={type}
                          accessibilityRole="button"
                          accessibilityState={{ selected: meal.mealType === type }}
                          onPress={() => patch({ mealType: type })}
                          style={[
                            s.pill,
                            meal.mealType === type && {
                              backgroundColor: c.lavender,
                              borderColor: '#D3C5EE',
                            },
                          ]}
                        >
                          <Type
                            style={{
                              fontSize: 12,
                              color: meal.mealType === type ? c.purple : c.muted,
                              fontFamily: f.medium,
                            }}
                          >
                            {type}
                          </Type>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  {meal.source !== 'sample' && meal.source !== 'ai' && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['manual', 'label'] as const).map((source) => (
                        <Pressable
                          key={source}
                          accessibilityRole="button"
                          accessibilityState={{ selected: meal.source === source }}
                          onPress={() => patch({ source })}
                          style={[
                            s.pill,
                            meal.source === source && { backgroundColor: c.lavender },
                          ]}
                        >
                          <Type
                            style={{
                              fontSize: 12,
                              color: meal.source === source ? c.purple : c.muted,
                            }}
                          >
                            {sourceLabel[source]}
                          </Type>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Type style={{ fontFamily: f.bold }}>What’s on your plate?</Type>
                      <Type kind="small">Total carbs, not net carbs</Type>
                    </View>
                    {meal.items.map((item, index) => (
                      <View key={item.id} style={s.foodRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={s.number}>
                            <Type style={{ fontSize: 11, fontFamily: f.bold, color: c.purple }}>
                              {String(index + 1).padStart(2, '0')}
                            </Type>
                          </View>
                          <TextInput
                            accessibilityLabel={`Food ${index + 1} name`}
                            placeholder="Food name"
                            placeholderTextColor={c.muted}
                            value={item.name}
                            onChangeText={(name) => itemPatch(item.id, { name })}
                            maxLength={100}
                            style={s.foodName}
                          />
                          <IconButton
                            label={`Remove food ${index + 1}`}
                            icon={X}
                            onPress={() =>
                              patch({ items: meal.items.filter((i) => i.id !== item.id) })
                            }
                            style={{ width: 32, height: 32, backgroundColor: 'transparent' }}
                          />
                        </View>
                        <Field
                          label={`Food ${index + 1} portion`}
                          value={item.portion}
                          onChangeText={(portion) => itemPatch(item.id, { portion })}
                          placeholder="e.g. ½ cup or 100 g"
                          maxLength={80}
                        />
                        <Field
                          label={`Food ${index + 1} calories (kcal / portion)`}
                          keyboardType="decimal-pad"
                          value={Number.isFinite(item.calories) ? String(item.calories) : ''}
                          onChangeText={(value) =>
                            itemPatch(item.id, {
                              calories: value.trim() ? Number(value.replace(',', '.')) : undefined,
                            })
                          }
                          placeholder="Optional · from a scan or nutrition label"
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <Field
                            inline
                            label={`Food ${index + 1} carbs (g / portion)`}
                            keyboardType="decimal-pad"
                            value={Number.isFinite(item.carbs) ? String(item.carbs) : ''}
                            onChangeText={(value) =>
                              itemPatch(item.id, {
                                carbs: value.trim() ? Number(value.replace(',', '.')) : NaN,
                              })
                            }
                            placeholder="Carbs in grams"
                          />
                          <Field
                            inline
                            label={`Food ${index + 1} portions eaten`}
                            keyboardType="decimal-pad"
                            value={Number.isFinite(item.servings) ? String(item.servings) : ''}
                            onChangeText={(value) =>
                              itemPatch(item.id, {
                                servings: value.trim() ? Number(value.replace(',', '.')) : NaN,
                              })
                            }
                            placeholder="e.g. 1.5"
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Type kind="small">
                            {Number.isFinite(item.carbs * item.servings)
                              ? `${Math.round(item.carbs * item.servings * 10) / 10} g for this food`
                              : 'Add a carb value to calculate'}
                          </Type>
                          <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
                            <IconButton
                              label={`Half a portion less of food ${index + 1}`}
                              icon={Minus}
                              onPress={() =>
                                itemPatch(item.id, {
                                  servings: Math.max(0.5, (item.servings || 1) - 0.5),
                                })
                              }
                              disabled={item.servings <= 0.5}
                              style={s.stepper}
                            />
                            <IconButton
                              label={`Half a portion more of food ${index + 1}`}
                              icon={Plus}
                              onPress={() =>
                                itemPatch(item.id, {
                                  servings: Math.min(100, (item.servings || 1) + 0.5),
                                })
                              }
                              style={s.stepper}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                    <Button
                      label="Add another food"
                      icon={Plus}
                      variant="ghost"
                      onPress={() =>
                        patch({
                          items: [
                            ...meal.items,
                            { id: uid(), name: '', portion: '1 serving', carbs: NaN, servings: 1 },
                          ],
                        })
                      }
                    />
                  </View>
                  <Field
                    label="A note to remember (optional)"
                    value={meal.note}
                    onChangeText={(note) => patch({ note })}
                    placeholder="That little café around the corner…"
                    multiline
                    maxLength={1000}
                    style={{ minHeight: 80 }}
                  />
                  {meal.source === 'ai' && (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="I checked the portions and nutrition estimates"
                      accessibilityState={{ checked }}
                      onPress={() => setChecked(!checked)}
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        alignItems: 'center',
                        paddingVertical: 8,
                      }}
                    >
                      <View
                        style={[
                          s.checkbox,
                          checked && { backgroundColor: c.purple, borderColor: c.purple },
                        ]}
                      >
                        {checked && <Check size={15} color={c.white} />}
                      </View>
                      <Type style={{ fontSize: 13, flex: 1 }}>
                        I checked the portions and nutrition estimates.
                      </Type>
                    </Pressable>
                  )}
                  {error && (
                    <Type accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>
                      {error}
                    </Type>
                  )}
                  {!valid && !error && (
                    <Type kind="small">
                      {validateMeal(meal) || 'Check the portions to save your photo estimate.'}
                    </Type>
                  )}
                  <Button
                    label={existing ? 'Save changes' : 'Save memory'}
                    icon={Save}
                    busy={saving}
                    disabled={!valid}
                    onPress={() => void save()}
                  />
                  <Button
                    label={existing ? 'Close memory' : 'Discard snap'}
                    variant="ghost"
                    onPress={close}
                    disabled={saving}
                  />
                  {existing &&
                    (confirmDelete ? (
                      <View
                        style={{ gap: 9, padding: 15, borderRadius: 16, backgroundColor: c.pink }}
                      >
                        <Type style={{ fontSize: 13 }}>
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
                    ))}
                </View>
              </View>
              <Type kind="small" style={{ textAlign: 'center', marginTop: 30 }}>
                Photo estimates are approximate. Use a label or weighed portion when accuracy
                matters.
              </Type>
            </>
          )}
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
    padding: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  content: { padding: 22, paddingBottom: 45, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  photo: { borderRadius: 28, overflow: 'hidden', backgroundColor: c.lavender },
  photoChip: { position: 'absolute', top: 20, left: 20 },
  photoSticker: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    padding: 20,
    borderRadius: 23,
    backgroundColor: '#FAF8F0',
    transform: [{ rotate: '-4deg' }],
    boxShadow: '0 5px 25px rgba(0,0,0,0.09)',
  },
  aiCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: c.lavender,
    borderRadius: 18,
    padding: 17,
  },
  uncertainty: { backgroundColor: '#F7F0DE', borderRadius: 14, padding: 14 },
  pill: {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  foodRow: {
    borderWidth: 1,
    borderColor: c.line,
    padding: 14,
    borderRadius: 18,
    gap: 12,
    backgroundColor: '#FEFDFC',
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: c.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodName: { flex: 1, fontFamily: f.bold, fontSize: 14, color: c.ink, minHeight: 40 },
  stepper: { width: 32, height: 32, borderWidth: 1, borderColor: c.line },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C5BAD9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
