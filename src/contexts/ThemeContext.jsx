import { createContext, useContext, useMemo } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeProvider - Simplified theme context (placeholder for future theming)
 * Website builder / theme system removed for now — 
 * this just provides a no-op context so downstream code doesn't break.
 */
export function ThemeProvider({ children }) {
  const value = useMemo(() => ({
    themes: [],
    activeTheme: null,
    loading: false,
    saving: false,
    error: null,
    activateTheme: async () => false,
    customizeTheme: async () => false,
    generateCSSVariables: () => ({}),
    reload: async () => {},
  }), []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themes: [],
      activeTheme: null,
      loading: false,
      saving: false,
      error: null,
      activateTheme: async () => false,
      customizeTheme: async () => false,
      generateCSSVariables: () => ({}),
      reload: async () => {},
    };
  }
  return context;
}

export default ThemeProvider;
