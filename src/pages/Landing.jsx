import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Landing() {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Features />
      <SocialProof />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <img src="/logo.png" alt="Splitmate" className="h-8 w-auto" />
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link to="/register" className="btn-primary py-2 text-xs">
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 lg:pb-24 lg:pt-28">
      <div className="grid gap-14 lg:grid-cols-[1fr_400px] lg:items-center">
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand">
            Shared expenses, solved
          </p>
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
            Split the bill.
            <br />
            Keep the friends.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-soft">
            Splitmate tracks shared expenses for trips, flatmates, and group
            dinners. Add what was spent, it figures out who owes what, you
            settle in one round.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Start for free
            </Link>
            <Link to="/login" className="btn-secondary px-6 py-3 text-base">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            No app to install. Works in any browser.
          </p>
        </div>
        <HeroMock />
      </div>
    </section>
  )
}

function HeroMock() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink">Barcelona Trip</p>
          <p className="mt-0.5 text-xs text-ink-muted">4 members · 6 expenses</p>
        </div>
        <span className="badge-active">Active</span>
      </div>

      <div className="divide-y divide-line">
        {[
          { name: 'Airbnb, 3 nights', amount: '€320', paidBy: 'Alex' },
          { name: 'Dinner, La Barceloneta', amount: '€84', paidBy: 'Priya' },
          { name: 'Groceries + drinks', amount: '€62', paidBy: 'Sam' },
        ].map((e) => (
          <div
            key={e.name}
            className="flex items-center justify-between py-2.5"
          >
            <div>
              <p className="font-medium text-ink">{e.name}</p>
              <p className="text-xs text-ink-muted">paid by {e.paidBy}</p>
            </div>
            <span className="font-semibold tabular-nums text-ink">
              {e.amount}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-canvas px-4 py-3.5">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Settle up
        </p>
        <div className="space-y-2">
          {[
            { from: 'Sam', to: 'Alex', amount: '€55' },
            { from: 'Priya', to: 'Alex', amount: '€33' },
          ].map((s) => (
            <div key={s.from} className="flex items-center justify-between">
              <span className="text-ink">
                {s.from}{' '}
                <span className="text-ink-muted">pays</span> {s.to}
              </span>
              <span className="pill-neg">{s.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <section className="border-t border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display mb-14 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
          From split to settled in three steps.
        </h2>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-14">
          {[
            {
              num: '01',
              title: 'Create a group',
              body: 'Name it after the trip or the flat. Invite people by email — they can join before or after they register.',
            },
            {
              num: '02',
              title: 'Log what was spent',
              body: 'Add who paid and how much. Splitmate records each split to the cent, with category and full history.',
            },
            {
              num: '03',
              title: 'Settle in one round',
              body: "When it's over, Splitmate finds the minimum number of payments to clear all debts. One screen, no spreadsheet.",
            },
          ].map((step) => (
            <div key={step.num}>
              <p className="font-display mb-4 text-[4rem] font-extrabold leading-none tracking-[-0.04em] text-line">
                {step.num}
              </p>
              <h3 className="mb-2 text-base font-semibold text-ink">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      label: 'Smart settlements',
      body: 'No matter how tangled the debts, Splitmate finds the shortest path to zero. One round of transfers clears the whole group.',
    },
    {
      label: 'Invite anyone, even non-members',
      body: "Add people by email before they sign up. Their splits are tracked from day one; they claim the account when they're ready.",
    },
    {
      label: 'Full expense history',
      body: 'Every payment stays on the record: what was spent, who paid, when. Edit or remove if something was logged wrong.',
    },
    {
      label: 'Works on any device',
      body: 'No download required. Splitmate runs in any mobile browser, in exactly the same way as on a laptop.',
    },
  ]

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display mb-14 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
          Built for how groups actually work.
        </h2>
        <div className="grid sm:grid-cols-2">
          {features.map((f, i) => {
            const isLeft = i % 2 === 0
            const parts = ['py-8', 'border-line']
            if (isLeft) parts.push('sm:pr-10', 'sm:border-r')
            else parts.push('sm:pl-10')
            if (i < features.length - 1) parts.push('border-b')
            if (i >= 2 && i < features.length - 1) parts.push('sm:border-b-0')
            return (
              <div key={f.label} className={parts.join(' ')}>
                <h3 className="mb-2 text-base font-semibold text-ink">
                  {f.label}
                </h3>
                <p className="max-w-[34ch] text-sm leading-relaxed text-ink-soft">
                  {f.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  return (
    <section className="border-t border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-2xl">
          <p className="font-display mb-6 text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-snug tracking-[-0.02em] text-ink">
            "We split a three-week Euro trip across six people. Splitmate
            figured out who owed what in one screen. Nobody argued about the
            math once."
          </p>
          <p className="text-sm font-medium text-ink-soft">
            Jamie, traveling with friends
          </p>
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="bg-ink py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-canvas">
          Your next trip, already sorted.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-muted">
          Free to use. No credit card, no app to install. Start splitting in
          under a minute.
        </p>
        <Link
          to="/register"
          className="btn-primary mt-10 inline-flex px-8 py-4 text-base"
        >
          Create your first group
        </Link>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-line bg-canvas py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
        <img
          src="/logo.png"
          alt="Splitmate"
          className="h-6 w-auto opacity-60"
        />
        <p className="text-xs text-ink-muted">© 2026 Splitmate</p>
      </div>
    </footer>
  )
}
