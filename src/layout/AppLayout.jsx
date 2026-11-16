import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MdMenu, MdChevronRight, MdLogout, MdPerson, MdKeyboardArrowDown, MdSearch } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { navFor, titleFor, ACCOUNT_NAV, ROLE_LABELS } from '../utils/nav'
import { Avatar } from '../components/ui'
import { KashLogo } from '../components/Logo'
import SearchPalette, { useSearchShortcut } from '../components/SearchPalette'

// Fecha corta: "Lun, 16 Nov 2026".
const todayLabel = (() => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).formatToParts(new Date()).map((p) => [p.type, p.value]))
  const cap = (x) => x.replace('.', '').charAt(0).toUpperCase() + x.replace('.', '').slice(1, 3)
  return `${cap(parts.weekday)}, ${parts.day} ${cap(parts.month)} ${parts.year}`
})()

const UserMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar user={user} />
        <span className="who hide-sm">
          <strong>{user.fullName}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </span>
        <MdKeyboardArrowDown />
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <button type="button" onClick={() => { setOpen(false); navigate('/perfil') }}><MdPerson /> Mi perfil</button>
          <hr />
          <button type="button" className="danger" onClick={logout}><MdLogout /> Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

const AppLayout = () => {
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const openSearch = useCallback(() => { if (user.role !== 'cliente') setSearching(true) }, [user.role])
  useSearchShortcut(openSearch)
  // En escritorio el botón contrae el menú (se recuerda); en celular lo abre como panel.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('ku_sidebar') === 'off' } catch { return false } })
  const toggleMenu = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) { setOpen(true); return }
    setCollapsed((c) => { try { localStorage.setItem('ku_sidebar', c ? 'on' : 'off') } catch { /* sin almacenamiento */ } return !c })
  }
  useEffect(() => setOpen(false), [pathname])

  const sections = navFor(user.role)
  const { section, title } = titleFor(user.role, pathname)

  return (
    <div className={`app${collapsed ? ' sidebar-off' : ''}`}>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          {settings.logoUrl ? <img src={settings.logoUrl} alt={settings.businessName} /> : <KashLogo size={32} onDark />}
        </div>
        <div className="sidebar-org">
          <small>Negocio</small>
          <strong>{settings.businessName}</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Menú principal">
          {sections.map((s) => (
            <div className="nav-section" key={s.title}>
              <div className="nav-section-title">{s.title}</div>
              {s.items.map((i) => (i.soon
                ? (
                  <span key={i.to} className="nav-link disabled" title={`Disponible en la ${i.soon}`} aria-disabled="true">
                    <i.icon /> <span className="nav-label">{i.label}</span> <small className="soon">{i.soon}</small>
                  </span>
                  )
                : (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <i.icon /> <span className="nav-label">{i.label}</span>
                  </NavLink>
                  )))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <nav className="sidebar-account" aria-label="Cuenta">
            {ACCOUNT_NAV.map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i.icon /> <span className="nav-label">{i.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-user">
            <Avatar user={user} size="sm" />
            <div className="sidebar-user-info">
              <strong>{user.fullName}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}><MdLogout /></button>
          </div>
        </div>
      </aside>
      <div className={`backdrop${open ? ' show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar-wrap">
          <header className="topbar">
            <button type="button" className="btn btn-ghost btn-icon menu-toggle" onClick={toggleMenu} aria-label="Menú" title={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}><MdMenu /></button>
            <div className="topbar-title">
              <small>{settings.businessName}{section && section !== 'General' ? ` · ${section}` : ''}</small>
              <strong>{title || 'KashUp'}</strong>
            </div>
            {user.role !== 'cliente' && (
              <button type="button" className="topbar-search" onClick={openSearch} aria-label="Buscar (Ctrl+K)">
                <MdSearch /> <span className="hide-sm">Buscar…</span> <kbd className="kbd hide-sm">Ctrl K</kbd>
              </button>
            )}
            <span className="topbar-date hide-md">{todayLabel}</span>
            <UserMenu />
          </header>
          <nav className="topbar-crumbs" aria-label="Miga de pan">
            <Link to="/">Inicio</Link>
            {section && section !== 'General' && (<><MdChevronRight className="sep" aria-hidden="true" /><span>{section}</span></>)}
            <MdChevronRight className="sep" aria-hidden="true" />
            <strong aria-current="page">{title || 'Dashboard'}</strong>
          </nav>
        </div>
        <main className="content">
          <Outlet />
        </main>
        {searching && <SearchPalette onClose={() => setSearching(false)} />}
      </div>
    </div>
  )
}

export default AppLayout
