import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

try {
  const theme = localStorage.getItem('sms_theme')
  if (theme === 'dark') document.documentElement.classList.add('sms-dark')
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline / blocked */
    })
  })
}
