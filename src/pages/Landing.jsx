import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Landing() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-14 border-b border-line bg-surface">
        <div className="page flex h-full items-center justify-between">
          <span className="text-base font-bold tracking-tight text-ink">Splitmate</span>
          <Link
            to="/login"
            className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="page py-20">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Split expenses without the awkward math.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-soft">
            Splitmate keeps shared costs honest and simple — for trips, roommates,
            and group dinners.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-3 sm:grid-cols-3">
          <Feature
            title="Create groups"
            body="Spin up a group for your trip, apartment, or one-off dinner in seconds."
          />
          <Feature
            title="Track shared expenses"
            body="Log who paid and who's in. Splitmate handles the splits for you."
          />
          <Feature
            title="See who owes what"
            body="One clear summary — who pays whom, no IOU spreadsheet required."
          />
        </div>
      </main>
    </div>
  )
}

function Feature({ title, body }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
    </div>
  )
}
