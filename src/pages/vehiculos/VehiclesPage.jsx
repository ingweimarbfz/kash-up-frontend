import React, { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { MdAdd, MdWarningAmber, MdErrorOutline, MdPerson, MdSportsMotorsports, MdBadge } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Kpi, PageHead, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { STATUS, VehicleForm, VehicleIcon, km } from './common'

// Flota de cobro: tarjetas con el estado, el responsable y las alertas de cada vehículo.
const VehiclesPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get('/vehiculos').then(({ data }) => setRows(data)).catch((e) => { toast(errorMessage(e), 'bad'); setRows([]) }) }, [toast])
  useEffect(() => { load() }, [load])
  if (!rows) return <div className="splash"><Spinner /></div>
  // El prestamista con un solo vehículo va directo a su hoja de vida.
  if (!admin && rows.length === 1) return <Navigate to={`/vehiculos/${rows[0].id}`} replace />
  const bad = rows.filter((v) => v.alerts.some((a) => a.level === 'bad'))
  const shown = rows.filter((v) => filter === 'todos' || (filter === 'alertas' && v.alerts.length) || v.status === filter)
  const sum = (k) => rows.reduce((s, v) => s + v[k], 0)

  return (
    <div className="stack">
      <PageHead title={admin ? 'Vehículos' : 'Mi vehículo'} subtitle={admin ? 'Motos y carros de las rutas: documentos, mantenimientos, combustible y kilometraje.' : 'El vehículo con el que cobras.'}>
        {admin && <button type="button" className="btn" onClick={() => navigate('/conductores')}><MdBadge /> Conductores</button>}
        {admin && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><MdAdd /> Nuevo vehículo</button>}
      </PageHead>
      {admin && (
        <div className="grid grid-kpi">
          <Kpi label="Vehículos" value={rows.length} tone="dark" note={`${rows.filter((v) => v.status === 'activo').length} activo(s) · ${rows.filter((v) => v.status === 'taller').length} en taller`} />
          <Kpi label="Con alertas" value={rows.filter((v) => v.alerts.length).length} tone={bad.length ? 'bad' : ''} note={bad.length ? `${bad.length} con documentos vencidos o aceite atrasado` : 'Todo al día'} />
          <Kpi label="Combustible del mes" value={formatMoney(sum('monthFuel'))} tone="brand" />
          <Kpi label="Mantenimiento del mes" value={formatMoney(sum('monthMaintenance'))} />
        </div>
      )}
      {admin && rows.length > 0 && (
        <div className="seg seg-wrap">{[['todos', 'Todos'], ['alertas', 'Con alertas'], ['activo', 'Activos'], ['taller', 'En taller'], ['inactivo', 'Inactivos']].map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
      )}
      {!rows.length ? <Card><Empty icon={<MdSportsMotorsports />}>{admin ? 'Aún no hay vehículos. Registra las motos y carros de las rutas.' : 'No tienes un vehículo asignado. El administrador lo asigna en Vehículos.'}</Empty></Card> : (
        <div className="vehicle-grid">
          {shown.map((v) => (
            <button key={v.id} type="button" className="vehicle-card" onClick={() => navigate(`/vehiculos/${v.id}`)}>
              <div className="vehicle-photo">{v.photoUrl ? <img src={v.photoUrl} alt="" /> : <VehicleIcon kind={v.kind} />}<span className="plate">{v.plate}</span></div>
              <div className="vehicle-body">
                <div className="row-between"><strong>Móvil {v.code}</strong><Badge tone={STATUS[v.status][1]}>{STATUS[v.status][0]}</Badge></div>
                <small>{[v.kindLabel, v.brand, v.line, v.modelYear].filter(Boolean).join(' · ')}</small>
                <small><MdPerson /> {v.collector?.fullName || 'Sin prestamista'}{v.driver ? ` · conduce ${v.driver.fullName}` : ''}</small>
                <div className="vehicle-stats"><span>{km(v.odometer)}</span><span>Combustible mes {formatMoney(v.monthFuel)}</span></div>
                {v.alerts.length > 0 && (
                  <ul className="vehicle-alerts">{v.alerts.slice(0, 3).map((a) => <li key={a.text} className={a.level}>{a.level === 'bad' ? <MdErrorOutline /> : <MdWarningAmber />} {a.text}</li>)}</ul>
                )}
              </div>
            </button>
          ))}
          {!shown.length && <Card><Empty>Ningún vehículo con ese filtro.</Empty></Card>}
        </div>
      )}
      {adding && <VehicleForm onClose={() => setAdding(false)} onSaved={(d) => { setAdding(false); toast('Vehículo creado'); navigate(`/vehiculos/${d.id}`) }} />}
      {toastNode}
    </div>
  )
}

export default VehiclesPage
