import './DashboardLayout.css'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const DashboardLayout = ({ sections = [], activeSection, onSectionChange, children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`dashboard-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar sections={sections} collapsed={sidebarCollapsed} />

      <div className="dashboard-content">
        <Topbar
          title={sections.find((item) => item.key === activeSection)?.label ?? 'Dashboard'}
          onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
        />

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
