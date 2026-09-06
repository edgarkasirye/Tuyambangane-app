import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }) {
  const { session, loading, staffProfile, profileError } = useAuth()

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!staffProfile) {
    return (
      <div className="page-message">
        <p>{profileError ?? 'Your account is not set up yet.'}</p>
      </div>
    )
  }

  return children
}
