import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import AppLayout from './layout/AppLayout'
import Login from './components/Login'
import { Spinner } from './components/ui'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))
const CustomersPage = lazy(() => import('./pages/clientes/CustomersPage'))
const CustomerDetail = lazy(() => import('./pages/clientes/CustomerDetail'))

const STAFF = ['administrador', 'prestamista']

const Splash = () => <div className="splash"><Spinner /></div>

// Protege una ruta: exige sesión y, si se indica, uno de los roles.
const Protected = ({ roles, children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

const LoginRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  return user ? <Navigate to="/" replace /> : <Login />
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="usuarios" element={<Protected roles={['administrador']}><UsersPage /></Protected>} />
              <Route path="configuracion" element={<Protected roles={['administrador']}><SettingsPage /></Protected>} />
              <Route path="auditoria" element={<Protected roles={['administrador']}><AuditPage /></Protected>} />
              <Route path="clientes" element={<Protected roles={STAFF}><CustomersPage /></Protected>} />
              <Route path="clientes/:id" element={<Protected roles={STAFF}><CustomerDetail /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
