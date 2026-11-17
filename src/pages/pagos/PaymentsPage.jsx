import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdAdd, MdSearch, MdPayments, MdChevronRight, MdReceipt } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import CustomerPicker from '../../components/CustomerPicker'
import { formatDate, formatMoney } from '../../utils/format'
import { PAY_METHOD } from '../../utils/credit'
import { PaymentModal, PayKindBadge, PayStatusBadge, ReceiptModal, todayBogota } from './common'

// Paso previo al pago: buscar al cliente y elegir el crédito activo.
const PickCreditModal = ({ onClose, onPick }) => {
  const [customer, setCustomer] = useState(null)
  const [credits, setCredits] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!customer) { setCredits(null); return }
    setCredits(null)
    api.get('/creditos', { params: { cliente: customer.id, estado: 'activo' } }).then(({ data }) => {
      setCredits(data)
      if (data.length === 1) choose(data[0].id)
    }).catch((e) => { setCredits([]); setError(errorMessage(e)) })
  }, [customer]) // eslint-disable-line react-hooks/exhaustive-deps
  const choose = async (id) => {
    setBusy(id); setError('')
    try { const { data } = await api.get(`/creditos/${id}`); onPick(data) } catch (e) { setError(errorMessage(e)); setBusy(null) }
  }
  return (
    <Modal title="Registrar pago" onClose={onClose}>
      <div className="stack">
        <Field label="Cliente" htmlFor="pc"><CustomerPicker id="pc" value={customer} onChange={setCustomer} autoFocus /></Field>
        {customer && (credits === null ? <div className="splash" style={{ minHeight: 80 }}><Spinner /></div>
          : !credits.length ? <div className="alert info">{customer.fullName} no tiene créditos activos{customer.lender ? '' : ' a tu cargo'}.</div>
            : (
              <div className="pick-list">
                <small className="hint">Elige el crédito al que se aplica el pago</small>
                {credits.map((c) => (
                  <button key={c.id} type="button" className="list-card clickable" onClick={() => choose(c.id)} disabled={Boolean(busy)}>
                    <div className="grow"><strong>Crédito #{c.number}</strong><small>{formatMoney(c.installmentAmount)} × {c.installmentsCount} · {c.frequencyLabel} · {c.paidCount} pagadas</small></div>
                    <div className="right"><div className="money"><strong>{formatMoney(c.balance)}</strong></div>{c.overdue > 0 ? <small className="text-bad">{formatMoney(c.overdue)} vencido</small> : <small>Al día</small>}</div>
                    {busy === c.id ? <Spinner /> : <MdChevronRight />}
                  </button>
                ))}
              </div>
            ))}
        {error && <div className="alert bad">{error}</div>}
      </div>
    </Modal>
  )
}

const PaymentsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [lenders, setLenders] = useState([])
  const [filters, setFilters] = useState({ desde: todayBogota(), hasta: todayBogota(), prestamista: '', estado: '', q: '' })
  const [picking, setPicking] = useState(params.get('nuevo') === '1')
  // Acceso rápido desde el buscador (?nuevo=1).
  useEffect(() => { if (params.get('nuevo') === '1') { setPicking(true); setParams({}, { replace: true }) } }, [params, setParams])
  const [paying, setPaying] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/pagos', { params: { desde: filters.desde || undefined, hasta: filters.hasta || undefined, prestamista: filters.prestamista || undefined, estado: filters.estado || undefined } })
      .then(({ data: d }) => setData(d)).catch((e) => { setData({ rows: [], totals: {} }); toast(errorMessage(e), 'bad') })
  }, [filters.desde, filters.hasta, filters.prestamista, filters.estado, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data: d }) => setLenders(d)).catch(() => {}) }, [admin])
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const range = (days) => {
    const d = new Date(`${todayBogota()}T12:00:00`); d.setDate(d.getDate() - days)
    setFilters((f) => ({ ...f, desde: d.toISOString().slice(0, 10), hasta: todayBogota() }))
  }

  const rows = useMemo(() => (data?.rows || []).filter((p) => !filters.q || `${p.number} ${p.customer?.fullName} ${p.customer?.identification} ${p.credit?.number}`.toLowerCase().includes(filters.q.toLowerCase())), [data, filters.q])
  const t = data?.totals || {}

  return (
    <div className="stack">
      <PageHead title={admin ? 'Pagos' : 'Registrar pago'} subtitle={admin ? 'Recaudo de cuotas y abonos a capital de todas las rutas.' : 'Registra lo que cobras en la ruta y comparte el recibo.'}>
        <button type="button" className="btn btn-primary" onClick={() => setPicking(true)}><MdAdd /> Registrar pago</button>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Recaudado" value={formatMoney(t.amount || 0)} tone="dark" note={`${t.count || 0} pago(s)`} />
        <Kpi label="En efectivo" value={formatMoney(t.cash || 0)} tone="brand" />
        <Kpi label="Transferencias y otros" value={formatMoney(t.transfer || 0)} />
        <Kpi label="Abonos a capital" value={formatMoney(t.capital || 0)} />
      </div>
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={filters.q} onChange={set('q')} placeholder="Buscar por recibo, cliente, documento o crédito" /></div>
          <input type="date" value={filters.desde} max={filters.hasta || undefined} onChange={set('desde')} aria-label="Desde" />
          <input type="date" value={filters.hasta} min={filters.desde || undefined} onChange={set('hasta')} aria-label="Hasta" />
          <div className="seg">
            <button type="button" className="btn btn-sm" onClick={() => range(0)}>Hoy</button>
            <button type="button" className="btn btn-sm" onClick={() => range(6)}>7 días</button>
            <button type="button" className="btn btn-sm" onClick={() => range(29)}>30 días</button>
          </div>
          {admin && <select value={filters.prestamista} onChange={set('prestamista')} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
          <select value={filters.estado} onChange={set('estado')} aria-label="Estado"><option value="">Aplicados y anulados</option><option value="aplicado">Aplicados</option><option value="anulado">Anulados</option></select>
        </div>
        {!data ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdPayments />}>No hay pagos en ese periodo.</Empty>
            : (
              <>
                <div className="table-wrap">
                  <table className="table responsive">
                    <thead><tr><th>Recibo</th><th>Cliente</th><th>Concepto</th><th className="hide-md">Medio</th>{admin && <th className="hide-md">Cobró</th>}<th className="num">Valor</th><th>Estado</th></tr></thead>
                    <tbody>{rows.map((p) => (
                      <tr key={p.id} className={`clickable${p.status === 'anulado' ? ' row-void' : ''}`} onClick={() => setReceipt({ id: p.id })}>
                        <td><strong>{p.number}</strong><br /><small>{formatDate(p.paidOn)}</small></td>
                        <td><div className="person"><img className="thumb" src={p.customer?.photoThumb} alt="" /><div><strong>{p.customer?.fullName}</strong><small><a className="link" onClick={(e) => { e.stopPropagation(); navigate(`/creditos/${p.credit?.id}`) }}>Crédito #{p.credit?.number}</a></small></div></div></td>
                        <td><PayKindBadge kind={p.kind} /></td>
                        <td className="hide-md">{PAY_METHOD[p.method]}{p.hasReceipt && <MdReceipt className="muted-icon" title="Con comprobante" aria-label="Con comprobante" />}{p.method === 'transferencia' && !p.hasReceipt && <small className="text-warn"> · sin comprobante</small>}{p.reference ? <><br /><small>{p.reference}</small></> : null}</td>
                        {admin && <td className="hide-md"><small>{p.lender?.fullName || 'Negocio'}</small></td>}
                        <td className="num money"><strong>{formatMoney(p.amount)}</strong></td>
                        <td><PayStatusBadge status={p.status} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="list-cards">
                  {rows.map((p) => (
                    <div key={p.id} className="list-card clickable" onClick={() => setReceipt({ id: p.id })}>
                      <img className="thumb" src={p.customer?.photoThumb} alt="" />
                      <div className="grow"><strong>{p.customer?.fullName}</strong><small>{p.number} · #{p.credit?.number} · {formatDate(p.paidOn)} · {PAY_METHOD[p.method]}</small></div>
                      <div className="right"><div className="money"><strong>{formatMoney(p.amount)}</strong></div>{p.status === 'anulado' ? <Badge tone="muted">Anulado</Badge> : p.kind === 'abono_capital' ? <Badge tone="ok">Abono</Badge> : null}</div>
                    </div>
                  ))}
                </div>
              </>
              )}
      </Card>
      {picking && <PickCreditModal onClose={() => setPicking(false)} onPick={(c) => { setPicking(false); setPaying(c) }} />}
      {paying && <PaymentModal credit={paying} onClose={() => setPaying(null)} onDone={(r) => { setPaying(null); load(); setReceipt({ id: r.id, initial: r }); toast(`Pago ${r.number} registrado`) }} />}
      {receipt && <ReceiptModal paymentId={receipt.id} initial={receipt.initial} onClose={() => setReceipt(null)} onChanged={() => { load(); toast('Pago anulado') }} />}
      {toastNode}
    </div>
  )
}

export default PaymentsPage
