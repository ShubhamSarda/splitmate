# Splitmate

A client-side expense-splitting app for tracking shared costs within groups, with automatic balance and settlement calculations.

## Features

- Create groups and add members by email — they can be added before they register
- Log expenses with a description, amount, date, category, payer, and optional notes
- Split expenses equally across members or enter custom (manual) amounts per person
- Edit or delete any expense you created or paid for
- View per-group balances showing exactly who owes whom, minimised to the fewest possible transactions
- Dashboard summary of total owed to you, total you owe, and your net balance across all groups

## Tech stack

- React 19
- React Router 7
- Tailwind CSS 4
- Vite 8
- localStorage (all persistence is client-side)

## Getting started

```bash
git clone <repo-url>
cd splitmate
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Test accounts

Four accounts are seeded automatically on first load. Any of them can be used to explore the app immediately:

| Email | Password |
|---|---|
| shubham@test.com | password |
| bob@test.com | password |
| rahul@test.com | password |
| eva@test.com | password |

## Project structure

```
src/
  components/       Reusable UI — AddExpenseModal, AppHeader, Avatar, ProtectedRoute
  context/          Auth — AuthContext, AuthContextValue (provider), useAuth (hook)
  data/             storage.js — single source of truth for all localStorage access
  lib/              balances.js (financial logic), format.js (currency/date helpers)
  pages/            One file per route — Landing, Login, Register, Dashboard, CreateGroup, GroupDetail
```

## Available routes

| Route | Page | Auth required |
|---|---|---|
| `/` | Landing | No (redirects to `/dashboard` if logged in) |
| `/login` | Login | No |
| `/register` | Register | No |
| `/dashboard` | Dashboard | Yes |
| `/group/new` | CreateGroup | Yes |
| `/group/:id` | GroupDetail | Yes |

## Data storage

All data lives in the browser's `localStorage` under these keys:

| Key | Contents |
|---|---|
| `splitmate.users` | All registered user accounts |
| `splitmate.groups` | All groups and their member lists |
| `splitmate.expenses` | All expenses (including soft-deleted) |
| `splitmate.currentUserId` | Session: the logged-in user's ID |
| `splitmate.seeded` | Flag; set on first load after seeding demo accounts |
| `splitmate.expenses.migrated.splits` | Flag; set after the one-time migration from the old `sharedWith` format to `splits` |

`storage.js` is the only file that reads or writes `localStorage`. Every other module goes through the methods it exports.

## Important notes

**Soft deletes**: expenses are never removed from storage — they are marked `isDeleted: true`. This keeps historical balance data intact and makes the deletion reversible at the storage level. `getActiveExpensesForGroup` always filters these out before any display or calculation.

**Pending members**: a group member added by email before they have an account is stored with `status: 'pending'` and `userId: null`. Their splits are keyed by email string rather than a user ID. When they register, `storage._upgradePendingMembers()` automatically upgrades all their group records to `status: 'active'` and fills in their real user ID.

**Equal split math**: amounts are calculated in integer cents (`Math.round(amount * 100)`) with any remainder distributed one cent at a time to the first N members, so splits always sum to exactly the total with no floating-point dust.
