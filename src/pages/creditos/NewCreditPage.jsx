import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdAdd, MdDelete, MdArrowBack, MdCheck, MdPayments, MdInventory2, MdSavings, MdAutorenew } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Field, PageHead, Spinner } from '../../components/ui'
import { MoneyInput, Tabs } from '../../components/forms'
import ScheduleTable from '../../components/ScheduleTable'
import { FREQUENCIES, FREQ_LABEL, METHODS, METHOD_LABEL, rateText } from '../../utils/credit'
import { formatDate, formatMoney } from '../../utils/format'
import { DiscountChip } from '../inventario/common'
import CustomerPicker from '../../components/CustomerPicker'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const EMPTY_REF = { name: '', phone: '', relationship: '', address: '' }

const NewCreditPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [customer, setCustomer] = useState(null)
  const renewId = params.get('renovar')
  const [renewal, setRenewal] = useState(null)
  const [rates, setRates] = useState([])
  const [products, setProducts] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [lenders, setLenders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [form, setForm] = useState({
    customerId: params.get('cliente') || '', kind: 'efectivo', principal: '', items: [], warehouseId: '', discountId: '', downPayment: '',
    interestRateId: '', method: 'fija', rate: '', rateBasis: 'mensual', frequency: 'diaria', customDays: 10, count: 30, skipSundays: true,
    disbursementDate: today(), firstDueDate: '', lenderId: '', notes: '', references: [{ ...EMPTY_REF }]
  })
  const [preview, setPreview] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Cliente que llega desde su ficha (?cliente=ID) o el crédito a renovar (?renovar=ID).
    const loadCustomer = (pre) => {
      api.get(`/clientes/${pre}`).then(({ data: c }) => {
        if (c.status !== 'activo') return
        const act = (c.credits || []).filter((k) => k.status === 'activo')
        setCustomer({ ...c, activeCredits: act.length, balance: act.reduce((s, k) => s + k.balance, 0), overdue: act.reduce((s, k) => s + k.overdue, 0) })
      }).catch(() => {})
    }
    if (renewId) {
      api.get(`/creditos/${renewId}/renovacion`).then(({ data: r }) => {
        setRenewal(r)
        setForm((f) => ({ ...f, kind: 'efectivo', items: [], customerId: String(r.customerId), lenderId: r.lenderId ? String(r.lenderId) : '' }))
        loadCustomer(r.customerId)
      }).catch((e) => setRenewal({ canRenew: false, reason: errorMessage(e) }))
    } else if (params.get('cliente')) loadCustomer(params.get('cliente'))
    api.get('/tasas', { params: { activas: 1 } }).then(({ data }) => setRates(data)).catch(() => {})
    api.get('/descuentos', { params: { activos: 1 } }).then(({ data }) => setDiscounts(data)).catch(() => {})
    api.get('/inventario/bodegas', { params: { activas: 1 } }).then(({ data }) => {
      setWarehouses(data)
      const g = data.find((w) => w.isGeneral) || data[0]
      if (g) setForm((f) => (f.warehouseId ? f : { ...f, warehouseId: String(g.id) }))
    }).catch(() => {})
    if (admin) api.get('/prestamistas').then(({ data }) => setLenders(data)).catch(() => {})
  }, [admin])
  // Los productos y su stock dependen de la bodega que entrega.
  useEffect(() => {
    if (!form.warehouseId) return
    api.get('/inventario/productos', { params: { activos: 1, bodega: form.warehouseId } }).then(({ data }) => setProducts(data)).catch(() => {})
  }, [form.warehouseId])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const pickCustomer = (c) => { setCustomer(c); setForm((f) => ({ ...f, customerId: c ? String(c.id) : '' })) }
  const pickRate = (e) => {
    const r = rates.find((x) => String(x.id) === e.target.value)
    setForm((f) => (r ? { ...f, interestRateId: e.target.value, method: r.method, rate: r.rate, rateBasis: r.rateBasis, frequency: r.defaultFrequency || f.frequency } : { ...f, interestRateId: '' }))
  }
  const setItem = (i, k, v) => setForm((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }))
  const setRef = (i, k, v) => setForm((f) => ({ ...f, references: f.references.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))

  // Cuerpo que entiende el backend.
  const body = useMemo(() => ({
    ...form,
    rate: Number(String(form.rate).replace(',', '.')),
    renewFromId: renewal?.creditId || undefined,
    count: Number(form.count),
    firstDueDate: form.firstDueDate || undefined,
    items: form.items.map((it) => ({ productId: Number(it.productId), quantity: Number(it.quantity), unitPrice: it.unitPrice }))
  }), [form, renewal])

  // Vista previa automática del plan cuando cambian las condiciones.
  const ready = (!renewId || renewal?.canRenew) && form.customerId && form.count && form.rate !== '' && (form.kind === 'efectivo' ? Number(form.principal) > 0 : form.items.some((it) => it.productId && Number(it.quantity) > 0))
  useEffect(() => {
    if (!ready) { setPreview(null); setPreviewError(''); return undefined }
    const t = setTimeout(() => {
      setCalculating(true)
      api.post('/creditos/simular', body).then(({ data }) => { setPreview(data); setPreviewError('') }).catch((e) => { setPreview(null); setPreviewError(errorMessage(e)) }).finally(() => setCalculating(false))
    }, 400)
    return () => clearTimeout(t)
  }, [body, ready])

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!preview) { setError(previewError || 'Completa los datos del crédito.'); return }
    setSaving(true)
    try { const { data } = await api.post('/creditos', body); navigate(`/creditos/${data.id}`, { replace: true, state: { created: true } }) } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }

  const productTotal = form.items.reduce((s, it) => {
    const p = products.find((x) => String(x.id) === String(it.productId))
    return s + (p ? (it.unitPrice !== undefined && it.unitPrice !== '' ? Number(it.unitPrice) : p.price) * (Number(it.quantity) || 0) : 0)
  }, 0)

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <PageHead title={renewId ? `Renovar crédito #${renewal?.number || ''}` : 'Nuevo crédito'} subtitle={renewId ? 'El nuevo crédito descuenta el saldo del actual y entrega el restante en efectivo.' : 'Elige el cliente, las condiciones y revisa el plan de cuotas antes de guardar.'}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}><MdArrowBack /> Volver</button>
      </PageHead>
      {renewId && renewal && !renewal.canRenew && <div className="alert bad">No se puede renovar. {renewal.reason}</div>}
      {renewal?.canRenew && <div className="alert info"><MdAutorenew /> Saldo actual del crédito #{renewal.number}: <strong>{formatMoney(renewal.payoff)}</strong>. Se descuenta del nuevo préstamo y el crédito #{renewal.number} queda cerrado como renovado.</div>}
      <div className="grid grid-2-1">
        <div className="stack">
          <Card title={renewId ? '1. Cliente y nuevo préstamo' : '1. Cliente y tipo de crédito'}>
            <div className="form-grid">
              <div className="span-2"><Field label="Cliente" htmlFor="nc" required>
                <CustomerPicker id="nc" value={customer} onChange={pickCustomer} locked={Boolean(renewId)} />
              </Field></div>
              {!renewId && <div className="span-2"><Tabs value={form.kind} onChange={(v) => setForm((f) => ({ ...f, kind: v, items: v === 'producto' && !f.items.length ? [{ productId: '', quantity: 1 }] : f.items }))} tabs={[['efectivo', 'Crédito en efectivo'], ['producto', 'Crédito de producto']]} /></div>}
              {form.kind === 'efectivo' && <Field label={renewId ? 'Valor del nuevo préstamo' : 'Valor del préstamo'} htmlFor="np" required hint={renewal?.canRenew ? `Debe ser mayor que el saldo actual (${formatMoney(renewal.payoff)})` : null}><MoneyInput id="np" value={form.principal} onChange={set('principal')} /></Field>}
              {admin && (
                <Field label="Prestamista que cobra" htmlFor="nl" hint="Por defecto, el asignado al cliente">
                  <select id="nl" value={form.lenderId} onChange={set('lenderId')}><option value="">{customer?.lender ? `Asignado: ${customer.lender.fullName}` : 'Sin asignar'}</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>
                </Field>
              )}
            </div>
          </Card>

          {form.kind === 'producto' && (
            <Card title="2. Productos del inventario" icon={<MdInventory2 />}>
              <div className="stack" style={{ gap: 10 }}>
                <Field label="Bodega que entrega" htmlFor="nw" hint="El stock que ves es el de esta bodega">
                  <select id="nw" value={form.warehouseId} onChange={set('warehouseId')}>
                    {[...new Set(warehouses.map((w) => w.siteName))].map((site) => (
                      <optgroup key={site} label={site}>{warehouses.filter((w) => w.siteName === site).map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (principal)' : ''}</option>)}</optgroup>
                    ))}
                  </select>
                </Field>
                {form.items.map((it, i) => {
                  const p = products.find((x) => String(x.id) === String(it.productId))
                  return (
                    <div key={i} className="item-row">
                      <select value={it.productId} onChange={(e) => setItem(i, 'productId', e.target.value)} aria-label="Producto">
                        <option value="">Producto…</option>
                        {products.map((x) => <option key={x.id} value={x.id} disabled={!x.stock}>{x.name} · {formatMoney(x.price)} · {x.stock} disp.</option>)}
                      </select>
                      <input type="number" min="1" max={p?.stock || undefined} value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} aria-label="Cantidad" />
                      {admin ? <MoneyInput value={it.unitPrice ?? p?.price ?? ''} onChange={(v) => setItem(i, 'unitPrice', v)} aria-label="Precio unitario" /> : <span className="money">{p ? formatMoney(p.price) : '—'}</span>}
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} aria-label="Quitar"><MdDelete /></button>
                    </div>
                  )
                })}
                <div><button type="button" className="btn btn-sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { productId: '', quantity: 1 }] }))}><MdAdd /> Agregar producto</button></div>
                <div className="form-grid">
                  <Field label="Descuento" htmlFor="nd"><select id="nd" value={form.discountId} onChange={set('discountId')}><option value="">Sin descuento</option>{discounts.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.type === 'porcentaje' ? `${d.value} %` : formatMoney(d.value)})</option>)}</select>
                    {discounts.find((d) => String(d.id) === String(form.discountId)) && <div className="disc-chip-row"><DiscountChip d={discounts.find((d) => String(d.id) === String(form.discountId))} /></div>}</Field>
                  <Field label="Cuota inicial" htmlFor="ndp"><MoneyInput id="ndp" value={form.downPayment} onChange={set('downPayment')} /></Field>
                </div>
                <dl className="stat-list">
                  <div><dt>Total productos</dt><dd className="money">{formatMoney(preview?.productsTotal ?? productTotal)}</dd></div>
                  {preview?.discountAmount > 0 && <div><dt>Descuento {preview.discountName}</dt><dd className="money text-ok">− {formatMoney(preview.discountAmount)}</dd></div>}
                  {Number(form.downPayment) > 0 && <div><dt>Cuota inicial</dt><dd className="money">− {formatMoney(form.downPayment)}</dd></div>}
                  {preview && <div className="total"><dt>A financiar</dt><dd className="money">{formatMoney(preview.principal)}</dd></div>}
                </dl>
              </div>
            </Card>
          )}

          <Card title={`${form.kind === 'producto' ? 3 : 2}. Interés y cuotas`}>
            <div className="form-grid">
              <div className="span-2"><Field label="Tasa de interés" htmlFor="nr">
                <select id="nr" value={form.interestRateId} onChange={pickRate}>
                  <option value="">Personalizada (escribe la tasa)</option>
                  {rates.map((r) => <option key={r.id} value={r.id}>{r.name} · {METHOD_LABEL[r.method]} · {rateText(r)}</option>)}
                </select>
              </Field></div>
              {!form.interestRateId && (
                <>
                  <Field label="Modalidad" htmlFor="nm"><select id="nm" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value, rateBasis: e.target.value === 'sobre_saldo' ? 'mensual' : f.rateBasis }))}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                  <Field label="Tasa (%)" htmlFor="nra"><div className="input-pair"><input id="nra" inputMode="decimal" value={form.rate} onChange={set('rate')} placeholder="20" />
                    <select value={form.rateBasis} onChange={set('rateBasis')} disabled={form.method === 'sobre_saldo'} aria-label="Base"><option value="mensual">mensual</option><option value="total">total</option></select></div></Field>
                  <small className="hint span-2">{METHODS.find(([k]) => k === form.method)[2]}</small>
                </>
              )}
              <Field label="Modalidad de cobro" htmlFor="nf"><select id="nf" value={form.frequency} onChange={set('frequency')}>{FREQUENCIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              {form.frequency === 'personalizada' && <Field label="Cada cuántos días" htmlFor="ncd"><input id="ncd" type="number" min="1" max="365" value={form.customDays} onChange={set('customDays')} /></Field>}
              <Field label="Número de cuotas" htmlFor="ncn" required><input id="ncn" type="number" min="1" max="720" value={form.count} onChange={set('count')} /></Field>
              <Field label="Fecha de desembolso" htmlFor="ndd"><input id="ndd" type="date" value={form.disbursementDate} onChange={set('disbursementDate')} /></Field>
              <Field label="Primera cuota" htmlFor="nfd" hint="Vacío = un periodo después del desembolso"><input id="nfd" type="date" value={form.firstDueDate} onChange={set('firstDueDate')} /></Field>
              {form.frequency === 'diaria' && <label className="check span-2"><input type="checkbox" checked={form.skipSundays} onChange={set('skipSundays')} /> No cobrar los domingos</label>}
            </div>
          </Card>

          <Card title={`${form.kind === 'producto' ? 4 : 3}. Referencias personales`} subtitle="Al menos una, con nombre y celular.">
            <div className="stack" style={{ gap: 14 }}>
              {form.references.map((r, i) => (
                <div key={i} className="form-grid ref-block">
                  <Field label="Nombre completo" htmlFor={`rn${i}`} required><input id={`rn${i}`} value={r.name} onChange={(e) => setRef(i, 'name', e.target.value)} /></Field>
                  <Field label="Celular" htmlFor={`rp${i}`} required><input id={`rp${i}`} inputMode="numeric" value={r.phone} onChange={(e) => setRef(i, 'phone', e.target.value)} /></Field>
                  <Field label="Parentesco o relación" htmlFor={`rr${i}`}><input id={`rr${i}`} value={r.relationship} onChange={(e) => setRef(i, 'relationship', e.target.value)} placeholder="Hermana, vecino, jefe…" /></Field>
                  <Field label="Dirección" htmlFor={`ra${i}`}><input id={`ra${i}`} value={r.address} onChange={(e) => setRef(i, 'address', e.target.value)} /></Field>
                  {form.references.length > 1 && <div className="span-2 right"><button type="button" className="btn btn-sm btn-ghost" onClick={() => setForm((f) => ({ ...f, references: f.references.filter((_, j) => j !== i) }))}><MdDelete /> Quitar referencia</button></div>}
                </div>
              ))}
              {form.references.length < 3 && <div><button type="button" className="btn btn-sm" onClick={() => setForm((f) => ({ ...f, references: [...f.references, { ...EMPTY_REF }] }))}><MdAdd /> Otra referencia</button></div>}
              <Field label="Observaciones del crédito" htmlFor="nno"><textarea id="nno" rows={2} value={form.notes} onChange={set('notes')} /></Field>
            </div>
          </Card>
        </div>

        <div className="stack sticky-col">
          <Card title="Resumen" icon={<MdPayments />}>
            {calculating && !preview && <div className="splash" style={{ minHeight: 120 }}><Spinner /></div>}
            {!preview && !calculating && <p className="disabled-text" style={{ margin: 0 }}>{previewError || 'Completa cliente, valor y condiciones para ver el plan.'}</p>}
            {preview && (
              <dl className="stat-list">
                <div><dt>Capital</dt><dd className="money">{formatMoney(preview.principal)}</dd></div>
                <div><dt>Interés</dt><dd>{METHOD_LABEL[preview.method]} · {String(preview.rate).replace('.', ',')} % {preview.rateBasis === 'total' ? 'total' : 'mensual'}</dd></div>
                <div><dt>Interés total</dt><dd className="money">{formatMoney(preview.totalInterest)}</dd></div>
                <div><dt>Cuotas</dt><dd>{preview.count} · {preview.frequency === 'personalizada' ? `cada ${preview.intervalDays} días` : FREQ_LABEL[preview.frequency]}</dd></div>
                <div><dt>Primera / última</dt><dd>{formatDate(preview.firstDueDate)} / {formatDate(preview.lastDueDate)}</dd></div>
                <div className="total"><dt>Valor de la cuota</dt><dd className="money">{formatMoney(preview.installmentAmount)}</dd></div>
                <div className="total"><dt>Total a pagar</dt><dd className="money">{formatMoney(preview.totalAmount)}</dd></div>
                {preview.renewal && <div><dt>Saldo crédito #{preview.renewal.number}</dt><dd className="money">− {formatMoney(preview.renewal.payoff)}</dd></div>}
                {form.kind === 'efectivo' && <div className="total"><dt>Se entrega en efectivo</dt><dd className={`money ${preview.renewal && preview.renewal.net <= 0 ? 'text-bad' : 'text-ok'}`}>{formatMoney(preview.renewal ? preview.renewal.net : preview.disbursedAmount)}</dd></div>}
              </dl>
            )}
            {preview?.funds && (
              <div className={`funds-note${preview.funds.enough ? '' : ' bad'}`} style={{ marginTop: 12 }}>
                <MdSavings />
                <span>{preview.funds.account === 'negocio' ? 'Disponible en el negocio' : 'Disponible en la caja del prestamista'}: <strong>{formatMoney(preview.funds.available)}</strong>
                  {!preview.funds.enough && <> · No alcanza para entregar {formatMoney(preview.renewal ? preview.renewal.net : preview.disbursedAmount)}. {admin ? 'Asígnale más dinero en Capital y cajas.' : 'Pide al administrador que te asigne más dinero.'}</>}</span>
              </div>
            )}
            {preview?.renewal && preview.renewal.net <= 0 && <div className="alert bad" style={{ marginTop: 12 }}>El nuevo préstamo debe ser mayor que el saldo actual ({formatMoney(preview.renewal.payoff)}) para entregar dinero.</div>}
            {error && <div className="alert bad" style={{ marginTop: 12 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={saving || !preview || preview.funds?.enough === false || (preview.renewal && preview.renewal.net <= 0)}>{saving ? <Spinner /> : <MdCheck />} {renewId ? 'Renovar crédito' : 'Crear crédito'}</button>
          </Card>
          {preview && <Card title="Plan de cuotas" flush><ScheduleTable rows={preview.installments} limit={8} compact /></Card>}
        </div>
      </div>
    </form>
  )
}

export default NewCreditPage
