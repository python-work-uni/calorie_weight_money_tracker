import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>
  }

  if (!session) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
