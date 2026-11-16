import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdBadge, MdPhone, MdPerson, MdImage, MdKey, MdLink } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { DriverForm, LicenseBadge } from './common'

// Acceso del conductor a la app (KU-021): usuario y contraseña, o enlace con su usuario de prestamista.
const AccessModal = ({ d, onClose, onSaved }) => {
  const [f, setF] = useState({ username: d.access?.username || d.identification, password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (e) => {
    e?.preventDefault(); setSaving(true); setError('')
    try { const { data } = await api.post(`/conductores/${d.id}/acceso`, f); onSaved(data) } catch (er) { setError(errorMessage(er)); setSaving(false) }
  }
  const remove = async () => {
    setSaving(true)
    try { await api.delete(`/conductores/${d.id}/acceso`); onSaved({ removed: true }) } catch (er) { setError(errorMessage(er)); setSaving(false) }
  }
  return (
    <Modal title={`Acceso de ${d.fullName}`} onClose={onClose}
      footer={<>{d.access && <button type="button" className="btn btn-ghost text-bad" disabled={saving} onClick={remove}>Quitar acceso</button>}<button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="acc-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} {d.isLender ? 'Enlazar' : 'Guardar'}</button></>}>
      <form id="acc-form" className="stack" onSubmit={save}>
        {d.isLender ? (
          <div className="alert ok">{d.fullName} también es prestamista. No necesita otro usuario: se enlaza a su cuenta de prestamista y ve el vehículo en "Mi vehículo".</div>
        ) : <>
          <small className="hint">El conductor entra a KashUp y solo ve el reporte de los vehículos que conduce: tanqueos, gastos y mantenimientos. No puede registrar ni cambiar nada.</small>
          <Field label="Usuario" htmlFor="acc-u" required><input id="acc-u" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" /></Field>
          <Field label={d.access ? 'Nueva contraseña (opcional)' : 'Contraseña'} htmlFor="acc-p" required={!d.access} hint="Mínimo 8 caracteres"><input id="acc-p" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
        </>}
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

// Conductores de la flota: se registran con su licencia y luego se eligen en el vehículo.
const DriversPage = () => {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [access, setAccess] = useState(null)
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
              <div className="driver-access">
                {d.access ? <Badge tone="ok"><MdKey /> {d.access.role === 'prestamista' ? `Usa su usuario de prestamista (${d.access.username})` : `Entra como ${d.access.username}`}</Badge> : <Badge tone="muted">Sin acceso a la app</Badge>}
                <span className="row-end">
                  {d.licensePhotoUrl && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPhoto(d.licensePhotoUrl)}><MdImage /> Licencia</button>}
                  {d.active && <button type="button" className="btn btn-sm" onClick={() => setAccess(d)}>{d.isLender && !d.access ? <><MdLink /> Enlazar</> : <><MdKey /> {d.access ? 'Acceso' : 'Dar acceso'}</>}</button>}
                </span>
              </div>
            </Card>
          ))}
          {!shown.length && <Card><Empty>Ningún conductor coincide con la búsqueda.</Empty></Card>}
        </div>
      )}
      {editing && <DriverForm driver={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { const isNew = editing === 'new'; setEditing(null); load(); toast(isNew ? 'Conductor registrado' : 'Conductor actualizado') }} />}
      {access && <AccessModal d={access} onClose={() => setAccess(null)} onSaved={(r) => { setAccess(null); load(); toast(r.removed ? 'Acceso quitado' : r.linked === 'prestamista' ? r.message : `Listo: entra con el usuario ${r.username}`) }} />}
      {photo && <Modal title="Licencia de conducción" onClose={() => setPhoto(null)}><img className="receipt-photo" src={photo} alt="Licencia" /></Modal>}
      {toastNode}
    </div>
  )
}

export default DriversPage
