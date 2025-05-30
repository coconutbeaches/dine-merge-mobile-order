"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useTheme as useNextTheme } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

type Theme = "dark" | "light" | "system";

export interface ThemeToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "center" | "start" | "end";
  side?: "top" | "bottom";
  sideOffset?: number;
}

export interface UseThemeProps {
  /** Current theme */
  theme: Theme;
  /** Whether the theme is ready to be used (avoid hydration mismatch) */
  isReady: boolean;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Force the light theme */
  setLightTheme: () => void;
  /** Force the dark theme */
  setDarkTheme: () => void;
  /** Toggle between light and dark themes */
  toggleTheme: () => void;
  /** Resolved theme: 'light' or 'dark'. If theme === 'system', this will be the system theme */
  resolvedTheme: "light" | "dark";
  /** System theme from the prefers-color-scheme media query */
  systemTheme: "light" | "dark" | undefined;
  /** Forced theme name for the current page (from _document) */
  forcedTheme: Theme | undefined;
  /** Whether the current theme is the system theme */
  isSystemTheme: boolean;
  /** Whether the current theme is the light theme */
  isLightTheme: boolean;
  /** Whether the current theme is the dark theme */
  isDarkTheme: boolean;
}

/**
 * Get the current theme and utilities to change it.
 * This is a wrapper around next-themes' useTheme hook.
 */
export const useTheme = (): UseThemeProps => {
  const [isClient, setIsClient] = React.useState(false);
  const {
    theme,
    setTheme,
    forcedTheme,
    resolvedTheme,
    systemTheme
  } = useNextTheme();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const _resolvedTheme = resolveTheme(
    theme as Theme,
    systemTheme as Theme | undefined
  );

  const setLightTheme = React.useCallback(() => {
    setTheme("light");
  }, [setTheme]);

  const setDarkTheme = React.useCallback(() => {
    setTheme("dark");
  }, [setTheme]);

  const toggleTheme = React.useCallback(() => {
    if (_resolvedTheme === "dark") {
      setLightTheme();
    } else {
      setDarkTheme();
    }
  }, [_resolvedTheme, setLightTheme, setDarkTheme]);

  return {
    theme: theme as Theme,
    isReady: isClient,
    setTheme: setTheme as (theme: Theme) => void,
    setLightTheme,
    setDarkTheme,
    toggleTheme,
    resolvedTheme: _resolvedTheme,
    systemTheme: systemTheme as "light" | "dark" | undefined,
    forcedTheme: forcedTheme as Theme | undefined,
    isSystemTheme: theme === "system",
    isLightTheme: _resolvedTheme === "light",
    isDarkTheme: _resolvedTheme === "dark",
  };
};

/**
 * Resolve the theme to either 'light' or 'dark'.
 * If the theme is 'system', use the system theme.
 * If the system theme is not available, use 'light'.
 */
export const resolveTheme = (theme: Theme, systemTheme?: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    // If systemTheme is 'system' or undefined, return 'light' as fallback
    if (!systemTheme || systemTheme === 'system') {
      return 'light';
    }
    // Otherwise return the system theme (which must be 'light' or 'dark')
    return systemTheme;
  }
  // If theme is not 'system', it must be 'light' or 'dark'
  return theme === 'dark' ? 'dark' : 'light';
};
