// Installment schedule for admission-time fee plans. One academic year is
// split into equal installments by the chosen plan; the last installment
// absorbs the rounding remainder. Shared by server.js (summary + payment
// enforcement) and the parent payment page (display).

export const FEE_PLAN_OPTIONS = [
  { value: 'One Time', label: 'One Time (full year)' },
  { value: '3-3-3-3 Months', label: 'Quarterly (3+3+3+3 months)' },
  { value: '6-6 Months', label: 'Half-yearly (6+6 months)' },
  { value: '12 Months', label: 'Monthly (12 months)' },
]

const PLAN_SPECS = {
  'One Time': { everyMonths: 12, count: 1 },
  'Full Year': { everyMonths: 12, count: 1 },
  '2 Installments': { everyMonths: 6, count: 2 },
  '3 Installments': { everyMonths: 4, count: 3 },
  '3-3-3-3 Months': { everyMonths: 3, count: 4 },
  Quarterly: { everyMonths: 3, count: 4 },
  '6-6 Months': { everyMonths: 6, count: 2 },
  'Half Yearly': { everyMonths: 6, count: 2 },
  '12 Months': { everyMonths: 1, count: 12 },
  Monthly: { everyMonths: 1, count: 12 },
}

export function feePlanSpec(plan) {
  return PLAN_SPECS[String(plan || '').trim()] || null
}

function addMonths(isoDate, months) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  const day = date.getUTCDate()
  date.setUTCMonth(date.getUTCMonth() + months)
  if (date.getUTCDate() < day) date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}

function asAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0
}

/** Split totalFee into `count` equal installments starting at startDate.
    Returns null when the plan, fee or start date is missing/invalid. */
export function buildFeeSchedule({ plan, totalFee, startDate } = {}) {
  const spec = feePlanSpec(plan)
  const fee = asAmount(totalFee)
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) ? String(startDate) : ''
  if (!spec || !fee || !start) return null

  const base = Math.floor((fee / spec.count) * 100) / 100
  const installments = []
  for (let i = 0; i < spec.count; i += 1) {
    const amount = i === spec.count - 1
      ? Math.round((fee - base * (spec.count - 1)) * 100) / 100
      : base
    installments.push({
      index: i + 1,
      amount,
      dueDate: addMonths(start, i * spec.everyMonths),
    })
  }
  return { plan: String(plan).trim(), everyMonths: spec.everyMonths, count: spec.count, totalFee: fee, startDate: start, installments }
}

/** Walk the schedule applying payment credits (oldest first). A payment that
    is Verified or awaiting verification covers the earliest uncovered
    installment. Returns per-installment states and the amount due right now —
    the no-skip rule: missed installments must be paid together. */
export function coverFeeSchedule(schedule, payments, todayIso) {
  if (!schedule || !Array.isArray(schedule.installments)) return null
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ''))
    ? String(todayIso)
    : new Date().toISOString().slice(0, 10)

  const credits = (Array.isArray(payments) ? payments : [])
    .filter((payment) => ['Verified', 'Verification pending'].includes(payment?.status))
    .map((payment) => ({ at: String(payment?.createdAt || ''), amount: asAmount(payment?.amount) }))
    .filter((credit) => credit.amount > 0)
    .sort((a, b) => a.at.localeCompare(b.at))

  let cursor = 0
  let remaining = credits.length ? credits[0].amount : 0
  let dueNow = 0
  const installments = schedule.installments.map((item) => {
    let covered = 0
    while (covered + 0.005 < item.amount && cursor < credits.length) {
      const take = Math.min(remaining, item.amount - covered)
      covered += take
      remaining -= take
      if (remaining <= 0.005) {
        cursor += 1
        remaining = cursor < credits.length ? credits[cursor].amount : 0
      }
    }
    const state = covered >= item.amount - 0.005
      ? 'paid'
      : item.dueDate && item.dueDate <= today
        ? 'due'
        : 'upcoming'
    if (state === 'due') dueNow = Math.round((dueNow + (item.amount - covered)) * 100) / 100
    return { ...item, covered: Math.round(covered * 100) / 100, state }
  })

  return { today, installments, dueNow: Math.round(dueNow * 100) / 100 }
}
