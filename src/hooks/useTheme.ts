import { useState, useEffect } from 'react';
import { getWeek, getYear } from 'date-fns';
import { ThemeName, Theme } from '../types';
import { themes, getRandomTheme, applyTheme } from '../lib/themes';

const THEME_STORAGE_KEY = 'sky-calendar-theme';
const THEME_WEEK_KEY = 'sky-calendar-theme-week';
const PREVIOUS_THEME_KEY = 'sky-calendar-previous-theme';

function getCurrentWeekKey(): string {
  const now = new Date();
  return `${getYear(now)}-W${getWeek(now)}`;
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.bluey);
  const [isManualOverride, setIsManualOverride] = useState(false);

  useEffect(() => {
    const weekKey = getCurrentWeekKey();
    const storedWeek = localStorage.getItem(THEME_WEEK_KEY);
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    const previousTheme = localStorage.getItem(PREVIOUS_THEME_KEY) as ThemeName | null;

    if (storedWeek === weekKey && storedTheme) {
      // Same week, use stored theme
      setCurrentTheme(themes[storedTheme]);
      applyTheme(themes[storedTheme]);
    } else {
      // New week, pick random theme (excluding previous)
      const newTheme = getRandomTheme(previousTheme || undefined);
      setCurrentTheme(themes[newTheme]);
      applyTheme(themes[newTheme]);

      // Store for this week
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      localStorage.setItem(THEME_WEEK_KEY, weekKey);
      if (storedTheme) {
        localStorage.setItem(PREVIOUS_THEME_KEY, storedTheme);
      }
      setIsManualOverride(false);
    }
  }, []);

  const selectTheme = (themeName: ThemeName) => {
    const theme = themes[themeName];
    setCurrentTheme(theme);
    applyTheme(theme);
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
