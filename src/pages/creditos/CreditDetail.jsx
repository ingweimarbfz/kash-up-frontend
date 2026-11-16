import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdBlock, MdPrint, MdPhone, MdPayments, MdAutorenew, MdReceiptLong } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import ScheduleTable from '../../components/ScheduleTable'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'
import { CREDIT_STATUS, KIND_LABEL, METHOD_LABEL, PAY_METHOD, frequencyText } from '../../utils/credit'
import { PaymentModal, PayKindBadge, PayStatusBadge, ReceiptModal } from '../pagos/common'

export const CreditSummary = ({ c }) => (
  <dl className="stat-list">
    <div><dt>Tipo</dt><dd>{KIND_LABEL[c.kind]}</dd></div>
    {c.kind === 'producto' && <div><dt>Total productos</dt><dd className="money">{formatMoney(c.productsTotal)}</dd></div>}
    {c.discountAmount > 0 && <div><dt>Descuento {c.discountName}</dt><dd className="money text-ok">− {formatMoney(c.discountAmount)}</dd></div>}
    {c.downPayment > 0 && <div><dt>Cuota inicial</dt><dd className="money">{formatMoney(c.downPayment)}</dd></div>}
    <div><dt>Capital financiado</dt><dd className="money">{formatMoney(c.principal)}</dd></div>
    <div><dt>Interés</dt><dd>{c.interestName ? `${c.interestName} · ` : ''}{METHOD_LABEL[c.interestMethod]} {String(c.rate).replace('.', ',')} % {c.rateBasis === 'total' ? 'total' : 'mensual'}</dd></div>
    <div><dt>Interés total</dt><dd className="money">{formatMoney(c.totalInterest)}</dd></div>
    <div><dt>Cuotas</dt><dd>{c.installmentsCount} × {formatMoney(c.installmentAmount)} · {frequencyText(c)}{c.skipSundays ? ' (sin domingos)' : ''}</dd></div>
    <div><dt>Desembolso</dt><dd>{formatDate(c.disbursementDate)}</dd></div>
    <div><dt>Vencimientos</dt><dd>{formatDate(c.firstDueDate)} al {formatDate(c.lastDueDate)}</dd></div>
    {c.payoffAmount > 0 && <div><dt>Saldo del crédito anterior</dt><dd className="money">− {formatMoney(c.payoffAmount)}</dd></div>}
    {c.kind === 'efectivo' && <div><dt>Entregado en efectivo</dt><dd className="money">{formatMoney(c.disbursedAmount)}</dd></div>}
    {c.waivedAmount > 0 && <div><dt>Interés condonado por abonos</dt><dd className="money text-ok">− {formatMoney(c.waivedAmount)}</dd></div>}
    <div className="total"><dt>Total a pagar</dt><dd className="money">{formatMoney(c.totalAmount)}</dd></div>
  </dl>
)

