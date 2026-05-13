import { useState, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PlusCircle, Settings } from "lucide-react";
import { Download } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { storage } from "../data/storage";
import { downloadGroupHistory } from "../utils/groupExport";
import { calculateNetBalances, settleDebts } from "../lib/balances";
import { formatCurrency, formatDate } from "../lib/format";
import AppHeader from "../components/AppHeader";
import AddExpenseModal from "../components/AddExpenseModal";
import Avatar from "../components/Avatar";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setVersion] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const group = storage.getGroupById(id);
  const isMember = group?.members.some((m) => m.userId === user.id);

  useEffect(() => {
    if (group?.name) document.title = `${group.name} | Splitmate`;
  }, [group?.name]);

  if (!group) return <Navigate to="/dashboard" replace />;
  if (!isMember) return <Navigate to="/dashboard" replace />;

  const expenses = storage.getActiveExpensesForGroup(group.id);
  const groupSettlements = storage.getSettlementsForGroup(group.id);
  const balances = calculateNetBalances(
    expenses,
    group.members,
    groupSettlements,
  );
  const settlements = settleDebts(balances);

  function refresh() {
    setVersion((v) => v + 1);
  }

  function nameFor(idOrEmail) {
    if (idOrEmail === user.id) return "You";
    // Pending members are keyed by email in balances/splits, so match either.
    const m = group.members.find(
      (x) => x.userId === idOrEmail || x.email === idOrEmail,
    );
    // After a pending member registers, their old splits still hold their email.
    // Resolve through the member record so the current user still sees "You".
    if (m?.userId === user.id) return "You";
    return m?.name || m?.email || "Someone";
  }

  function handleDelete(expenseId) {
    if (
      !confirm("Delete this expense? It will no longer count toward balances.")
    )
      return;
    storage.softDeleteExpense(expenseId);
    refresh();
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="page-app py-8">
        {/* Page header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
          >
            ← Back to dashboard
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {group.name}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              {group.createdBy === user.id && (
                <Link
                  to={`/group/${id}/settings`}
                  className="btn-secondary gap-2"
                >
                  <Settings size={16} />
                  Settings
                </Link>
              )}
              <button
                onClick={() => downloadGroupHistory(group.id, group.name)}
                disabled={expenses.length === 0}
                title={
                  expenses.length === 0
                    ? "No expenses to export"
                    : "Download CSV"
                }
                className="btn-secondary gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={16} />
                Export
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary gap-2"
              >
                <PlusCircle size={16} />
                Add expense
              </button>
            </div>
          </div>
        </div>

        {/* Two-column layout: expenses left (wider), balance+members right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          {/* Left column — expenses, DOM-first so mobile stacks correctly */}
          <div className="lg:col-span-3">
            <Expenses
              expenses={sortedExpenses}
              nameFor={nameFor}
              onDelete={handleDelete}
              currentUserId={user.id}
              onEdit={(e) => setEditingExpense(e)}
            />
          </div>

          {/* Right column — balance summary on top, members below */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {group.budget > 0 && (
              <BudgetCard expenses={expenses} budget={group.budget} />
            )}
            <BalanceSummary
              settlements={settlements}
              currentUserId={user.id}
              nameFor={nameFor}
              groupId={group.id}
              onSettle={refresh}
            />
            <Members members={group.members} />
          </div>
        </div>
      </main>

      {(showModal || editingExpense) && (
        <AddExpenseModal
          group={group}
          currentUserId={user.id}
          existingExpense={editingExpense}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingExpense(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function BudgetCard({ expenses, budget }) {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;
  const pct = Math.min((totalSpent / budget) * 100, 100);
  const isOverBudget = totalSpent > budget;

  return (
    <section className="card space-y-3">
      <SectionLabel>Budget</SectionLabel>
      <p className="text-sm text-ink-soft">
        <span className="font-semibold tabular-nums text-ink">
          {formatCurrency(totalSpent)}
        </span>{" "}
        spent of {formatCurrency(budget)}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: isOverBudget
              ? "var(--color-neg)"
              : "var(--color-brand)",
          }}
        />
      </div>
      <p
        className={`text-sm font-medium ${isOverBudget ? "text-neg" : "text-pos"}`}
      >
        {isOverBudget
          ? `Over budget by ${formatCurrency(Math.abs(remaining))}`
          : `${formatCurrency(remaining)} remaining`}
      </p>
    </section>
  );
}

function BalanceSummary({
  settlements,
  currentUserId,
  nameFor,
  groupId,
  onSettle,
}) {
  const [settling, setSettling] = useState(null);

  async function handleSettle(s, i) {
    setSettling(i);
    try {
      await storage.recordSettlement(groupId, s.from, s.to, s.amount);
      onSettle();
    } catch (err) {
      console.error("recordSettlement failed", err);
      alert("Could not record settlement. Please try again.");
    } finally {
      setSettling(null);
    }
  }

  if (settlements.length === 0) {
    return (
      <section className="card">
        <SectionLabel>Balances</SectionLabel>
        <p className="mt-3 text-sm text-ink-muted">All settled up.</p>
      </section>
    );
  }

  const involves = settlements.filter(
    (s) => s.from === currentUserId || s.to === currentUserId,
  );
  const others = settlements.filter(
    (s) => s.from !== currentUserId && s.to !== currentUserId,
  );

  return (
    <section className="card">
      <SectionLabel>Balances</SectionLabel>

      {involves.length > 0 && (
        <ul className="mt-3 space-y-2">
          {involves.map((s, i) => {
            const youOwe = s.from === currentUserId;
            const isSettling = settling === i;
            return (
              <li
                key={i}
                className={`rounded-lg px-3.5 py-3 ${
                  youOwe ? "bg-neg-bg" : "bg-pos-bg"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={`text-sm font-medium ${
                      youOwe ? "text-neg" : "text-pos"
                    }`}
                  >
                    {youOwe ? (
                      <>
                        You owe{" "}
                        <span className="font-semibold">{nameFor(s.to)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{nameFor(s.from)}</span>{" "}
                        owes you
                      </>
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-[17px] font-extrabold tabular-nums ${
                        youOwe ? "text-neg" : "text-pos"
                      }`}
                    >
                      {youOwe ? "−" : "+"}
                      {formatCurrency(s.amount)}
                    </span>
                    <button
                      onClick={() => handleSettle(s, i)}
                      disabled={isSettling}
                      className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-50"
                    >
                      {isSettling ? "Saving…" : "Settle up"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {others.length > 0 && (
        <>
          {involves.length > 0 && (
            <div className="my-3.5 border-t border-line" />
          )}
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Others
          </p>
          <ul className="space-y-2">
            {others.map((s, i) => (
              <li
                key={`o${i}`}
                className="flex items-center justify-between gap-3 text-sm text-ink-muted"
              >
                <span>
                  {nameFor(s.from)} owes {nameFor(s.to)}
                </span>
                <span className="tabular-nums font-medium text-ink-soft">
                  {formatCurrency(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Members({ members }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <SectionLabel>Members</SectionLabel>
        <span className="text-xs text-ink-muted">{members.length}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {members.map((m) => (
          <li
            key={m.email}
            className="flex items-center justify-between gap-2 py-0.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={m.name} email={m.email} />
              <span className="truncate text-sm text-ink">
                {m.name || m.email}
              </span>
            </div>
            {m.status === "pending" && (
              <span className="badge-pending shrink-0">pending</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Expenses({ expenses, nameFor, onDelete, currentUserId, onEdit }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <SectionLabel>Expenses</SectionLabel>
        <span className="text-xs text-ink-muted">
          {expenses.length} {expenses.length === 1 ? "item" : "items"}
        </span>
      </div>

      {expenses.length === 0 ? (
        <p className="mb-4 mt-8 text-center text-sm text-ink-muted">
          No expenses yet. Add the first one to get started.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {expenses.map((e) => (
            <li key={e.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                {/* Left: description, meta, splits */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[15px] font-semibold leading-snug text-ink">
                      {e.description}
                    </span>
                    {e.category && (
                      <span className="shrink-0 rounded-full border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                        {e.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {nameFor(e.paidBy)} paid · {formatDate(e.date)}
                  </p>
                  {e.notes && (
                    <p className="mt-0.5 text-xs italic text-ink-muted">
                      {e.notes}
                    </p>
                  )}
                  {e.splits && e.splits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                      {e.splits.map((split) => (
                        <span
                          key={split.userId}
                          className="text-xs text-ink-muted"
                        >
                          {nameFor(split.userId)}:{" "}
                          <span className="font-medium tabular-nums text-ink-soft">
                            {formatCurrency(split.amount)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: amount + actions */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[17px] font-bold tabular-nums text-ink">
                    {formatCurrency(e.amount)}
                  </span>
                  <div className="flex items-center gap-2">
                    {(e.createdBy === currentUserId ||
                      (!e.createdBy && e.paidBy === currentUserId)) && (
                      <button
                        onClick={() => onEdit(e)}
                        className="text-[11px] text-ink-muted transition-colors hover:text-ink"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(e.id)}
                      className="text-[11px] text-ink-muted transition-colors hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </h2>
  );
}
