import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdReceiptLong, MdBlock, MdCheck, MdImage } from 'react-icons/md'
import { useSearchParams } from 'react-router-dom'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { MoneyInput, PhotoInput } from '../../components/forms'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'
import { EXPENSE_CATS } from './common'

const CAT_LABEL = Object.fromEntries(EXPENSE_CATS)

const ExpenseModal = ({ lenders, onClose, onDone }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [form, setForm] = useState({ category: 'combustible', amount: '', spentOn: todayBogota(), note: '', photoUrl: null, lenderId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!(Number(form.amount) > 0)) return setError('Ingresa el valor del gasto.')
    setSaving(true)
    try { const { data } = await api.post('/gastos', form); onDone(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Registrar gasto" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="exp-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdCheck />} Guardar gasto</button></>}>
      <form id="exp-form" className="stack" onSubmit={submit} noValidate>
        <div className="choice-grid">{EXPENSE_CATS.map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${form.category === k ? ' on' : ''}`} onClick={() => setForm((f) => ({ ...f, category: k }))}>{l}</button>)}</div>
        <div className="form-grid">
          <Field label="Valor" htmlFor="ea" required><MoneyInput id="ea" value={form.amount} onChange={set('amount')} autoFocus /></Field>
          {admin ? <Field label="Fecha" htmlFor="ed"><input id="ed" type="date" max={todayBogota()} value={form.spentOn} onChange={set('spentOn')} /></Field> : <Field label="Fecha"><input value={formatDate(form.spentOn)} disabled /></Field>}
          {admin && <div className="span-2"><Field label="Sale de la caja de" htmlFor="el"><select id="el" value={form.lenderId} onChange={set('lenderId')}><option value="">El negocio</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select></Field></div>}
          <div className="span-2"><Field label="Descripción" htmlFor="en"><input id="en" value={form.note} onChange={set('note')} placeholder="Ej.: gasolina de la moto" /></Field></div>
        </div>
        <Field label="Soporte (foto de la factura)"><PhotoInput value={form.photoUrl} onChange={set('photoUrl')} round={false} label="Tomar foto" /></Field>
        {!admin && <small className="hint">El gasto sale de tu caja y aparece en el cierre de jornada.</small>}
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

const ExpensesPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [data, setData] = useState(null)
  const [lenders, setLenders] = useState([])
  const first = new Date(`${todayBogota()}T12:00:00`); first.setDate(1)
  const [filters, setFilters] = useState({ desde: first.toISOString().slice(0, 10), hasta: todayBogota(), prestamista: '', categoria: '' })
  const [adding, setAdding] = useState(false)
  const [qs, setQs] = useSearchParams()
  // Acceso rápido desde el buscador (?nuevo=1).
  useEffect(() => { if (qs.get('nuevo') === '1') { setAdding(true); setQs({}, { replace: true }) } }, [qs, setQs])
  const [detail, setDetail] = useState(null)
  const [reason, setReason] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/gastos', { params: { desde: filters.desde || undefined, hasta: filters.hasta || undefined, prestamista: filters.prestamista || undefined, categoria: filters.categoria || undefined } })
      .then(({ data: d }) => setData(d)).catch((e) => { setData({ rows: [], totals: {}, byCategory: [] }); toast(errorMessage(e), 'bad') })
  }, [filters, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data: d }) => setLenders(d)).catch(() => {}) }, [admin])
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const doVoid = async () => {
    setVoiding(true)
    try { await api.post(`/gastos/${detail.id}/anular`, { reason }); setDetail(null); setReason(''); load(); toast('Gasto anulado') } catch (e) { toast(errorMessage(e), 'bad') } finally { setVoiding(false) }
  }
  const top = (data?.byCategory || []).slice().sort((a, b) => b.amount - a.amount)

  return (
    <div className="stack">
      <PageHead title="Gastos" subtitle={admin ? 'Gastos de las rutas y del negocio. Salen de la caja correspondiente.' : 'Gastos de tu ruta: salen de tu caja.'}>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><MdAdd /> Registrar gasto</button>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Total en el periodo" value={formatMoney(data?.totals?.amount || 0)} tone="dark" note={`${data?.totals?.count || 0} gasto(s)`} />
        {top.slice(0, 3).map((c) => <Kpi key={c.key} label={c.label} value={formatMoney(c.amount)} />)}
      </div>
      <Card flush>
        <div className="toolbar">
          <input type="date" value={filters.desde} max={filters.hasta} onChange={set('desde')} aria-label="Desde" />
          <input type="date" value={filters.hasta} min={filters.desde} max={todayBogota()} onChange={set('hasta')} aria-label="Hasta" />
          <select value={filters.categoria} onChange={set('categoria')} aria-label="Categoría"><option value="">Todas las categorías</option>{EXPENSE_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          {admin && <select value={filters.prestamista} onChange={set('prestamista')} aria-label="Caja"><option value="">Todas las cajas</option><option value="negocio">Negocio</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
        </div>
        {!data ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !data.rows.length ? <Empty icon={<MdReceiptLong />}>No hay gastos en ese periodo.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Gasto</th><th>Categoría</th><th className="hide-sm">Descripción</th>{admin && <th className="hide-md">Caja</th>}<th className="num">Valor</th><th className="hide-sm">Estado</th></tr></thead>
              <tbody>{data.rows.map((e) => (
                <tr key={e.id} className={`clickable${e.status === 'anulado' ? ' row-void' : ''}`} onClick={() => setDetail(e)}>
                  <td><strong>{e.number}</strong><br /><small>{formatDate(e.spentOn)}</small></td>
                  <td><Badge tone="dark">{e.categoryLabel}</Badge></td>
                  <td className="hide-sm">{e.note || '—'}{e.photoUrl && <MdImage className="muted-icon" title="Con soporte" />}</td>
                  {admin && <td className="hide-md"><small>{e.lender?.fullName || 'Negocio'}</small></td>}
                  <td className="num money"><strong>{formatMoney(e.amount)}</strong></td>
                  <td className="hide-sm">{e.status === 'anulado' ? <Badge tone="muted">Anulado</Badge> : <Badge tone="ok">Aplicado</Badge>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </Card>
      {adding && <ExpenseModal lenders={lenders} onClose={() => setAdding(false)} onDone={(e) => { setAdding(false); load(); toast(`Gasto ${e.number} registrado`) }} />}
      {detail && (
        <Modal title={`Gasto ${detail.number}`} onClose={() => { setDetail(null); setReason('') }}
          footer={admin && detail.status === 'aplicado' ? <button type="button" className="btn" disabled={voiding || !reason.trim()} onClick={doVoid}>{voiding ? <Spinner /> : <MdBlock />} Anular gasto</button> : null}>
          <div className="stack">
            <dl className="stat-list">
              <div><dt>Categoría</dt><dd>{CAT_LABEL[detail.category]}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDate(detail.spentOn)}</dd></div>
              <div><dt>Caja</dt><dd>{detail.lender?.fullName || 'Negocio'}</dd></div>
              <div><dt>Registró</dt><dd>{detail.user}</dd></div>
              {detail.note && <div><dt>Descripción</dt><dd>{detail.note}</dd></div>}
              <div className="total"><dt>Valor</dt><dd className="money">{formatMoney(detail.amount)}</dd></div>
            </dl>
            {detail.status === 'anulado' && <div className="alert warn">Anulado: {detail.voidReason}</div>}
            {detail.photoUrl && <img className="receipt-photo" src={detail.photoUrl} alt="Soporte del gasto" />}
            {admin && detail.status === 'aplicado' && <Field label="Motivo para anular" htmlFor="evr"><input id="evr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Solo si se registró por error" /></Field>}
          </div>
        </Modal>
      )}
      {toastNode}
    </div>
  )
}

export default ExpensesPage
