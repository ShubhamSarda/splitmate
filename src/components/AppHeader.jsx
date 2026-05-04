import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-surface">
      <div className="page flex h-full items-center justify-between">
        <Link
          to={user ? '/dashboard' : '/'}
          className="text-base font-bold tracking-tight text-ink"
        >
          Splitmate
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
