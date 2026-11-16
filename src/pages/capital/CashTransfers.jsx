import React, { useCallback, useEffect, useState } from 'react'
import { MdSwapHoriz, MdCheck, MdClose, MdSend } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Modal, Spinner } from '../../components/ui'
import { MoneyInput } from '../../components/forms'
import { formatDateTime, formatMoney } from '../../utils/format'

const STATUS = { pendiente: ['Pendiente', 'warn'], entregado: ['Entregado', 'ok'], rechazado: ['Devuelto', 'muted'] }

// El prestamista envía dinero al negocio para que el administrador se lo pase a otro prestamista.
export const SendTransferModal = ({ balance, onClose, onDone }) => {
  const { user } = useAuth()
  const [lenders, setLenders] = useState([])
  const [form, setForm] = useState({ toLenderId: '', amount: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/prestamistas').then(({ data }) => setLenders(data.filter((l) => l.id !== user.id))).catch(() => {}) }, [user.id])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.toLenderId) return setError('Elige a qué prestamista va el dinero.')
    if (!(Number(form.amount) > 0)) return setError('Ingresa el valor a trasladar.')
    if (Number(form.amount) > balance) return setError(`No tienes ese saldo en tu caja (disponible ${formatMoney(balance)}).`)
    setSaving(true)
    try { const { data } = await api.post('/traslados-caja', form); onDone(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Trasladar dinero a otro prestamista" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="tr-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdSend />} Enviar al administrador</button></>}>
      <form id="tr-form" className="stack" onSubmit={submit} noValidate>
        <div className="alert info"><MdSwapHoriz /> <span>El dinero sale de tu caja hacia el negocio. El administrador se lo entrega al otro prestamista. Si lo rechaza, vuelve a tu caja.</span></div>
        <div className="form-grid">
          <div className="span-2"><Field label="Para" htmlFor="trto" required><select id="trto" value={form.toLenderId} onChange={set('toLenderId')}><option value="">Elige el prestamista</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select></Field></div>
          <Field label="Valor" htmlFor="tram" required hint={`Disponible en tu caja: ${formatMoney(balance)}`}><MoneyInput id="tram" value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Nota" htmlFor="trno"><input id="trno" value={form.note} onChange={set('note')} placeholder="Ej.: para que preste mañana" /></Field>
        </div>
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

// Administrador: entrega el traslado (al pedido u otro prestamista) o lo devuelve.
const ResolveModal = ({ t, onClose, onDone }) => {
  const [lenders, setLenders] = useState([])
  const [to, setTo] = useState(t.to ? String(t.to.id) : '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api.get('/prestamistas').then(({ data }) => setLenders(data.filter((l) => l.id !== t.from.id))).catch(() => {}) }, [t.from.id])
  const act = async (action) => {
    setError('')
    if (action === 'rechazar' && !note.trim()) return setError('Escribe el motivo para devolver el dinero.')
    if (action === 'entregar' && !to) return setError('Elige quién recibe el dinero.')
    setBusy(action)
    try { await api.post(`/traslados-caja/${t.id}/${action}`, { toLenderId: to, note }); onDone(action) } catch (e) { setError(errorMessage(e)); setBusy('') }
  }
  return (
    <Modal title={`Traslado ${t.number}`} onClose={onClose}
      footer={<><button type="button" className="btn" disabled={!!busy} onClick={() => act('rechazar')}>{busy === 'rechazar' ? <Spinner /> : <MdClose />} Devolver a {t.from.fullName}</button><button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => act('entregar')}>{busy === 'entregar' ? <Spinner /> : <MdCheck />} Entregar</button></>}>
      <div className="stack">
        <dl className="stat-list">
          <div><dt>Envía</dt><dd>{t.from.fullName}</dd></div>
          <div><dt>Pidió que sea para</dt><dd>{t.to?.fullName || '—'}</dd></div>
          {t.note && <div><dt>Nota</dt><dd>{t.note}</dd></div>}
          <div className="total"><dt>Valor</dt><dd className="money">{formatMoney(t.amount)}</dd></div>
        </dl>
        <Field label="Entregar a" htmlFor="rsto"><select id="rsto" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Elige el prestamista</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select></Field>
        <Field label="Nota" htmlFor="rsno" hint="Obligatoria si lo devuelves"><input id="rsno" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <small className="hint">El dinero ya está en la cuenta del negocio. Al entregarlo pasa a la caja del prestamista elegido.</small>
        {error && <div className="alert bad">{error}</div>}
      </div>
    </Modal>
  )
}

// Lista de traslados. El administrador ve todos (y resuelve los pendientes); el prestamista, los suyos.
export const CashTransfers = ({ reloadKey = 0, onChanged, toast }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const load = useCallback(() => { api.get('/traslados-caja').then(({ data }) => setRows(data)).catch(() => setRows([])) }, [])
  useEffect(() => { load() }, [load, reloadKey])
  if (!rows) return null
  if (!rows.length && admin) return null
  const pending = rows.filter((r) => r.status === 'pendiente').length
  return (
    <Card flush title="Traslados entre prestamistas" icon={<MdSwapHoriz />} subtitle={pending ? `${pending} pendiente(s) por entregar` : 'El dinero pasa por el administrador'}>
      {!rows.length ? <Empty icon={<MdSwapHoriz />}>No has hecho traslados.</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Traslado</th><th>De → Para</th><th className="num">Valor</th><th>Estado</th>{admin && <th />}</tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td><strong>{t.number}</strong><br /><small>{formatDateTime(t.createdAt)}</small></td>
              <td>{t.from.fullName} → {(t.deliveredTo || t.to)?.fullName || '—'}{t.note && <><br /><small>{t.note}</small></>}{t.reviewNote && <><br /><small>Admin: {t.reviewNote}</small></>}</td>
              <td className="num money"><strong>{formatMoney(t.amount)}</strong></td>
              <td><Badge tone={STATUS[t.status][1]}>{STATUS[t.status][0]}</Badge></td>
              {admin && <td className="right">{t.status === 'pendiente' && <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(t)}>Resolver</button>}</td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {open && <ResolveModal t={open} onClose={() => setOpen(null)} onDone={(a) => { setOpen(null); load(); onChanged?.(); toast?.(a === 'entregar' ? `Traslado ${open.number} entregado` : `Traslado ${open.number} devuelto`) }} />}
    </Card>
  )
}
