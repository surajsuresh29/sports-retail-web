import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Transfers from './pages/Transfers'
import POS from './pages/POS'
import Team from './pages/Team'
import SalesHistory from './pages/SalesHistory'
import { ToastContainer } from './components/ui/ToastContainer'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>
  if (!user) return <Navigate to="/login" />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/pos" replace />
  }

  return children
}

function App() {
  const { setUser, fetchProfile, setLoading, user } = useAuthStore()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

        <Route element={<Layout />}>
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/transfers" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Transfers />
            </ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
              <POS />
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
              <SalesHistory />
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Team />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      <ToastContainer />
    </Router>
  )
}

export default App
