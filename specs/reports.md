# Reports — Feature Spec

**Route:** `/reports` (protected)
**Status:** Not yet built.

---

## Overview

Reports gives the current user a single view of every expense they are involved
in across all their groups. The goal is to answer two questions at a glance:

1. How much have I spent, and on what, over a time period?
2. Which groups are driving my spending?

The page also produces a cross-group CSV that complements the per-group CSV
already available from `GroupDetail`.

---

## Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Reports                            [Export CSV ↓]  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Date     │  │ Group    │  │ Category         │   │
│  │ [range ▾]│  │ [all  ▾] │  │ [all          ▾] │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌─────────────── Summary cards ───────────────────┐ │
│  │  Total spent by me  │  My share  │  # Expenses  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────── Spending over time (bar chart) ──┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────── Expense table ───────────────────┐ │
│  │  Date │ Group │ Description │ Category │ Amount  │ │
│  │       │       │             │          │         │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Navigation entry point

Add a "Reports" link to the Dashboard header/nav alongside existing actions.
Route guards: same `ProtectedRoute` wrapper used by all other internal pages.

---

## Filters

All three filters work together (AND logic). They control the summary cards,
chart, and table simultaneously. Changing any filter re-derives everything from
the in-memory cache — no network calls.

### Date range

A dropdown with preset options:

| Label         | Value                              |
| ------------- | ---------------------------------- |
| Last 30 days  | `today − 30d` to `today`           |
| Last 3 months | `today − 90d` to `today`           |
| Last 6 months | `today − 180d` to `today`          |
| This year     | `Jan 1` of current year to `today` |
| All time      | No date filter (default)           |

The comparison uses the expense `date` string (`YYYY-MM-DD`) against the local
date at render time — no timezone conversion needed since the field is
date-only.

### Group

A dropdown listing every group the user belongs to, plus "All groups" (default).
Groups are sorted alphabetically.

### Category

A dropdown with "All categories" (default) followed by the seven values from
`CATEGORIES` in `storage.js`:
Food & Drinks · Transport · Accommodation · Activities · Shopping · Utilities · Other.

---

## Data: what counts as "my expenses"

An expense is included in the user's report if **either** of the following is
true (after applying the active filters):

- `expense.paidBy === currentUserId` — the user paid for it.
- `expense.splits` contains an entry whose `userId` matches `currentUserId`.

This means an expense where the user did not pay but owes a share still appears,
because it represents their financial involvement.

Only non-deleted expenses are considered (`getActiveExpensesForGroup` semantics).
The user's own groups are sourced from `storage.getGroupsForUser()` — the same
list used by Dashboard.

**Pending-member identity**: a user may appear in splits as their UUID (if
active) or as their email string (if they were invited before registering and
`_upgradePendingMembers` has not yet run). The matching logic must check both
`userId === currentUserId` and `email === currentUserEmail` when scanning splits,
consistent with how `calculateNetBalances` resolves identities in `balances.js`.

---

## Summary Cards

Three stat cards shown above the chart, derived from the filtered expense list.

| Card             | Calculation                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| Total paid by me | Sum of `expense.amount` where `expense.paidBy === me`                             |
| My share         | Sum of each split entry where `split.userId === me`, across all filtered expenses |
| # Expenses       | Count of filtered expense rows (regardless of who paid)                           |

"My share" is always ≤ "Total paid by me" + what others owe me, but these two
numbers can diverge significantly (e.g. the user paid for a group dinner but
their personal share is only 1/4). Showing both helps them distinguish
cash-out-of-pocket from what they're actually on the hook for.

---

## Chart: Spending Over Time

A vertical bar chart. Each bar represents one time bucket; bar height = **total
amount paid by the current user** in that bucket (i.e. `paidBy === me`).

### Bucketing rules

| Selected date range | Bucket size                                                |
| ------------------- | ---------------------------------------------------------- |
| Last 30 days        | Day                                                        |
| Last 3 months       | Week (Mon–Sun)                                             |
| Last 6 months       | Month                                                      |
| This year           | Month                                                      |
| All time            | Month (if ≤ 24 months of data) or Quarter (if > 24 months) |

When grouped by week, the label shows the week-start date (`MMM D`).
When grouped by month, the label shows abbreviated month + year (`Jan 2025`).
When grouped by quarter, the label shows `Q1 2025` etc.

