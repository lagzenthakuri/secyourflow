"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

const THEME_KEY = "secyourflow-theme";

type ThemeMode = "dark" | "light";
type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const APP_SHELL_PREFIXES = [
  "/dashboard",
  "/vulnerabilities",
  "/assets",
  "/threats",
  "/compliance",
  "/reports",
  "/settings",
  "/users",
  "/scanners",
  "/risk-register",
  "/cves",
];

function isAppShellPath(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light", "dark");
  if (theme === "light") {
    root.classList.add("theme-light");
  } else {
    root.classList.add("theme-dark", "dark");
  }
  root.style.colorScheme = theme;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      theme: "dark",
      toggleTheme: () => undefined,
    };
  }

  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialTheme = resolveInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    applyTheme(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [isReady, theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme],
  );

  const showFloatingToggle = !isAppShellPath(pathname);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      {showFloatingToggle && (
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="fixed bottom-5 right-5 z-[120] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-md)] transition hover:scale-105 hover:border-[var(--border-hover)]"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      )}
    </ThemeContext.Provider>
  );
}
