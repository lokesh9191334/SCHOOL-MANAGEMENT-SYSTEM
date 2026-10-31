import { jsPDF } from 'jspdf'
import { currentCurrency } from '../utils/currency'

/* Premium A5 fee receipt. The Mukta font covers the ₹ glyph, which the
   built-in Helvetica cannot — it is fetched lazily on first download and the
   amount falls back to "Rs." if the font is unavailable. The $ symbol always
   uses the base font. School identity comes from /api/payment-config so the
   same receipt prints on every device. */

const FONT_URL = '/fonts/Mukta-Regular.ttf'
const FONT_FILE = 'Mukta-Regular.ttf'
const FONT_FAMILY = 'Mukta'

const NAVY = [16, 24, 47]
const INK = [15, 23, 42]
const SLATE = [92, 107, 140]
const MUTED = [116, 130, 156]
const GOLD = [201, 154, 60]
const LINE = [226, 232, 240]
const SOFT = [244, 246, 251]

const STATUS_STYLES = {
  Verified: { text: [21, 128, 61], bg: [220, 252, 231], border: [134, 239, 172] },
  Rejected: { text: [185, 28, 28], bg: [254, 226, 226], border: [252, 165, 165] },
  'Verification pending': { text: [180, 83, 9], bg: [254, 243, 199], border: [253, 230, 138] },
}

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

function cleanText(value) {
  return String(value ?? '').trim()
}

/** Fit text into a box, shrinking the font before truncating. Returns the
    lines to draw and the size the drawing code must apply. */
function wrapText(doc, value, maxWidth, size, maxLines = 1) {
  const text = cleanText(value)
  if (!text) return { lines: [], size }
  let current = size
  doc.setFontSize(current)
  let lines = doc.splitTextToSize(text, maxWidth).filter(Boolean)
  while (lines.length > maxLines && current > 5) {
    current = Math.max(5, Math.round((current - 0.2) * 10) / 10)
    doc.setFontSize(current)
    lines = doc.splitTextToSize(text, maxWidth).filter(Boolean)
  }
  return { lines: lines.slice(0, maxLines), size: current }
}

function detailRow(doc, x, y, labelWidth, valueWidth, label, value, size = 7.4) {
  doc.setFontSize(6.1)
  doc.setTextColor(...MUTED)
  doc.text(label.toUpperCase(), x, y)
  const fit = wrapText(doc, value, valueWidth, size, 1)
  doc.setTextColor(...INK)
  doc.text(fit.lines[0] || '—', x + labelWidth, y)
}

function sectionCaption(doc, x, y, width, text) {
  doc.setFontSize(6.2)
  doc.setTextColor(...MUTED)
  const label = text.toUpperCase()
  doc.text(label, x, y)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.25)
  const start = Math.min(x + doc.getTextWidth(label) + 2.5, x + width - 6)
  doc.line(start, y - 0.9, x + width, y - 0.9)
}

