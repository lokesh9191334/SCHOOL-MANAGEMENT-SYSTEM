import { useLocation } from 'react-router-dom'
import PremiumWorkspace from '../components/PremiumWorkspace/PremiumWorkspace'
import { getModuleConfig } from '../data/moduleRegistry'

export default function ModulePage() {
  const { pathname } = useLocation()
  const config = getModuleConfig(pathname)

  if (!config) {
    return (
      <div className="pw-page">
        <section className="pw-hero">
          <div>
            <p className="admin-kicker">Module</p>
            <h2>Workspace unavailable</h2>
            <p>This route is not mapped to a premium module yet.</p>
          </div>
        </section>
      </div>
    )
  }

  return <PremiumWorkspace config={config} />
}
