import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Database, History, PencilLine, Search, Tag, X } from 'lucide-react-native';
import {
  defaultPortion,
  FoodItem,
  FoodRecord,
  itemFromFood,
  itemFromProduct,
  Meal,
  Product,
  recentFoods,
  round,
  uid,
} from '../../lib/model';
import { analysisUrl, searchFoods } from '../../lib/analysis';
import { colors as c, fonts as f } from '../../lib/theme';
import { IconButton, Type } from '../ui';
import { PressableScale } from '../PressableScale';

function Row({
  icon: Icon,
  title,
  detail,
  onPress,
}: {
  icon: typeof Search;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Add ${title}`}
      onPress={onPress}
      scaleTo={0.985}
      style={s.row}
      hoverStyle={{ backgroundColor: c.bg }}
    >
      <View style={s.rowIcon}>
        <Icon size={15} color={c.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Type numberOfLines={2} style={{ fontFamily: f.medium, fontSize: 14, lineHeight: 19 }}>
          {title}
        </Type>
        <Type kind="small" numberOfLines={1}>
          {detail}
        </Type>
      </View>
    </PressableScale>
  );
}

const describe = (per100: number | undefined, label: string, grams: number) =>
  per100 === undefined ? label : `${round((per100 * grams) / 100)} g carbs · ${label}`;

export function AddFood({
  meals,
  onAdd,
  onClose,
}: {
  meals: Meal[];
  onAdd: (item: FoodItem, expand: boolean) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  // Results remember which query they answer, so stale responses are simply not shown.
  const [result, setResult] = useState<{
    query: string;
    foods: FoodRecord[];
    branded: Product[];
    error: string | null;
  } | null>(null);
  const q = query.trim();
  const searchable = !!analysisUrl && q.length >= 2;
  const current = searchable && result?.query === q ? result : null;
  const foods = current?.foods ?? [];
  const branded = current?.branded ?? [];
  const error = current?.error ?? null;
  const loading = searchable && !current;
  const yours = recentFoods(meals, query, query ? 4 : 5);
  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    // Wait for a pause in typing before asking the database.
    const timer = setTimeout(() => {
      searchFoods(q, controller.signal)
        .then((found) =>
          setResult({
            query: q,
            foods: found.foods.slice(0, 8),
            branded: found.branded.slice(0, 4),
            error: null,
          }),
        )
        .catch((e) => {
          if (!controller.signal.aborted)
            setResult({
              query: q,
              foods: [],
              branded: [],
              error: e instanceof Error ? e.message : 'Food search isn’t available right now.',
            });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, searchable]);
  const manual = () =>
    onAdd({ id: uid(), name: query.trim(), portion: '1 serving', carbs: NaN, servings: 1 }, true);
  return (
    <Animated.View entering={FadeIn.duration(160)} style={s.panel}>
      <View style={s.search}>
        <Search size={17} color={c.muted} />
        <TextInput
          accessibilityLabel="Search foods"
          autoFocus
          placeholder={
            analysisUrl ? 'Search USDA foods, brands, your foods…' : 'Search your foods…'
          }
          placeholderTextColor={c.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={s.input}
        />
        {loading && <ActivityIndicator size="small" color={c.purple} />}
        <IconButton label="Close food search" icon={X} onPress={onClose} style={s.close} />
      </View>
      {!!yours.length && (
        <View style={s.section}>
          <Type kind="label" style={s.sectionTitle}>
            YOUR FOODS
          </Type>
          {yours.map((item) => (
            <Row
              key={item.id}
              icon={History}
              title={item.name}
              detail={`${item.carbs} g carbs · ${item.portion}`}
              onPress={() => onAdd(item, false)}
            />
          ))}
        </View>
      )}
      {!!foods.length && (
        <View style={s.section}>
          <Type kind="label" style={s.sectionTitle}>
            USDA FOODDATA CENTRAL
          </Type>
          {foods.map((food) => {
            const portion = defaultPortion(food);
            return (
              <Row
                key={food.id}
                icon={Database}
                title={food.description}
                detail={describe(food.per100g.carbs, portion.label, portion.grams)}
                onPress={() => onAdd(itemFromFood(food, portion), true)}
              />
            );
          })}
        </View>
      )}
      {!!branded.length && (
        <View style={s.section}>
          <Type kind="label" style={s.sectionTitle}>
            BRANDS
          </Type>
          {branded.map((product, i) => {
            const serving = product.serving ?? { label: `100 ${product.unit}`, grams: 100 };
            return (
              <Row
                key={`${product.sourceId}-${i}`}
                icon={Tag}
                title={[product.brand, product.name].filter(Boolean).join(' · ')}
                detail={describe(product.per100g.carbs, serving.label, serving.grams)}
                onPress={() => onAdd(itemFromProduct(product), true)}
              />
            );
          })}
        </View>
      )}
      {error && (
        <Type kind="small" style={{ color: c.error }}>
          {error}
        </Type>
      )}
      {!analysisUrl && (
        <Type kind="small">Connect the Carbsy service to search the USDA food database.</Type>
      )}
      <Row
        icon={PencilLine}
        title={query.trim() ? `Enter “${query.trim()}” myself` : 'Enter it myself'}
        detail="Type carbs from a label or your own recipe"
        onPress={manual}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  panel: {
    gap: 12,
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9CEF3',
    backgroundColor: c.white,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 12,
    borderRadius: 15,
    backgroundColor: c.bg,
  },
  input: { flex: 1, height: 46, fontFamily: f.regular, fontSize: 14, color: c.ink },
  close: { backgroundColor: 'transparent', width: 40, height: 40 },
  section: { gap: 2 },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: c.muted,
    marginLeft: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 13,
    minHeight: 48,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
