import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdBlock, MdPrint, MdPhone, MdPayments, MdAutorenew, MdReceiptLong, MdEdit, MdArrowForward } from 'react-icons/md'
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

// Editar el crédito (administrador): fecha de cobro de una cuota (y las siguientes), no cobrar domingos y notas.
// Los montos no cambian. El motivo queda en la bitácora.
// Prestamista: envía una solicitud. Si es de fecha, ve la cuota y la nueva fecha; si es otro cambio (valor, interés,
// cuotas), solo lo describe, y únicamente si el crédito no tiene pagos (el administrador pide anular y crear de nuevo).
const REQUEST_KINDS = [['fecha', 'Cambio de fecha de cobro'], ['valor', 'Cambiar el valor'], ['interes', 'Cambiar el interés'], ['cuotas', 'Cambiar el número de cuotas'], ['otro', 'Otro cambio']]
const EditModal = ({ credit, onClose, onDone, asLender = false }) => {
  const active = credit.status === 'activo'
  const movable = credit.installments.filter((i) => i.status !== 'pagada' && i.status !== 'anulada')
  const first = movable[0]
  const [f, setF] = useState({ fromNumber: first ? String(first.number) : '', newDate: first?.dueDate || '', mode: 'siguientes', skipSundays: credit.skipSundays, notes: credit.notes || '', reason: '' })
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [kind, setKind] = useState('fecha')
  const hasPayments = (credit.payments || []).some((p) => p.status === 'aplicado')
  const isDate = !asLender || kind === 'fecha'
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const target = credit.installments.find((i) => String(i.number) === f.fromNumber)
  const datesChanged = active && target && f.newDate && f.newDate !== target.dueDate
  const sundaysChanged = f.skipSundays !== credit.skipSundays
  const body = () => ({
    dates: datesChanged || (active && sundaysChanged && target) ? { fromNumber: Number(f.fromNumber), newDate: f.newDate, mode: f.mode } : undefined,
    skipSundays: f.skipSundays, notes: f.notes, reason: f.reason
  })
  useEffect(() => {
    if (!isDate || (!datesChanged && !(active && sundaysChanged))) { setPreview(null); setError(''); return undefined }
    const t = setTimeout(() => {
      api.put(`/creditos/${credit.id}`, { ...body(), preview: true }).then(({ data }) => { setPreview(data.changes); setError('') }).catch((e) => { setPreview(null); setError(errorMessage(e)) })
    }, 300)
    return () => clearTimeout(t)
  }, [f.fromNumber, f.newDate, f.mode, f.skipSundays, isDate]) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!isDate) {
      if (f.reason.trim().length < 5) return setError('Explica el cambio que necesitas (mínimo 5 letras).')
      setSaving(true)
      try {
        const { data } = await api.put(`/creditos/${credit.id}`, { kind: 'otro', topic: kind, reason: f.reason })
        return onDone(data.credit, data.message)
      } catch (err) { setError(errorMessage(err)); return setSaving(false) }
    }
    if (f.reason.trim().length < 5) return setError('Escribe el motivo del cambio (mínimo 5 letras): queda en la bitácora.')
    if (asLender && !datesChanged && !sundaysChanged) return setError('Elige una fecha distinta a la actual.')
    setSaving(true)
    try {
      const { data, status } = await api.put(`/creditos/${credit.id}`, asLender ? { dates: body().dates || { fromNumber: Number(f.fromNumber), newDate: f.newDate, mode: f.mode }, skipSundays: f.skipSundays, reason: f.reason } : body())
      onDone(status === 202 ? data.credit : data, status === 202 ? data.message : null)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal size="lg" title={asLender ? `Solicitar cambio · crédito #${credit.number}` : `Editar crédito #${credit.number}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="edit-credit" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} {asLender ? 'Enviar solicitud' : 'Guardar cambios'}</button></>}>
      <form id="edit-credit" className="stack" onSubmit={submit} noValidate>
        {asLender && (
          <Field label="Tipo de solicitud" htmlFor="ek" hint={hasPayments ? 'El crédito ya tiene pagos registrados: solo se puede pedir cambio de fecha.' : null}>
            <select id="ek" value={kind} onChange={(e) => { setKind(e.target.value); setError('') }}>
              {REQUEST_KINDS.filter(([k]) => k === 'fecha' || !hasPayments).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        )}
        {asLender && (isDate
          ? <div className="alert info">El administrador recibe tu solicitud y la aprueba o la rechaza. Mientras tanto, las fechas no cambian.</div>
          : <div className="alert info">El administrador recibe tu solicitud. Para cambiar el valor, el interés o las cuotas, lo normal es anular este crédito y crear uno nuevo con los datos correctos.</div>)}
        {!isDate ? null : active && movable.length > 0 ? (
          <>
            <div className="section-title">Fecha de cobro</div>
            <div className="form-grid">
              <Field label="Cuota" htmlFor="ef">
                <select id="ef" value={f.fromNumber} onChange={(e) => { const i = credit.installments.find((x) => String(x.number) === e.target.value); setF((x) => ({ ...x, fromNumber: e.target.value, newDate: i?.dueDate || x.newDate })) }}>
                  {movable.map((i) => <option key={i.number} value={i.number}>Cuota {i.number} · {formatDate(i.dueDate)} · {formatMoney(i.amount - i.paidAmount - (i.waived || 0))}{i.status === 'parcial' ? ' (abonada)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Nueva fecha" htmlFor="ed"><input id="ed" type="date" min={credit.disbursementDate} value={f.newDate} onChange={set('newDate')} /></Field>
              <div className="span-2 row-actions">
                <label className="check"><input type="radio" name="em" checked={f.mode === 'siguientes'} onChange={() => setF((x) => ({ ...x, mode: 'siguientes' }))} /><span>Mover también las cuotas siguientes ({frequencyText(credit)})</span></label>
                <label className="check"><input type="radio" name="em" checked={f.mode === 'una'} onChange={() => setF((x) => ({ ...x, mode: 'una' }))} /><span>Solo esta cuota</span></label>
              </div>
              <label className="check span-2"><input type="checkbox" checked={f.skipSundays} onChange={set('skipSundays')} /><span>No cobrar los domingos</span></label>
            </div>
            {preview && preview.length > 0 && (
              <div className="alert info">
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{preview.length} cuota(s) cambian de fecha:</strong>
                  {preview.slice(0, 6).map((x) => <span key={x.number}>Cuota {x.number}: {formatDate(x.from)} <MdArrowForward /> {formatDate(x.to)}</span>)}
                  {preview.length > 6 && <span>… y {preview.length - 6} más, hasta el {formatDate(preview[preview.length - 1].to)}.</span>}
                </div>
              </div>
            )}
            {preview && preview.length === 0 && <div className="alert">Las fechas quedan iguales.</div>}
            <small className="hint">Los valores de las cuotas no cambian. Las cuotas pagadas no se mueven.</small>
          </>
        ) : <div className="alert">{active ? 'Todas las cuotas están pagadas: solo puedes cambiar las notas.' : `El crédito está ${credit.status}: solo puedes cambiar las notas.`}</div>}
        {!asLender && <Field label="Notas" htmlFor="en"><textarea id="en" rows={2} value={f.notes} onChange={set('notes')} /></Field>}
        <Field label={isDate ? 'Motivo del cambio' : 'Describe el cambio'} htmlFor="er" required hint={asLender ? 'El administrador lo ve al decidir. Queda en la bitácora.' : 'Queda en la bitácora junto con la fecha anterior y la nueva.'}><input id="er" value={f.reason} maxLength={200} onChange={set('reason')} placeholder={isDate ? 'Ej.: el cliente cobra su sueldo el día 20' : 'Ej.: el valor correcto es 500.000, no 50.000'} /></Field>
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

// Texto rápido para rechazar cuando el cambio no es solo de fechas (monto, tasa, cuotas…).
const ANULAR_Y_CREAR = 'Este cambio no se puede hacer editando el crédito. Anula el crédito y créalo de nuevo con los datos correctos.'

// Solicitud de cambio de fecha pendiente: el administrador la aprueba o rechaza; el prestamista puede retirarla.
const PendingChange = ({ credit, admin, onDone, toast }) => {
  const p = credit.pendingChange
  const [busy, setBusy] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  if (!p) return null
  const act = async (kind) => {
    setError('')
    if (kind === 'rechazar' && admin && !note.trim()) return setError('Escribe el motivo del rechazo.')
    setBusy(kind)
    try {
      await api.post(`/solicitudes-cambio-credito/${p.id}/${kind}`, { note: note.trim() || undefined })
      toast(kind === 'aprobar' ? 'Cambio de fecha aprobado' : admin ? 'Solicitud rechazada' : 'Solicitud retirada'); onDone()
    } catch (e) { setError(errorMessage(e)); setBusy('') }
  }
  const first = p.changes[0]
  const other = p.kind === 'otro'
  return (
    <div className="alert warn">
      <div className="stack" style={{ gap: 6, width: '100%' }}>
        <span><strong>{other ? (admin ? `${p.requestedBy} pidió: ${p.topicLabel.toLowerCase()}` : `Pediste: ${p.topicLabel.toLowerCase()}`) : admin ? `${p.requestedBy} pidió cambiar la fecha de cobro` : 'Pediste cambiar la fecha de cobro'}</strong> · {formatDateTime(p.createdAt)}</span>
        {!other && first && <span>Cuota {first.number}: {formatDate(first.from)} <MdArrowForward /> {formatDate(first.to)}{p.changes.length > 1 ? ` y ${p.changes.length - 1} cuota(s) siguiente(s), hasta el ${formatDate(p.changes[p.changes.length - 1].to)}` : ''}.</span>}
        <span>{other ? 'Detalle' : 'Motivo'}: “{p.reason}”</span>
        {admin && other && !rejecting && <small>Este cambio no se aplica editando el crédito. Recházalo y pide al prestamista que lo anule y cree uno nuevo{credit.payments?.some((x) => x.status === 'aplicado') ? '' : ', o anúlalo tú desde el botón Anular'}.</small>}
        {admin ? (
          rejecting ? (
            <div className="stack" style={{ gap: 6 }}>
            <div className="row-actions">
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setNote(ANULAR_Y_CREAR)}>Pedir que anule y cree de nuevo</button>
            </div>
            <div className="row-actions">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" />
              <button type="button" className="btn btn-sm" onClick={() => act('rechazar')} disabled={!!busy}>{busy === 'rechazar' && <Spinner />} Rechazar</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRejecting(false)}>Volver</button>
            </div>
            </div>
          ) : (
            <div className="row-actions">
              {other
                ? <button type="button" className="btn btn-sm btn-primary" onClick={() => { setNote(ANULAR_Y_CREAR); setRejecting(true) }} disabled={!!busy}>Rechazar y pedir anular</button>
                : <button type="button" className="btn btn-sm btn-primary" onClick={() => act('aprobar')} disabled={!!busy}>{busy === 'aprobar' && <Spinner />} Aprobar cambio</button>}
              <button type="button" className="btn btn-sm" onClick={() => setRejecting(true)} disabled={!!busy}>Rechazar</button>
            </div>
          )
        ) : <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => act('rechazar')} disabled={!!busy}>{busy && <Spinner />} Retirar solicitud</button></div>}
        {error && <div className="alert bad">{error}</div>}
      </div>
    </div>
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
  const [editing, setEditing] = useState(false)
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
        {user.role === 'administrador' && c.status !== 'anulado' && <button type="button" className="btn" onClick={() => setEditing(true)}><MdEdit /> Editar</button>}
        {user.role === 'prestamista' && c.status === 'activo' && !c.pendingChange && c.installments.some((i) => i.status !== 'pagada' && i.status !== 'anulada') && <button type="button" className="btn" onClick={() => setEditing(true)}><MdEdit /> Solicitar cambio</button>}
        {user.role === 'administrador' && c.status === 'activo' && !applied.length && <button type="button" className="btn" onClick={() => setVoiding(true)}><MdBlock /> Anular</button>}
        {c.status === 'activo' && <button type="button" className="btn" disabled={c.overdueCount > 0} title={renewTitle} onClick={() => navigate(`/creditos/nuevo?renovar=${c.id}`)}><MdAutorenew /> Renovar</button>}
        {canPay && <button type="button" className="btn btn-primary" onClick={() => setPaying(true)}><MdPayments /> Registrar pago</button>}
      </PageHead>
      <PendingChange credit={c} admin={user.role === 'administrador'} onDone={load} toast={toast} />
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
              <table className="table"><tbody>{c.items.map((i) => <tr key={i.productId}><td><strong>{i.name}</strong>{i.promotion && <> <span className="promo-tag sm">{i.promotion}</span></>}<br /><small>{i.quantity} × {formatMoney(i.unitPrice)}{i.listPrice && i.listPrice > i.unitPrice ? <> <s className="muted">{formatMoney(i.listPrice)}</s></> : null}</small></td><td className="num money">{formatMoney(i.subtotal)}</td></tr>)}</tbody></table>
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
      {editing && <EditModal credit={c} asLender={user.role === 'prestamista'} onClose={() => setEditing(false)} onDone={(d, msg) => { setEditing(false); setC(d); toast(msg || 'Crédito actualizado') }} />}
      {voiding && <VoidModal credit={c} onClose={() => setVoiding(false)} onDone={(d) => { setVoiding(false); setC(d); toast('Crédito anulado') }} />}
      {toastNode}
    </div>
  )
}

export default CreditDetail
