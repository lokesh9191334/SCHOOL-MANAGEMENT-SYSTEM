import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AppShell from '../src/layouts/AppShell.jsx'
import DashboardPage from '../src/pages/dashboard/index.jsx'

try {
  const html = renderToString(
    createElement(
      MemoryRouter,
      { initialEntries: ['/dashboard'] },
      createElement(
        Routes,
        null,
        createElement(
          Route,
          { element: createElement(AppShell) },
          createElement(Route, { path: '/dashboard', element: createElement(DashboardPage) }),
        ),
      ),
    ),
  )
  console.log('render ok, length', html.length)
  console.log(html.slice(0, 300))
} catch (err) {
  console.error('RENDER FAILED')
  console.error(err)
  process.exit(1)
}
