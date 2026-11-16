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
const RatesPage = lazy(() => import('./pages/creditos/RatesPage'))
const InventoryPage = lazy(() => import('./pages/inventario/InventoryPage'))
const CreditsPage = lazy(() => import('./pages/creditos/CreditsPage'))
const NewCreditPage = lazy(() => import('./pages/creditos/NewCreditPage'))
const CreditDetail = lazy(() => import('./pages/creditos/CreditDetail'))
const MyCreditsPage = lazy(() => import('./pages/creditos/MyCreditsPage'))
const CapitalPage = lazy(() => import('./pages/capital/CapitalPage'))
const MyCashPage = lazy(() => import('./pages/capital/MyCashPage'))
const PaymentsPage = lazy(() => import('./pages/pagos/PaymentsPage'))
const MyPaymentsPage = lazy(() => import('./pages/pagos/MyPaymentsPage'))
const RoutesPage = lazy(() => import('./pages/cobro/RoutesPage'))
const RoutePage = lazy(() => import('./pages/cobro/RoutePage'))
const ExpensesPage = lazy(() => import('./pages/cobro/ExpensesPage'))
const DelinquentPage = lazy(() => import('./pages/cobro/DelinquentPage'))
const MapPage = lazy(() => import('./pages/cobro/MapPage'))
const CloseDayPage = lazy(() => import('./pages/cobro/CloseDayPage'))
const RequestsPage = lazy(() => import('./pages/creditos/RequestsPage'))
const VehiclesPage = lazy(() => import('./pages/vehiculos/VehiclesPage'))
const VehicleDetail = lazy(() => import('./pages/vehiculos/VehicleDetail'))
const DriversPage = lazy(() => import('./pages/vehiculos/DriversPage'))
const SitesPage = lazy(() => import('./pages/sedes/SitesPage'))
const NotificationsPage = lazy(() => import('./pages/notificaciones/NotificationsPage'))
const MyNotificationsPage = lazy(() => import('./pages/notificaciones/MyNotificationsPage'))
const ReportsPage = lazy(() => import('./pages/reportes/ReportsPage'))
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
              <Route path="sedes" element={<Protected roles={['administrador']}><SitesPage /></Protected>} />
              <Route path="usuarios" element={<Protected roles={['administrador']}><UsersPage /></Protected>} />
              <Route path="configuracion" element={<Protected roles={['administrador']}><SettingsPage /></Protected>} />
              <Route path="notificaciones" element={<Protected roles={['administrador']}><NotificationsPage /></Protected>} />
              <Route path="mis-notificaciones" element={<Protected roles={['prestamista']}><MyNotificationsPage /></Protected>} />
              <Route path="auditoria" element={<Protected roles={['administrador']}><AuditPage /></Protected>} />
              <Route path="clientes" element={<Protected roles={STAFF}><CustomersPage /></Protected>} />
              <Route path="clientes/:id" element={<Protected roles={STAFF}><CustomerDetail /></Protected>} />
              <Route path="tasas" element={<Protected roles={STAFF}><RatesPage /></Protected>} />
              <Route path="inventario" element={<Protected roles={['administrador']}><InventoryPage /></Protected>} />
              <Route path="creditos" element={<Protected roles={STAFF}><CreditsPage /></Protected>} />
              <Route path="creditos/nuevo" element={<Protected roles={STAFF}><NewCreditPage /></Protected>} />
              <Route path="creditos/:id" element={<Protected roles={STAFF}><CreditDetail /></Protected>} />
              <Route path="solicitudes" element={<Protected roles={STAFF}><RequestsPage /></Protected>} />
              <Route path="capital" element={<Protected roles={['administrador']}><CapitalPage /></Protected>} />
              <Route path="mi-caja" element={<Protected roles={['prestamista']}><MyCashPage /></Protected>} />
              <Route path="pagos" element={<Protected roles={STAFF}><PaymentsPage /></Protected>} />
              <Route path="rutas" element={<Protected roles={['administrador']}><RoutesPage /></Protected>} />
              <Route path="rutas/:lenderId" element={<Protected roles={['administrador']}><RoutePage /></Protected>} />
              <Route path="mi-ruta" element={<Protected roles={['prestamista']}><RoutePage /></Protected>} />
              <Route path="cierre" element={<Protected roles={['prestamista']}><CloseDayPage /></Protected>} />
              <Route path="gastos" element={<Protected roles={STAFF}><ExpensesPage /></Protected>} />
              <Route path="morosos" element={<Protected roles={STAFF}><DelinquentPage /></Protected>} />
              <Route path="mapa" element={<Protected roles={STAFF}><MapPage /></Protected>} />
              <Route path="reportes" element={<Protected roles={['administrador']}><ReportsPage /></Protected>} />
              <Route path="vehiculos" element={<Protected roles={STAFF}><VehiclesPage /></Protected>} />
              <Route path="vehiculos/:id" element={<Protected roles={STAFF}><VehicleDetail /></Protected>} />
              <Route path="conductores" element={<Protected roles={['administrador']}><DriversPage /></Protected>} />
              <Route path="mis-pagos" element={<Protected roles={['cliente']}><MyPaymentsPage /></Protected>} />
              <Route path="mis-creditos" element={<Protected roles={['cliente']}><MyCreditsPage /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
