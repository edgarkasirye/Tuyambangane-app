import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { staffProfile, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">Shoe Shop Sales</div>
        <div className="app-header-user">
          <span>{staffProfile?.name}</span>
          <button type="button" className="link-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/sales" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sales
        </NavLink>
        <NavLink to="/sales/record" className={({ isActive }) => (isActive ? 'active' : '')}>
          Record sale
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => (isActive ? 'active' : '')}>
          Catalog
        </NavLink>
      </nav>
    </div>
  )
}
