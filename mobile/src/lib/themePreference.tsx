import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'evct_theme';

type ThemePreferenceState = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceState | undefined>(undefined);

async function readStored(): Promise<ThemePreference | null> {
  const value =
    Platform.OS === 'web'
      ? typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
  return value === 'system' || value === 'light' || value === 'dark' ? value : null;
}

async function writeStored(value: ThemePreference): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    readStored().then((stored) => {
      if (stored) setPreferenceState(stored);
    });
  }, []);

  function setPreference(value: ThemePreference) {
    setPreferenceState(value);
    writeStored(value);
  }

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceState {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  return context;
}
