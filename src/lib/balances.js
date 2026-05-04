// Round to 2dp to avoid floating point dust in displayed totals.
function round(n) {
  return Math.round(n * 100) / 100
}

// Returns { [userId]: netAmount } where positive = owed, negative = owes.
// Soft-deleted expenses are filtered upstream by storage.getActiveExpensesForGroup,
// but we double-check here so this function is safe with any expense list.
export function calculateNetBalances(expenses, members) {
  const balances = {}
  // When a pending member registers, their split entries still hold their email
  // as the userId. Build an email→key map so those entries resolve correctly.
  const emailToKey = {}
  for (const m of members) {
    // Pending members have no userId; key them by email so their share still
    // counts. AddExpenseModal saves split userIds the same way.
    const key = m.userId || m.email
    if (key) {
      balances[key] = 0
      if (m.email) emailToKey[m.email] = key
    }
  }
  for (const e of expenses) {
    if (e.isDeleted) continue
    if (!e.splits?.length) continue
    if (balances[e.paidBy] !== undefined) {
      balances[e.paidBy] += e.amount
    }
    for (const s of e.splits) {
      const key = emailToKey[s.userId] ?? s.userId
      if (balances[key] !== undefined) {
        balances[key] -= s.amount
      }
    }
  }
  for (const k of Object.keys(balances)) balances[k] = round(balances[k])
  return balances
}

// Greedy min-settlements: pair largest creditor with largest debtor until
// everyone is balanced. Produces fewer transfers than naive per-expense IOUs.
export function settleDebts(balances) {
  const creditors = []
  const debtors = []
  for (const [userId, amount] of Object.entries(balances)) {
    if (amount > 0.01) creditors.push({ userId, amount })
    else if (amount < -0.01) debtors.push({ userId, amount: -amount })
  }
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const settlements = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    settlements.push({
      from: debtors[i].userId,
      to: creditors[j].userId,
      amount: round(pay),
    })
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }
  return settlements
}

// Convenience for the dashboard cards.
export function userBalanceInGroup(expenses, members, userId) {
  const balances = calculateNetBalances(expenses, members)
  return balances[userId] ?? 0
}
