import { useState } from "react";

const STORAGE_KEY = "splitmate_theme";

/**
 * Theme state for the manual light/dark toggle. The initial `.dark` class is
 * applied pre-paint by the inline script in index.html; this hook reads that
 * DOM state so React and the document can never disagree.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;

    // Crossfade the whole surface for the flip only (see index.css).
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 250);

    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — preference just won't persist */
    }
    setTheme(next);
  }

  return { theme, toggleTheme };
}
