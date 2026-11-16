import {
  MdDashboard, MdPeople, MdRequestQuote, MdPayments, MdRoute, MdInventory2, MdPercent, MdBarChart,
  MdManageAccounts, MdSettings, MdHistory, MdPerson, MdReceiptLong, MdWarningAmber, MdMap, MdSavings, MdAccountBalance, MdAccountBalanceWallet, MdLockOutline, MdPlaylistAddCheck
} from 'react-icons/md'

export const ROLE_LABELS = { administrador: 'Administrador', prestamista: 'Prestamista', cliente: 'Cliente' }

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
        { to: '/mapa', label: 'Mapa', icon: MdMap }
      ]
    },
    {
      title: 'Administración',
      items: [
        { to: '/reportes', label: 'Reportes', icon: MdBarChart },
        { to: '/usuarios', label: 'Usuarios', icon: MdManageAccounts },
        { to: '/configuracion', label: 'Configuración', icon: MdSettings },
        { to: '/auditoria', label: 'Auditoría', icon: MdHistory }
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
        { to: '/cierre', label: 'Cierre de jornada', icon: MdLockOutline }
      ]
    }
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

export const navFor = (role) => NAV[role] || []

// Título de la página actual para la barra superior.
export const titleFor = (role, pathname) => {
  for (const s of [...navFor(role), { title: 'Cuenta', items: ACCOUNT_NAV }]) {
    for (const i of s.items) {
      if (i.end ? pathname === i.to : pathname.startsWith(i.to)) return { section: s.title, title: i.label }
    }
  }
  return { section: '', title: '' }
}
