import { useState, useRef, useEffect } from 'react';
import type { ThemeName, Theme } from '../types';
import { themeNames, themes } from '../lib/themes';

interface ThemePickerProps {
  currentTheme: Theme;
  onSelectTheme: (theme: ThemeName) => void;
}

export function ThemePicker({ currentTheme, onSelectTheme }: ThemePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (event.target instanceof Node && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  return (
    <div className="relative no-print" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      >
        <span>{currentTheme.emoji}</span>
        <span className="text-sm font-medium">{currentTheme.displayName}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {themeNames.map((themeName) => {
            const theme = themes[themeName];
            const isSelected = themeName === currentTheme.name;
            return (
              <button
                key={themeName}
                onClick={() => {
                  onSelectTheme(themeName);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
              >
                <span>{theme.emoji}</span>
                <span className="text-sm">{theme.displayName}</span>
                {isSelected && <span className="ml-auto text-green-500">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
