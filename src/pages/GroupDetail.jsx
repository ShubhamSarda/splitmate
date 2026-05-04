import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { storage } from '../data/storage'
import { calculateNetBalances, settleDebts } from '../lib/balances'
import { formatCurrency, formatDate } from '../lib/format'
import AppHeader from '../components/AppHeader'
import AddExpenseModal from '../components/AddExpenseModal'
import Avatar from '../components/Avatar'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [, setVersion] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const group = storage.getGroupById(id)
  if (!group) return <Navigate to="/dashboard" replace />

  const isMember = group.members.some((m) => m.userId === user.id)
  if (!isMember) return <Navigate to="/dashboard" replace />

  const expenses = storage.getActiveExpensesForGroup(group.id)
  const balances = calculateNetBalances(expenses, group.members)
  const settlements = settleDebts(balances)

  function refresh() {
    setVersion((v) => v + 1)
  }

  function nameFor(idOrEmail) {
    if (idOrEmail === user.id) return 'You'
    // Pending members are keyed by email in balances/splits, so match either.
    const m = group.members.find(
      (x) => x.userId === idOrEmail || x.email === idOrEmail
    )
    // After a pending member registers, their old splits still hold their email.
    // Resolve through the member record so the current user still sees "You".
    if (m?.userId === user.id) return 'You'
    return m?.name || m?.email || 'Someone'
  }

  function handleDelete(expenseId) {
    if (!confirm('Delete this expense? It will no longer count toward balances.')) return
    storage.softDeleteExpense(expenseId)
    refresh()
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt - a.createdAt
  })

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="page py-8 space-y-8">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
          >
            ← Back to dashboard
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold tracking-tight text-ink">{group.name}</h1>
            <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
              Add expense
            </button>
          </div>
        </div>

        <BalanceSummary
          settlements={settlements}
          currentUserId={user.id}
          nameFor={nameFor}
        />

        <Members members={group.members} />

        <Expenses
          expenses={sortedExpenses}
          nameFor={nameFor}
          onDelete={handleDelete}
          currentUserId={user.id}
          onEdit={(e) => setEditingExpense(e)}
        />
      </main>

      {(showModal || editingExpense) && (
        <AddExpenseModal
          group={group}
          currentUserId={user.id}
          existingExpense={editingExpense}
          onClose={() => {
            setShowModal(false)
            setEditingExpense(null)
          }}
          onSaved={() => {
            setShowModal(false)
            setEditingExpense(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function BalanceSummary({ settlements, currentUserId, nameFor }) {
  if (settlements.length === 0) {
    return (
      <section className="card">
        <SectionLabel>Balances</SectionLabel>
        <p className="mt-3 text-sm text-ink-muted">All settled up.</p>
      </section>
    )
  }

  const involves = settlements.filter(
    (s) => s.from === currentUserId || s.to === currentUserId
  )
  const others = settlements.filter(
    (s) => s.from !== currentUserId && s.to !== currentUserId
  )

  return (
    <section className="card">
      <SectionLabel>Balances</SectionLabel>
      {involves.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {involves.map((s, i) => {
            const youOwe = s.from === currentUserId
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-base text-ink">
                  {youOwe ? (
                    <>
                      You owe <span className="font-semibold">{nameFor(s.to)}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{nameFor(s.from)}</span> owes you
                    </>
                  )}
                </span>
                <span
                  className={`text-2xl font-extrabold tabular-nums ${
                    youOwe ? 'text-neg' : 'text-pos'
                  }`}
                >
                  {formatCurrency(s.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {others.length > 0 && (
        <>
          {involves.length > 0 && <div className="my-4 border-t border-line" />}
          <ul className="space-y-1.5">
            {others.map((s, i) => (
              <li
                key={`o${i}`}
                className="flex items-center justify-between gap-3 text-sm text-ink-muted"
              >
                <span>
                  {nameFor(s.from)} owes {nameFor(s.to)}
                </span>
                <span className="tabular-nums">{formatCurrency(s.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Members({ members }) {
  return (
    <section className="card">
      <SectionLabel>Members ({members.length})</SectionLabel>
      <ul className="mt-3 flex flex-wrap gap-2">
        {members.map((m) => (
          <li
            key={m.email}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3"
          >
            <Avatar name={m.name} email={m.email} />
            <span className="text-sm text-ink">{m.name || m.email}</span>
            {m.status === 'pending' && <span className="badge-pending">pending</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Expenses({ expenses, nameFor, onDelete, currentUserId, onEdit }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <SectionLabel>Expenses</SectionLabel>
        <span className="text-xs text-ink-muted">
          {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {expenses.length === 0 ? (
        <p className="mt-8 mb-4 text-center text-sm text-ink-muted">
          No expenses yet. Add the first one to get started.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{e.description}</div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {nameFor(e.paidBy)} paid · {formatDate(e.date)}
                </div>
                {e.splits && e.splits.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                    {e.splits.map((split) => (
                      <span key={split.userId}>
                        {nameFor(split.userId)}: <span className="font-medium text-ink">{formatCurrency(split.amount)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-base font-bold tabular-nums text-ink">
                {formatCurrency(e.amount)}
              </span>
              {(e.createdBy === currentUserId || (!e.createdBy && e.paidBy === currentUserId)) && (
                <button
                  onClick={() => onEdit(e)}
                  className="text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => onDelete(e.id)}
                className="text-xs text-ink-muted transition-colors hover:text-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">{children}</h2>
  )
}
