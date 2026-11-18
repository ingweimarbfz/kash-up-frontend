// KU-040 · Solicitudes pendientes del administrador.
// Consulta cada 30 s (y al volver a la pestaña o cambiar de página) cuántas solicitudes hay por revisar.
// Con eso se pinta el contador del menú y se avisa con un toast cuando llega una nueva.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdNotificationsActive, MdClose } from 'react-icons/md'
import api from '../api/client'

const EVERY = 30000

export const usePendingRequests = (enabled) => {
  const { pathname } = useLocation()
  const [counts, setCounts] = useState({})
  const [fresh, setFresh] = useState([])
  const seen = useRef(null)

  const load = useCallback(() => {
    if (!enabled || document.hidden) return
    api.get('/solicitudes/pendientes').then(({ data }) => {
      setCounts({ '/solicitudes': (data.creditos || 0) + (data.cambios || 0), '/rutas': data.jornadas || 0 })
      const keys = (data.items || []).map((i) => i.key)
      // En la primera carga solo se recuerdan las que ya había; se avisan las que lleguen después.
      if (seen.current) {
        const nuevas = (data.items || []).filter((i) => !seen.current.has(i.key))
        if (nuevas.length) setFresh((f) => [...nuevas, ...f].slice(0, 3))
      }
      seen.current = new Set([...(seen.current || []), ...keys])
    }).catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    load()
    const t = setInterval(load, EVERY)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('ku:requests-changed', load)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('ku:requests-changed', load) }
  }, [enabled, load])

  // Al cambiar de página (p. ej. después de aprobar) se actualiza el contador.
  useEffect(() => { if (enabled && seen.current) load() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((key) => setFresh((f) => f.filter((x) => x.key !== key)), [])
  return { counts, fresh, dismiss }
}

// Avisos de solicitudes nuevas (se cierran solos a los 10 s).
const RequestToast = ({ item, onClose }) => {
  const navigate = useNavigate()
  useEffect(() => { const t = setTimeout(onClose, 10000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="toast request-toast" role="status">
      <MdNotificationsActive />
      <div className="grow">
        <strong>Nueva solicitud</strong>
        <span>{item.text}</span>
      </div>
      <button type="button" className="btn btn-sm" onClick={() => { onClose(); navigate(item.path) }}>Ver</button>
      <button type="button" className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={onClose}><MdClose /></button>
    </div>
  )
}

export const RequestToasts = ({ items, onDismiss }) => (
  items.length ? <div className="request-toasts">{items.map((i) => <RequestToast key={i.key} item={i} onClose={() => onDismiss(i.key)} />)}</div> : null
)
