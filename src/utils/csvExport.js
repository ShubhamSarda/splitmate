export function downloadReport(expenses, userId, userEmail) {
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const header = [
    "Date",
    "Group",
    "Description",
    "Category",
    "Total Amount",
    "Paid By",
    "My Share",
    "Notes",
  ]
    .map(escape)
    .join(",");

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const dataRows = sorted.map((e) => {
    const myShareSplit = e.splits.find(
      (s) => s.userId === userId || s.userId === userEmail,
    );
    const myShare = myShareSplit ? Number(myShareSplit.amount).toFixed(2) : "";

    return [
      e.date,
      e._groupName,
      e.description,
      e.category || "Other",
      Number(e.amount).toFixed(2),
      e._paidByName,
      myShare,
      e.notes || "",
    ]
      .map(escape)
      .join(",");
  });

  const csv = [header, ...dataRows].join("\r\n");

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `splitmate-report-${yyyy}-${mm}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
