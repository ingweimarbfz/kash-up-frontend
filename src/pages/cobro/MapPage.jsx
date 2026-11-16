import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MdMap } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Empty, PageHead, Spinner } from '../../components/ui'
import { formatMoney } from '../../utils/format'

const STATUS = {
  mora: ['En mora', '#EF4444'],
  al_dia: ['Al día', '#10B981'],
  cobrado: ['Pagó hoy', '#18181B'],
  sin_credito: ['Sin crédito activo', '#A1A1AA']
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Mapa de clientes con ubicación, coloreados por estado de pago.
const MapPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const box = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const [rows, setRows] = useState(null)
  const [lenders, setLenders] = useState([])
  const [lender, setLender] = useState('')
  const [hidden, setHidden] = useState({})
  const [error, setError] = useState('')
  useEffect(() => { setRows(null); api.get('/mapa', { params: { prestamista: lender || undefined } }).then(({ data }) => setRows(data)).catch((e) => { setError(errorMessage(e)); setRows([]) }) }, [lender])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data }) => setLenders(data)).catch(() => {}) }, [admin])

  useEffect(() => {
    if (!box.current || map.current) return undefined
    map.current = L.map(box.current, { zoomControl: true }).setView([4.65, -74.08], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => { map.current?.remove(); map.current = null }
  }, [])

  const shown = useMemo(() => (rows || []).filter((r) => !hidden[r.status]), [rows, hidden])
  useEffect(() => {
    if (!layer.current) return
    layer.current.clearLayers()
    shown.forEach((r) => {
      const [label, color] = STATUS[r.status]
      L.circleMarker([r.lat, r.lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindPopup(`<strong>${esc(r.fullName)}</strong><br>${esc(r.address || '')}${r.neighborhood ? `, ${esc(r.neighborhood)}` : ''}<br>${label}${r.balance ? ` · saldo ${formatMoney(r.balance)}` : ''}${r.overdue ? `<br><span style="color:#B91C1C">Vencido ${formatMoney(r.overdue)}</span>` : ''}${admin && r.lender ? `<br><small>Cobra: ${esc(r.lender)}</small>` : ''}<br><a href="/clientes/${r.id}">Ver cliente</a> · <a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noreferrer">Cómo llegar</a>`)
        .addTo(layer.current)
    })
    if (shown.length) map.current.fitBounds(L.latLngBounds(shown.map((r) => [r.lat, r.lng])).pad(0.2), { maxZoom: 15 })
  }, [shown, admin])

  const count = (k) => (rows || []).filter((r) => r.status === k).length
  return (
    <div className="stack">
      <PageHead title="Mapa" subtitle="Clientes con ubicación registrada, por estado de pago.">
        {admin && <select value={lender} onChange={(e) => setLender(e.target.value)} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
      </PageHead>
      {error && <div className="alert bad">{error}</div>}
      <div className="map-legend">
        {Object.entries(STATUS).map(([k, [label, color]]) => (
          <button key={k} type="button" className={hidden[k] ? 'off' : ''} onClick={() => setHidden((h) => ({ ...h, [k]: !h[k] }))}>
            <span className="dot" style={{ background: color }} /> {label} <strong>{rows ? count(k) : '…'}</strong>
          </button>
        ))}
      </div>
      <Card flush>
        <div className="map-box" ref={box}>{!rows && <div className="map-loading"><Spinner /></div>}</div>
        {rows && !rows.length && <Empty icon={<MdMap />}>Ningún cliente tiene ubicación. Regístrala en la ficha del cliente con "Usar mi ubicación".</Empty>}
      </Card>
    </div>
  )
}

export default MapPage
