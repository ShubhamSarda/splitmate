import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { storage } from "../data/storage";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";

export default function CreateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [members, setMembers] = useState([]); // [{ email, registered, name? }]
  const [error, setError] = useState("");

  function addMember() {
    setError("");
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (email === user.email) {
      setError("You're added automatically — you don't need to add yourself.");
      return;
    }
    if (members.some((m) => m.email === email)) {
      setError("That email is already in the list.");
      return;
    }
    const existing = storage.getUserByEmail(email);
    setMembers((prev) => [
      ...prev,
      { email, registered: !!existing, name: existing?.name || null },
    ]);
    setEmailInput("");
  }

  function removeMember(email) {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    const parsedBudget = parseFloat(budget);
    const group = storage.createGroup({
      name,
      createdBy: user.id,
      memberEmails: members.map((m) => m.email),
      budget: !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : null,
    });
    navigate(`/group/${group.id}`);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <title>New Group | Splitmate</title>
      <AppHeader />
      <main className="page-app py-8 space-y-8">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-ink-muted transition-colors hover:text-ink-soft"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-ink">
            New group
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card space-y-5">
            <label className="block">
              <span className="field-label">Group name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Goa trip, Apartment 3B…"
                autoFocus
                className="field"
              />
            </label>

            <label className="block">
              <span className="field-label">
                Budget{" "}
                <span className="font-normal text-ink-muted">(optional)</span>
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 20000"
                className="field"
              />
            </label>

            <div>
              <span className="field-label">Add members by email</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                  placeholder="friend@example.com"
                  className="field"
                />
                <button
                  type="button"
                  onClick={addMember}
                  className="btn-secondary shrink-0"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Unregistered emails are saved as pending — they get access
                automatically when they sign up.
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Members
            </h2>
            <ul className="mt-3 divide-y divide-line">
              <MemberRow
                name={`${user.name} (you)`}
                email={user.email}
                status="active"
              />
              {members.map((m) => (
                <MemberRow
                  key={m.email}
                  name={m.name || m.email}
                  email={m.name ? m.email : null}
                  status={m.registered ? "active" : "pending"}
                  onRemove={() => removeMember(m.email)}
                />
              ))}
            </ul>
          </div>

          {error && (
            <div className="rounded-lg bg-neg-bg px-3 py-2 text-sm text-neg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary">
              Create group
            </button>
            <Link to="/dashboard" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

function MemberRow({ name, email, status, onRemove }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar name={name} email={email || name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{name}</div>
        {email && (
          <div className="truncate text-xs text-ink-muted">{email}</div>
        )}
      </div>
      <span className={status === "active" ? "badge-active" : "badge-pending"}>
        {status}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-ink-muted transition-colors hover:text-danger"
        >
          Remove
        </button>
      )}
    </li>
  );
}
