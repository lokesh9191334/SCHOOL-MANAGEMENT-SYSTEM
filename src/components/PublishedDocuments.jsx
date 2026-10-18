import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  academicPdfName,
  academicPdfObjectUrl,
  downloadAcademicPdf,
  listAcademicDocuments,
} from '../services/academicDocuments'
import './PublishedDocuments.css'

const EMAIL_LABELS = {
  queued: 'Email queued',
  sent: 'Email sent',
  partial: 'Email partial',
  failed: 'Email failed',
  unavailable: 'Email not configured',
  disabled: 'Email disabled',
}

function emailBadgeText(email) {
  if (!email?.status) return ''
  if (email.status === 'sent' && !email.recipients) return 'Email · no addresses on record'
  const label = EMAIL_LABELS[email.status] || email.status
  if (Number(email.recipients) > 0) {
    return `${label} · ${Number(email.sent) || 0}/${email.recipients}`
  }
  return label
}

function emailTone(status) {
  if (status === 'sent') return 'success'
  if (status === 'queued') return 'info'
  if (status === 'partial') return 'warning'
  if (status === 'failed') return 'danger'
  return 'muted'
}

function formatMoment(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function docMeta(doc) {
  if (doc.type === 'timetable') {
    const grades = {
      'pre-primary': 'Pre-Primary',
      primary: 'Primary',
      middle: 'Middle',
      secondary: 'Secondary',
      senior: 'Senior',
    }
    const grade = grades[doc.payload?.grade] || doc.payload?.grade || ''
    const section = doc.payload?.section || ''
    const days = Array.isArray(doc.payload?.rows) ? doc.payload.rows.length : 0
    const periods = (doc.payload?.rows || []).reduce(
      (sum, row) => sum + (Array.isArray(row.periods) ? row.periods.length : 0),
      0,
    )
    return [
      grade ? `Grade: ${grade}` : '',
      section ? `Section ${section}` : '',
      days ? `${days} day${days === 1 ? '' : 's'}` : '',
      periods ? `${periods} periods` : '',
      Number(doc.version) > 1 ? `Version ${doc.version}` : '',
    ].filter(Boolean)
  }
  const rows = Array.isArray(doc.payload?.rows) ? doc.payload.rows : []
  return [
    doc.payload?.className || '',
    rows.length ? `${rows.length} paper${rows.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
}

export default function PublishedDocuments({
  type = 'all',
  title = 'Published documents',
  description = '',
  showEmailStatus = false,
  emptyHint = '',
  reloadToken = 0,
}) {
  const [docs, setDocs] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [preview, setPreview] = useState(null)
  const previewUrlRef = useRef('')

  useEffect(() => {
    let cancelled = false
    listAcademicDocuments(type)
      .then((rows) => {
        if (cancelled) return
        setDocs(rows)
        setStatus('ready')
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError?.message || 'Could not load published documents.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [type, refreshKey, reloadToken])

  const hasQueued = useMemo(
    () => docs.some((doc) => doc?.email?.status === 'queued'),
    [docs],
  )

  useEffect(() => {
    if (!hasQueued) return undefined
    const timer = setInterval(() => setRefreshKey((key) => key + 1), 12000)
    return () => clearInterval(timer)
  }, [hasQueued])

  const closePreview = () => {
    setPreview(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
  }

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  useEffect(() => {
    if (!preview) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setPreview(null)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [preview])

  const runAction = async (doc, action) => {
    setBusy(`${doc.id}:${action}`)
    setActionError('')
    try {
      if (action === 'view') {
        const url = await academicPdfObjectUrl(doc)
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = url
        setPreview({ doc, url })
      } else {
        await downloadAcademicPdf(doc)
      }
    } catch (actionFailure) {
      setActionError(actionFailure?.message || 'The PDF could not be opened.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="acad-docs">
      <div className="acad-docs__head">
        <div>
          <p className="acad-docs__label">{type === 'datesheet' ? 'Datesheets' : type === 'timetable' ? 'Timetables' : 'Academic documents'}</p>
          <h3>{title}</h3>
          {description ? <p className="acad-docs__intro">{description}</p> : null}
        </div>
        <button
          type="button"
          className="acad-docs__refresh"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          Refresh
        </button>
      </div>

      {actionError ? <p className="acad-docs__error">{actionError}</p> : null}
      {status === 'error' ? <p className="acad-docs__error">{error}</p> : null}

      {status === 'loading' && !docs.length ? (
        <p className="acad-docs__empty">Loading published documents…</p>
      ) : null}

      {status === 'ready' && !docs.length ? (
        <div className="acad-docs__empty">
          <strong>Nothing published yet</strong>
          <span>{emptyHint || 'Published timetables and datesheets will appear here for every parent.'}</span>
        </div>
      ) : null}

      {docs.length ? (
        <div className="acad-docs__grid">
          {docs.map((doc) => {
            const meta = docMeta(doc)
            const email = doc.email || null
            return (
              <article key={doc.id} className="acad-doc">
                <div className="acad-doc__top">
                  <span className={`acad-doc__type acad-doc__type--${doc.type}`}>
                    {doc.type === 'timetable' ? 'Timetable' : 'Datesheet'}
                  </span>
                  <span className="acad-doc__date">{formatMoment(doc.publishedAt)}</span>
                </div>
                <h4>{doc.title || 'Academic document'}</h4>
                {doc.subtitle ? <p className="acad-doc__subtitle">{doc.subtitle}</p> : null}
                {meta.length ? (
                  <div className="acad-doc__meta">
                    {meta.map((entry) => (
                      <span key={entry}>{entry}</span>
                    ))}
                  </div>
                ) : null}
                {showEmailStatus && email ? (
                  <span
                    className={`acad-doc__email acad-doc__email--${emailTone(email.status)}`}
                    title={Array.isArray(email.errors) && email.errors.length ? email.errors.join('\n') : ''}
                  >
                    {emailBadgeText(email)}
                  </span>
                ) : null}
                <div className="acad-doc__actions">
                  <button
                    type="button"
                    onClick={() => runAction(doc, 'view')}
                    disabled={Boolean(busy)}
                  >
                    {busy === `${doc.id}:view` ? 'Opening…' : 'View PDF'}
                  </button>
                  <button
                    type="button"
                    className="acad-doc__download"
                    onClick={() => runAction(doc, 'download')}
                    disabled={Boolean(busy)}
                    title={`Download ${academicPdfName(doc)}`}
                  >
                    {busy === `${doc.id}:download` ? 'Preparing…' : 'Download'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {preview
        ? createPortal(
            <div className="acad-preview" role="dialog" aria-modal="true" aria-label={`${preview.doc.title || 'Academic document'} PDF`}>
              <div className="acad-preview__sheet">
                <div className="acad-preview__head">
                  <div className="acad-preview__title">
                    <strong>{preview.doc.title || 'Academic document'}</strong>
                    <span>{preview.doc.subtitle || formatMoment(preview.doc.publishedAt)}</span>
                  </div>
                  <div className="acad-preview__actions">
                    <a
                      className="acad-preview__download"
                      href={preview.url}
                      download={academicPdfName(preview.doc)}
                    >
                      Download
                    </a>
                    <a
                      className="acad-preview__newtab"
                      href={preview.url}
                      target="_blank"
                      rel="noopener"
                    >
                      New tab
                    </a>
                    <button type="button" className="acad-preview__close" onClick={closePreview}>
                      Close
                    </button>
                  </div>
                </div>
                <div className="acad-preview__frame">
                  <iframe src={preview.url} title={`${preview.doc.title || 'Academic document'} PDF`} />
                </div>
                <p className="acad-preview__hint">
                  If the preview does not load on this device, use Download or New tab to open the PDF.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
