// Single source of truth for all localStorage access.
// Nothing else in the app should read or write localStorage directly.

const KEYS = {
  USERS: 'splitmate.users',
  GROUPS: 'splitmate.groups',
  EXPENSES: 'splitmate.expenses',
  CURRENT_USER: 'splitmate.currentUserId',
  SEEDED: 'splitmate.seeded',
  EXPENSES_MIGRATED_SPLITS: 'splitmate.expenses.migrated.splits',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Equal split with the remainder cent distributed to the first members so
// the splits sum to exactly the total (no penny dust).
function buildEqualSplits(amount, userIds) {
  const cents = Math.round(Number(amount) * 100)
  const n = userIds.length
  const base = Math.floor(cents / n)
  const remainder = cents - base * n
  return userIds.map((userId, i) => ({
    userId,
    amount: (base + (i < remainder ? 1 : 0)) / 100,
  }))
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

const SEED_USERS = [
  { name: 'Shubham', email: 'shubham@test.com', password: 'password' },
  { name: 'Bob', email: 'bob@test.com', password: 'password' },
  { name: 'Rahul', email: 'rahul@test.com', password: 'password' },
  { name: 'Eva', email: 'eva@test.com', password: 'password' },
]

export const storage = {
  init() {
    if (!localStorage.getItem(KEYS.SEEDED)) {
      const users = SEED_USERS.map((u) => ({
        id: uid(),
        name: u.name,
        email: normalizeEmail(u.email),
        password: u.password,
        createdAt: Date.now(),
      }))
      write(KEYS.USERS, users)
      if (!localStorage.getItem(KEYS.GROUPS)) write(KEYS.GROUPS, [])
      if (!localStorage.getItem(KEYS.EXPENSES)) write(KEYS.EXPENSES, [])
      localStorage.setItem(KEYS.SEEDED, '1')
    }
    this._migrateExpensesToSplits()
  },

  _migrateExpensesToSplits() {
    if (localStorage.getItem(KEYS.EXPENSES_MIGRATED_SPLITS)) return
    const expenses = this.getExpenses()
    let changed = false
    for (const e of expenses) {
      if (Array.isArray(e.splits)) continue
      const ids = Array.isArray(e.sharedWith) ? e.sharedWith : []
      e.splits = ids.length ? buildEqualSplits(e.amount, ids) : []
      e.splitMode = 'equal'
      delete e.sharedWith
      changed = true
    }
    if (changed) write(KEYS.EXPENSES, expenses)
    localStorage.setItem(KEYS.EXPENSES_MIGRATED_SPLITS, '1')
  },

  // ---------- Users ----------
  getUsers() {
    return read(KEYS.USERS, [])
  },
  getUserById(id) {
    return this.getUsers().find((u) => u.id === id) || null
  },
  getUserByEmail(email) {
    const e = normalizeEmail(email)
    return this.getUsers().find((u) => u.email === e) || null
  },
  createUser({ name, email, password }) {
    const users = this.getUsers()
    const newUser = {
      id: uid(),
      name: name.trim(),
      email: normalizeEmail(email),
      password,
      createdAt: Date.now(),
    }
    users.push(newUser)
    write(KEYS.USERS, users)
    this._upgradePendingMembers(newUser)
    return newUser
  },
  _upgradePendingMembers(user) {
    const groups = this.getGroups()
    let changed = false
    for (const g of groups) {
      for (const m of g.members) {
        if (m.status === 'pending' && m.email === user.email) {
          m.userId = user.id
          m.name = user.name
          m.status = 'active'
          changed = true
        }
      }
    }
    if (changed) write(KEYS.GROUPS, groups)
  },

  // ---------- Session ----------
  getCurrentUserId() {
    return localStorage.getItem(KEYS.CURRENT_USER)
  },
  setCurrentUserId(id) {
    if (id) localStorage.setItem(KEYS.CURRENT_USER, id)
    else localStorage.removeItem(KEYS.CURRENT_USER)
  },

  // ---------- Groups ----------
  getGroups() {
    return read(KEYS.GROUPS, [])
  },
  getGroupById(id) {
    return this.getGroups().find((g) => g.id === id) || null
  },
  getGroupsForUser(userId) {
    return this.getGroups().filter((g) =>
      g.members.some((m) => m.userId === userId)
    )
  },
  createGroup({ name, createdBy, memberEmails }) {
    const creator = this.getUserById(createdBy)
    if (!creator) throw new Error('Creator not found')

    const seen = new Set([creator.email])
    const members = [
      {
        userId: creator.id,
        email: creator.email,
        name: creator.name,
        status: 'active',
      },
    ]

    for (const rawEmail of memberEmails) {
      const email = normalizeEmail(rawEmail)
      if (!email || seen.has(email)) continue
      seen.add(email)
      const existing = this.getUserByEmail(email)
      if (existing) {
        members.push({
          userId: existing.id,
          email: existing.email,
          name: existing.name,
          status: 'active',
        })
      } else {
        members.push({
          userId: null,
          email,
          name: null,
          status: 'pending',
        })
      }
    }

    const group = {
      id: uid(),
      name: name.trim(),
      createdBy,
      createdAt: Date.now(),
      members,
    }
    const groups = this.getGroups()
    groups.push(group)
    write(KEYS.GROUPS, groups)
    return group
  },

  // ---------- Expenses ----------
  getExpenses() {
    return read(KEYS.EXPENSES, [])
  },
  getActiveExpensesForGroup(groupId) {
    return this.getExpenses().filter(
      (e) => e.groupId === groupId && !e.isDeleted
    )
  },
  createExpense({ groupId, description, amount, paidBy, date, splits, splitMode, createdBy }) {
    const expenses = this.getExpenses()
    const expense = {
      id: uid(),
      groupId,
      description: description.trim(),
      amount: Number(amount),
      paidBy,
      date,
      splits: splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
      splitMode,
      createdBy: createdBy ?? paidBy,
      isDeleted: false,
      createdAt: Date.now(),
    }
    expenses.push(expense)
    write(KEYS.EXPENSES, expenses)
    return expense
  },
  softDeleteExpense(expenseId) {
    const expenses = this.getExpenses()
    const e = expenses.find((x) => x.id === expenseId)
    if (e && !e.isDeleted) {
      e.isDeleted = true
      write(KEYS.EXPENSES, expenses)
    }
  },
}
