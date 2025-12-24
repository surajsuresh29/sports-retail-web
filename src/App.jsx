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
import SalesHistory from './pages/SalesHistory'
import { ToastContainer } from './components/ui/ToastContainer'

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
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/inventory" element={user ? <Inventory /> : <Navigate to="/login" />} />
          <Route path="/transfers" element={user ? <Transfers /> : <Navigate to="/login" />} />
          <Route path="/pos" element={user ? <POS /> : <Navigate to="/login" />} />
          <Route path="/sales" element={user ? <SalesHistory /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
      <ToastContainer />
    </Router>
  )
}

export default App
