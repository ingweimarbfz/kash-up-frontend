import {
  MdMenuBook, MdDashboard, MdPeople, MdRequestQuote, MdPayments, MdRoute, MdInventory2, MdPercent, MdBarChart,
  MdManageAccounts, MdSettings, MdHistory, MdPerson, MdReceiptLong, MdWarningAmber, MdMap, MdSavings, MdAccountBalance, MdAccountBalanceWallet, MdLockOutline, MdPlaylistAddCheck, MdTwoWheeler, MdBadge, MdPlace, MdNotificationsActive, MdWorkspacePremium
} from 'react-icons/md'

export const ROLE_LABELS = { administrador: 'Administrador', prestamista: 'Prestamista', cliente: 'Cliente', conductor: 'Conductor' }

// Menú por rol. Los ítems con soon: true se muestran deshabilitados con la etapa en que llegan.
const NAV = {
  administrador: [
    { title: 'General', items: [{ to: '/', label: 'Dashboard', icon: MdDashboard, end: true }] },
    {
      title: 'Cartera',
      items: [
        { to: '/clientes', label: 'Clientes', icon: MdPeople },
        { to: '/creditos', label: 'Créditos', icon: MdRequestQuote },
        { to: '/solicitudes', label: 'Solicitudes', icon: MdPlaylistAddCheck },
        { to: '/tasas', label: 'Tasas y simulador', icon: MdPercent },
        { to: '/inventario', label: 'Inventario', icon: MdInventory2 },
        { to: '/capital', label: 'Capital y cajas', icon: MdAccountBalance }
      ]
    },
    {
      title: 'Cobro',
      items: [
        { to: '/rutas', label: 'Rutas y rutero', icon: MdRoute },
        { to: '/pagos', label: 'Pagos', icon: MdPayments },
        { to: '/morosos', label: 'Morosos', icon: MdWarningAmber },
        { to: '/gastos', label: 'Gastos', icon: MdReceiptLong },
        { to: '/mapa', label: 'Mapa', icon: MdMap },
        { to: '/vehiculos', label: 'Vehículos', icon: MdTwoWheeler },
        { to: '/conductores', label: 'Conductores', icon: MdBadge }
      ]
    },
    {
      title: 'Administración',
      items: [
        { to: '/reportes', label: 'Reportes', icon: MdBarChart },
        { to: '/bitacora', label: 'Bitácora', icon: MdMenuBook },
        { to: '/sedes', label: 'Sedes', icon: MdPlace },
        { to: '/usuarios', label: 'Usuarios', icon: MdManageAccounts },
        { to: '/notificaciones', label: 'Notificaciones', icon: MdNotificationsActive },
        { to: '/configuracion', label: 'Configuración', icon: MdSettings },
        { to: '/auditoria', label: 'Auditoría', icon: MdHistory },
        { to: '/mi-plan', label: 'Mi plan', icon: MdWorkspacePremium }
      ]
    }
  ],
  prestamista: [
    { title: 'General', items: [{ to: '/', label: 'Mi jornada', icon: MdDashboard, end: true }] },
    {
      title: 'Cobro',
      items: [
        { to: '/mi-ruta', label: 'Mi ruta', icon: MdRoute },
        { to: '/mi-caja', label: 'Mi caja', icon: MdAccountBalanceWallet },
        { to: '/clientes', label: 'Mis clientes', icon: MdPeople },
        { to: '/creditos', label: 'Créditos', icon: MdRequestQuote },
        { to: '/solicitudes', label: 'Mis solicitudes', icon: MdPlaylistAddCheck },
        { to: '/tasas', label: 'Simulador', icon: MdPercent },
        { to: '/pagos', label: 'Registrar pago', icon: MdPayments },
        { to: '/gastos', label: 'Gastos', icon: MdReceiptLong },
        { to: '/morosos', label: 'Morosos', icon: MdWarningAmber },
        { to: '/mapa', label: 'Mapa', icon: MdMap },
        { to: '/vehiculos', label: 'Mi vehículo', icon: MdTwoWheeler },
        { to: '/cierre', label: 'Cierre de jornada', icon: MdLockOutline },
        { to: '/mis-notificaciones', label: 'Notificaciones', icon: MdNotificationsActive }
      ]
    }
  ],
  // Conductor (KU-021): solo el reporte de su vehículo.
  conductor: [
    { title: 'Mi vehículo', items: [{ to: '/vehiculos', label: 'Mi vehículo', icon: MdTwoWheeler }] }
  ],
  cliente: [
    { title: 'General', items: [{ to: '/', label: 'Mi resumen', icon: MdDashboard, end: true }] },
    {
      title: 'Mis créditos',
      items: [
        { to: '/mis-creditos', label: 'Créditos y cuotas', icon: MdSavings },
        { to: '/mis-pagos', label: 'Mis pagos', icon: MdPayments }
      ]
    }
  ]
}

export const ACCOUNT_NAV = [{ to: '/perfil', label: 'Mi perfil', icon: MdPerson }]

// Funcionalidad del plan que habilita cada pantalla (KU-026). Lo que no aparece es del núcleo.
export const FEATURE_OF = {
  '/solicitudes': 'solicitudes', '/inventario': 'productos', '/capital': 'cajas', '/mi-caja': 'cajas',
  '/rutas': 'rutas', '/mi-ruta': 'rutas', '/cierre': 'gastos', '/gastos': 'gastos', '/mapa': 'mapa',
  '/vehiculos': 'vehiculos', '/conductores': 'conductores', '/reportes': 'reportes', '/bitacora': 'bitacora',
  '/auditoria': 'auditoria', '/notificaciones': 'telegram', '/mis-notificaciones': 'telegram',
  '/mis-creditos': 'portal_cliente', '/mis-pagos': 'portal_cliente'
}

// Menú del rol, sin las pantallas que el plan del negocio no incluye.
export const navFor = (role, has = () => true) => (NAV[role] || [])
  .map((s) => ({ ...s, items: s.items.filter((i) => has(FEATURE_OF[i.to])) }))
  .filter((s) => s.items.length)

// Título de la página actual para la barra superior.
export const titleFor = (role, pathname) => {
  for (const s of [...navFor(role), { title: 'Cuenta', items: ACCOUNT_NAV }]) {
    for (const i of s.items) {
      if (i.end ? pathname === i.to : pathname.startsWith(i.to)) return { section: s.title, title: i.label }
    }
  }
  return { section: '', title: '' }
}
