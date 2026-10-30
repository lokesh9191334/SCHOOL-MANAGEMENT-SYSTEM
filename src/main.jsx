import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { installSessionExpiryGuard } from './utils/session.js'

installSessionExpiryGuard()

try {
  const theme = localStorage.getItem('sms_theme')
  if (theme === 'dark') document.documentElement.classList.add('sms-dark')
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

const bootSplash = document.getElementById('boot-splash')
if (bootSplash) {
  const MIN_SPLASH_MS = 700
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const wait = Math.max(0, MIN_SPLASH_MS - performance.now())
      window.setTimeout(() => {
        bootSplash.classList.add('boot-splash--hide')
        window.setTimeout(() => bootSplash.remove(), 520)
      }, wait)
    }),
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline / blocked */
    })
  })
}
