// Gestione del tema: 'light' (predefinito), 'dark' oppure 'system' (segue il telefono)
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme';

const KEY = 'theme_mode';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((m) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');

  const value = useMemo(
    () => ({ mode, setMode, isDark, ready, colors: isDark ? darkColors : lightColors }),
    [mode, setMode, isDark, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
