import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-surface">
      <div className="page-app flex h-full items-center justify-between">
        <Link to={user ? "/dashboard" : "/"}>
          <img src="/logo.png" alt="Splitmate" className="h-8 w-auto" />
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <Link
              to="/reports"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Reports
            </Link>
            <Link
              to="/profile"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Profile
            </Link>
            <span className="text-sm text-ink-soft">{user.name}</span>
            <button onClick={handleLogout} className="btn-secondary gap-2">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
