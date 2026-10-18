import { jsPDF } from 'jspdf'
import { currentCurrency } from '../utils/currency'

/* Compact A5 fee receipt. The Mukta font covers the ₹ glyph, which the
   built-in Helvetica cannot — it is fetched lazily on first download and the
   amount falls back to "Rs." if the font is unavailable. The $ symbol always
   uses the base font. */

const FONT_URL = '/fonts/Mukta-Regular.ttf'
const FONT_FILE = 'Mukta-Regular.ttf'
const FONT_FAMILY = 'Mukta'

let fontPromise = null

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function loadFont() {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Font request failed (${response.status})`)
        return response.arrayBuffer()
      })
      .then(arrayBufferToBase64)
      .catch(() => null)
  }
  return fontPromise
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function under100(value) {
  if (value < 20) return ONES[value]
  return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ''}`
}

function under1000(value) {
  const hundreds = Math.floor(value / 100)
  const rest = value % 100
  if (hundreds && rest) return `${ONES[hundreds]} Hundred ${under100(rest)}`
  if (hundreds) return `${ONES[hundreds]} Hundred`
  return under100(rest)
}

export function amountInWords(amount, currencyWord = 'Rupees') {
  const value = Math.floor(Math.abs(Number(amount) || 0))
  if (value <= 0) return `Zero ${currencyWord} Only`
  const crore = Math.floor(value / 10000000)
  const lakh = Math.floor((value % 10000000) / 100000)
  const thousand = Math.floor((value % 100000) / 1000)
  const rest = value % 1000
  const parts = []
  if (crore) parts.push(`${under1000(crore)} Crore`)
  if (lakh) parts.push(`${under100(lakh)} Lakh`)
  if (thousand) parts.push(`${under100(thousand)} Thousand`)
  if (rest) parts.push(under1000(rest))
  return `${parts.join(' ')} ${currencyWord} Only`
}

function formatIndian(amount) {
  return Number(amount || 0).toLocaleString('en-IN')
}

const STATUS_COLORS = {
  Verified: [21, 128, 61],
  Rejected: [185, 28, 28],
  'Verification pending': [180, 83, 9],
}

export async function buildReceipt(payment, config = {}) {
  const fontBase64 = await loadFont()
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  if (fontBase64) {
    doc.addFileToVFS(FONT_FILE, fontBase64)
    doc.addFont(FONT_FILE, FONT_FAMILY, 'normal')
    doc.setFont(FONT_FAMILY)
  }
  const currency = currentCurrency()
  const rupee = currency.value === 'USD' ? '$' : fontBase64 ? '\u20B9' : 'Rs.'
  const pageWidth = 148
  const left = 12
  const right = pageWidth - 12
  const columnWidth = (right - left - 6) / 2

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.rect(6, 6, pageWidth - 12, 198)

  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text('FEE PAYMENT RECEIPT', pageWidth / 2, 18, { align: 'center' })
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Received with thanks', pageWidth / 2, 23.5, { align: 'center' })
  doc.setDrawColor(226, 232, 240)
  doc.line(left, 27, right, 27)

  const date = new Date(payment.createdAt || Date.now())
  const dateText = Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
  const timeText = Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })

  const rows = [
    ['Receipt No', payment.receiptNo || payment.id || '-', 'Date', dateText],
    ['Transaction ID', payment.id || '-', 'Time', timeText],
    ['Student', payment.studentName || '-', 'Class / Roll', `${payment.className || '-'} / ${payment.rollNo || '-'}`],
    ['Parent', payment.parentName || '-', 'Method', payment.method || 'UPI'],
  ]

  let y = 35
  for (const [labelA, valueA, labelB, valueB] of rows) {
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(String(labelA).toUpperCase(), left, y)
    doc.text(String(labelB).toUpperCase(), left + columnWidth + 6, y)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(doc.splitTextToSize(String(valueA), columnWidth)[0], left, y + 5)
    doc.text(doc.splitTextToSize(String(valueB), columnWidth)[0], left + columnWidth + 6, y + 5)
    y += 14
  }

  y = 92
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(left, y, right - left, 24, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('AMOUNT PAID', pageWidth / 2, y + 6, { align: 'center' })
  doc.setFontSize(19)
  doc.setTextColor(15, 23, 42)
  doc.text(`${rupee}${formatIndian(payment.amount)}`, pageWidth / 2, y + 15, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(doc.splitTextToSize(amountInWords(payment.amount, currency.word), right - left - 8)[0], pageWidth / 2, y + 20.5, { align: 'center' })

  y = 126
  const pairs = [
    ['UTR / Reference', payment.reference || '-'],
    ['UPI ID', config.upiId || ''],
    ['Bank', [config.bankName, config.bankAccount ? `A/C ${config.bankAccount}` : '', config.bankIfsc ? `IFSC ${config.bankIfsc}` : ''].filter(Boolean).join(' · ')],
    ['Received by', config.holderName || ''],
  ].filter(([, value]) => value)

  for (const [label, value] of pairs) {
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(String(label).toUpperCase(), left, y)
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    const lines = doc.splitTextToSize(String(value), right - left)
    doc.text(lines[0], left + 38, y)
    y += 8
  }

  const status = String(payment.status || 'Verification pending')
  const statusColor = STATUS_COLORS[status] || [100, 116, 139]
  y += 2
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('STATUS', left, y)
  doc.setFontSize(10)
  doc.setTextColor(...statusColor)
  doc.text(status, left + 38, y)

  doc.setDrawColor(226, 232, 240)
  doc.line(left, 178, right, 178)
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('This is a computer-generated receipt. Keep it for your records.', left, 184)
  doc.text(`Downloaded on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, left, 188.5)
  return doc
}

export async function downloadPaymentReceipt(payment, config = {}) {
  const doc = await buildReceipt(payment, config)
  const name = String(payment.receiptNo || payment.id || 'receipt').replace(/[^\w-]+/g, '-')
  doc.save(`Receipt-${name}.pdf`)
}
