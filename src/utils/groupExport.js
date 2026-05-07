import { storage } from "../data/storage";

function resolveName(key, members) {
  const m = members.find((x) => x.userId === key || x.email === key);
  return m?.name || m?.email || "Unknown";
}

export function exportGroupHistory(groupId) {
  const group = storage.getGroupById(groupId);
  const members = group?.members ?? [];
  const expenses = storage.getActiveExpensesForGroup(groupId);

  const rows = expenses.map((expense) => {
    const paidBy = resolveName(expense.paidBy, members);

    const splitBetween = (expense.splits ?? [])
      .map((s) => resolveName(s.userId, members))
      .join(", ");

    return {
      date: expense.date,
      description: expense.description,
      category: expense.category || "Other",
      amount: expense.amount,
      paidBy,
      splitBetween,
      notes: expense.notes || "",
    };
  });

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return rows;
}

export function downloadGroupHistory(groupId, groupName) {
  const rows = exportGroupHistory(groupId);

  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const header = [
    "Date",
    "Description",
    "Category",
    "Amount",
    "Paid By",
    "Split Between",
    "Notes",
  ]
    .map(escape)
    .join(",");

  const dataRows = rows.map((r) =>
    [
      r.date,
      r.description,
      r.category,
      Number(r.amount).toFixed(2),
      r.paidBy,
      r.splitBetween,
      r.notes,
    ]
      .map(escape)
      .join(","),
  );

  const csv = [header, ...dataRows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `splitmate-${groupName.toLowerCase().replace(/\s+/g, "-")}-history.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
