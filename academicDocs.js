import { Buffer } from 'node:buffer'
import { jsPDF } from 'jspdf'

const NAVY = [22, 30, 58]
const ACCENT = [65, 87, 255]
const MUTED = [110, 122, 150]
const ROW_ALT = [244, 246, 252]
const BORDER = [222, 227, 240]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function publishedLabel(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function dayFromIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return String(value || '—')
  const [, month, day] = value.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${value.slice(0, 4)}`
}

function fitText(doc, value, maxWidth) {
  const text = String(value ?? '').trim() || '—'
  if (doc.getTextWidth(text) <= maxWidth) return text
  let trimmed = text
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed.trim()}…`
}

function drawPageFooter(doc) {
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.6)
    doc.line(40, height - 34, width - 40, height - 34)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('School Management System', 40, height - 20)
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 20, { align: 'right' })
  }
}

function drawHeader(doc, { kicker, title, subtitle, meta }) {
  const width = doc.internal.pageSize.getWidth()
  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, width, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ACCENT)
  doc.text(String(kicker).toUpperCase(), 40, 34, { charSpace: 1.4 })
  doc.setFontSize(21)
  doc.setTextColor(...NAVY)
  doc.text(title, 40, 60)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(subtitle, 40, 78)
  if (meta) {
    doc.setFontSize(9)
    doc.text(meta, width - 40, 60, { align: 'right' })
  }
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(1)
  doc.line(40, 90, width - 40, 90)
}

function drawTableHeader(doc, columns, x, y, height) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)
  doc.setFillColor(...NAVY)
  doc.rect(x, y, totalWidth, height, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  let cursor = x
  columns.forEach((column) => {
    doc.text(column.label, cursor + 6, y + height / 2 + 3)
    cursor += column.width
  })
}

function drawRow(doc, columns, x, y, height, values, index) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)
  if (index % 2 === 1) {
    doc.setFillColor(...ROW_ALT)
    doc.rect(x, y, totalWidth, height, 'F')
  }
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.5)
  doc.line(x, y + height, x + totalWidth, y + height)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  let cursor = x
  columns.forEach((column, columnIndex) => {
    doc.text(fitText(doc, values[columnIndex], column.width - 12), cursor + 6, y + height / 2 + 3)
    cursor += column.width
  })
}

function buildTimetablePdf(docModel) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const rows = Array.isArray(docModel.payload?.rows) ? docModel.payload.rows : []
  const columns = [
    { label: 'Period', width: 62 },
    { label: 'Time', width: 98 },
    { label: 'Subject', width: 216 },
    { label: 'Teacher', width: 196 },
    { label: 'Room', width: 88 },
    { label: 'Duration', width: 102 },
  ]
  drawHeader(doc, {
    kicker: 'Weekly Timetable',
    title: docModel.title || 'Weekly Timetable',
    subtitle: docModel.subtitle || '',
    meta: `Published ${publishedLabel(docModel.publishedAt)}`,
  })
  let y = 108
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)
  const daysWithPeriods = rows.filter((row) => Array.isArray(row.periods) && row.periods.length)
  if (!daysWithPeriods.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text('No periods have been published for this timetable yet.', 40, y + 16)
  }
  daysWithPeriods.forEach((dayRow) => {
    if (y + 24 + 22 + dayRow.periods.length * 20 > pageHeight - 48) {
      doc.addPage()
      drawHeader(doc, {
        kicker: 'Weekly Timetable',
        title: docModel.title || 'Weekly Timetable',
        subtitle: `${docModel.subtitle || ''} (continued)`,
        meta: `Published ${publishedLabel(docModel.publishedAt)}`,
      })
      y = 108
    }
    const dayName = String(dayRow.day || '').replace(/^./, (char) => char.toUpperCase())
    doc.setFillColor(238, 241, 255)
    doc.roundedRect(40, y, tableWidth, 22, 5, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...ACCENT)
    doc.text(dayName, 48, y + 14.5)
    y += 22
    drawTableHeader(doc, columns, 40, y, 22)
    y += 22
    dayRow.periods.forEach((period, index) => {
      drawRow(
        doc,
        columns,
        40,
        y,
        20,
        [
          `Period ${index + 1}`,
          period.time || '—',
          period.subject || '—',
          period.teacher || '—',
          period.room || '—',
          period.duration ? `${period.duration} min` : '—',
        ],
        index,
      )
      y += 20
    })
    y += 16
  })
  drawPageFooter(doc)
  return Buffer.from(doc.output('arraybuffer'))
}

function buildDatesheetPdf(docModel) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const rows = Array.isArray(docModel.payload?.rows) ? docModel.payload.rows : []
  const examName = docModel.payload?.examName || docModel.subtitle || 'Examination'
  const className = docModel.payload?.className || ''
  const columns = [
    { label: '#', width: 30 },
    { label: 'Date', width: 88 },
    { label: 'Day', width: 58 },
    { label: 'Subject', width: 171 },
    { label: 'Time', width: 98 },
    { label: 'Room', width: 70 },
  ]
  drawHeader(doc, {
    kicker: 'Examination Datesheet',
    title: examName,
    subtitle: [className, `Published ${publishedLabel(docModel.publishedAt)}`].filter(Boolean).join(' · '),
    meta: docModel.payload?.schoolName || '',
  })
  let y = 108
  if (!rows.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text('No papers have been scheduled for this datesheet yet.', 40, y + 16)
  } else {
    drawTableHeader(doc, columns, 40, y, 24)
    y += 24
    rows.forEach((row, index) => {
      if (y + 22 > pageHeight - 48) {
        doc.addPage()
        drawHeader(doc, {
          kicker: 'Examination Datesheet',
          title: examName,
          subtitle: `${className ? `${className} · ` : ''}(continued)`,
          meta: '',
        })
        y = 108
        drawTableHeader(doc, columns, 40, y, 24)
        y += 24
      }
      drawRow(
        doc,
        columns,
        40,
        y,
        22,
        [
          String(index + 1),
          dateLabel(row.date),
          dayFromIso(row.date),
          row.subject || '—',
          row.time || '—',
          row.room || '—',
        ],
        index,
      )
      y += 22
    })
    y += 18
    if (y < pageHeight - 60) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      doc.text('Dates, timings and rooms are as published by the school. Reach out to the school office for any clarification.', 40, y)
    }
  }
  drawPageFooter(doc)
  return Buffer.from(doc.output('arraybuffer'))
}

export function buildAcademicPdf(docModel) {
  if (!docModel || !['timetable', 'datesheet'].includes(docModel.type)) {
    throw new Error('Unsupported academic document type.')
  }
  return docModel.type === 'timetable' ? buildTimetablePdf(docModel) : buildDatesheetPdf(docModel)
}

export function academicPdfFilename(docModel) {
  const label = [docModel?.title, docModel?.subtitle]
    .filter(Boolean)
    .join(' ')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Academic_Document'
  const date = new Date(docModel?.publishedAt || Date.now())
  const stamp = Number.isNaN(date.getTime()) ? '' : `_${date.toISOString().slice(0, 10)}`
  return `${label}${stamp}.pdf`
}
