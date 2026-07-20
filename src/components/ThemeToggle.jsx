import { Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

/**
 * Icon-only light/dark toggle for navbars. Hover tint is surface-agnostic so
 * it sits on both the app header (surface) and the landing nav (canvas).
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
