'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define theme types
type Theme = 'light' | 'dark' | 'system';
type Language = 'th' | 'en';

// Theme context type
type ThemeContextType = {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  systemTheme?: Theme;
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  language: 'th', // Default to Thai language
  setTheme: () => null,
  setLanguage: () => null,
  systemTheme: 'light',
});

// Provider props
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultLanguage?: Language;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultLanguage = 'th',
}: ThemeProviderProps) {
  // Initialize theme state from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      return savedTheme || defaultTheme;
    }
    return defaultTheme;
  });

  // Initialize language state from localStorage or default
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      return savedLanguage || defaultLanguage;
    }
    return defaultLanguage;
  });

  // Track system theme preference
  const [systemTheme, setSystemTheme] = useState<Theme>('light');

  // Update theme in localStorage and document
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Update language in localStorage
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLanguage);
      // Update html lang attribute
      document.documentElement.lang = newLanguage;
    }
  };

  // Effect to handle system theme changes and apply theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Update system theme when preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
    
    if (isDark) {
      root.classList.add('dark');
      document.body.dataset.theme = 'dark';
    } else {
      root.classList.remove('dark');
      document.body.dataset.theme = 'light';
    }
  }, [theme, systemTheme]);

  // Set html lang attribute on initial load
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Provide theme context to children
  return (
    <ThemeContext.Provider value={{ theme, language, setTheme, setLanguage, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Utility function to get current theme (light/dark)
export const resolveTheme = (theme: Theme, systemTheme?: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return systemTheme || 'light';
  }
  return theme;
};
