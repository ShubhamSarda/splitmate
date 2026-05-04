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

Splitmate is a fully client-side expense-splitting app. There is no backend — all state lives in `localStorage`. The stack is React 19, React Router 7, Tailwind CSS 4, and Vite 8.

### Data layer

**`src/data/storage.js`** is the single source of truth for all `localStorage` access. No other file should read or write `localStorage` directly. It exports:
- A `storage` object with methods for users, groups, expenses, and session
- A `CATEGORIES` constant (used in `AddExpenseModal` and expense display)

`storage.init()` is called once on app mount (inside `AuthProvider`). It seeds 4 demo accounts if `splitmate.seeded` is not set, and runs a one-time migration for the old `sharedWith` → `splits` format.

### Auth

Auth state lives in `src/context/` split across three files:
- `AuthContext.jsx` — creates and exports the React context
- `AuthContextValue.js` — the provider component; holds `{ user, ready }` state, calls `storage.init()`, implements `login` / `register` / `logout`
- `useAuth.js` — custom hook; throws if used outside the provider

`AuthProvider` wraps the entire app in `App.jsx`. `ProtectedRoute` checks `useAuth().user` and redirects to `/login` if null. The `ready` flag prevents a flash-of-redirect before the initial localStorage read completes.

### Balance calculations

**`src/lib/balances.js`** contains all financial logic:
- `calculateNetBalances(expenses, members)` — returns `{ [userId]: netAmount }` where positive = is owed, negative = owes
- `settleDebts(balances)` — greedy min-settlements algorithm; returns `[{ from, to, amount }]`
- `userBalanceInGroup(expenses, members, userId)` — convenience wrapper used in Dashboard cards

**Pending member identity**: when a member is invited by email before registering, their `userId` is `null` and their splits are keyed by email string. `calculateNetBalances` builds an `emailToKey` map to unify these. When a pending member registers, `storage._upgradePendingMembers()` upgrades their group membership records to `status: 'active'`.

**Equal split math**: done in integer cents (`Math.round(amount * 100)`) with remainder distributed to the first N members, so splits always sum to the exact total.

### Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | `Landing` | Public (redirects to `/dashboard` if logged in) |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `Dashboard` | Protected |
| `/group/new` | `CreateGroup` | Protected |
| `/group/:id` | `GroupDetail` | Protected |

### Key conventions

**State management**: React Context only for auth. All other data is read from `storage` directly inside components, with a local `version` integer (`setVersion(v => v + 1)`) used to trigger re-reads after mutations — see `GroupDetail.jsx`.

**Expense edit/delete**: edits are implemented as soft-delete + create-new (preserving original `createdBy` / `createdAt`). Only the creator or payer may edit. Deletes are soft (`isDeleted: true`); `getActiveExpensesForGroup` filters them out.

**Styling**: Tailwind 4 with a custom `@theme` block in `src/index.css` defining the full design token set. Reusable semantic classes (`.page`, `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.field`, `.field-label`, `.badge-*`) are defined in `@layer components` — prefer these over raw Tailwind utilities when a semantic class exists.

**IDs**: generated with `Math.random().toString(36).slice(2,10) + Date.now().toString(36)` in `storage.js`.

**No TypeScript**: the project uses plain JSX. The `@types/react` packages are present only for editor intellisense via JSDoc.
