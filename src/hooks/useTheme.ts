import { useState, useEffect } from 'react';
import { getWeek, getYear } from 'date-fns';
import type { ThemeName, Theme } from '../types';
import { themes, getRandomTheme, applyTheme } from '../lib/themes';

const THEME_STORAGE_KEY = 'sky-calendar-theme';
const THEME_WEEK_KEY = 'sky-calendar-theme-week';
const PREVIOUS_THEME_KEY = 'sky-calendar-previous-theme';

function getCurrentWeekKey(): string {
  const now = new Date();
  return `${getYear(now)}-W${getWeek(now)}`;
}

function getInitialTheme(): Theme {
  const weekKey = getCurrentWeekKey();
  const storedWeek = localStorage.getItem(THEME_WEEK_KEY);
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
  const previousTheme = localStorage.getItem(PREVIOUS_THEME_KEY) as ThemeName | null;

  if (storedWeek === weekKey && storedTheme) {
    return themes[storedTheme];
  }

  const newTheme = getRandomTheme(previousTheme || undefined);
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  localStorage.setItem(THEME_WEEK_KEY, weekKey);
  if (storedTheme) {
    localStorage.setItem(PREVIOUS_THEME_KEY, storedTheme);
  }
  return themes[newTheme];
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);
  const [isManualOverride, setIsManualOverride] = useState(false);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const selectTheme = (themeName: ThemeName) => {
    const theme = themes[themeName];
    setCurrentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    setIsManualOverride(true);
  };

  return {
    currentTheme,
    selectTheme,
    isManualOverride,
    allThemes: themes,
  };
}
