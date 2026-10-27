/* Daily planning for driver tracking links sent over WhatsApp.
   Pure orchestration: the actual message send is injected, so the caller
   (cron, admin "send now", tests) owns the WhatsApp client. */

import { istParts } from './faceAttendance.js'
import { normalizeWhatsAppPhone } from './whatsappCloud.js'

const MAX_RECORDS_PER_RUN = 200

export function dailyDeliveryStamp(date = new Date()) {
  const ist = istParts(date)
  return { date: ist.date, iso: ist.iso, atIST: `${ist.date} ${ist.time} IST` }
}

export function markAutoSent(record, date = new Date()) {
  const stamp = dailyDeliveryStamp(date)
  return {
    ...record,
    lastAutoSentOn: stamp.date,
    lastAutoSendAt: stamp.iso,
    lastAutoSendAtIST: stamp.atIST,
    lastAutoSendStatus: 'sent',
    lastAutoSendError: '',
  }
}

export function markAutoFailed(record, error, date = new Date()) {
  const stamp = dailyDeliveryStamp(date)
  const message = String(error?.message || 'Could not send WhatsApp message.').replace(/\s+/g, ' ').trim()
  return {
    ...record,
    lastAutoSendAt: stamp.iso,
    lastAutoSendAtIST: stamp.atIST,
    lastAutoSendStatus: 'failed',
    lastAutoSendError: message.slice(0, 240),
  }
}

export function dailySkipReason(record, todayIST) {
  if (!record || !record.id || !record.key) return 'invalid'
  if (record.active === false) return 'off'
  if (record.autoSend !== true) return 'auto-off'
  if (!normalizeWhatsAppPhone(record.phone)) return 'no-phone'
  if (record.lastAutoSentOn && record.lastAutoSentOn === todayIST) return 'sent-already'
  return ''
}

export function planDailyWhatsApp(records, todayIST = istParts().date) {
  const eligible = []
  const skipped = []
  for (const record of Array.isArray(records) ? records.slice(0, MAX_RECORDS_PER_RUN) : []) {
    const reason = dailySkipReason(record, todayIST)
    if (reason) skipped.push({ id: record?.id || '', driverName: record?.driverName || '', reason })
    else eligible.push(record)
  }
  return { eligible, skipped }
}

export function summarizeSkips(skipped) {
  const counts = { off: 0, 'auto-off': 0, invalid: 0, 'no-phone': 0, 'sent-already': 0 }
  for (const item of skipped) counts[item.reason] = (counts[item.reason] || 0) + 1
  return {
    skipped: skipped.length,
    skippedOff: counts.off,
    skippedAutoOff: counts['auto-off'],
    skippedNoPhone: counts['no-phone'],
    skippedAlreadySent: counts['sent-already'],
    skippedInvalid: counts.invalid,
  }
}

async function runWithLimit(items, limit, worker) {
  const queue = [...items]
  const results = []
  const size = Math.max(1, Math.min(Number(limit) || 1, queue.length || 1))
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) {
        const item = queue.shift()
        results.push(await worker(item))
      }
    }),
  )
  return results
}

/**
 * Sends today's link to every eligible key, at most once per IST day.
 * `linkFor(record)` builds the public tracking URL; `send` performs the send.
 * On failure the key is NOT marked as sent, so a manual retry can run later
 * the same day.
 */
export async function runDailyWhatsApp({
  records,
  todayIST = istParts().date,
  linkFor,
  send,
  concurrency = 5,
}) {
  if (typeof linkFor !== 'function') throw new Error('linkFor is required')
  if (typeof send !== 'function') throw new Error('send is required')

  const { eligible, skipped } = planDailyWhatsApp(records, todayIST)
  const sent = []
  const failed = []
  const byId = new Map()

  await runWithLimit(eligible, concurrency, async (record) => {
    const link = linkFor(record)
    try {
      const result = await send({
        to: record.phone,
        driverName: record.driverName,
        vehicleLabel: record.vehicleLabel,
        routeLabel: record.routeLabel,
        link,
        record,
      })
      const updated = markAutoSent(record)
      byId.set(record.id, updated)
      sent.push({
        id: record.id,
        driverName: record.driverName,
        messageId: result?.messageId || '',
        atIST: updated.lastAutoSendAtIST,
      })
    } catch (error) {
      const updated = markAutoFailed(record, error)
      byId.set(record.id, updated)
      failed.push({
        id: record.id,
        driverName: record.driverName,
        error: updated.lastAutoSendError,
        status: error?.status || 0,
      })
    }
  })

  const updatedRecords = (Array.isArray(records) ? records : []).map((record) => byId.get(record.id) || record)
  return {
    records: updatedRecords,
    results: [...sent, ...failed],
    sent,
    failed,
    skipped,
    counts: { eligible: eligible.length, sent: sent.length, failed: failed.length, ...summarizeSkips(skipped) },
  }
}
