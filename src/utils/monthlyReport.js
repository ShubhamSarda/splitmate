import { storage } from "../data/storage";

function round(n) {
  return Math.round(n * 100) / 100;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Returns { start, end } ISO strings, or null for "all time".
export function resolveDateRange(rangeKey) {
  const today = todayISO();
  if (rangeKey === "all") return null;
  if (rangeKey === "30d") return { start: addDays(today, -30), end: today };
  if (rangeKey === "3m") return { start: addDays(today, -90), end: today };
  if (rangeKey === "6m") return { start: addDays(today, -180), end: today };
  if (rangeKey === "year")
    return { start: `${new Date().getFullYear()}-01-01`, end: today };
  return null;
}

function isUserInvolved(expense, userId, userEmail) {
  if (expense.paidBy === userId || expense.paidBy === userEmail) return true;
  return expense.splits.some(
    (s) => s.userId === userId || s.userId === userEmail,
  );
}

function resolvePaidByName(paidBy, members) {
  const m = members.find((x) => x.userId === paidBy || x.email === paidBy);
  return m?.name || m?.email || "Unknown";
}

// Returns enriched expense objects with _groupName and _paidByName added.
export function filterExpenses(
  userId,
  userEmail,
  { dateRange, groupId, category },
) {
  const groups = storage.getGroupsForUser(userId);
  const result = [];

  for (const group of groups) {
    if (groupId !== "all" && group.id !== groupId) continue;
    const expenses = storage.getActiveExpensesForGroup(group.id);

    for (const e of expenses) {
      if (!isUserInvolved(e, userId, userEmail)) continue;
      if (dateRange && (e.date < dateRange.start || e.date > dateRange.end))
        continue;
      if (category !== "all" && (e.category || "Other") !== category) continue;

      result.push({
        ...e,
        _groupName: group.name,
        _paidByName: resolvePaidByName(e.paidBy, group.members),
      });
    }
  }

  return result;
}

export function getSummaryStats(expenses, userId, userEmail) {
  let totalPaidByMe = 0;
  let myShare = 0;

  for (const e of expenses) {
    if (e.paidBy === userId || e.paidBy === userEmail) {
      totalPaidByMe += e.amount;
    }
    for (const s of e.splits) {
      if (s.userId === userId || s.userId === userEmail) {
        myShare += s.amount;
      }
    }
  }

  return {
    totalPaidByMe: round(totalPaidByMe),
    myShare: round(myShare),
    expenseCount: expenses.length,
  };
}

// Returns the split amount for the current user in a given expense, or null.
export function getMyShare(expense, userId, userEmail) {
  const s = expense.splits.find(
    (s) => s.userId === userId || s.userId === userEmail,
  );
  return s ? s.amount : null;
}

// ---- Chart helpers ----

function monthsBetween(startISO, endISO) {
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(endISO + "T00:00:00");
  return (
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  );
}

function getMondayISO(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getBucketKey(dateISO, bucketSize) {
  if (bucketSize === "day") return dateISO;
  if (bucketSize === "week") return getMondayISO(dateISO);
  if (bucketSize === "month") return dateISO.slice(0, 7);
  if (bucketSize === "quarter") {
    const d = new Date(dateISO + "T00:00:00");
    return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  }
  return dateISO;
}

export function formatBucketLabel(key, bucketSize) {
  if (bucketSize === "day" || bucketSize === "week") {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (bucketSize === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }
  if (bucketSize === "quarter") {
    const [year, q] = key.split("-");
    return `${q} ${year}`;
  }
  return key;
}

function generateBucketKeys(rangeKey, myExpenses, bucketSize) {
  const today = todayISO();
  let startISO, endISO;

  if (rangeKey === "all") {
    if (myExpenses.length === 0) return [];
    const sorted = myExpenses.map((e) => e.date).sort();
    startISO = sorted[0];
    endISO = today;
  } else {
    const range = resolveDateRange(rangeKey);
    startISO = range.start;
    endISO = today;
  }

  const keys = [];

  if (bucketSize === "day") {
    let cur = startISO;
    while (cur <= endISO) {
      keys.push(cur);
      cur = addDays(cur, 1);
    }
  } else if (bucketSize === "week") {
    let cur = getMondayISO(startISO);
    while (cur <= endISO) {
      keys.push(cur);
      cur = addDays(cur, 7);
    }
  } else if (bucketSize === "month") {
    const s = new Date(startISO.slice(0, 7) + "-01T00:00:00");
    const e = new Date(endISO.slice(0, 7) + "-01T00:00:00");
    while (s <= e) {
      keys.push(
        `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`,
      );
      s.setMonth(s.getMonth() + 1);
    }
  } else if (bucketSize === "quarter") {
    const s = new Date(startISO.slice(0, 7) + "-01T00:00:00");
    s.setMonth(Math.floor(s.getMonth() / 3) * 3, 1);
    const e = new Date(endISO.slice(0, 7) + "-01T00:00:00");
    while (s <= e) {
      keys.push(`${s.getFullYear()}-Q${Math.floor(s.getMonth() / 3) + 1}`);
      s.setMonth(s.getMonth() + 3);
    }
  }

  return keys;
}

// Returns { buckets: [{ key, label, amount, count }], bucketSize }
// Only expenses paid by the user count toward bar height.
export function getChartData(expenses, userId, userEmail, rangeKey) {
  const myExpenses = expenses.filter(
    (e) => e.paidBy === userId || e.paidBy === userEmail,
  );

  let bucketSize;
  if (rangeKey === "30d") {
    bucketSize = "day";
  } else if (rangeKey === "3m") {
    bucketSize = "week";
  } else if (rangeKey === "6m" || rangeKey === "year") {
    bucketSize = "month";
  } else {
    // all time — bucket size driven by actual data span
    if (myExpenses.length === 0) return { buckets: [], bucketSize: "month" };
    const sorted = myExpenses.map((e) => e.date).sort();
    bucketSize =
      monthsBetween(sorted[0], todayISO()) > 24 ? "quarter" : "month";
  }

  const keys = generateBucketKeys(rangeKey, myExpenses, bucketSize);
  const bucketMap = {};
  for (const key of keys) bucketMap[key] = { key, amount: 0, count: 0 };

  for (const e of myExpenses) {
    const key = getBucketKey(e.date, bucketSize);
    if (bucketMap[key]) {
      bucketMap[key].amount = round(bucketMap[key].amount + e.amount);
      bucketMap[key].count++;
    }
  }

  return {
    buckets: keys.map((key) => ({
      ...bucketMap[key],
      label: formatBucketLabel(key, bucketSize),
    })),
    bucketSize,
  };
}
