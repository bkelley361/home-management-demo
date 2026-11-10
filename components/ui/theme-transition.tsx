import React from 'react';
import { useColorScheme } from 'nativewind';

type ThemeTransitionContextType = {
  toggleTheme: (origin?: { x: number; y: number }) => void;
};

const ThemeTransitionContext = React.createContext<ThemeTransitionContextType | null>(null);

export function useThemeTransition() {
  const context = React.useContext(ThemeTransitionContext);

  if (!context) {
    throw new Error('useThemeTransition must be inside ThemeTransition');
  }

  return context;
}

export function ThemeTransition({ children }: { children: React.ReactNode }) {
  const { toggleColorScheme } = useColorScheme();

  const toggleTheme = React.useCallback(
    (_origin?: { x: number; y: number }) => {
      toggleColorScheme();
    },
    [toggleColorScheme]
  );

  return (
    <ThemeTransitionContext.Provider value={{ toggleTheme }}>
      {children}
    </ThemeTransitionContext.Provider>
  );
}
