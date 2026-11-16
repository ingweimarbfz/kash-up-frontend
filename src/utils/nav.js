import {
  MdDashboard, MdPeople, MdRequestQuote, MdPayments, MdRoute, MdInventory2, MdPercent, MdBarChart,
  MdManageAccounts, MdSettings, MdHistory, MdPerson, MdReceiptLong, MdWarningAmber, MdMap, MdSavings
} from 'react-icons/md'

export const ROLE_LABELS = { administrador: 'Administrador', prestamista: 'Prestamista', cliente: 'Cliente' }

// Menú por rol. Los ítems con soon: true se muestran deshabilitados con la etapa en que llegan.
const NAV = {
  administrador: [
    { title: 'General', items: [{ to: '/', label: 'Dashboard', icon: MdDashboard, end: true }] },
    {
      title: 'Cartera',
      items: [
        { to: '/clientes', label: 'Clientes', icon: MdPeople, soon: 'Etapa 2' },
        { to: '/creditos', label: 'Créditos', icon: MdRequestQuote, soon: 'Etapa 2' },
        { to: '/tasas', label: 'Tasas de interés', icon: MdPercent, soon: 'Etapa 2' },
        { to: '/inventario', label: 'Inventario', icon: MdInventory2, soon: 'Etapa 2' }
      ]
    },
    {
      title: 'Cobro',
      items: [
        { to: '/rutas', label: 'Rutas y rutero', icon: MdRoute, soon: 'Etapa 3' },
        { to: '/pagos', label: 'Pagos', icon: MdPayments, soon: 'Etapa 3' },
        { to: '/morosos', label: 'Morosos', icon: MdWarningAmber, soon: 'Etapa 3' },
        { to: '/mapa', label: 'Mapa', icon: MdMap, soon: 'Etapa 3' }
      ]
    },
    {
      title: 'Administración',
      items: [
        { to: '/reportes', label: 'Reportes', icon: MdBarChart, soon: 'Etapa 4' },
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
        { to: '/mi-ruta', label: 'Mi ruta', icon: MdRoute, soon: 'Etapa 3' },
        { to: '/clientes', label: 'Mis clientes', icon: MdPeople, soon: 'Etapa 2' },
        { to: '/pagos', label: 'Registrar pago', icon: MdPayments, soon: 'Etapa 3' },
        { to: '/gastos', label: 'Gastos', icon: MdReceiptLong, soon: 'Etapa 3' }
      ]
    }
  ],
  cliente: [
    { title: 'General', items: [{ to: '/', label: 'Mi resumen', icon: MdDashboard, end: true }] },
    {
      title: 'Mis créditos',
      items: [
        { to: '/mis-creditos', label: 'Créditos y cuotas', icon: MdSavings, soon: 'Etapa 2' },
        { to: '/mis-pagos', label: 'Mis pagos', icon: MdPayments, soon: 'Etapa 3' }
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
