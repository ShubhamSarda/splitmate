import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { storage } from "../data/storage";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";

export default function GroupSettings() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setVersion] = useState(0);

  const group = storage.getGroupById(id);

  // Redirect non-members to dashboard and non-admins back to group page
  if (!group) return <Navigate to="/dashboard" replace />;
  const isMember = group.members.some((m) => m.userId === user.id);
  if (!isMember) return <Navigate to="/dashboard" replace />;
  if (group.createdBy !== user.id)
    return <Navigate to={`/group/${id}`} replace />;

  function refresh() {
    setVersion((v) => v + 1);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <title>Group Settings | Splitmate</title>
      <AppHeader />
      <main className="page-app py-8 space-y-8">
        <div>
          <Link
            to={`/group/${id}`}
            className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
          >
            ← Back to group
          </Link>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-ink">
            Group settings
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{group.name}</p>
        </div>

        <RenameSection group={group} onRenamed={refresh} />
        <BudgetSection group={group} onUpdate={refresh} />
        <AddMemberSection group={group} onAdded={refresh} />
        <MembersSection
          group={group}
          currentUserId={user.id}
          onRemoved={refresh}
        />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rename section
// ---------------------------------------------------------------------------

function RenameSection({ group, onRenamed }) {
  const [name, setName] = useState(group.name);
  const [status, setStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Group name cannot be empty.");
      setStatus("error");
      return;
    }
    if (trimmed === group.name) {
      setStatus("success");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    try {
      await storage.renameGroup(group.id, trimmed);
      setStatus("success");
      onRenamed();
    } catch (err) {
      setErrorMsg(err.message || "Failed to rename group. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="card space-y-4">
      <SectionLabel>Rename group</SectionLabel>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="field-label">Group name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus(null);
            }}
            className="field"
          />
        </label>
        {status === "error" && (
          <p className="text-sm text-danger">{errorMsg}</p>
        )}
        {status === "success" && (
          <p className="text-sm text-pos">Group renamed successfully.</p>
        )}
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn-primary disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save name"}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Budget section
// ---------------------------------------------------------------------------

function BudgetSection({ group, onUpdate }) {
  const [budgetValue, setBudgetValue] = useState(
    group.budget != null ? String(group.budget) : "",
  );
  const [status, setStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(budgetValue);
    const normalized =
      budgetValue.trim() === "" || isNaN(parsed) || parsed <= 0 ? null : parsed;
    setStatus("saving");
    setErrorMsg("");
    try {
      await storage.updateGroupBudget(group.id, normalized);
      setStatus("success");
      onUpdate();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update budget. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="card space-y-4">
      <SectionLabel>Budget</SectionLabel>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="field-label">
            Total budget{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input
            type="number"
            min="0"
            step="any"
            value={budgetValue}
            onChange={(e) => {
              setBudgetValue(e.target.value);
              setStatus(null);
            }}
            placeholder="e.g. 20000"
            className="field"
          />
        </label>
        <p className="text-sm text-ink-muted">
          Leave empty to remove the budget.
        </p>
        {status === "error" && (
          <p className="text-sm text-danger">{errorMsg}</p>
        )}
        {status === "success" && (
          <p className="text-sm text-pos">Budget updated successfully.</p>
        )}
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn-primary disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save budget"}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Add member section
// ---------------------------------------------------------------------------

function AddMemberSection({ group, onAdded }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [addedEmail, setAddedEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg("Please enter an email address.");
      setStatus("error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    try {
      await storage.addMember(group.id, trimmed);
      setAddedEmail(trimmed);
      setEmail("");
      setStatus("success");
      onAdded();
    } catch (err) {
      setErrorMsg(err.message || "Failed to add member. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="card space-y-4">
      <SectionLabel>Add member</SectionLabel>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="field-label">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus(null);
            }}
            placeholder="friend@example.com"
            className="field"
          />
        </label>
        {status === "error" && (
          <p className="text-sm text-danger">{errorMsg}</p>
        )}
        {status === "success" && (
          <p className="text-sm text-pos">
            {addedEmail} added to the group.
          </p>
        )}
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn-primary disabled:opacity-60"
        >
          {status === "saving" ? "Adding…" : "Add member"}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Members section
// ---------------------------------------------------------------------------

function MembersSection({ group, currentUserId, onRemoved }) {
  // All expenses (including soft-deleted) for this group are needed to check
  // involvement. The in-memory cache only holds active expenses, so we read
  // those. Soft-deleted expenses were already spliced out of _expenses on
  // delete, but their data was preserved in Supabase. To be conservative we
  // check ALL expenses currently in the cache for this group (active only),
  // which is the data available to us without an extra Supabase round-trip.
  // If a member was only involved in soft-deleted expenses they technically
  // have no live financial ties, so allowing removal is correct.
  const expenses = storage.getActiveExpensesForGroup(group.id);

  // Build a set of member keys (UUID or email) that are involved in expenses.
  const involvedKeys = new Set();
  for (const exp of expenses) {
    if (exp.paidBy) involvedKeys.add(exp.paidBy);
    for (const split of exp.splits ?? []) {
      if (split.userId) involvedKeys.add(split.userId);
    }
  }

  // Members to display — everyone except the admin (current user).
  const nonAdminMembers = group.members.filter(
    (m) => m.userId !== currentUserId,
  );

  return (
    <section className="card space-y-4">
      <SectionLabel>Members</SectionLabel>
      {nonAdminMembers.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No other members in this group.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {nonAdminMembers.map((m) => {
            // A pending member's key in splits/paidBy is their email string;
            // an active member's key is their userId UUID.
            const key = m.userId ?? m.email;
            const hasExpenses = involvedKeys.has(key);
            return (
              <MemberRow
                key={m.email}
                member={m}
                groupId={group.id}
                hasExpenses={hasExpenses}
                onRemoved={onRemoved}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MemberRow({ member, groupId, hasExpenses, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const displayName = member.name || member.email;
  // The identifier used to find the member in the DB and cache.
  const memberId = member.userId ?? member.email;

  async function handleRemove() {
    if (
      !confirm(
        `Remove ${displayName} from this group? They will lose access immediately.`,
      )
    )
      return;
    setRemoving(true);
    setError("");
    try {
      await storage.removeMember(groupId, memberId);
      onRemoved();
    } catch (err) {
      setError(err.message || "Failed to remove member.");
      setRemoving(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar name={member.name} email={member.email} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {displayName}
        </div>
        {member.name && (
          <div className="truncate text-xs text-ink-muted">{member.email}</div>
        )}
        {error && <div className="mt-0.5 text-xs text-danger">{error}</div>}
      </div>
      {member.status === "pending" && (
        <span className="badge-pending shrink-0">pending</span>
      )}
      {hasExpenses ? (
        <span className="shrink-0 text-xs text-ink-muted">
          Cannot remove — member has existing expenses.
        </span>
      ) : (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="btn-danger shrink-0 py-1.5 text-xs disabled:opacity-60"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      )}
    </li>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </h2>
  );
}
