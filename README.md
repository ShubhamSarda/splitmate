# Splitmate

An expense-splitting app for tracking shared costs within groups, with automatic balance and settlement calculations. Data is persisted in Supabase with an in-memory cache for synchronous reads.

## Features

- Create groups and add members by email — they can be added before they register
- Log expenses with a description, amount, date, category, payer, and optional notes
- Split expenses equally across members or enter custom (manual) amounts per person
- Edit or delete any expense you created or paid for
- View per-group balances showing exactly who owes whom, minimised to the fewest possible transactions
- Settle up directly between any two members and have balances update immediately
- Dashboard summary of total owed to you, total you owe, and your net balance across all groups
- Group settings: rename the group or remove members (admin only)
- Set an optional budget per group with a live progress bar showing spend vs. limit
- Export a group's full expense history as a CSV file
- Reports page with date and category filters and CSV download
- Profile page with display name editing, profile photo upload, and password change

## Tech stack

- React 19
- React Router 7
- Tailwind CSS 4
- Vite 8
- Supabase (`@supabase/supabase-js`) — auth and database

## Getting started

```bash
git clone <repo-url>
cd splitmate
npm install
```

Copy `.env` (or create one) with your Supabase project credentials:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Test accounts

Register accounts via the `/register` page. No demo accounts are seeded automatically — authentication and user data are managed by Supabase.

## Project structure

```
src/
  components/       Reusable UI — AddExpenseModal, AppHeader, Avatar, ProtectedRoute
  context/          Auth — AuthContext.jsx (provider), AuthContextValue.js (context), useAuth.js (hook)
  data/             storage.js — in-memory cache + Supabase persistence; single source of truth for all data access
  lib/              balances.js (financial logic), format.js (currency/date helpers), supabase.js (client init)
  pages/            One file per route — Landing, Login, Register, Dashboard, CreateGroup, GroupDetail, GroupSettings, Reports, Profile
  utils/            groupExport.js (group CSV export), csvExport.js, monthlyReport.js
```

## Available routes

| Route                 | Page          | Auth required                               |
| --------------------- | ------------- | ------------------------------------------- |
| `/`                   | Landing       | No (redirects to `/dashboard` if logged in) |
| `/login`              | Login         | No                                          |
| `/register`           | Register      | No                                          |
| `/dashboard`          | Dashboard     | Yes                                         |
| `/group/new`          | CreateGroup   | Yes                                         |
| `/group/:id`          | GroupDetail   | Yes                                         |
| `/group/:id/settings` | GroupSettings | Yes (admin only — non-admins redirected)    |
| `/reports`            | Reports       | Yes                                         |
| `/profile`            | Profile       | Yes                                         |

## Data storage

Data is stored in Supabase and cached in memory at runtime. The Supabase tables are:

| Table            | Contents                                                           |
| ---------------- | ------------------------------------------------------------------ |
| `users`          | Registered user profiles (id, name, email)                         |
| `groups`         | Groups (id, name, created_by, created_at)                          |
| `group_members`  | Group membership rows (user_id, email, name, status)               |
| `expenses`       | Expense records (amount, paidBy, date, splits...)                  |
| `expense_splits` | Per-member split amounts for each expense                          |
| `settlements`    | Recorded settle-up payments (paid_by, paid_to, amount, settled_at) |

Authentication is handled by Supabase Auth. Session is restored automatically on page load via `supabase.auth.onAuthStateChange`.

`storage.js` is the only file that accesses Supabase data tables. All reads are synchronous from the in-memory cache; all writes update the cache immediately then persist to Supabase in the background.

## Important notes

**Soft deletes**: expenses are never removed from storage — they are marked `isDeleted: true`. This keeps historical balance data intact and makes the deletion reversible at the storage level. `getActiveExpensesForGroup` always filters these out before any display or calculation.

**Pending members**: a group member added by email before they have an account is stored with `status: 'pending'` and `userId: null`. Their splits are keyed by email string rather than a user ID. When they register, `storage._upgradePendingMembers(user)` (async) updates both the Supabase `group_members` rows and the in-memory cache to `status: 'active'` and fills in their real user ID.

**Equal split math**: amounts are calculated in integer cents (`Math.round(amount * 100)`) with any remainder distributed one cent at a time to the first N members, so splits always sum to exactly the total with no floating-point dust.
