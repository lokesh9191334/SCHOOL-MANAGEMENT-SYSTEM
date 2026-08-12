import { useEffect, useState } from 'react'
import './InstallApp.css'

const DISMISS_KEY = 'sms_install_dismissed_at'

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const at = Number(raw)
    if (Number.isNaN(at)) return false
    return Date.now() - at < 7 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export default function InstallApp() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (standalone) {
      setInstalled(true)
      return undefined
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios|edgios/i.test(window.navigator.userAgent)

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferred(event)
      if (!wasDismissedRecently()) setVisible(true)
    }

    const onInstalled = () => {
      setInstalled(true)
      setVisible(false)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    if (isIos && isSafari && !wasDismissedRecently()) {
      setIosHint(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try {
      await deferred.userChoice
    } catch {
      /* ignore */
    }
    setDeferred(null)
    setVisible(false)
  }

  return (
    <div className="sms-install" role="dialog" aria-label="Install SMS app">
      <div className="sms-install__icon" aria-hidden>
        <img src="/icons/icon-192.png" alt="" width="44" height="44" />
      </div>
      <div className="sms-install__copy">
        <strong>Install SMS on this phone</strong>
        <p>
          {iosHint
            ? 'Tap Share, then Add to Home Screen for a full-screen campus app.'
            : 'Download the app for faster access, offline shell, and home-screen launch.'}
        </p>
      </div>
      <div className="sms-install__actions">
        {!iosHint ? (
          <button type="button" className="sms-install__primary" onClick={install} disabled={!deferred}>
            Download
          </button>
        ) : null}
        <button type="button" className="sms-install__ghost" onClick={dismiss}>
          Later
        </button>
      </div>
    </div>
  )
}
