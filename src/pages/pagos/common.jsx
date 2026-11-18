import React, { useEffect, useState } from 'react'
import { MdCheck, MdPrint, MdShare, MdBlock, MdMyLocation, MdInfoOutline, MdReceipt, MdOpenInNew } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Field, Modal, Spinner } from '../../components/ui'
import { MoneyInput, ReceiptInput, Tabs } from '../../components/forms'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'
import { PAY_KIND, PAY_METHOD, PAY_STATUS } from '../../utils/credit'

export const todayBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

export const PayKindBadge = ({ kind }) => <Badge tone={PAY_KIND[kind]?.[1]}>{PAY_KIND[kind]?.[0] || kind}</Badge>
export const PayStatusBadge = ({ status }) => <Badge tone={PAY_STATUS[status]?.[1]}>{PAY_STATUS[status]?.[0] || status}</Badge>

// Registrar un pago de cuota o un abono a capital sobre un crédito (detalle del crédito).
// credit: { id, number, installmentAmount, balance, overdue, overdueCount, capitalBalance, nextDueDate, customer }
export const PaymentModal = ({ credit, onClose, onDone }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [kind, setKind] = useState('cuota')
  const [form, setForm] = useState({ amount: credit.overdue > 0 ? credit.overdue : Math.min(credit.installmentAmount, credit.balance), method: 'efectivo', reference: '', paidOn: todayBogota(), note: '', receiptUrl: null })
  const [geo, setGeo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  // Se toma la ubicación del cobro sin bloquear el registro si el permiso se niega.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((p) => setGeo({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }), () => {}, { enableHighAccuracy: true, timeout: 10000 })
  }, [])

  const blockedAbono = kind === 'abono_capital' && credit.overdue > 0
  const quick = kind === 'cuota'
    ? [['Una cuota', Math.min(credit.installmentAmount, credit.balance)], ...(credit.overdue > 0 ? [[`Vencido (${credit.overdueCount})`, credit.overdue]] : []), ['Todo el saldo', credit.balance]]
    : [['Todo el capital', credit.capitalBalance]]
  // Varias cuotas: suma lo que falta de las siguientes N cuotas pendientes (desde la más antigua).
  const open = (credit.installments || []).filter((i) => i.status === 'pendiente' || i.status === 'parcial').sort((a, b) => a.number - b.number)
  const pendingCount = open.length || (credit.installmentAmount > 0 ? Math.ceil(credit.balance / credit.installmentAmount) : 0)
  const forCuotas = (n) => Math.min(credit.balance, open.length
    ? open.slice(0, n).reduce((t, i) => t + i.amount - (i.paidAmount || 0) - (i.waived || 0), 0)
    : n * credit.installmentAmount)
  const amount = Number(form.amount) || 0
  const cuotasN = kind === 'cuota' ? Array.from({ length: Math.min(pendingCount, 60) }, (_, k) => k + 1).find((n) => forCuotas(n) === amount) : undefined
  const tooMuch = amount > credit.balance
  const needsReceipt = form.method === 'transferencia' && !form.receiptUrl

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (needsReceipt) { setError('Adjunta la foto o el archivo del comprobante de la transferencia'); return }
    setSaving(true)
    try {
      const { data } = await api.post(`/creditos/${credit.id}/pagos`, { kind, amount, method: form.method, reference: form.reference, paidOn: form.paidOn, note: form.note, lat: geo?.lat, lng: geo?.lng, receiptUrl: form.method !== 'efectivo' ? form.receiptUrl : null })
      onDone(data)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }

  return (
    <Modal title={`Registrar pago · crédito #${credit.number}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="pay-form" className="btn btn-primary" disabled={saving || !amount || tooMuch || blockedAbono || needsReceipt}>{saving ? <Spinner /> : <MdCheck />} Registrar {formatMoney(amount)}</button></>}>
      <form id="pay-form" className="stack" onSubmit={submit}>
        {credit.customer && <p style={{ margin: 0 }}><strong>{credit.customer.fullName}</strong> · {credit.customer.docType ? `${credit.customer.docType} ` : ''}{credit.customer.identification}</p>}
        <dl className="stat-list compact">
          <div><dt>Saldo</dt><dd className="money">{formatMoney(credit.balance)}</dd></div>
          <div><dt>Vencido</dt><dd className={`money${credit.overdue ? ' text-bad' : ''}`}>{credit.overdue ? `${formatMoney(credit.overdue)} · ${credit.overdueCount} cuota(s)` : 'Al día'}</dd></div>
          <div><dt>Cuota</dt><dd className="money">{formatMoney(credit.installmentAmount)}{credit.nextDueDate ? ` · vence ${formatDate(credit.nextDueDate)}` : ''}</dd></div>
        </dl>
        <Tabs value={kind} onChange={(v) => { setKind(v); setForm((f) => ({ ...f, amount: v === 'cuota' ? (credit.overdue || Math.min(credit.installmentAmount, credit.balance)) : '' })) }}
          tabs={[['cuota', 'Pago de cuota'], ['abono_capital', 'Abono a capital']]} />
        {kind === 'cuota'
          ? <small className="hint"><MdInfoOutline /> Se aplica a las cuotas pendientes desde la más antigua.</small>
          : <small className="hint"><MdInfoOutline /> Reduce el capital desde las últimas cuotas: el crédito termina antes y no se cobra el interés de las cuotas que cubre. Capital pendiente: <strong>{formatMoney(credit.capitalBalance)}</strong>.</small>}
        {blockedAbono && <div className="alert bad">Para abonar a capital el cliente debe estar al día. Primero registre el pago de lo vencido ({formatMoney(credit.overdue)}).</div>}
        <Field label="Valor recibido" htmlFor="pa" required>
          <MoneyInput id="pa" value={form.amount} onChange={set('amount')} autoFocus disabled={blockedAbono} />
        </Field>
        <div className="quick-amounts">
          {quick.map(([label, v]) => <button key={label} type="button" className={`btn btn-sm${amount === v ? ' on' : ''}`} disabled={blockedAbono || !v} onClick={() => setForm((f) => ({ ...f, amount: v }))}>{label} · {formatMoney(v)}</button>)}
        </div>
        {kind === 'cuota' && pendingCount > 1 && (
          <Field label="Número de cuotas" htmlFor="pn" hint="Calcula el valor de varias cuotas; se aplican desde la más antigua.">
            <select id="pn" value={cuotasN || ''} onChange={(e) => e.target.value && setForm((f) => ({ ...f, amount: forCuotas(Number(e.target.value)) }))}>
              <option value="">Otro valor</option>
              {Array.from({ length: Math.min(pendingCount, 60) }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n} cuota{n > 1 ? 's' : ''} · {formatMoney(forCuotas(n))}</option>)}
            </select>
          </Field>
        )}
        {tooMuch && <div className="alert bad">El valor supera el saldo del crédito ({formatMoney(credit.balance)}).</div>}
        <div className="form-grid">
          <Field label="Medio de pago" htmlFor="pm">
            <select id="pm" value={form.method} onChange={set('method')}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="otro">Otro</option></select>
          </Field>
          {admin
            ? <Field label="Fecha del pago" htmlFor="pd"><input id="pd" type="date" max={todayBogota()} value={form.paidOn} onChange={set('paidOn')} /></Field>
            : <Field label="Fecha del pago"><input value={formatDate(form.paidOn)} disabled /></Field>}
          {form.method !== 'efectivo' && <div className="span-2"><Field label="Referencia o comprobante" htmlFor="pr"><input id="pr" value={form.reference} onChange={set('reference')} placeholder="Número de la transferencia" /></Field></div>}
          {form.method !== 'efectivo' && <div className="span-2"><Field label="Comprobante" required={form.method === 'transferencia'}><ReceiptInput value={form.receiptUrl} onChange={set('receiptUrl')} required={form.method === 'transferencia'} /></Field></div>}
          <div className="span-2"><Field label="Nota" htmlFor="pn"><input id="pn" value={form.note} onChange={set('note')} placeholder="Opcional" /></Field></div>
        </div>
        <small className="hint"><MdMyLocation /> {geo ? `Ubicación del cobro: ${geo.lat}, ${geo.lng}` : 'Sin ubicación (se registra igual)'}</small>
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

// Texto plano del recibo, para compartir por WhatsApp.
const receiptText = (r) => [
  `*${r.business}* · Recibo de pago ${r.number}`,
  `${PAY_KIND[r.kind]?.[0]} · ${formatDate(r.paidOn)}`,
  `Cliente: ${r.customer?.fullName} (${r.customer?.identification})`,
  `Crédito #${r.credit?.number}`,
  `Valor: *${formatMoney(r.amount)}* (${PAY_METHOD[r.method]}${r.reference ? ` · ref. ${r.reference}` : ''})`,
  r.installments.length ? `Cuotas: ${r.installments.map((i) => `#${i.number}`).join(', ')}` : null,
  `Saldo pendiente: ${formatMoney(r.after.balance)}`,
  r.after.nextDueDate ? `Próxima cuota: ${formatDate(r.after.nextDueDate)}` : null,
  r.status === 'anulado' ? '*PAGO ANULADO*' : null,
  r.footer || null
].filter(Boolean).join('\n')

const printReceipt = (r) => {
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return
  const rows = r.installments.map((i) => `<tr><td>Cuota #${i.number} · ${formatDate(i.dueDate)}</td><td style="text-align:right">${formatMoney(i.amount)}${i.waived ? `<br><small>interés condonado ${formatMoney(i.waived)}</small>` : ''}</td></tr>`).join('')
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(r.number)}</title>
<style>@page{size:auto;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:system-ui,Arial,sans-serif;color:#111;font-size:16px;line-height:1.35;padding:14mm 16mm;max-width:640px;margin:0 auto}
h1{font-size:26px;margin:0}h2{font-size:18px;margin:4px 0 16px;color:#555;font-weight:500}
table{width:100%;border-collapse:collapse;table-layout:fixed}td{padding:8px 0;border-bottom:1px dashed #bbb;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}td:first-child{width:45%;padding-right:12px}
.big{font-size:34px;font-weight:700;margin:16px 0}@media print{body{max-width:none;width:100%}}.void{color:#b91c1c;font-weight:700;border:2px solid #b91c1c;padding:6px;text-align:center;margin:10px 0}small{color:#666}</style></head><body>
<h1>${esc(r.business)}</h1><h2>Recibo de pago ${esc(r.number)}</h2>
${r.status === 'anulado' ? `<div class="void">PAGO ANULADO · ${esc(r.voidReason)}</div>` : ''}
<table><tr><td>Fecha</td><td style="text-align:right">${formatDate(r.paidOn)}</td></tr><tr><td>Cliente</td><td style="text-align:right">${esc(r.customer?.fullName)}<br><small>${esc(r.customer?.identification)}</small></td></tr>
<tr><td>Crédito</td><td style="text-align:right">#${esc(r.credit?.number)}</td></tr><tr><td>Concepto</td><td style="text-align:right">${esc(PAY_KIND[r.kind]?.[0])}</td></tr>
<tr><td>Medio</td><td style="text-align:right">${esc(PAY_METHOD[r.method])}${r.reference ? `<br><small>${esc(r.reference)}</small>` : ''}</td></tr>${rows}</table>
<div class="big">${formatMoney(r.amount)}</div>
<table><tr><td>Saldo pendiente</td><td style="text-align:right"><strong>${formatMoney(r.after.balance)}</strong></td></tr>${r.after.nextDueDate ? `<tr><td>Próxima cuota</td><td style="text-align:right">${formatDate(r.after.nextDueDate)}</td></tr>` : ''}
<tr><td>Recibió</td><td style="text-align:right">${esc(r.user || '')}</td></tr></table>
${r.footer ? `<p><small>${esc(r.footer)}</small></p>` : ''}<script>window.onload=()=>{window.print()}</script></body></html>`)
  w.document.close()
}

// Recibo del pago: imprimir, compartir por WhatsApp y (administrador) anular.
export const ReceiptModal = ({ paymentId, initial = null, onClose, onChanged }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [r, setR] = useState(initial)
  const [error, setError] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [proof, setProof] = useState(null)
  const [attaching, setAttaching] = useState(null)
  const canAttach = r && r.status === 'aplicado' && !['efectivo', 'renovacion'].includes(r.method) && (admin || !r.hasReceipt) && user.role !== 'cliente'
  const showProof = async () => {
    setError('')
    try { const { data } = await api.get(`/pagos/${r.id}/comprobante`); setProof(data) } catch (e) { setError(errorMessage(e)) }
  }
  const saveProof = async () => {
    setSaving(true); setError('')
    try { const { data } = await api.put(`/pagos/${r.id}/comprobante`, { receiptUrl: attaching }); setR(data); setAttaching(null); setProof(null); onChanged?.(data) } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }
  const openProof = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(proof.type === 'pdf' ? `<iframe src="${proof.url}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>` : `<img src="${proof.url}" style="max-width:100%">`)
    w.document.close()
  }
  useEffect(() => { if (!initial) api.get(`/pagos/${paymentId}`).then(({ data }) => setR(data)).catch((e) => setError(errorMessage(e))) }, [paymentId, initial])

  const share = () => {
    const phone = String(r.customer?.phone || '').replace(/\D/g, '')
    const to = phone ? (phone.length === 10 ? `57${phone}` : phone) : ''
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(receiptText(r))}`, '_blank', 'noopener')
  }
  const doVoid = async () => {
    setSaving(true); setError('')
    try { const { data } = await api.post(`/pagos/${r.id}/anular`, { reason }); setR(data); setVoiding(false); onChanged?.(data) } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <Modal title={r ? `Recibo ${r.number}` : 'Recibo'} onClose={onClose}
      footer={r && (voiding
        ? <><button type="button" className="btn" onClick={() => setVoiding(false)}>Volver</button><button type="button" className="btn btn-primary" disabled={saving || !reason.trim()} onClick={doVoid}>{saving ? <Spinner /> : <MdBlock />} Anular pago</button></>
        : <>{admin && r.status === 'aplicado' && r.kind !== 'renovacion' && <button type="button" className="btn btn-ghost" onClick={() => setVoiding(true)}><MdBlock /> Anular</button>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => printReceipt(r)}><MdPrint /> Imprimir</button>
          <button type="button" className="btn btn-primary" onClick={share}><MdShare /> WhatsApp</button></>)}>
      {!r ? (error ? <div className="alert bad">{error}</div> : <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>) : (
        <div className="stack receipt">
          <div className="receipt-head">
            <div><small>{r.business}</small><strong className="money">{formatMoney(r.amount)}</strong><span>{PAY_KIND[r.kind]?.[0]} · {PAY_METHOD[r.method]}{r.reference ? ` · ${r.reference}` : ''}</span></div>
            <PayStatusBadge status={r.status} />
          </div>
          {r.status === 'anulado' && <div className="alert warn">Pago anulado. Motivo: {r.voidReason}</div>}
          <dl className="stat-list">
            <div><dt>Fecha del pago</dt><dd>{formatDate(r.paidOn)}</dd></div>
            <div><dt>Cliente</dt><dd>{r.customer?.fullName} · {r.customer?.identification}</dd></div>
            <div><dt>Crédito</dt><dd>#{r.credit?.number}</dd></div>
            {r.installments.map((i) => <div key={i.number}><dt>Cuota #{i.number} · {formatDate(i.dueDate)}</dt><dd className="money">{formatMoney(i.amount)}{i.waived > 0 && <small className="waived">interés condonado {formatMoney(i.waived)}</small>}</dd></div>)}
            <div className="total"><dt>Saldo pendiente</dt><dd className="money">{formatMoney(r.after.balance)}</dd></div>
            {r.after.nextDueDate && <div><dt>Próxima cuota</dt><dd>{formatDate(r.after.nextDueDate)}</dd></div>}
            <div><dt>Registró</dt><dd>{r.user} · {formatDateTime(r.createdAt)}</dd></div>
            {r.note && <div><dt>Nota</dt><dd>{r.note}</dd></div>}
            {!['efectivo', 'renovacion'].includes(r.method) && (
              <div><dt>Comprobante</dt><dd>{r.hasReceipt
                ? <button type="button" className="link-btn" onClick={showProof}><MdReceipt /> Ver comprobante</button>
                : <span className={r.method === 'transferencia' ? 'text-warn' : 'muted'}>Sin comprobante</span>}</dd></div>
            )}
          </dl>
          {proof && (
            <div className="receipt-proof">
              {proof.type === 'pdf' ? <div className="receipt-file"><MdReceipt /> Comprobante en PDF</div> : <img src={proof.url} alt="Comprobante de la transferencia" />}
              <div className="row-end"><button type="button" className="btn btn-sm" onClick={openProof}><MdOpenInNew /> Abrir</button>{canAttach && <button type="button" className="btn btn-sm" onClick={() => setAttaching('')}>Cambiar</button>}</div>
            </div>
          )}
          {canAttach && !r.hasReceipt && attaching === null && <button type="button" className="btn btn-sm" onClick={() => setAttaching('')}><MdReceipt /> Adjuntar comprobante</button>}
          {attaching !== null && (
            <div className="stack" style={{ gap: 8 }}>
              <ReceiptInput value={attaching || null} onChange={(v) => setAttaching(v || '')} required />
              <div className="row-end"><button type="button" className="btn btn-sm" onClick={() => setAttaching(null)}>Cancelar</button><button type="button" className="btn btn-sm btn-primary" disabled={!attaching || saving} onClick={saveProof}>{saving && <Spinner />} Guardar comprobante</button></div>
            </div>
          )}
          {voiding && (
            <>
              <div className="alert warn">Solo se puede anular el último pago del crédito. El dinero sale de la caja donde entró y las cuotas vuelven a quedar pendientes.</div>
              <Field label="Motivo de la anulación" htmlFor="pvr" required><textarea id="pvr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
            </>
          )}
          {error && <div className="alert bad">{error}</div>}
        </div>
      )}
    </Modal>
  )
}
