import { Theme, ThemeName } from '../types';

export const themes: Record<ThemeName, Theme> = {
  bluey: {
    name: 'bluey',
    displayName: 'Bluey',
    emoji: '🐕',
    colors: {
      primary: '#6EC6E6',
      secondary: '#F4A460',
      background: '#F0F8FF',
      gan: '#87CEEB',
      noGan: '#FFE4B5',
      saturday: '#E6F3E6',
    },
  },
  peppa: {
    name: 'peppa',
    displayName: 'Peppa Pig',
    emoji: '🐷',
    colors: {
      primary: '#FF91A4',
      secondary: '#7EC8E3',
      background: '#FFF5F7',
      gan: '#FFD1DC',
      noGan: '#FFEB99',
      saturday: '#E8F4EA',
    },
  },
  spiderman: {
    name: 'spiderman',
    displayName: 'Spiderman',
    emoji: '🕷️',
    colors: {
      primary: '#E23636',
      secondary: '#2B4B8C',
      background: '#F5F5F5',
      gan: '#DCEEFF',
      noGan: '#FFE5E5',
      saturday: '#E8E8E8',
    },
  },
  blippi: {
    name: 'blippi',
    displayName: 'Blippi',
    emoji: '🟠',
    colors: {
      primary: '#FF8C00',
      secondary: '#1E90FF',
      background: '#FFFAF0',
      gan: '#E6F2FF',
      noGan: '#FFE4CC',
      saturday: '#FFF5E6',
    },
  },
};

export const themeNames: ThemeName[] = ['bluey', 'peppa', 'spiderman', 'blippi'];

export function getRandomTheme(excludeTheme?: ThemeName): ThemeName {
  const available = themeNames.filter((t) => t !== excludeTheme);
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-secondary', theme.colors.secondary);
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-gan', theme.colors.gan);
  root.style.setProperty('--color-no-gan', theme.colors.noGan);
  root.style.setProperty('--color-saturday', theme.colors.saturday);
}
