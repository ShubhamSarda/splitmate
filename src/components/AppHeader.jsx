import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, User, BarChart2, LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import Avatar from "./Avatar";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-surface">
      <div className="page-app flex h-full items-center justify-between">
        <Link to={user ? "/dashboard" : "/"}>
          <Logo />
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {user && (
            <div ref={menuRef} className="relative">
              {/* Trigger */}
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-canvas"
              >
                <span className="text-ink-soft">{user.name}</span>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <Avatar name={user.name} size={32} />
                )}
                <ChevronDown
                  size={14}
                  className={`text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              <div
                role="menu"
                className={`absolute right-0 top-full mt-1.5 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_-4px_rgba(28,25,23,0.12)] transition-[opacity,transform] duration-150 ease-out dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
              >
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-canvas"
                >
                  <User size={15} className="shrink-0 text-ink-muted" />
                  Profile
                </Link>
                <Link
                  to="/reports"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors hover:bg-canvas"
                >
                  <BarChart2 size={15} className="shrink-0 text-ink-muted" />
                  Reports
                </Link>
                <div className="mx-4 border-t border-line" />
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-neg-bg"
                >
                  <LogOut size={15} className="shrink-0 text-danger" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