function logoFormat(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,/.exec(String(dataUrl || ''))
  if (!match) return ''
  return match[1] === 'jpeg' ? 'JPEG' : match[1].toUpperCase()
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

  const schoolName = cleanText(config.schoolName)
  const schoolAddress = cleanText(config.schoolAddress)
  const schoolPhone = cleanText(config.schoolPhone)
  const schoolEmail = cleanText(config.schoolEmail)
  const schoolWebsite = cleanText(config.schoolWebsite)
  const principalName = cleanText(config.principalName)
  const classTeacherName = cleanText(config.classTeacherName)
  const classTeacherPhone = cleanText(config.classTeacherPhone)

  const status = cleanText(payment.status) || 'Verification pending'
  const style = STATUS_STYLES[status] || { text: SLATE, bg: [241, 245, 249], border: [203, 213, 225] }

  const created = new Date(payment.createdAt || Date.now())
  const createdValid = !Number.isNaN(created.getTime())
  const dateText = createdValid ? created.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const timeText = createdValid ? created.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
  const reviewed = payment.reviewedAt ? new Date(payment.reviewedAt) : null
  const reviewText = reviewed && !Number.isNaN(reviewed.getTime())
    ? reviewed.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.5)
  doc.roundedRect(9, 9, 130, 192, 3, 3, 'S')

  // Header band
  doc.setFillColor(...NAVY)
  doc.roundedRect(9, 9, 130, 38, 3, 3, 'F')
  doc.rect(9, 40, 130, 7, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(9, 47, 130, 0.9, 'F')

  const hLeft = 16
  const hRight = 131

  const logoFormatName = logoFormat(config.schoolLogo)
  const textX = logoFormatName ? 36 : hLeft
  const textWidth = logoFormatName ? 54 : 74
  if (logoFormatName) {
    doc.addImage(String(config.schoolLogo), logoFormatName, 14, 13.5, 17, 17)
  }

  doc.setFontSize(6.3)
  doc.setTextColor(...GOLD)
  doc.text(schoolName ? 'FEE PAYMENT RECEIPT' : 'OFFICIAL DOCUMENT', textX, 15.6)

  const titleFit = wrapText(doc, schoolName || 'Fee Payment Receipt', textWidth, 13, 1)
  doc.setFontSize(titleFit.size)
  doc.setTextColor(255, 255, 255)
  doc.text(titleFit.lines[0] || 'Fee Payment Receipt', textX, 22.6)

  let headY = 28.8
  if (schoolAddress) {
    const addressFit = wrapText(doc, schoolAddress, textWidth, 6.7, 2)
    doc.setFontSize(addressFit.size)
    doc.setTextColor(190, 201, 224)
    doc.text(addressFit.lines, textX, headY, { lineHeightFactor: 1.25 })
    headY += addressFit.lines.length * 3.5 + 0.9
  }

  const contactLine = [schoolPhone, schoolEmail, schoolWebsite].filter(Boolean).join('  ·  ')
  if (contactLine) {
    const contactFit = wrapText(doc, contactLine, textWidth, 6.6, logoFormatName ? 2 : 1)
    const contactLines = contactFit.lines.map((line) => line.replace(/\s*·\s*$/, ''))
    doc.setFontSize(contactFit.size)
    doc.setTextColor(208, 217, 236)
    doc.text(contactLines, textX, Math.max(headY, 29.4), { lineHeightFactor: 1.18 })
  }

  doc.setFontSize(5.9)
  doc.setTextColor(150, 163, 196)
  doc.text('RECEIPT NO.', hRight, 16)
  const receiptFit = wrapText(doc, payment.receiptNo || payment.id, 40, 7.3, 1)
  doc.setFontSize(receiptFit.size)
  doc.setTextColor(255, 255, 255)
  doc.text(receiptFit.lines[0] || '—', hRight, 20.9, { align: 'right' })

  doc.setFontSize(5.9)
  doc.setTextColor(150, 163, 196)
  doc.text('DATE', hRight, 27)
  doc.setFontSize(7.2)
  doc.setTextColor(255, 255, 255)
  doc.text(dateText, hRight, 31.3, { align: 'right' })
  doc.setFontSize(6.2)
  doc.setTextColor(190, 201, 224)
  doc.text(timeText, hRight, 35.4, { align: 'right' })

  // Amount panel
  doc.setFillColor(...SOFT)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(15, 53, 118, 32, 2.6, 2.6, 'FD')

  doc.setFontSize(6.2)
  doc.setTextColor(...MUTED)
  doc.text('AMOUNT PAID', 20, 60.2)

  const amountFit = wrapText(doc, `${rupee}${formatIndian(payment.amount)}`, 70, 20, 1)
  doc.setFontSize(amountFit.size)
  doc.setTextColor(...INK)
  doc.text(amountFit.lines[0] || `${rupee}0`, 20, 69.6)

  const wordsFit = wrapText(doc, amountInWords(payment.amount, currency.word), 70, 6.8, 2)
  doc.setFontSize(wordsFit.size)
  doc.setTextColor(...SLATE)
  doc.text(wordsFit.lines, 20, 75.9, { lineHeightFactor: 1.2 })

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.25)
  doc.line(94.5, 57.5, 94.5, 80.5)

  doc.setFontSize(6.2)
  doc.setTextColor(...MUTED)
  doc.text('STATUS', 99, 60.2)

  doc.setFillColor(...style.bg)
  doc.setDrawColor(...style.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(99, 62, 31, 10.5, 2.5, 2.5, 'FD')
  const statusFit = wrapText(doc, status, 27, 6.2, 2)
  doc.setFontSize(statusFit.size)
  doc.setTextColor(...style.text)
  if (statusFit.lines.length > 1) {
    doc.text(statusFit.lines, 114.5, 66.4, { align: 'center', lineHeightFactor: 1.15 })
  } else {
    doc.text(statusFit.lines[0] || '—', 114.5, 68.6, { align: 'center' })
  }

  doc.setFontSize(6.2)
  doc.setTextColor(...MUTED)
  doc.text('PAID VIA', 99, 79)
  const methodFit = wrapText(doc, payment.method || 'UPI', 24, 7.6, 1)
  doc.setFontSize(methodFit.size)
  doc.setTextColor(...INK)
  doc.text(methodFit.lines[0] || 'UPI', 130, 79, { align: 'right' })

  // Student + transaction details
  const colA = 16
  const colB = 79
  sectionCaption(doc, colA, 93, 50, 'Student')
  sectionCaption(doc, colB, 93, 52, 'Transaction')

  const studentRows = [
    ['Student', payment.studentName],
    ['Class / section', payment.className],
    ['Roll no.', payment.rollNo],
    ['Parent', payment.parentName],
  ]
  const transactionRows = [
    ['Transaction ID', payment.id],
    ['UTR / reference', payment.reference],
    ['Method', payment.method || 'UPI'],
    ['Review date', reviewText],
  ]

  let rowY = 99.4
  for (const [label, value] of studentRows) {
    detailRow(doc, colA, rowY, 21, 28, label, value)
    rowY += 6.6
  }
  rowY = 99.4
  for (const [label, value] of transactionRows) {
    detailRow(doc, colB, rowY, 17, 35, label, value)
    rowY += 6.6
  }

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.25)
  doc.line(16, 125, 131, 125)

  // School payment account
  sectionCaption(doc, colA, 131, 115, 'Payment account')
  const accountRows = [
    ['UPI ID', config.upiId],
    ['Account name', config.holderName],
    ['Bank', [config.bankName, config.bankAccount ? `A/C ${config.bankAccount}` : '', config.bankIfsc ? `IFSC ${config.bankIfsc}` : ''].filter(Boolean).join(' · ')],
  ].filter(([, value]) => cleanText(value))

  let accountY = 137.2
  if (accountRows.length) {
    for (const [label, value] of accountRows) {
      detailRow(doc, colA, accountY, 27, 88, label, value)
      accountY += 6.2
    }
  } else {
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text('The school has not added bank or UPI details yet.', colA, accountY)
    accountY += 6.2
  }

  // Help block
  sectionCaption(doc, colA, accountY + 5.6, 115, 'Assistance')
  let helpY = accountY + 11.6
  detailRow(doc, colA, helpY, 27, 88, 'Class teacher', [classTeacherName, classTeacherPhone].filter(Boolean).join(' · '))
  helpY += 6.2
  detailRow(doc, colA, helpY, 27, 88, 'School help', [schoolPhone, schoolEmail, schoolWebsite].filter(Boolean).join(' · '))

  // Footer
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(16, 175.5, 131, 175.5)

  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('Thank you for your payment.', 16, 181.2)

  doc.setFontSize(5.7)
  doc.setTextColor(...MUTED)
  doc.text('This is a computer-generated receipt. Please keep it for your records.', 16, 185.6)
  doc.text(`Downloaded on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 16, 189)

  doc.setDrawColor(...SLATE)
  doc.setLineWidth(0.3)
  doc.line(96, 181, 125, 181)
  doc.setFontSize(6.2)
  doc.setTextColor(...MUTED)
  doc.text('Authorised signatory', 125, 185, { align: 'right' })
  doc.setFontSize(7.4)
  doc.setTextColor(...INK)
  doc.text(principalName || schoolName || 'School office', 125, 189.2, { align: 'right' })

  return doc
}

export async function downloadPaymentReceipt(payment, config = {}) {
  const doc = await buildReceipt(payment, config)
  const name = String(payment.receiptNo || payment.id || 'receipt').replace(/[^\w-]+/g, '-')
  doc.save(`Receipt-${name}.pdf`)
}
