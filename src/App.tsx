import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { SessionProvider } from './hooks/useSession'

// Chart-heavy screens pull in Recharts, which dwarfs everything else. Loading
// route components lazily keeps that out of the initial download, which matters
// because this is used mostly on a phone.
const AiAgent = lazy(() => import('./routes/AiAgent'))
const CalorieCharts = lazy(() => import('./routes/CalorieCharts'))
const Calories = lazy(() => import('./routes/Calories'))
const Categories = lazy(() => import('./routes/Categories'))
const Insights = lazy(() => import('./routes/Insights'))
const Login = lazy(() => import('./routes/Login'))
const Profile = lazy(() => import('./routes/Profile'))
const Spending = lazy(() => import('./routes/Spending'))
const SpendingCharts = lazy(() => import('./routes/SpendingCharts'))
const Today = lazy(() => import('./routes/Today'))
const Weight = lazy(() => import('./routes/Weight'))

function RouteFallback() {
  return <div className="p-6 text-sm text-slate-500">Loading…</div>
}

export default function App() {
  return (
    <SessionProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* The only screen reachable without a session. */}
          <Route path="/login" element={<Login />} />

          {/* Everything else requires a signed-in user. */}
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Today />} />
            <Route path="calories" element={<Calories />} />
            <Route path="calories/charts" element={<CalorieCharts />} />
            <Route path="calories/ai" element={<AiAgent />} />
            <Route path="weight" element={<Weight />} />
            <Route path="spending" element={<Spending />} />
            <Route path="spending/charts" element={<SpendingCharts />} />
            <Route path="insights" element={<Insights />} />
            <Route path="profile" element={<Profile />} />
            <Route path="categories" element={<Categories />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </SessionProvider>
  )
}
