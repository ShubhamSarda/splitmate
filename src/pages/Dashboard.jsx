import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { storage } from "../data/storage";
import { userBalanceInGroup } from "../lib/balances";
import { formatCurrency } from "../lib/format";
import AppHeader from "../components/AppHeader";

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();

  // Re-derive data whenever the component mounts/re-mounts (e.g. navigating
  // back from GroupDetail after a settlement). location.key changes on every
  // navigation so the memo always re-runs when the page becomes active.
  const data = useMemo(() => {
    const groups = storage.getGroupsForUser(user.id);
    const cards = groups.map((g) => {
      const expenses = storage.getActiveExpensesForGroup(g.id);
      const settlements = storage.getSettlementsForGroup(g.id);
      const balance = userBalanceInGroup(
        expenses,
        g.members,
        user.id,
        settlements,
      );
      return { group: g, balance };
    });
    let owed = 0;
    let owe = 0;
    for (const c of cards) {
      if (c.balance > 0) owed += c.balance;
      else if (c.balance < 0) owe += -c.balance;
    }
    return { cards, owed, owe, net: owed - owe };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, location.key]); // location.key is a cache-buster: forces re-read from storage on every navigation

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="page py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Your groups
          </h1>
          {data.cards.length > 0 && (
            <Link to="/group/new" className="btn-primary gap-2">
              <Plus size={16} />
              Create group
            </Link>
          )}
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary
            label="Total owed to you"
            value={data.owed}
            tone="positive"
          />
          <Summary label="Total you owe" value={data.owe} tone="negative" />
          <Summary label="Net balance" value={data.net} tone="net" />
        </section>

        {data.cards.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="space-y-2">
            {data.cards.map(({ group, balance }) => (
              <GroupCard key={group.id} group={group} balance={balance} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function Summary({ label, value, tone }) {
  let color = "text-ink";
  let display = formatCurrency(value);
  if (tone === "net") {
    if (value > 0.01) {
      color = "text-pos";
      display = `+${formatCurrency(value)}`;
    } else if (value < -0.01) {
      color = "text-neg";
    }
  } else if (tone === "positive" && value > 0.01) {
    color = "text-pos";
  } else if (tone === "negative" && value > 0.01) {
    color = "text-neg";
  }

  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-extrabold tabular-nums ${color}`}>
        {display}
      </div>
    </div>
  );
}

function GroupCard({ group, balance }) {
  let pillClass = "pill-mute";
  let pillText = "Settled";
  if (balance > 0.01) {
    pillClass = "pill-pos";
    pillText = `+${formatCurrency(balance)}`;
  } else if (balance < -0.01) {
    pillClass = "pill-neg";
    pillText = formatCurrency(balance);
  }

  let helper = "All settled";
  if (balance > 0.01) helper = "You're owed";
  else if (balance < -0.01) helper = "You owe";

  return (
    <Link
      to={`/group/${group.id}`}
      className="card flex items-center justify-between transition-colors hover:bg-canvas"
    >
      <div>
        <h3 className="text-lg font-semibold text-ink">{group.name}</h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          {group.members.length}{" "}
          {group.members.length === 1 ? "member" : "members"}
          {balance !== 0 && <span className="text-ink-muted"> · {helper}</span>}
        </p>
      </div>
      <span className={pillClass}>{pillText}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card">
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold text-ink">No groups yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Create your first group to start tracking shared expenses.
        </p>
        <Link to="/group/new" className="btn-primary mt-6 inline-flex gap-2">
          <Plus size={16} />
          Create group
        </Link>
      </div>
    </div>
  );
}
