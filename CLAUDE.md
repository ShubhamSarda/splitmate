# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

There is no test suite.

## Architecture

Splitmate is a React SPA backed by Supabase (auth + database). The stack is React 19, React Router 7, Tailwind CSS 4, Vite 8, and `@supabase/supabase-js`.

### Environment variables

Required in `.env`:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key

### Data layer

**`src/lib/supabase.js`** — initializes and exports the Supabase client using the two env vars above.

**`src/data/storage.js`** is the single source of truth for all data access. It exports:

- A `storage` object with methods for users, groups, expenses, and session
- A `CATEGORIES` constant (used in `AddExpenseModal` and expense display)

Data is held in four in-memory arrays (`_users`, `_groups`, `_expenses`, `_settlements`) and persisted to Supabase. All reads are synchronous (from cache); all writes are optimistic (update cache immediately, fire-and-forget Supabase persist).

**`storage.init(userId)`** — async; called by `AuthProvider` after login/register and on session restore. Loads the user's groups, members, non-deleted expenses, and settlements from Supabase into cache.

**`storage.clear()`** — wipes in-memory cache; called on logout.

**`storage.getCurrentUserId()` / `setCurrentUserId()`** — no-ops; Supabase Auth owns the session.

**Supabase tables**: `users`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`.

**Settlements**: `{ id, group_id, paid_by, paid_to, amount, settled_at }`. RLS allows any group member to insert provided `auth.uid()` is either `paid_by` or `paid_to`. In-memory shape: `{ id, groupId, paidBy, paidTo, amount, settledAt }`.

New storage methods added this session:

- `storage.renameGroup(groupId, newName)` — trims, validates, updates `groups` table and cache
- `storage.removeMember(groupId, memberId)` — `memberId` is UUID for active members or email string for pending; callers must check expense involvement first
- `storage.recordSettlement(groupId, paidBy, paidTo, amount)` — optimistic insert into `settlements`; rolls back cache on Supabase error
- `storage.getSettlementsForGroup(groupId)` — synchronous cache read

**FK safety**: `_pendingGroupWrites` map tracks in-flight `_persistGroup` promises so `_persistExpense` can await the parent group write before inserting — prevents FK violations when a group and expense are created back-to-back.

**Expense object shape**: `{ id, groupId, description, amount, paidBy, date, splits, splitMode, category, notes, createdBy, isDeleted, createdAt }`. `notes` is optional (empty string default, trimmed on save). `category` defaults to `'Other'`.

### Auth

Auth state lives in `src/context/` split across three files:

- `AuthContext.jsx` — the `AuthProvider` component; holds `{ user, ready }` state, subscribes to `supabase.auth.onAuthStateChange`, implements `login` / `register` / `logout`
- `AuthContextValue.js` — creates and exports the React context (`AuthContext`)
- `useAuth.js` — custom hook; throws if used outside the provider

`login` calls `supabase.auth.signInWithPassword`; `register` calls `supabase.auth.signUp` and awaits `storage._upgradePendingMembers` before re-initialising the cache. `logout` calls `supabase.auth.signOut` and `storage.clear()`. Session is restored on page load via the `INITIAL_SESSION` auth event.

`AuthProvider` wraps the entire app in `App.jsx`. `ProtectedRoute` checks `useAuth().user` and redirects to `/login` if null. The `ready` flag prevents a flash-of-redirect before the initial Supabase session check completes.

### Balance calculations

**`src/lib/balances.js`** contains all financial logic:

- `calculateNetBalances(expenses, members, settlements = [])` — returns `{ [userId]: netAmount }` where positive = is owed, negative = owes; settlements adjust each party's balance toward zero
- `settleDebts(balances)` — greedy min-settlements algorithm; returns `[{ from, to, amount }]`
- `userBalanceInGroup(expenses, members, userId, settlements = [])` — convenience wrapper used in Dashboard cards

**Pending member identity**: when a member is invited by email before registering, their `userId` is `null` and their splits are keyed by email string. `calculateNetBalances` builds an `emailToKey` map to unify these. When a pending member registers, `storage._upgradePendingMembers(user)` (async) updates both the Supabase `group_members` rows and the in-memory cache to `status: 'active'`.

**Equal split math**: done in integer cents (`Math.round(amount * 100)`) with remainder distributed to the first N members, so splits always sum to the exact total.

### Utilities

**`src/utils/groupExport.js`** — CSV export for group expense history:

- `exportGroupHistory(groupId)` — returns a sorted (by date) array of plain objects `{ date, description, category, amount, paidBy, splitBetween, notes }` with member UUIDs/emails resolved to display names
- `downloadGroupHistory(groupId, groupName)` — builds a CSV string from the above, triggers a browser download as `splitmate-<group-name>-history.csv`

The "Export history" button in `GroupDetail.jsx` calls `downloadGroupHistory` and is disabled (with `disabled:opacity-40 disabled:cursor-not-allowed`) when the group has no active expenses.

### Routes

| Path                  | Component       | Auth                                                          |
| --------------------- | --------------- | ------------------------------------------------------------- |
| `/`                   | `Landing`       | Public (redirects to `/dashboard` if logged in)               |
| `/login`              | `Login`         | Public                                                        |
| `/register`           | `Register`      | Public                                                        |
| `/dashboard`          | `Dashboard`     | Protected                                                     |
| `/group/new`          | `CreateGroup`   | Protected                                                     |
| `/group/:id`          | `GroupDetail`   | Protected                                                     |
| `/group/:id/settings` | `GroupSettings` | Protected (admin only — redirects non-admins to `/group/:id`) |

### Key conventions

**State management**: React Context only for auth. All other data is read from `storage` directly inside components, with a local `version` integer (`setVersion(v => v + 1)`) used to trigger re-reads after mutations — see `GroupDetail.jsx`.

**Expense edit/delete**: edits are implemented as soft-delete + create-new (preserving original `createdBy` / `createdAt`). Only the creator or payer may edit. Deletes are soft (`isDeleted: true`); `getActiveExpensesForGroup` filters them out.

**Styling**: Tailwind 4 with a custom `@theme` block in `src/index.css` defining the full design token set. Reusable semantic classes (`.page`, `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.field`, `.field-label`, `.badge-*`) are defined in `@layer components` — prefer these over raw Tailwind utilities when a semantic class exists.

**IDs**: generated with `crypto.randomUUID()` — UUIDs required by Supabase FK constraints.

**No TypeScript**: the project uses plain JSX. The `@types/react` packages are present only for editor intellisense via JSDoc.

**Admin identity**: the group creator is the admin. Check with `group.createdBy === user.id`. Stored as a UUID in `groups.created_by` (Supabase) / `group.createdBy` (cache).

**Dashboard balance freshness**: `Dashboard.jsx` includes `location.key` in its `useMemo` dependency array so balances re-derive from the in-memory cache on every navigation. This is required because React Router does not unmount/remount the component on back-navigation — without `location.key`, settled debts would still appear after returning from a group page.

**Member removal guard**: before calling `storage.removeMember`, check all active expenses for the group (`getActiveExpensesForGroup`) — if the member's key (UUID or email) appears as `paidBy` or in any `splits[].userId`, block removal and show "Cannot remove — member has existing expenses."
