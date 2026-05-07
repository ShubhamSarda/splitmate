import { supabase } from "../lib/supabase";

export const CATEGORIES = [
  "Food & Drinks",
  "Transport",
  "Accommodation",
  "Activities",
  "Shopping",
  "Utilities",
  "Other",
];

// ---------------------------------------------------------------------------
// In-memory cache — components read synchronously; all writes go to Supabase
// in the background via fire-and-forget async helpers.
// ---------------------------------------------------------------------------
let _users = [];
let _groups = [];
let _expenses = []; // only non-deleted; softDeleteExpense splices in place
let _settlements = [];

// Tracks in-flight _persistGroup promises so _persistExpense can await the
// parent group write before inserting (prevents FK constraint failures when
// both writes race to the DB after an immediate createGroup → createExpense).
const _pendingGroupWrites = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUUID(str) {
  return (
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  );
}

function toGroup(row) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).getTime(),
    members: (row.group_members ?? []).map((m) => ({
      userId: m.user_id,
      email: m.email,
      name: m.name,
      status: m.status,
    })),
  };
}

function toExpense(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    paidBy: row.paid_by,
    date: row.date,
    splitMode: row.split_mode,
    category: row.category,
    notes: row.notes ?? "",
    createdBy: row.created_by,
    isDeleted: row.is_deleted,
    createdAt: new Date(row.created_at).getTime(),
    // pending members have user_id = null in the DB; use their email as the
    // split key so balances.js can match them to the group member record.
    splits: (row.expense_splits ?? []).map((s) => ({
      userId: s.user_id ?? s.email,
      amount: Number(s.amount),
    })),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const storage = {
  // Loads all data for `userId` from Supabase into the cache.
  // AuthProvider awaits this before setting ready = true.
  async init(userId) {
    if (!userId) return;

    // All users visible to this account (permissive RLS allows lookup for invites)
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email");
    _users = users ?? [];

    // Groups this user is a member of
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    const groupIds = (memberships ?? []).map((m) => m.group_id);

    if (groupIds.length === 0) {
      _groups = [];
      _expenses = [];
      _settlements = [];
      return;
    }

    // Groups with all their members in one query
    const { data: groups } = await supabase
      .from("groups")
      .select(
        "id, name, created_by, created_at, group_members(user_id, email, name, status)",
      )
      .in("id", groupIds);
    _groups = (groups ?? []).map(toGroup);

    // Non-deleted expenses with splits in one query
    const { data: expenses } = await supabase
      .from("expenses")
      .select(
        "id, group_id, description, amount, paid_by, date, split_mode, category, notes, created_by, is_deleted, created_at, expense_splits(user_id, email, amount)",
      )
      .in("group_id", groupIds)
      .eq("is_deleted", false);
    _expenses = (expenses ?? []).map(toExpense);

    // Settlements for all groups the user belongs to
    const { data: settlements } = await supabase
      .from("settlements")
      .select("id, group_id, paid_by, paid_to, amount, settled_at")
      .in("group_id", groupIds);
    _settlements = (settlements ?? []).map((r) => ({
      id: r.id,
      groupId: r.group_id,
      paidBy: r.paid_by,
      paidTo: r.paid_to,
      amount: Number(r.amount),
      settledAt: new Date(r.settled_at).getTime(),
    }));
  },

  // Called on logout to wipe cached data.
  clear() {
    _users = [];
    _groups = [];
    _expenses = [];
    _settlements = [];
  },

  // ---------- Users ----------
  getUsers() {
    return _users;
  },
  getUserById(id) {
    return _users.find((u) => u.id === id) || null;
  },
  getUserByEmail(email) {
    const e = email.trim().toLowerCase();
    return _users.find((u) => u.email === e) || null;
  },

  // ---------- Session — no-ops; Supabase Auth owns the session ----------
  getCurrentUserId() {
    return null;
  },
  setCurrentUserId() {},

  // ---------- Groups ----------
  getGroups() {
    return _groups;
  },
  getGroupById(id) {
    return _groups.find((g) => g.id === id) || null;
  },
  getGroupsForUser(userId) {
    return _groups.filter((g) => g.members.some((m) => m.userId === userId));
  },

  createGroup({ name, createdBy, memberEmails }) {
    const creator = this.getUserById(createdBy);
    if (!creator) throw new Error("Creator not found");

    const seen = new Set([creator.email]);
    const members = [
      {
        userId: creator.id,
        email: creator.email,
        name: creator.name,
        status: "active",
      },
    ];
    for (const rawEmail of memberEmails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const existing = this.getUserByEmail(email);
      members.push(
        existing
          ? {
              userId: existing.id,
              email: existing.email,
              name: existing.name,
              status: "active",
            }
          : { userId: null, email, name: null, status: "pending" },
      );
    }

    const group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdBy,
      createdAt: Date.now(),
      members,
    };
    _groups.push(group);
    const p = this._persistGroup(group).catch((e) =>
      console.error("_persistGroup failed", e),
    );
    _pendingGroupWrites.set(group.id, p);
    p.finally(() => _pendingGroupWrites.delete(group.id));
    return group;
  },

  async _persistGroup(group) {
    const { error: gErr } = await supabase.from("groups").insert({
      id: group.id,
      name: group.name,
      created_by: group.createdBy,
      created_at: new Date(group.createdAt).toISOString(),
    });
    if (gErr) throw gErr;

    const rows = group.members.map((m) => ({
      group_id: group.id,
      user_id: m.userId,
      email: m.email,
      name: m.name,
      status: m.status,
    }));
    const { error: mErr } = await supabase.from("group_members").insert(rows);
    if (mErr) throw mErr;
  },

  // ---------- Expenses ----------
  getExpenses() {
    return _expenses;
  },
  // _expenses only holds non-deleted rows; no isDeleted filter needed.
  getActiveExpensesForGroup(groupId) {
    return _expenses.filter((e) => e.groupId === groupId);
  },

  createExpense({
    groupId,
    description,
    amount,
    paidBy,
    date,
    splits,
    splitMode,
    createdBy,
    category,
    notes,
  }) {
    const expense = {
      id: crypto.randomUUID(),
      groupId,
      description: description.trim(),
      amount: Number(amount),
      paidBy,
      date,
      splits: splits.map((s) => ({
        userId: s.userId,
        amount: Number(s.amount),
      })),
      splitMode,
      category: category ?? "Other",
      notes: notes?.trim() ?? "",
      createdBy: createdBy ?? paidBy,
      isDeleted: false,
      createdAt: Date.now(),
    };
    _expenses.push(expense);
    this._persistExpense(expense).catch(console.error);
    return expense;
  },

  async _persistExpense(expense) {
    // If this group's write is still in-flight, wait for it before inserting
    // the expense — the FK on expenses.group_id requires the group to exist first.
    const pendingGroup = _pendingGroupWrites.get(expense.groupId);
    if (pendingGroup) await pendingGroup;

    const { error: eErr } = await supabase.from("expenses").insert({
      id: expense.id,
      group_id: expense.groupId,
      description: expense.description,
      amount: expense.amount,
      paid_by: expense.paidBy,
      date: expense.date,
      split_mode: expense.splitMode,
      category: expense.category,
      notes: expense.notes,
      created_by: expense.createdBy,
      is_deleted: false,
      created_at: new Date(expense.createdAt).toISOString(),
    });
    if (eErr) throw eErr;

    const rows = expense.splits.map((s) => ({
      expense_id: expense.id,
      // A split's userId is either a UUID (registered member) or an email
      // string (pending member). Store accordingly.
      user_id: isUUID(s.userId) ? s.userId : null,
      email: isUUID(s.userId) ? null : s.userId,
      amount: s.amount,
    }));
    const { error: sErr } = await supabase.from("expense_splits").insert(rows);
    if (sErr) throw sErr;
  },

  softDeleteExpense(expenseId) {
    const idx = _expenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) _expenses.splice(idx, 1);

    supabase
      .from("expenses")
      .update({ is_deleted: true })
      .eq("id", expenseId)
      .then(({ error }) => {
        if (error) console.error("softDeleteExpense failed", error);
      });
  },

  // Rename a group — updates the `groups` table and the in-memory cache.
  async renameGroup(groupId, newName) {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error("Name cannot be empty.");

    const group = _groups.find((g) => g.id === groupId);
    if (!group) throw new Error("Group not found.");

    const { error } = await supabase
      .from("groups")
      .update({ name: trimmed })
      .eq("id", groupId);
    if (error) throw error;

    group.name = trimmed;
  },

  // Remove a member from a group — deletes from `group_members` and removes
  // from the in-memory cache.  Callers must verify the member has no expense
  // involvement before calling this.
  async removeMember(groupId, memberId) {
    const group = _groups.find((g) => g.id === groupId);
    if (!group) throw new Error("Group not found.");

    // memberId may be a UUID (active member) or an email string (pending member)
    const isUUIDMember = isUUID(memberId);

    const query = supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId);
    const { error } = isUUIDMember
      ? await query.eq("user_id", memberId)
      : await query.eq("email", memberId);
    if (error) throw error;

    group.members = group.members.filter((m) =>
      isUUIDMember ? m.userId !== memberId : m.email !== memberId,
    );
  },

  // ---------- Settlements ----------
  getSettlementsForGroup(groupId) {
    return _settlements.filter((s) => s.groupId === groupId);
  },

  // Records a settlement: the current user (paidBy) paid `amount` to `paidTo`.
  // Optimistically updates the cache, then persists to Supabase.
  async recordSettlement(groupId, paidBy, paidTo, amount) {
    const settlement = {
      id: crypto.randomUUID(),
      groupId,
      paidBy,
      paidTo,
      amount: Number(amount),
      settledAt: Date.now(),
    };
    _settlements.push(settlement);

    const { error } = await supabase.from("settlements").insert({
      id: settlement.id,
      group_id: settlement.groupId,
      paid_by: settlement.paidBy,
      paid_to: settlement.paidTo,
      amount: settlement.amount,
      settled_at: new Date(settlement.settledAt).toISOString(),
    });
    if (error) {
      // Roll back the optimistic update on failure
      const idx = _settlements.findIndex((s) => s.id === settlement.id);
      if (idx !== -1) _settlements.splice(idx, 1);
      throw error;
    }

    return settlement;
  },

  // Flip pending group memberships to active after a new user registers.
  // Called (and awaited) by AuthProvider's register() before re-initialising.
  async _upgradePendingMembers(user) {
    const { error } = await supabase
      .from("group_members")
      .update({ user_id: user.id, name: user.name, status: "active" })
      .eq("email", user.email)
      .eq("status", "pending");
    if (error) console.error("_upgradePendingMembers failed", error);

    for (const g of _groups) {
      for (const m of g.members) {
        if (m.status === "pending" && m.email === user.email) {
          m.userId = user.id;
          m.name = user.name;
          m.status = "active";
        }
      }
    }
  },
};