const VoidModal = ({ credit, onClose, onDone }) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { const { data } = await api.post(`/creditos/${credit.id}/anular`, { reason }); onDone(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={`Anular crédito #${credit.number}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="void-form" className="btn btn-primary" disabled={saving || !reason.trim()}>{saving && <Spinner />} Anular crédito</button></>}>
      <form id="void-form" className="stack" onSubmit={submit}>
        <div className="alert warn">Solo se anulan créditos sin pagos. Las cuotas quedan anuladas{credit.items.length ? ' y los productos vuelven al inventario' : ''}. No se puede deshacer.</div>
        <Field label="Motivo" htmlFor="vr" required><textarea id="vr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

const CreditDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get(`/creditos/${id}`).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (location.state?.created) toast('Crédito creado') }, [location.state, toast])

  if (error) return <div className="alert bad">{error}</div>
  if (!c) return <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>
  const progress = c.totalAmount ? Math.round((c.paidAmount / c.totalAmount) * 100) : 0
  const applied = (c.payments || []).filter((p) => p.status === 'aplicado')
  const canPay = c.status === 'activo' && c.balance > 0
  const renewTitle = c.overdueCount ? `Debe ponerse al día primero (${c.overdueCount} cuota(s) vencida(s))` : 'Nuevo crédito que descuenta el saldo actual'

  return (
    <div className="stack">
      <PageHead title={`Crédito #${c.number}`} subtitle={`${KIND_LABEL[c.kind]} · creado por ${c.createdBy || '—'} el ${formatDateTime(c.createdAt)}`}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}><MdArrowBack /> Volver</button>
        <button type="button" className="btn" onClick={() => window.print()}><MdPrint /> Imprimir</button>
        {user.role === 'administrador' && c.status === 'activo' && !applied.length && <button type="button" className="btn" onClick={() => setVoiding(true)}><MdBlock /> Anular</button>}
        {c.status === 'activo' && <button type="button" className="btn" disabled={c.overdueCount > 0} title={renewTitle} onClick={() => navigate(`/creditos/nuevo?renovar=${c.id}`)}><MdAutorenew /> Renovar</button>}
        {canPay && <button type="button" className="btn btn-primary" onClick={() => setPaying(true)}><MdPayments /> Registrar pago</button>}
      </PageHead>
      {c.status === 'anulado' && <div className="alert warn">Crédito anulado. Motivo: {c.voidReason}</div>}
      {c.renewedBy && <div className="alert info">Este crédito se cerró al renovarse con el <a className="link" onClick={() => navigate(`/creditos/${c.renewedBy.id}`)}>crédito #{c.renewedBy.number}</a>.</div>}
      {c.renewedFrom && <div className="alert info">Renovación del <a className="link" onClick={() => navigate(`/creditos/${c.renewedFrom.id}`)}>crédito #{c.renewedFrom.number}</a>: se descontó su saldo de {formatMoney(c.payoffAmount)} y se entregó el restante.</div>}
      {c.status === 'activo' && c.overdueCount > 0 && <div className="alert warn">Tiene {c.overdueCount} cuota(s) vencida(s) por {formatMoney(c.overdue)}. No se puede renovar ni abonar a capital hasta que se ponga al día.</div>}

      <div className="grid grid-kpi">
        <Kpi label="Saldo" value={formatMoney(c.balance)} tone="dark" note={`${progress} % pagado`} />
        <Kpi label="Capital pendiente" value={formatMoney(c.capitalBalance)} />
        <Kpi label="Vencido" value={formatMoney(c.overdue)} tone={c.overdue ? 'bad' : ''} note={c.overdueCount ? `${c.overdueCount} cuota(s)` : 'Al día'} />
        <Kpi label="Próxima cuota" value={c.nextDueDate ? formatDate(c.nextDueDate) : '—'} tone="brand" note={`${c.paidCount} de ${c.installmentsCount} pagadas`} />
      </div>

      <div className="grid grid-2-1">
        <div className="stack">
          <Card title="Plan de cuotas" flush><ScheduleTable rows={c.installments} withStatus limit={15} /></Card>
          <Card title="Pagos" icon={<MdReceiptLong />} subtitle={applied.length ? `${applied.length} pago(s) · ${formatMoney(applied.reduce((s, p) => s + p.amount, 0))}` : null} flush>
            {!c.payments?.length ? <Empty icon={<MdReceiptLong />}>Aún no hay pagos registrados.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Recibo</th><th>Fecha</th><th>Concepto</th><th className="hide-sm">Medio</th><th className="num">Valor</th><th className="hide-sm">Estado</th></tr></thead>
                <tbody>{c.payments.map((p) => (
                  <tr key={p.id} className={`clickable${p.status === 'anulado' ? ' row-void' : ''}`} onClick={() => setReceipt({ id: p.id })}>
                    <td><strong>{p.number}</strong><br /><small>{p.user}</small></td><td>{formatDate(p.paidOn)}</td><td><PayKindBadge kind={p.kind} /></td>
                    <td className="hide-sm">{PAY_METHOD[p.method]}{p.reference ? <><br /><small>{p.reference}</small></> : null}</td>
                    <td className="num money"><strong>{formatMoney(p.amount)}</strong></td><td className="hide-sm"><PayStatusBadge status={p.status} /></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card>
            <div className="person clickable" onClick={() => navigate(`/clientes/${c.customer.id}`)}>
              <img className="thumb" style={{ width: 52, height: 52 }} src={c.customer.photoThumb} alt="" />
              <div style={{ flex: 1 }}><strong>{c.customer.fullName}</strong><small>{c.customer.docType} {c.customer.identification}</small><small>{c.customer.address}{c.customer.neighborhood ? `, ${c.customer.neighborhood}` : ''}</small></div>
              <Badge tone={CREDIT_STATUS[c.status][1]}>{CREDIT_STATUS[c.status][0]}</Badge>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 13 }}><MdPhone /> <a href={`tel:${c.customer.phone}`}>{c.customer.phone}</a> · Cobra: <strong>{c.lender?.fullName || 'Sin asignar'}</strong></p>
          </Card>
          <Card title="Condiciones"><CreditSummary c={c} /></Card>
          {c.items.length > 0 && (
            <Card title="Productos entregados" subtitle={c.warehouse ? `Desde ${c.warehouse.name}` : null} flush>
              <table className="table"><tbody>{c.items.map((i) => <tr key={i.productId}><td><strong>{i.name}</strong><br /><small>{i.quantity} × {formatMoney(i.unitPrice)}</small></td><td className="num money">{formatMoney(i.subtotal)}</td></tr>)}</tbody></table>
            </Card>
          )}
          <Card title="Referencias personales">
            {c.references.map((r, i) => <p key={i} style={{ margin: i ? '10px 0 0' : 0 }}><strong>{r.name}</strong>{r.relationship ? ` · ${r.relationship}` : ''}<br /><small><a href={`tel:${r.phone}`}>{r.phone}</a>{r.address ? ` · ${r.address}` : ''}</small></p>)}
          </Card>
          {c.notes && <Card title="Observaciones"><p style={{ margin: 0 }}>{c.notes}</p></Card>}
        </div>
      </div>
      {paying && <PaymentModal credit={c} onClose={() => setPaying(false)} onDone={(r) => { setPaying(false); load(); setReceipt({ id: r.id, initial: r }); toast(`Pago ${r.number} registrado`) }} />}
      {receipt && <ReceiptModal paymentId={receipt.id} initial={receipt.initial} onClose={() => setReceipt(null)} onChanged={() => { load(); toast('Pago anulado') }} />}
      {voiding && <VoidModal credit={c} onClose={() => setVoiding(false)} onDone={(d) => { setVoiding(false); setC(d); toast('Crédito anulado') }} />}
      {toastNode}
    </div>
  )
}

export default CreditDetail
