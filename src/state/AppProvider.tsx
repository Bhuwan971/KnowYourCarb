import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Meal, Settings, defaultSettings, isMeal, validateMeal } from '../lib/model';
import { keepPhoto, removePhoto } from '../lib/photos';

const KEY = 'carbsy.journal.v1';
type Store = { meals: Meal[]; settings: Settings };
type AppState = Store & {
  ready: boolean;
  storageError: string | null;
  draft: Meal | null;
  setDraft: (meal: Meal | null) => void;
  saveMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  toast: string | null;
  notify: (message: string) => void;
  tap: () => void;
  retry: () => void;
};
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>({ meals: [], settings: defaultSettings });
  const storeRef = useRef(store);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Meal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if (value.version !== 1 || !Array.isArray(value.meals) || !value.meals.every(isMeal))
          throw new Error('Unreadable journal');
        const settings = { ...defaultSettings, ...value.settings } as Settings;
        if (
          typeof settings.name !== 'string' ||
          typeof settings.haptics !== 'boolean' ||
          (settings.goal !== null && (!Number.isFinite(settings.goal) || settings.goal <= 0))
        )
          throw new Error('Unreadable settings');
        storeRef.current = { meals: value.meals, settings };
        setStore(storeRef.current);
      }
      setStorageError(null);
    } catch {
      setStorageError(
        'Your journal couldn’t be opened. Your saved data has been kept. Please retry.',
      );
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);
  const notify = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const commit = useCallback(
    (transform: (s: Store) => Promise<Store> | Store) => {
      const job = queue.current
        .catch(() => {})
        .then(async () => {
          if (storageError || !ready)
            throw new Error('Please reopen your journal before making changes.');
          const next = await transform(storeRef.current);
          await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, ...next }));
          storeRef.current = next;
          setStore(next);
        });
      queue.current = job;
      return job;
    },
    [ready, storageError],
  );
  const saveMeal = useCallback(
    async (meal: Meal) => {
      const problem = validateMeal(meal);
      if (problem) throw new Error(problem);
      let persisted: string | undefined;
      try {
        await commit(async (current) => {
          persisted = await keepPhoto(meal.photo, meal.id);
          const saved = { ...meal, title: meal.title.trim(), photo: persisted, reviewed: true };
          return {
            ...current,
            meals: [saved, ...current.meals.filter((m) => m.id !== meal.id)].sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
            ),
          };
        });
      } catch (error) {
        if (persisted !== meal.photo && !storeRef.current.meals.some((m) => m.photo === persisted))
          removePhoto(persisted);
        throw error;
      }
      if (storeRef.current.settings.haptics && Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [commit],
  );
  const deleteMeal = useCallback(
    async (id: string) => {
      const photo = storeRef.current.meals.find((m) => m.id === id)?.photo;
      await commit((current) => ({ ...current, meals: current.meals.filter((m) => m.id !== id) }));
      removePhoto(photo);
    },
    [commit],
  );
  const updateSettings = useCallback(
    (settings: Settings) => commit((current) => ({ ...current, settings })),
    [commit],
  );
  const tap = useCallback(() => {
    if (storeRef.current.settings.haptics && Platform.OS !== 'web')
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  return (
    <Context.Provider
      value={{
        ...store,
        ready,
        storageError,
        draft,
        setDraft,
        saveMeal,
        deleteMeal,
        updateSettings,
        toast,
        notify,
        tap,
        retry: () => {
          setReady(false);
          void load();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing app provider');
  return value;
}
