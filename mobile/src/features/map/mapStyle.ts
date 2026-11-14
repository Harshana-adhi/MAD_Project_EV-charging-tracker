import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type MapStyle = 'auto' | 'light' | 'dark' | 'satellite';

export const MAP_STYLE_OPTIONS: { value: MapStyle; label: string; icon: string }[] = [
  { value: 'light', label: 'Light map', icon: 'map-outline' },
  { value: 'dark', label: 'Dark map', icon: 'map' },
  { value: 'satellite', label: 'Satellite', icon: 'satellite-variant' },
  { value: 'auto', label: 'Match app theme', icon: 'theme-light-dark' },
];

const STORAGE_KEY = 'evct_map_style';

function isMapStyle(value: string | null): value is MapStyle {
  return value === 'auto' || value === 'light' || value === 'dark' || value === 'satellite';
}

async function readStored(): Promise<MapStyle | null> {
  const value =
    Platform.OS === 'web'
      ? typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
  return isMapStyle(value) ? value : null;
}

async function writeStored(value: MapStyle): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export function useMapStyle() {
  const [mapStyle, setMapStyleState] = useState<MapStyle>('light');

  useEffect(() => {
    readStored().then((stored) => {
      if (stored) setMapStyleState(stored);
    });
  }, []);

  function setMapStyle(value: MapStyle) {
    setMapStyleState(value);
    writeStored(value);
  }

  return { mapStyle, setMapStyle };
}
