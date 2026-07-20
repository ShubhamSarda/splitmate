import { useEffect, useMemo, useState } from "react";
import { storage, CATEGORIES } from "../data/storage";
import { todayISO, formatCurrency } from "../lib/format";

// Distribute the remainder cent across the first members so the splits
// sum to exactly the total — same approach as storage.buildEqualSplits.
function equalSplitAmounts(total, n) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  return Array.from(
    { length: n },
    (_, i) => (base + (i < remainder ? 1 : 0)) / 100,
  );
}

// Pending members have no userId — fall back to email so they can still own a
// share. Owing money is independent of having registered.
const memberKey = (m) => m.userId || m.email;
const memberLabel = (m) => m.name || m.email;

export default function AddExpenseModal({
  group,
  currentUserId,
  onClose,
  onSaved,
  existingExpense,
}) {
  const activeMembers = group.members.filter(
    (m) => m.status === "active" && m.userId,
  );
  const splitMembers = group.members;

  const [description, setDescription] = useState(
    existingExpense?.description ?? "",
  );
  const [amount, setAmount] = useState(
    existingExpense ? String(existingExpense.amount) : "",
  );
  const [date, setDate] = useState(existingExpense?.date ?? todayISO());
  const [paidBy, setPaidBy] = useState(
    existingExpense?.paidBy ?? currentUserId,
  );
  const [splitMode, setSplitMode] = useState(
    existingExpense?.splitMode ?? "equal",
  );
  const [shared, setShared] = useState(() => {
    if (!existingExpense?.splits) {
      return Object.fromEntries(splitMembers.map((m) => [memberKey(m), true]));
    }
    // Split entries may use email as key (if member was pending when expense was created).
    const splitKeys = new Set(existingExpense.splits.map((s) => s.userId));
    return Object.fromEntries(
      splitMembers.map((m) => [
        memberKey(m),
        splitKeys.has(memberKey(m)) || splitKeys.has(m.email),
      ]),
    );
  });
  // Manual amounts as strings keyed by userId. Kept independent of `shared`
  // so unchecking + re-checking doesn't clobber a user's previously typed value.
  const [manual, setManual] = useState(() => {
    if (!existingExpense?.splits || existingExpense.splitMode !== "manual")
      return {};
    const splitMap = Object.fromEntries(
      existingExpense.splits.map((s) => [s.userId, s.amount]),
    );
    const out = {};
    for (const m of splitMembers) {
      const key = memberKey(m);
      const val = splitMap[key] ?? splitMap[m.email];
      if (val != null) out[key] = String(val);
    }
    return out;
  });
  const [category, setCategory] = useState(
    existingExpense?.category ?? "Other",
  );
  const [notes, setNotes] = useState(existingExpense?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const numericAmount = parseFloat(amount);
  const validAmount = !isNaN(numericAmount) && numericAmount > 0;
  const sharedIds = useMemo(
    () => splitMembers.filter((m) => shared[memberKey(m)]).map(memberKey),
    [splitMembers, shared],
  );

  const equalAmounts = useMemo(() => {
    if (!validAmount || sharedIds.length === 0) return {};
    const arr = equalSplitAmounts(numericAmount, sharedIds.length);
    return Object.fromEntries(sharedIds.map((id, i) => [id, arr[i]]));
  }, [validAmount, numericAmount, sharedIds]);

  const manualSum = useMemo(() => {
    let sum = 0;
    for (const id of sharedIds) {
      const v = parseFloat(manual[id]);
      if (!isNaN(v)) sum += v;
    }
    return sum;
  }, [manual, sharedIds]);

  const manualRemaining = validAmount ? numericAmount - manualSum : 0;
  const manualMatches = validAmount && Math.abs(manualRemaining) < 0.005;

  function toggleShared(userId) {
    setShared((prev) => {
      const next = { ...prev, [userId]: !prev[userId] };
      return next;
    });
    if (splitMode === "manual") {
      // Clear stale manual value when unchecking; re-checks start fresh.
      setManual((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  }

  function switchToManual() {
    if (splitMode === "manual") return;
    // Prefill manual inputs with the current equal split so users start from
    // a balanced state and can tweak from there.
    if (validAmount && sharedIds.length > 0) {
      const arr = equalSplitAmounts(numericAmount, sharedIds.length);
      setManual(
        Object.fromEntries(sharedIds.map((id, i) => [id, arr[i].toFixed(2)])),
      );
    } else {
      setManual({});
    }
    setSplitMode("manual");
    setError("");
  }

  function switchToEqual() {
    if (splitMode === "equal") return;
    const hasInput = Object.values(manual).some((v) => v !== "" && v != null);
    if (hasInput && !confirm("Discard custom amounts and split equally?"))
      return;
    setManual({});
    setSplitMode("equal");
    setError("");
  }

  function setManualFor(userId, value) {
    setManual((prev) => ({ ...prev, [userId]: value }));
  }

  function distributeRemainder() {
    if (!validAmount || sharedIds.length === 0) return;
    // Spread the leftover (positive or negative) across selected rows so the
    // total lands exactly on the expense amount.
    const cents = Math.round(numericAmount * 100);
    const currentCents = sharedIds.map((id) => {
      const v = parseFloat(manual[id]);
      return isNaN(v) ? 0 : Math.round(v * 100);
    });
    const currentSum = currentCents.reduce((a, b) => a + b, 0);
    let diff = cents - currentSum;
    const next = [...currentCents];
    let i = 0;
    while (diff !== 0) {
      const step = diff > 0 ? 1 : -1;
      next[i % next.length] += step;
      diff -= step;
      i++;
    }
    setManual((prev) => {
      const out = { ...prev };
      sharedIds.forEach((id, idx) => {
        out[id] = (next[idx] / 100).toFixed(2);
      });
      return out;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!description.trim()) return setError("Description is required.");
    if (!validAmount) return setError("Enter an amount greater than 0.");
    if (!sharedIds.length)
      return setError("Pick at least one person to split with.");

    let splits;
    if (splitMode === "equal") {
      const arr = equalSplitAmounts(numericAmount, sharedIds.length);
      splits = sharedIds.map((userId, i) => ({ userId, amount: arr[i] }));
    } else {
      for (const id of sharedIds) {
        const raw = manual[id];
        const v = parseFloat(raw);
        if (raw === "" || raw == null || isNaN(v) || v < 0) {
          return setError("Each person needs a non-negative amount.");
        }
      }
      if (!manualMatches) {
        return setError(
          `Splits add up to ${formatCurrency(manualSum)}, expected ${formatCurrency(numericAmount)}.`,
        );
      }
      splits = sharedIds.map((userId) => ({
        userId,
        amount: parseFloat(manual[userId]),
      }));
      if (!splits.some((s) => s.amount > 0)) {
        return setError("At least one person must owe more than 0.");
      }
    }

    if (existingExpense) {
      storage.softDeleteExpense(existingExpense.id);
    }
    storage.createExpense({
      groupId: group.id,
      description,
      amount: numericAmount,
      paidBy,
      date,
      splits,
      splitMode,
      category,
      notes,
      createdBy: existingExpense?.createdBy ?? currentUserId,
    });
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl bg-surface p-6 dark:border dark:border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-ink">
            {existingExpense ? "Edit expense" : "Add expense"}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-muted transition-colors hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="field-label">What was it for?</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, cab, groceries…"
              autoFocus
              className="field"
            />
          </label>

          <label className="block">
            <span className="field-label">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">
              Notes{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details…"
              rows={2}
              className="field resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="field tabular-nums"
              />
            </label>
            <label className="block">
              <span className="field-label">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field"
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Paid by</span>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="field"
            >
              {activeMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userId === currentUserId ? `${m.name} (you)` : m.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="field-label">Split between</span>
              <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
                <button
                  type="button"
                  onClick={switchToEqual}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    splitMode === "equal"
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={switchToManual}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    splitMode === "manual"
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-line">
              {splitMembers.map((m, i) => {
                const key = memberKey(m);
                const checked = !!shared[key];
                const equalShown = checked && equalAmounts[key] != null;
                return (
                  <label
                    key={key}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleShared(key)}
                        className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                      />
                      <span className="text-ink">
                        {m.userId === currentUserId
                          ? `${memberLabel(m)} (you)`
                          : memberLabel(m)}
                      </span>
                    </span>
                    {splitMode === "equal" ? (
                      <span
                        className={`tabular-nums ${
                          equalShown ? "text-ink" : "text-ink-muted"
                        }`}
                      >
                        {equalShown ? formatCurrency(equalAmounts[key]) : "—"}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={checked ? (manual[key] ?? "") : ""}
                        onChange={(e) => setManualFor(key, e.target.value)}
                        disabled={!checked}
                        placeholder="0.00"
                        className="field tabular-nums w-24 py-1 text-right disabled:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {splitMode === "equal" && validAmount && sharedIds.length > 0 && (
              <p className="mt-2 text-xs text-ink-muted">
                Split equally ·{" "}
                {formatCurrency(numericAmount / sharedIds.length)} each
              </p>
            )}
            {splitMode === "manual" && validAmount && sharedIds.length > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={manualMatches ? "text-pos" : "text-ink-muted"}>
                  Assigned {formatCurrency(manualSum)} of{" "}
                  {formatCurrency(numericAmount)}
                  {!manualMatches && (
                    <span className="text-neg">
                      {" · "}
                      {manualRemaining > 0
                        ? `${formatCurrency(manualRemaining)} left`
                        : `${formatCurrency(-manualRemaining)} over`}
                    </span>
                  )}
                </span>
                {!manualMatches && (
                  <button
                    type="button"
                    onClick={distributeRemainder}
                    className="text-brand hover:underline"
                  >
                    Distribute remainder
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-neg-bg px-3 py-2 text-sm text-neg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {existingExpense ? "Save changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
