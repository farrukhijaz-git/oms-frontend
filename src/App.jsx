import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { UploadProvider } from './context/UploadContext'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import AuthErrorPage from './pages/AuthErrorPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import LabelQueuePage from './pages/LabelQueuePage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminWalmartPage from './pages/AdminWalmartPage'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <UploadProvider>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/error" element={<AuthErrorPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="labels/queue" element={<LabelQueuePage />} />
          <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
          <Route path="admin/walmart" element={<RequireAdmin><AdminWalmartPage /></RequireAdmin>} />
        </Route>
      </Routes>
    </UploadProvider>
  )
}
