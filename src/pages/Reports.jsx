import { useMemo, useState, useRef, useEffect } from "react";
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

function emptyFallbackBuckets() {
  const today = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
      amount: 0,
      count: 0,
    };
  });
}

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

  const effectiveBuckets = useMemo(
    () =>
      chartData.buckets.length > 0 ? chartData.buckets : emptyFallbackBuckets(),
    [chartData],
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
      <title>Reports | Splitmate</title>
      <AppHeader />
      <main className="page-app py-8 space-y-6">
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

            {/* Summary cards — only when there are matching expenses */}
            {expenses.length > 0 && (
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
            )}

            {/* Chart — always visible */}
            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-ink">
                Spending over time
              </h2>
              <SpendingChart buckets={effectiveBuckets} />
            </div>

            {/* Table or empty state */}
            {expenses.length === 0 ? (
              <EmptyState
                filtersActive={filtersActive}
                onClear={clearFilters}
              />
            ) : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-canvas">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Date
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Group
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Description
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Category
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Paid by
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          Amount
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
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
                            <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                              {formatDate(e.date)}
                            </td>
                            <td className="px-5 py-3 text-ink-soft">
                              {e._groupName}
                            </td>
                            <td className="px-5 py-3 font-medium text-ink">
                              {e.description}
                            </td>
                            <td className="px-5 py-3">
                              <CategoryBadge category={e.category || "Other"} />
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                              {e._paidByName}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-ink">
                              {formatCurrency(e.amount)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-ink-soft">
                              {share != null ? formatCurrency(share) : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sortedExpenses.length > TABLE_LIMIT && (
                  <p className="border-t border-line px-4 py-3 text-sm text-ink-muted">
                    Showing {TABLE_LIMIT} of {sortedExpenses.length} expenses.
                    Narrow your filters or export CSV for the full list.
                  </p>
                )}
              </div>
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

function fmtBarLabel(amount) {
  if (amount >= 10000) return `$${(amount / 1000).toFixed(1)}k`;
  if (amount >= 1000) return `$${(Math.round(amount / 100) / 10).toFixed(1)}k`;
  return `$${Math.round(amount)}`;
}

function SpendingChart({ buckets }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWrapW(el.clientWidth || 600);
    const obs = new ResizeObserver(() => setWrapW(el.clientWidth || 600));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const LABEL_TOP = 24;
  const CHART_H = 150;
  const LABEL_H = 32;
  const TOTAL_H = LABEL_TOP + CHART_H + LABEL_H;
  const n = buckets.length;

  // Compute bar width to fill the container. gap = 20% of bar width, min 2px.
  const MIN_BAR_W = 10;
  const BAR_W =
    n > 0 ? Math.max(MIN_BAR_W, Math.floor(wrapW / (n * 1.2 - 0.2))) : 44;
  const BAR_GAP = n > 1 ? Math.max(2, Math.round(BAR_W * 0.2)) : 0;
  const totalW = n > 0 ? n * (BAR_W + BAR_GAP) - BAR_GAP : wrapW;
  const showAmountLabel = BAR_W >= 20;

  const maxAmount = Math.max(...buckets.map((b) => b.amount), 0.01);
  const allEmpty = buckets.every((b) => b.amount === 0);
  const labelStep = Math.max(1, Math.ceil(n / 8));
  return (
    <div ref={wrapRef} className="overflow-x-auto">
      <svg
        width={totalW}
        height={TOTAL_H}
        style={{ display: "block", minWidth: totalW }}
        onMouseLeave={() => setHoveredKey(null)}
        aria-hidden="true"
      >
        {/* Baseline */}
        <line
          x1={0}
          y1={LABEL_TOP + CHART_H}
          x2={totalW}
          y2={LABEL_TOP + CHART_H}
          stroke="#E8E4DE"
          strokeWidth={1}
        />

        {/* Empty state label */}
        {allEmpty && (
          <text
            x={totalW / 2}
            y={LABEL_TOP + CHART_H / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#A8A29E"
          >
            No spending data for this period
          </text>
        )}

        {buckets.map((bucket, i) => {
          const x = i * (BAR_W + BAR_GAP);
          const cx = x + BAR_W / 2;
          const barH =
            bucket.amount > 0
              ? Math.max(4, (bucket.amount / maxAmount) * CHART_H)
              : 0;
          const barY = LABEL_TOP + CHART_H - barH;
          const showXLabel = i % labelStep === 0 || i === n - 1;
          const isHovered = bucket.key === hoveredKey;

          return (
            <g key={bucket.key}>
              {/* Bar — darkens on hover */}
              {barH > 0 && (
                <rect
                  x={x}
                  y={barY}
                  width={BAR_W}
                  height={barH}
                  fill={isHovered ? "#C2410C" : "#EA580C"}
                  rx={3}
                />
              )}

              {/* Amount label above bar — full amount on hover, short label otherwise */}
              {barH > 0 && (showAmountLabel || isHovered) && (
                <text
                  x={cx}
                  y={barY - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill={isHovered ? "#1C1917" : "#78716C"}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {isHovered
                    ? formatCurrency(bucket.amount)
                    : fmtBarLabel(bucket.amount)}
                </text>
              )}

              {/* Hover zone rendered last so it sits above bar in SVG z-order */}
              {bucket.amount > 0 && (
                <rect
                  x={x}
                  y={LABEL_TOP}
                  width={BAR_W}
                  height={CHART_H}
                  fill="transparent"
                  onMouseEnter={() => setHoveredKey(bucket.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              )}

              {/* X-axis label */}
              {showXLabel && (
                <text
                  x={cx}
                  y={LABEL_TOP + CHART_H + 20}
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
