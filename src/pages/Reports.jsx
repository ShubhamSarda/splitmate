import { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { storage, CATEGORIES } from "../data/storage";
import {
  filterExpenses,
  getSummaryStats,
  getMyShare,
  getChartData,
  resolveDateRange,
} from "../utils/monthlyReport";
import { downloadReport } from "../utils/csvExport";
import { formatCurrency, formatDate } from "../lib/format";
import AppHeader from "../components/AppHeader";

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "year", label: "This year" },
];

const TABLE_LIMIT = 200;

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rangeKey, setRangeKey] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [category, setCategory] = useState("all");

  // location.key busts the memo cache on every navigation, same as Dashboard.
  const groups = useMemo(
    () =>
      storage
        .getGroupsForUser(user.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, location.key],
  );

  const userEmail = user.email ?? "";

  const dateRange = useMemo(() => resolveDateRange(rangeKey), [rangeKey]);

  const expenses = useMemo(
    () => filterExpenses(user.id, userEmail, { dateRange, groupId, category }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, userEmail, dateRange, groupId, category, location.key],
  );

  const stats = useMemo(
    () => getSummaryStats(expenses, user.id, userEmail),
    [expenses, user.id, userEmail],
  );

  const chartData = useMemo(
    () => getChartData(expenses, user.id, userEmail, rangeKey),
    [expenses, user.id, userEmail, rangeKey],
  );

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      ),
    [expenses],
  );

  function clearFilters() {
    setRangeKey("all");
    setGroupId("all");
    setCategory("all");
  }

  const filtersActive =
    rangeKey !== "all" || groupId !== "all" || category !== "all";
  const hasNoGroups = groups.length === 0;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="page py-8 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">Reports</h1>
          <button
            onClick={() => downloadReport(expenses, user.id, userEmail)}
            disabled={expenses.length === 0}
            className="btn-secondary gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {hasNoGroups ? (
          <NoGroupsState />
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="field-label">Date range</label>
                <select
                  value={rangeKey}
                  onChange={(e) => setRangeKey(e.target.value)}
                  className="field"
                >
                  {DATE_RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Group</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="field"
                >
                  <option value="all">All groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field"
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {expenses.length === 0 ? (
              <EmptyState
                filtersActive={filtersActive}
                onClear={clearFilters}
              />
            ) : (
              <>
                {/* Summary cards */}
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Total paid by me"
                    value={formatCurrency(stats.totalPaidByMe)}
                  />
                  <StatCard
                    label="My share"
                    value={formatCurrency(stats.myShare)}
                  />
                  <StatCard
                    label="Expenses"
                    value={stats.expenseCount.toString()}
                  />
                </section>

                {/* Chart */}
                {chartData.buckets.length > 0 && (
                  <div className="card space-y-3">
                    <h2 className="text-sm font-semibold text-ink">
                      Spending over time
                    </h2>
                    <SpendingChart buckets={chartData.buckets} />
                  </div>
                )}

                {/* Table */}
                <div className="card overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-canvas">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Group
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Paid by
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          My share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sortedExpenses.slice(0, TABLE_LIMIT).map((e) => {
                        const share = getMyShare(e, user.id, userEmail);
                        return (
                          <tr
                            key={e.id}
                            onClick={() => navigate(`/group/${e.groupId}`)}
                            className="cursor-pointer transition-colors hover:bg-canvas"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                              {formatDate(e.date)}
                            </td>
                            <td className="px-4 py-3 text-ink-soft">
                              {e._groupName}
                            </td>
                            <td className="px-4 py-3 font-medium text-ink">
                              {e.description}
                            </td>
                            <td className="px-4 py-3">
                              <CategoryBadge category={e.category || "Other"} />
                            </td>
                            <td className="px-4 py-3 text-ink-soft">
                              {e._paidByName}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                              {formatCurrency(e.amount)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-soft">
                              {share != null ? formatCurrency(share) : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {sortedExpenses.length > TABLE_LIMIT && (
                    <p className="border-t border-line px-4 py-3 text-sm text-ink-muted">
                      Showing {TABLE_LIMIT} of {sortedExpenses.length} expenses.
                      Narrow your filters or export CSV for the full list.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}

function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center rounded-full bg-mute-bg px-2 py-0.5 text-xs font-medium text-mute">
      {category}
    </span>
  );
}

function SpendingChart({ buckets }) {
  const CHART_H = 160;
  const LABEL_H = 36;
  const TOTAL_H = CHART_H + LABEL_H;
  const BAR_GAP = 4;
  const n = buckets.length;

  const maxAmount = Math.max(...buckets.map((b) => b.amount), 0.01);
  const barW = Math.max(8, (600 - (n - 1) * BAR_GAP) / n);
  const totalW = Math.ceil(n * barW + (n - 1) * BAR_GAP);

  // Show at most ~8 evenly-spaced labels to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalW}
        height={TOTAL_H}
        style={{ display: "block", minWidth: totalW }}
        aria-hidden="true"
      >
        {/* Baseline */}
        <line
          x1={0}
          y1={CHART_H}
          x2={totalW}
          y2={CHART_H}
          stroke="#E8E4DE"
          strokeWidth={1}
        />

        {buckets.map((bucket, i) => {
          const x = i * (barW + BAR_GAP);
          const cx = x + barW / 2;
          const barH =
            bucket.amount > 0
              ? Math.max(2, (bucket.amount / maxAmount) * CHART_H)
              : 0;
          const y = CHART_H - barH;
          const showLabel = i % labelStep === 0 || i === n - 1;

          return (
            <g key={bucket.key}>
              {barH > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill="#EA580C"
                  rx={2}
                >
                  <title>
                    {`$${bucket.amount.toFixed(2)} (${bucket.count} expense${bucket.count !== 1 ? "s" : ""})`}
                  </title>
                </rect>
              ) : null}
              {showLabel && (
                <text
                  x={cx}
                  y={CHART_H + 20}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#A8A29E"
                >
                  {bucket.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function NoGroupsState() {
  return (
    <div className="card">
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold text-ink">
          You haven&apos;t joined any groups yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Create a group and add expenses to see your spending history here.
        </p>
        <Link to="/group/new" className="btn-primary mt-6 inline-flex">
          Create a group
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ filtersActive, onClear }) {
  if (filtersActive) {
    return (
      <div className="card">
        <div className="py-12 text-center">
          <h2 className="text-lg font-semibold text-ink">
            No expenses match your filters
          </h2>
          <button onClick={onClear} className="btn-secondary mt-6">
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold text-ink">
          No expenses recorded yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Add your first expense in a group to start tracking your spending.
        </p>
        <Link to="/dashboard" className="btn-secondary mt-6 inline-flex">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
