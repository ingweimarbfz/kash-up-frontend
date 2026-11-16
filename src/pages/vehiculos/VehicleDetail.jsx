import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdLocalGasStation, MdBuild, MdSpeed, MdErrorOutline, MdWarningAmber, MdCheckCircle, MdDelete, MdImage, MdPhone, MdPerson } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { Tabs } from '../../components/forms'
import { SeriesBars } from '../../components/charts'
import { CHART } from '../../utils/brand'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'
import { LicenseBadge, LogModal, STATUS, VehicleForm, VehicleIcon, km } from './common'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const monthTick = (v) => (v ? `${MONTHS[Number(v.slice(5, 7)) - 1]} ${v.slice(2, 4)}` : '')
const daysTo = (d) => (d ? Math.round((new Date(`${d}T12:00:00Z`) - new Date(`${todayBogota()}T12:00:00Z`)) / 86400000) : null)

// Documento con su vencimiento y un semáforo.
const DocRow = ({ label, date, extra }) => {
  const d = daysTo(date)
  const tone = d === null ? 'muted' : d < 0 ? 'bad' : d <= 30 ? 'warn' : 'ok'
  const text = d === null ? 'Sin registrar' : d < 0 ? `Vencido hace ${-d} día(s)` : d === 0 ? 'Vence hoy' : `Vence en ${d} día(s)`
  return (
    <div className="doc-row">
      <div><strong>{label}</strong>{extra && <small>{extra}</small>}</div>
      <div className="right"><Badge tone={tone}>{text}</Badge>{date && <small>{formatDate(date)}</small>}</div>
    </div>
  )
}

const VehicleDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [v, setV] = useState(null)
  const [tab, setTab] = useState('tanqueos')
  const [editing, setEditing] = useState(false)
  const [log, setLog] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get(`/vehiculos/${id}`).then(({ data }) => setV(data)).catch((e) => { toast(errorMessage(e), 'bad'); setV(false) }) }, [id, toast])
  useEffect(() => { load() }, [load])
  if (v === null) return <div className="splash"><Spinner /></div>
  if (v === false) return <Empty>No se encontró el vehículo.</Empty>
  const remove = async () => {
    try { await api.delete(`/vehiculos/${v.id}/${removing.type}/${removing.row.id}`); setRemoving(null); load(); toast('Registro eliminado') } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const expenseBadge = (e) => (e ? <Badge tone={e.status === 'anulado' ? 'muted' : 'dark'}>{e.number}</Badge> : null)
  const delBtn = (type, row) => admin && <button type="button" className="btn btn-icon btn-ghost" aria-label="Eliminar" onClick={() => setRemoving({ type, row })}><MdDelete /></button>

  return (
    <div className="stack">
      <PageHead title={`${v.plate} · Móvil ${v.code}`} subtitle={[v.kindLabel, v.brand, v.line, v.modelYear, v.color].filter(Boolean).join(' · ')}>
        {admin && <button type="button" className="btn btn-ghost" onClick={() => navigate('/vehiculos')}><MdArrowBack /> Vehículos</button>}
        {admin && <button type="button" className="btn" onClick={() => setEditing(true)}><MdEdit /> Editar</button>}
        <button type="button" className="btn" onClick={() => setLog('kilometraje')}><MdSpeed /> Kilometraje</button>
        <button type="button" className="btn" onClick={() => setLog('mantenimientos')}><MdBuild /> Mantenimiento</button>
        <button type="button" className="btn btn-primary" onClick={() => setLog('tanqueos')}><MdLocalGasStation /> Tanqueo</button>
      </PageHead>

      {v.alerts.length > 0
        ? <div className="vehicle-alert-list">{v.alerts.map((a) => <div key={a.text} className={`alert ${a.level === 'bad' ? 'bad' : 'warn'}`}>{a.level === 'bad' ? <MdErrorOutline /> : <MdWarningAmber />} <span>{a.text}</span></div>)}</div>
        : <div className="alert ok"><MdCheckCircle /> <span>Documentos y mantenimiento al día.</span></div>}

      <div className="grid grid-kpi">
        <Kpi label="Kilometraje" value={km(v.odometer)} tone="dark" note={v.lastOilKm !== null && v.oilChangeKm ? `Próximo aceite a los ${km(v.lastOilKm + v.oilChangeKm)}` : null} />
        <Kpi label="Recorrido 30 días" value={km(v.stats.km30)} note={v.stats.costPerKm ? `${formatMoney(v.stats.costPerKm)} por km` : null} />
        <Kpi label="Rendimiento" value={v.stats.kmPerGallon ? `${String(v.stats.kmPerGallon).replace('.', ',')} km/gal` : '—'} tone="brand" note="Entre tanqueos llenos" />
        <Kpi label="Gasto 30 días" value={formatMoney(v.stats.spent30)} note="Combustible y mantenimiento" />
      </div>

      <div className="grid grid-1-2">
        <div className="stack">
          <Card title="Hoja de vida" flush>
            <div className="vehicle-hero">{v.photoUrl ? <img src={v.photoUrl} alt="" /> : <VehicleIcon kind={v.kind} />}<span className="plate">{v.plate}</span></div>
            <dl className="stat-list pad">
              <div><dt>Estado</dt><dd><Badge tone={STATUS[v.status][1]}>{STATUS[v.status][0]}</Badge></dd></div>
              <div><dt>Cobra</dt><dd>{v.collector?.fullName || 'Sin asignar'}</dd></div>
              <div><dt>Conductor</dt><dd>{v.driver?.fullName || 'El mismo prestamista'}{v.driver?.phone && <> · <a href={`tel:${v.driver.phone}`}><MdPhone /> {v.driver.phone}</a></>}</dd></div>
              {v.engineCc && <div><dt>Cilindraje</dt><dd>{v.engineCc} cc</dd></div>}
              {v.vin && <div><dt>Chasis / VIN</dt><dd>{v.vin}</dd></div>}
              {v.ownerName && <div><dt>Propietario</dt><dd>{v.ownerName}</dd></div>}
              {v.oilChangeKm && <div><dt>Aceite cada</dt><dd>{km(v.oilChangeKm)}</dd></div>}
              {v.notes && <div><dt>Notas</dt><dd>{v.notes}</dd></div>}
            </dl>
          </Card>
          <Card title="Documentos">
            <DocRow label="SOAT" date={v.soatExpires} extra={v.soatNumber} />
            <DocRow label="Técnico-mecánica" date={v.tecnoExpires} />
            <DocRow label="Póliza" date={v.insuranceExpires} extra={[v.insuranceCompany, v.insurancePolicy].filter(Boolean).join(' · ')} />
            {v.driver && <DocRow label="Licencia del conductor" date={v.driver.licenseExpires} extra={`${v.driver.licenseNumber} · categoría ${v.driver.licenseCategory}`} />}
          </Card>
          {v.driver && (
            <Card title="Conductor">
              <div className="driver-card">
                <span className="avatar-lg"><MdPerson /></span>
                <div className="grow">
                  <strong>{v.driver.fullName}</strong>
                  <small>C.C. {v.driver.identification}</small>
                  <small><a href={`tel:${v.driver.phone}`}><MdPhone /> {v.driver.phone}</a></small>
                  <LicenseBadge driver={v.driver} />
                </div>
              </div>
            </Card>
          )}
        </div>
        <div className="stack">
          <Card title="Gasto por mes" subtitle="Combustible y mantenimiento, últimos 6 meses">
            <SeriesBars data={v.byMonth} stacked height={220} tickFormatter={monthTick} series={[{ key: 'combustible', name: 'Combustible', color: CHART.recaudo }, { key: 'mantenimiento', name: 'Mantenimiento', color: CHART.colocado }]} />
          </Card>
          <Card flush>
            <div className="toolbar"><Tabs value={tab} onChange={setTab} tabs={[['tanqueos', `Tanqueos (${v.fuel.length})`], ['mantenimientos', `Mantenimientos (${v.maintenances.length})`], ['kilometraje', 'Kilometraje']]} /></div>
            {tab === 'tanqueos' && (!v.fuel.length ? <Empty icon={<MdLocalGasStation />}>Sin tanqueos registrados.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Fecha</th><th className="num">Km</th><th className="num hide-sm">Galones</th><th className="num">Valor</th><th className="hide-md">Registró</th><th /></tr></thead>
                <tbody>{v.fuel.map((f) => (
                  <tr key={f.id}>
                    <td>{formatDate(f.filledOn)}{f.station && <><br /><small>{f.station}</small></>}</td>
                    <td className="num">{km(f.odometer)}{f.kmSincePrev !== null && <><br /><small>+{f.kmSincePrev.toLocaleString('es-CO')}</small></>}</td>
                    <td className="num hide-sm">{f.gallons ? String(f.gallons).replace('.', ',') : '—'}{!f.fullTank && <><br /><small>parcial</small></>}</td>
                    <td className="num money"><strong>{formatMoney(f.amount)}</strong><br />{expenseBadge(f.expense)}</td>
                    <td className="hide-md"><small>{f.user}</small></td>
                    <td className="right nowrap">{f.photoUrl && <button type="button" className="btn btn-icon btn-ghost" aria-label="Ver recibo" onClick={() => setPhoto(f.photoUrl)}><MdImage /></button>}{delBtn('tanqueos', f)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ))}
            {tab === 'mantenimientos' && (!v.maintenances.length ? <Empty icon={<MdBuild />}>Sin mantenimientos registrados.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Fecha</th><th>Mantenimiento</th><th className="num">Costo</th><th className="hide-md">Próximo</th><th /></tr></thead>
                <tbody>{v.maintenances.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.doneOn)}{m.odometer !== null && <><br /><small>{km(m.odometer)}</small></>}</td>
                    <td><Badge tone="dark">{m.kindLabel}</Badge><br /><small>{m.description}{m.workshop ? ` · ${m.workshop}` : ''}</small></td>
                    <td className="num money"><strong>{formatMoney(m.cost)}</strong><br />{expenseBadge(m.expense)}</td>
                    <td className="hide-md"><small>{[m.nextOdometer && km(m.nextOdometer), m.nextDate && formatDate(m.nextDate)].filter(Boolean).join(' · ') || '—'}</small></td>
                    <td className="right nowrap">{m.photoUrl && <button type="button" className="btn btn-icon btn-ghost" aria-label="Ver recibo" onClick={() => setPhoto(m.photoUrl)}><MdImage /></button>}{delBtn('mantenimientos', m)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ))}
            {tab === 'kilometraje' && (!v.odometerLogs.length ? <Empty icon={<MdSpeed />}>Sin lecturas de kilometraje.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Fecha</th><th className="num">Kilometraje</th><th>Origen</th><th className="hide-sm">Registró</th></tr></thead>
                <tbody>{v.odometerLogs.map((o) => <tr key={o.id}><td>{formatDate(o.readOn)}</td><td className="num"><strong>{km(o.odometer)}</strong></td><td><small>{{ manual: 'Lectura', tanqueo: 'Tanqueo', mantenimiento: 'Mantenimiento' }[o.source]}{o.note ? ` · ${o.note}` : ''}</small></td><td className="hide-sm"><small>{o.user}</small></td></tr>)}</tbody>
              </table></div>
            ))}
          </Card>
        </div>
      </div>
      {editing && <VehicleForm vehicle={v} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); toast('Vehículo actualizado') }} />}
      {log && <LogModal type={log} vehicle={v} onClose={() => setLog(null)} onDone={() => { const t = log; setLog(null); setTab(t); load(); toast({ tanqueos: 'Tanqueo registrado', mantenimientos: 'Mantenimiento registrado', kilometraje: 'Kilometraje actualizado' }[t]) }} />}
      {photo && <Modal title="Recibo" onClose={() => setPhoto(null)}><img className="receipt-photo" src={photo} alt="Recibo" /></Modal>}
      {removing && (
        <Modal title="Eliminar registro" onClose={() => setRemoving(null)} footer={<><button type="button" className="btn" onClick={() => setRemoving(null)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar este {removing.type === 'tanqueos' ? 'tanqueo' : 'mantenimiento'}?{removing.row.expense?.status === 'aplicado' ? ` El gasto ${removing.row.expense.number} se anula y el dinero vuelve a la caja.` : ''}</p>
        </Modal>
      )}
      {toastNode}
    </div>
  )
}

export default VehicleDetail
