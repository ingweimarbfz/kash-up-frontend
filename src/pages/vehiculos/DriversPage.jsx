import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdBadge, MdPhone, MdPerson, MdImage } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { DriverForm, LicenseBadge } from './common'

// Conductores de la flota: se registran con su licencia y luego se eligen en el vehículo.
const DriversPage = () => {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [q, setQ] = useState('')
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get('/conductores').then(({ data }) => setRows(data)).catch((e) => { toast(errorMessage(e), 'bad'); setRows([]) }) }, [toast])
  useEffect(() => { load() }, [load])
  if (!rows) return <div className="splash"><Spinner /></div>
  const t = q.trim().toLowerCase()
  const shown = rows.filter((d) => !t || `${d.fullName} ${d.identification} ${d.phone} ${d.licenseNumber}`.toLowerCase().includes(t))
  const expired = rows.filter((d) => d.active && d.licenseDays < 0)
  const soon = rows.filter((d) => d.active && d.licenseDays >= 0 && d.licenseDays <= 30)
  return (
    <div className="stack">
      <PageHead title="Conductores" subtitle="Regístralos con su licencia; después los eliges al editar el vehículo y su celular se llena solo.">
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><MdAdd /> Nuevo conductor</button>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Conductores activos" value={rows.filter((d) => d.active).length} tone="dark" note={`${rows.filter((d) => d.vehicles.length).length} con vehículo asignado`} />
        <Kpi label="Licencias vencidas" value={expired.length} tone={expired.length ? 'bad' : ''} note={expired.length ? expired.map((d) => d.fullName).join(', ') : 'Ninguna'} />
        <Kpi label="Vencen en 30 días" value={soon.length} tone={soon.length ? 'warn' : ''} />
      </div>
      {rows.length > 0 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, cédula, celular o licencia" aria-label="Buscar conductor" />}
      {!rows.length ? <Card><Empty icon={<MdBadge />}>Aún no hay conductores. Regístralos con su licencia para asignarlos a los vehículos.</Empty></Card> : (
        <div className="driver-grid">
          {shown.map((d) => (
            <Card key={d.id}>
              <button type="button" className="driver-card btn-reset" onClick={() => setEditing(d)}>
                {d.photoUrl ? <img className="avatar-lg" src={d.photoUrl} alt="" /> : <span className="avatar-lg"><MdPerson /></span>}
                <span className="grow">
                  <span className="row-between"><strong>{d.fullName}</strong>{!d.active && <Badge tone="muted">Inactivo</Badge>}</span>
                  <small>C.C. {d.identification}</small>
                  <small><MdPhone /> {d.phone}</small>
                  <small>Licencia {d.licenseNumber}</small>
                  <LicenseBadge driver={d} />
                  <small>{d.vehicles.length ? `Conduce ${d.vehicles.map((v) => v.plate).join(', ')}` : 'Sin vehículo asignado'}</small>
                </span>
              </button>
              {d.licensePhotoUrl && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPhoto(d.licensePhotoUrl)}><MdImage /> Ver licencia</button>}
            </Card>
          ))}
          {!shown.length && <Card><Empty>Ningún conductor coincide con la búsqueda.</Empty></Card>}
        </div>
      )}
      {editing && <DriverForm driver={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { const isNew = editing === 'new'; setEditing(null); load(); toast(isNew ? 'Conductor registrado' : 'Conductor actualizado') }} />}
      {photo && <Modal title="Licencia de conducción" onClose={() => setPhoto(null)}><img className="receipt-photo" src={photo} alt="Licencia" /></Modal>}
      {toastNode}
    </div>
  )
}

export default DriversPage