Bars are rendered using `<svg>` or a lightweight charting approach — no
third-party charting library is added to the project. Bucket values of zero
still render as an empty bar slot so the time axis stays continuous.

Hovering a bar shows a tooltip: **"$X.XX (N expenses)"** where N is the count
of expenses paid by the user in that bucket.

The chart is not filterable beyond the three global filters — category and group
filters do affect which expenses feed into bar heights.

---

## Expense Table

Shows every filtered expense, one row per expense, sorted by date descending
(most recent first).

| Column      | Value                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Date        | `expense.date` formatted as `MMM D, YYYY` (e.g. "May 3, 2025")                                        |
| Group       | `group.name` resolved via `expense.groupId`                                                           |
| Description | `expense.description`                                                                                 |
| Category    | `expense.category` (badge, same style as `GroupDetail`)                                               |
| Paid by     | Display name of `expense.paidBy`, resolved through group members                                      |
| Amount      | `$X.XX`, right-aligned                                                                                |
| My share    | The split entry for `me` in `expense.splits`, formatted `$X.XX`; blank if the user has no split entry |

The table is not paginated for the initial implementation. If the filtered
result exceeds 200 rows, a notice appears below the table:
"Showing 200 of N expenses. Narrow your filters or export CSV for the full list."

Clicking a row navigates to `/group/:id` with the group the expense belongs to
(not deep-linking to the expense itself, since `GroupDetail` has no anchor per
expense yet).

---

## CSV Export

The "Export CSV" button is always visible but disabled (with
`disabled:opacity-40 disabled:cursor-not-allowed`) when the filtered expense
list is empty.

The download respects the currently active filters — it exports exactly what
the table shows (no 200-row cap; the full filtered set is included).

**File name:** `splitmate-report-<YYYY-MM>.csv` using the current year and month at export time.

**Columns:**

| Column       | Source                                                  |
| ------------ | ------------------------------------------------------- |
| Date         | `expense.date` (ISO 8601: `YYYY-MM-DD`)                 |
| Group        | `group.name`                                            |
| Description  | `expense.description`                                   |
| Category     | `expense.category`                                      |
| Total Amount | `expense.amount` formatted to 2 decimal places          |
| Paid By      | Display name of `expense.paidBy`                        |
| My Share     | The split amount for the current user; `""` if no entry |
| Notes        | `expense.notes` (empty string if none)                  |

Cell escaping: same double-quote approach used in `groupExport.js` — wrap every
value in `"..."`, escape internal `"` as `""`. Line endings: `\r\n`.

---

## Empty States

### No groups at all

> "You haven't joined any groups yet."
> [Create a group →]

Shown when `storage.getGroupsForUser()` returns an empty array.

### Groups exist but no matching expenses

> "No expenses match your filters."
> [Clear filters]

"Clear filters" resets date range to "All time", group to "All groups", category
to "All categories".

Show this state inside the chart area and instead of the table — do not render
empty chart axes or an empty table with headers.

### All-time, no expenses in any group

> "No expenses recorded yet. Add your first expense in a group."
> [Go to Dashboard →]

---

## Edge Cases

**User only appears in splits, never as payer** — "Total paid by me" card shows
$0.00; "My share" card reflects their split obligations. Both are valid.

**Pending-member email in splits** — if the current user registered after being
invited, some older splits may carry their email key. The matching logic must
check `split.userId === currentUserEmail` as a fallback (mirrors
`_upgradePendingMembers` semantics).

**Expense with no splits** — `expense.splits` is always populated by
`addExpense`, but defensive handling: treat "My share" as $0.00 rather than
crashing.

**Amount precision** — use the same integer-cents rounding as `balances.js`
(`Math.round(amount * 100) / 100`) when summing "My share" across multiple
expenses to avoid floating-point drift in the summary cards and CSV totals.

**Single group** — group filter dropdown still appears but only lists that one
group plus "All groups". No special-casing needed.

**Expenses spanning many years (All time)** — chart switches to quarterly
buckets once the data spans more than 24 calendar months (see bucketing rules).
The threshold is evaluated against the date range of the filtered expense set,
not the selected filter option.

**No data in a date bucket** — the bar still occupies its slot in the chart with
height 0 and no tooltip. This preserves the time axis continuity.

---

## Out of Scope (this iteration)

- Per-category breakdown chart (donut / pie).
- Net-balance or settlement data in the report.
- Scheduled / emailed reports.
- Shared reports or public links.
- Currency conversion (app is single-currency throughout).
