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
import { ArrowLeft, Minus, Plus, Save, ScanLine, Trash2, X } from 'lucide-react-native';
import {
  Meal,
  FoodItem,
  MealType,
  sourceLabel,
  totalCarbs,
  totalCalories,
  nutrientFields,
  totalNutrient,
  totalCarbsRange,
  withPortionWeight,
  uid,
  validateMeal,
} from '../lib/model';
import { analyzePhoto, analysisUrl, scanTimeoutMs } from '../lib/analysis';
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
  const [editing, setEditing] = useState(initial.source !== 'ai' && initial.source !== 'sample');
  const [moreNutrition, setMoreNutrition] = useState(false);
  const [expandedFood, setExpandedFood] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const { saveMeal, deleteMeal, setDraft, notify, tap } = useApp();
  const split = useWindowDimensions().width >= 800;
  const analyze = useCallback(async (photo: string) => {
    if (abort.current) return;
    setScanError(null);
    setScanning(true);
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), scanTimeoutMs);
    try {
      const result = await analyzePhoto(photo, controller.signal);
      if (mounted.current && !controller.signal.aborted && abort.current === controller) {
        setMeal((m) => ({ ...m, ...result, source: 'ai' }));
        setEditing(false);
      }
    } catch (e) {
      if (
        mounted.current &&
        abort.current === controller &&
        controller.signal.reason !== 'cancelled'
      )
        setScanError(
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
    setMeal((m) => ({
      ...m,
      items: m.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...values };
        const weightChanged =
          values.portionGrams !== undefined && values.portionGrams !== item.portionGrams;
        const nutritionChanged = (
          ['name', 'portion', 'carbs', 'calories', ...nutrientFields.map(({ key }) => key)] as const
        ).some((key) => key in values && values[key] !== item[key]);
        if (nutritionChanged && !weightChanged) {
          next.nutritionBasis = 'estimate';
          next.referenceId = undefined;
          next.referenceDescription = undefined;
          next.fdcId = undefined;
          next.nutritionPer100g = undefined;
          next.carbsRange = undefined;
        }
        return next;
      }),
    }));
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
  const valid = validateMeal(meal) === null;
  const range = totalCarbsRange(meal.items);
  const nutritionValue = (key: (typeof nutrientFields)[number]['key'], unit: string) => {
    const value = totalNutrient(meal.items, key);
    return value === null ? '—' : `${value} ${unit}`;
  };
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
              {scanning ? 'scanning your plate.' : 'your meal.'}
            </Type>
          </View>
          <Chip>{scanning ? 'SCANNING' : sourceLabel[meal.source]}</Chip>
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
                  setEditing(true);
                }}
                style={{ alignSelf: 'center', marginTop: 15 }}
              />
            </>
          ) : (
            <View style={{ flexDirection: split ? 'row' : 'column', gap: 22 }}>
              {meal.photo && (
                <View style={[s.photo, { flex: split ? 1 : undefined, height: split ? 500 : 265 }]}>
                  <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
                  <View style={s.photoChip}>
                    <Chip color="rgba(255,255,255,0.95)" textColor={c.ink}>
                      {meal.mealType}
                    </Chip>
                  </View>
                  <View style={s.photoSticker}>
                    <Type
                      style={{
                        fontFamily: f.displayBold,
                        fontSize: 38,
                        lineHeight: 44,
                        letterSpacing: -1,
                      }}
                    >
                      {meal.source === 'ai' ? '≈ ' : ''}
                      {Number.isFinite(total) ? total : '—'}
                      <Type style={{ fontSize: 20 }}> g</Type>
                    </Type>
                    <Type kind="small">total carbs</Type>
                    <Type style={{ fontSize: 12, color: c.purple }}>
                      {calories === null ? 'Calories unknown' : `${calories} kcal`}
                    </Type>
                  </View>
                </View>
              )}
              <View style={{ flex: split ? 1 : undefined, gap: 16 }}>
                {!!meal.title && (
                  <Type style={{ fontFamily: f.displayBold, fontSize: 23, lineHeight: 29 }}>
                    {meal.title}
                  </Type>
                )}
                {!meal.photo && (
                  <Type style={{ fontFamily: f.displayBold, fontSize: 30 }}>
                    {Number.isFinite(total) ? total : '—'} g carbs ·{' '}
                    {calories === null ? '—' : calories} kcal
                  </Type>
                )}
                {range && range.min !== range.max && (
                  <Type kind="small">
                    Estimated carbs: {range.min}–{range.max} g
                  </Type>
                )}
                <View style={s.macros}>
                  {(['protein', 'fat'] as const).map((key) => (
                    <View key={key} style={{ flex: 1, gap: 2 }}>
                      <Type kind="small">{key === 'protein' ? 'Protein' : 'Fat'}</Type>
                      <Type style={{ fontFamily: f.bold, fontSize: 20 }}>
                        {nutritionValue(key, 'g')}
                      </Type>
                    </View>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More nutrition"
                  accessibilityState={{ expanded: moreNutrition }}
                  onPress={() => setMoreNutrition(!moreNutrition)}
                  style={s.detailToggle}
                >
                  <Type style={{ fontSize: 13, color: c.purple }}>
                    More nutrition {moreNutrition ? '−' : '+'}
                  </Type>
                </Pressable>
                {moreNutrition && (
                  <View style={s.nutrients}>
                    {nutrientFields
                      .filter(({ key }) => key !== 'protein' && key !== 'fat')
                      .map(({ key, label, unit }) => (
                        <View
                          key={key}
                          style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                        >
                          <Type style={{ fontSize: 13 }}>{label}</Type>
                          <Type style={{ fontSize: 13 }}>{nutritionValue(key, unit)}</Type>
                        </View>
                      ))}
                    <Type kind="small">
                      — means unknown. Sugar and fiber are included in total carbs.
                    </Type>
                    {meal.uncertainty && <Type kind="small">{meal.uncertainty}</Type>}
                    {meal.items.some((item) => item.fdcId) && (
                      <Type kind="small">USDA composition · estimated food match and portion</Type>
                    )}
                    {meal.source === 'sample' && (
                      <Type kind="small">Samples don’t count toward daily totals.</Type>
                    )}
                    {meal.photo && meal.source !== 'sample' && analysisUrl && (
                      <Button
                        label={meal.source === 'ai' ? 'Scan again' : 'Retry scan'}
                        variant="ghost"
                        icon={ScanLine}
                        onPress={() => {
                          tap();
                          void analyze(meal.photo!);
                        }}
                      />
                    )}
                  </View>
                )}
                {scanError && (
                  <Type accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>
                    {scanError}
                  </Type>
                )}
                {meal.photo &&
                  meal.source !== 'sample' &&
                  meal.source !== 'ai' &&
                  (analysisUrl ? (
                    <Button
                      label="Retry scan"
                      variant="secondary"
                      icon={ScanLine}
                      onPress={() => void analyze(meal.photo!)}
                    />
                  ) : (
                    <Type kind="small">Add nutrition from a label.</Type>
                  ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={editing ? 'Hide meal details' : 'Edit meal details'}
                  accessibilityState={{ expanded: editing }}
                  onPress={() => setEditing(!editing)}
                  style={s.detailToggle}
                >
                  <Type style={{ fontSize: 13, fontFamily: f.bold }}>
                    {editing ? 'Hide details −' : 'Edit details +'}
                  </Type>
                </Pressable>
                {editing && (
                  <View style={{ gap: 18 }}>
                    <Field
                      label="Memory name"
                      value={meal.title}
                      onChangeText={(title) => patch({ title })}
                      placeholder="Something delicious…"
                      maxLength={100}
                    />
                    <View>
                      <Type kind="label" style={{ marginBottom: 9 }}>
                        Meal
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
                        <Type style={{ fontFamily: f.bold }}>Foods</Type>
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
                          {item.portionGrams !== undefined && (
                            <Field
                              label={`Food ${index + 1} weight (g)`}
                              keyboardType="decimal-pad"
                              value={
                                Number.isFinite(item.portionGrams) ? String(item.portionGrams) : ''
                              }
                              onChangeText={(value) => {
                                const grams = Number(value.replace(',', '.'));
                                if (value.trim() && Number.isFinite(grams) && grams > 0)
                                  itemPatch(item.id, withPortionWeight(item, grams));
                              }}
                            />
                          )}
                          <Field
                            label={`Food ${index + 1} calories (kcal / portion)`}
                            keyboardType="decimal-pad"
                            value={Number.isFinite(item.calories) ? String(item.calories) : ''}
                            onChangeText={(value) =>
                              itemPatch(item.id, {
                                calories: value.trim()
                                  ? Number(value.replace(',', '.'))
                                  : undefined,
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
                                  carbsRange: undefined,
                                  nutritionBasis: 'estimate',
                                  referenceId: undefined,
                                  nutritionPer100g: undefined,
                                  referenceDescription: undefined,
                                  fdcId: undefined,
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
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`More nutrients for food ${index + 1}`}
                            accessibilityState={{ expanded: expandedFood === item.id }}
                            onPress={() =>
                              setExpandedFood(expandedFood === item.id ? null : item.id)
                            }
                            style={{ minHeight: 44, justifyContent: 'center' }}
                          >
                            <Type style={{ fontSize: 13, color: c.purple }}>
                              More nutrients {expandedFood === item.id ? '−' : '+'}
                            </Type>
                          </Pressable>
                          {expandedFood === item.id && (
                            <View style={{ gap: 12 }}>
                              {nutrientFields.map(({ key, label, unit }) => (
                                <Field
                                  key={key}
                                  label={`Food ${index + 1} ${label.toLowerCase()} (${unit} / portion)`}
                                  keyboardType="decimal-pad"
                                  value={Number.isFinite(item[key]) ? String(item[key]) : ''}
                                  placeholder="Unknown · add from a label"
                                  onChangeText={(value) =>
                                    itemPatch(item.id, {
                                      [key]: value.trim()
                                        ? Number(value.replace(',', '.'))
                                        : undefined,
                                      nutritionBasis: 'estimate',
                                      referenceId: undefined,
                                      nutritionPer100g: undefined,
                                      referenceDescription: undefined,
                                      fdcId: undefined,
                                    })
                                  }
                                />
                              ))}
                            </View>
                          )}
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
                              {
                                id: uid(),
                                name: '',
                                portion: '1 serving',
                                carbs: NaN,
                                servings: 1,
                              },
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
                  </View>
                )}
                {error && (
                  <Type accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>
                    {error}
                  </Type>
                )}
                {!valid && !error && <Type kind="small">{validateMeal(meal)}</Type>}
                <Button
                  label={existing ? 'Save changes' : 'Save memory'}
                  icon={Save}
                  busy={saving}
                  disabled={!valid}
                  onPress={() => void save()}
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
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#FAF8F0',
    boxShadow: '0 5px 25px rgba(0,0,0,0.09)',
  },
  macros: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  nutrients: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: c.white },
  detailToggle: { minHeight: 44, justifyContent: 'center' },
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
});
