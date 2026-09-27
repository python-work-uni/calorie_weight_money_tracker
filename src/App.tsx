import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { SessionProvider } from './hooks/useSession'
import AiAgent from './routes/AiAgent'
import CalorieCharts from './routes/CalorieCharts'
import Calories from './routes/Calories'
import Categories from './routes/Categories'
import Insights from './routes/Insights'
import Login from './routes/Login'
import Profile from './routes/Profile'
import Spending from './routes/Spending'
import SpendingCharts from './routes/SpendingCharts'
import Today from './routes/Today'
import Weight from './routes/Weight'

export default function App() {
  return (
    <SessionProvider>
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
    </SessionProvider>
  )
}
