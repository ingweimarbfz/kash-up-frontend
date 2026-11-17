import React, { useEffect, useState } from 'react'
import { MdCheck, MdLockOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Field, Modal, Spinner } from '../../components/ui'
import { MoneyInput } from '../../components/forms'
import { formatDate, formatMoney } from '../../utils/format'
import { PaymentModal, ReceiptModal, todayBogota } from '../pagos/common'

export const VISIT_RESULTS = [['no_pago', 'No pagó'], ['no_estaba', 'No estaba'], ['promesa', 'Promesa de pago'], ['otro', 'Otro']]
export const STOP_TONES = { cobrado: 'ok', parcial: 'warn', pendiente: '', no_pago: 'bad', no_estaba: 'muted', promesa: 'brand', otro: 'muted' }
export const EXPENSE_CATS = [['combustible', 'Combustible'], ['alimentacion', 'Alimentación'], ['transporte', 'Transporte'], ['mantenimiento', 'Mantenimiento'], ['papeleria', 'Papelería'], ['comunicaciones', 'Comunicaciones'], ['otro', 'Otro']]

const useGeo = () => {
  const [geo, setGeo] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((p) => setGeo({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }), () => {}, { timeout: 10000 })
  }, [])
  return geo
}

// Visita sin pago: no pagó, no estaba o promesa de pago.
export const VisitModal = ({ stop, onClose, onDone }) => {
  const geo = useGeo()
  const [form, setForm] = useState({ result: 'no_pago', promiseDate: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/visitas', { creditId: stop.creditId, ...form, lat: geo?.lat, lng: geo?.lng }); onDone() } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={`Visita · ${stop.customer.fullName}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="visit-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdCheck />} Guardar visita</button></>}>
      <form id="visit-form" className="stack" onSubmit={submit}>
        <p style={{ margin: 0 }}>Crédito #{stop.number} · debe hoy <strong>{formatMoney(stop.dueAmount)}</strong>{stop.overdueCount ? ` (${stop.overdueCount} cuota(s) vencida(s))` : ''}</p>
        <div className="choice-grid">
          {VISIT_RESULTS.map(([k, l]) => <button key={k} type="button" className={`btn${form.result === k ? ' on' : ''}`} onClick={() => setForm((f) => ({ ...f, result: k }))}>{l}</button>)}
        </div>
        {form.result === 'promesa' && <Field label="¿Cuándo promete pagar?" htmlFor="vp" required><input id="vp" type="date" min={todayBogota()} value={form.promiseDate} onChange={set('promiseDate')} /></Field>}
        <Field label="Nota" htmlFor="vn"><input id="vn" value={form.note} onChange={set('note')} placeholder="Qué dijo el cliente" /></Field>
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

// Cobrar desde la ruta: trae el crédito y abre el registro de pago.
export const CollectFlow = ({ creditId, onClose, onDone }) => {
  const [credit, setCredit] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get(`/creditos/${creditId}`).then(({ data }) => setCredit(data)).catch((e) => setError(errorMessage(e))) }, [creditId])
  if (error) return <Modal title="Registrar pago" onClose={onClose}><div className="alert bad">{error}</div></Modal>
  if (receipt) return <ReceiptModal paymentId={receipt.id} initial={receipt} onClose={() => { onClose() }} />
  if (!credit) return <Modal title="Registrar pago" onClose={onClose}><div className="splash" style={{ minHeight: 120 }}><Spinner /></div></Modal>
  return <PaymentModal credit={credit} onClose={onClose} onDone={(r) => { setReceipt(r); onDone?.(r) }} />
}

// Resumen del día y cierre de jornada (cuadre de efectivo y entrega opcional al negocio).
export const CloseDayPanel = ({ lenderId, day, onClosed }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [s, setS] = useState(null)
  const [form, setForm] = useState({ countedCash: '', deliver: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = () => api.get('/cierres/resumen', { params: { prestamista: lenderId, fecha: day } }).then(({ data }) => setS(data)).catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [lenderId, day]) // eslint-disable-line react-hooks/exhaustive-deps
  const counted = form.countedCash === '' ? null : Number(form.countedCash)
  const diff = counted === null || !s ? null : counted - s.cash
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (counted === null) return setError('Escribe el efectivo que tienes en mano.')
    setSaving(true)
    try { await api.post('/cierres', { lenderId, day, countedCash: counted, deliver: Number(form.deliver) || 0, note: form.note }); await load(); onClosed?.() } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  const reopen = async () => {
    setSaving(true); setError('')
    try { await api.delete(`/cierres/${s.closure.id}`); await load(); onClosed?.() } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  if (!s) return error ? <div className="alert bad">{error}</div> : <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
  const c = s.closure
  return (
    <div className="stack">
      <dl className="stat-list">
        <div><dt>Cobrado en efectivo ({s.payments} pago(s))</dt><dd className="money text-ok">+ {formatMoney(s.collectedCash)}</dd></div>
        <div><dt>Transferencias (van a la cuenta del negocio)</dt><dd className="money">{formatMoney(s.collectedOther)}</dd></div>
        {s.received > 0 && <div><dt>Recibido del negocio</dt><dd className="money text-ok">+ {formatMoney(s.received)}</dd></div>}
        <div><dt>Prestado hoy</dt><dd className="money text-bad">− {formatMoney(s.disbursed)}</dd></div>
        <div><dt>Gastos</dt><dd className="money text-bad">− {formatMoney(s.expenses)}</dd></div>
        {s.delivered > 0 && <div><dt>Entregado al negocio</dt><dd className="money text-bad">− {formatMoney(s.delivered)}</dd></div>}
        <div><dt>Ruta</dt><dd>{s.route.paid} cobrados · {s.route.visited} visitados · {s.unvisited} sin visitar de {s.route.stops}</dd></div>
        <div className="total"><dt>Efectivo que debe tener</dt><dd className="money">{formatMoney(c ? c.expectedCash : s.cash)}</dd></div>
      </dl>
      {c ? (
        <>
          <div className={`alert ${c.difference === 0 ? 'ok' : 'warn'}`}><MdLockOutline /> <span>Jornada cerrada por {c.closedBy} · contó {formatMoney(c.countedCash)}{c.difference !== 0 ? ` · ${c.difference < 0 ? 'faltante' : 'sobrante'} de ${formatMoney(Math.abs(c.difference))}` : ' · cuadre exacto'}{c.deliveryRef ? ` · entrega al negocio ${c.deliveryRef}` : ''}.</span></div>
          {admin && <div><button type="button" className="btn btn-sm" onClick={reopen} disabled={saving}>{saving && <Spinner />} Reabrir jornada</button></div>}
        </>
      ) : (
        <form className="stack" onSubmit={submit}>
          {s.unvisited > 0 && <div className="alert warn">Quedan {s.unvisited} cliente(s) de la ruta sin cobro ni visita registrada.</div>}
          <div className="form-grid">
            <Field label="Efectivo contado" htmlFor="cc" required hint="Lo que tienes en la mano al cerrar"><MoneyInput id="cc" value={form.countedCash} onChange={(v) => setForm((f) => ({ ...f, countedCash: v }))} /></Field>
            <Field label="Entregar al negocio" htmlFor="cd" hint="Opcional: sale de tu caja y entra a la del negocio"><MoneyInput id="cd" value={form.deliver} onChange={(v) => setForm((f) => ({ ...f, deliver: v }))} /></Field>
            <div className="span-2"><Field label="Nota" htmlFor="cn"><input id="cn" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Opcional" /></Field></div>
          </div>
          {diff !== null && <div className={`alert ${diff === 0 ? 'ok' : 'warn'}`}>{diff === 0 ? 'El efectivo cuadra exacto.' : `${diff < 0 ? 'Faltan' : 'Sobran'} ${formatMoney(Math.abs(diff))} frente a lo que debe tener.`}</div>}
          {error && <div className="alert bad">{error}</div>}
          <div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdLockOutline />} Cerrar jornada del {formatDate(s.day)}</button></div>
          <small className="hint">Al cerrar ya no podrás registrar pagos ni gastos de este día. Solo el administrador puede reabrirla.</small>
        </form>
      )}
    </div>
  )
}
