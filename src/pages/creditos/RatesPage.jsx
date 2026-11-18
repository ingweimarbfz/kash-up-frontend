import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdPercent, MdCalculate } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { MoneyInput } from '../../components/forms'
import ScheduleTable from '../../components/ScheduleTable'
import { FREQUENCIES, FREQ_LABEL, METHODS, METHOD_LABEL, rateText, termText, dailyMonthlyTip } from '../../utils/credit'
import { formatMoney } from '../../utils/format'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const EMPTY = { name: '', method: 'fija', rate: '', rateBasis: 'mensual', defaultFrequency: '', notes: '', active: true }

const RateForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}), defaultFrequency: initial?.defaultFrequency || '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    const next = { ...f, [k]: v }
    if (k === 'method' && v === 'sobre_saldo') next.rateBasis = 'mensual'
    return next
  })
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const body = { ...form, rate: Number(String(form.rate).replace(',', '.')) }
      const { data } = editing ? await api.put(`/tasas/${initial.id}`, body) : await api.post('/tasas', body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar tasa' : 'Nueva tasa de interés'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="rate-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="rate-form" className="form-grid" onSubmit={submit}>
        <div className="span-2"><Field label="Nombre" htmlFor="rn" required hint="Así aparece al crear un crédito. Ej.: Diario 20 %"><input id="rn" value={form.name} onChange={set('name')} /></Field></div>
        <div className="span-2"><Field label="Modalidad" htmlFor="rm" required>
          <select id="rm" value={form.method} onChange={set('method')}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field><small className="hint">{METHODS.find(([k]) => k === form.method)[2]}</small></div>
        <Field label="Tasa (%)" htmlFor="rr" required><input id="rr" inputMode="decimal" value={form.rate} onChange={set('rate')} placeholder="20" /></Field>
        <Field label="La tasa es" htmlFor="rb">
          <select id="rb" value={form.rateBasis} onChange={set('rateBasis')} disabled={form.method === 'sobre_saldo'}>
            <option value="mensual">Mensual</option><option value="total">Por todo el crédito</option>
          </select>
        </Field>
        <Field label="Periodicidad sugerida" htmlFor="rf">
          <select id="rf" value={form.defaultFrequency} onChange={set('defaultFrequency')}><option value="">Ninguna</option>{FREQUENCIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={form.active} onChange={set('active')} /> Activa</label>
        <div className="span-2"><Field label="Notas" htmlFor="rno"><textarea id="rno" rows={2} value={form.notes || ''} onChange={set('notes')} /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

// Simulador: calcula el plan sin crear el crédito.
export const Simulator = ({ rates }) => {
  const [form, setForm] = useState({ principal: 1000000, rateId: '', method: 'fija', rate: 20, rateBasis: 'total', frequency: 'diaria', customDays: 10, count: 30, skipSundays: true, disbursementDate: today() })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const pickRate = (e) => {
    const r = rates.find((x) => String(x.id) === e.target.value)
    setForm((f) => (r ? { ...f, rateId: e.target.value, method: r.method, rate: r.rate, rateBasis: r.rateBasis, frequency: r.defaultFrequency || f.frequency } : { ...f, rateId: '' }))
  }
  const run = async (e) => {
    e?.preventDefault(); setBusy(true); setError('')
    try {
      const { data } = await api.post('/simulador', { ...form, rate: Number(String(form.rate).replace(',', '.')), count: Number(form.count), firstDueDate: undefined })
      setResult(data)
    } catch (err) { setResult(null); setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <Card title="Simulador de crédito" icon={<MdCalculate />} subtitle="Prueba condiciones antes de ofrecerlas. No guarda nada.">
      <form className="form-grid" onSubmit={run}>
        <Field label="Capital" htmlFor="sp"><MoneyInput id="sp" value={form.principal} onChange={set('principal')} /></Field>
        <Field label="Tasa del catálogo" htmlFor="sr">
          <select id="sr" value={form.rateId} onChange={pickRate}><option value="">Personalizada</option>{rates.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </Field>
        <Field label="Modalidad" htmlFor="sm"><select id="sm" value={form.method} onChange={(e) => setForm((f) => ({ ...f, rateId: '', method: e.target.value, rateBasis: e.target.value === 'sobre_saldo' ? 'mensual' : f.rateBasis }))}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Tasa (%)" htmlFor="sra"><div className="input-pair"><input id="sra" inputMode="decimal" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rateId: '', rate: e.target.value }))} />
          <select value={form.rateBasis} onChange={(e) => setForm((f) => ({ ...f, rateId: '', rateBasis: e.target.value }))} disabled={form.method === 'sobre_saldo'} aria-label="Base de la tasa"><option value="mensual">mensual</option><option value="total">total</option></select></div></Field>
        <Field label="Periodicidad" htmlFor="sf"><select id="sf" value={form.frequency} onChange={set('frequency')}>{FREQUENCIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {form.frequency === 'personalizada'
          ? <Field label="Cada cuántos días" htmlFor="sd"><input id="sd" type="number" min="1" max="365" value={form.customDays} onChange={set('customDays')} /></Field>
          : <Field label="Número de cuotas" htmlFor="sc" hint={termText(form)}><input id="sc" type="number" min="1" max="720" value={form.count} onChange={set('count')} /></Field>}
        {form.frequency === 'personalizada' && <Field label="Número de cuotas" htmlFor="sc2" hint={termText(form)}><input id="sc2" type="number" min="1" max="720" value={form.count} onChange={set('count')} /></Field>}
        <Field label="Desembolso" htmlFor="sdd"><input id="sdd" type="date" value={form.disbursementDate} onChange={set('disbursementDate')} /></Field>
        {form.frequency === 'diaria' && <label className="check span-2"><input type="checkbox" checked={form.skipSundays} onChange={set('skipSundays')} /> No cobrar los domingos</label>}
              {dailyMonthlyTip(form) && <div className="alert warn span-2">{dailyMonthlyTip(form)}</div>}
        <div className="span-2 right"><button type="submit" className="btn btn-accent" disabled={busy}>{busy ? <Spinner /> : <MdCalculate />} Calcular</button></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
      {result && (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="grid grid-kpi">
            <div className="kpi dark"><div className="kpi-top"><span>Cuota</span></div><strong>{formatMoney(result.installmentAmount)}</strong><small>{result.count} cuotas · {FREQ_LABEL[result.frequency]}</small></div>
            <div className="kpi"><div className="kpi-top"><span>Interés total</span></div><strong>{formatMoney(result.totalInterest)}</strong></div>
            <div className="kpi"><div className="kpi-top"><span>Total a pagar</span></div><strong>{formatMoney(result.totalAmount)}</strong></div>
            <div className="kpi brand"><div className="kpi-top"><span>Se entrega</span></div><strong>{formatMoney(result.disbursedAmount)}</strong><small>{result.anticipatedInterest ? 'Interés descontado al desembolsar' : 'Capital completo'}</small></div>
          </div>
          <ScheduleTable rows={result.installments} />
        </div>
      )}
    </Card>
  )
}

const RatesPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [rates, setRates] = useState(null)
  const [editing, setEditing] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get('/tasas').then(({ data }) => setRates(data)).catch((e) => { setRates([]); toast(errorMessage(e), 'bad') }) }, [toast])
  useEffect(() => { load() }, [load])
  return (
    <div className="stack">
      <PageHead title="Tasas de interés" subtitle="Crea las tasas que usas y elígelas al otorgar un crédito. También puedes poner una tasa personalizada en cada crédito.">
        {admin && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><MdAdd /> Nueva tasa</button>}
      </PageHead>
      <Card flush>
        {!rates ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
          : !rates.length ? <Empty icon={<MdPercent />}>Aún no hay tasas. Crea la primera.</Empty>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Nombre</th><th>Modalidad</th><th>Tasa</th><th className="hide-sm">Periodicidad sugerida</th><th>Estado</th>{admin && <th />}</tr></thead>
                  <tbody>
                    {rates.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong>{r.notes && <><br /><small>{r.notes}</small></>}</td>
                        <td>{METHOD_LABEL[r.method]}</td>
                        <td className="money">{rateText(r)}</td>
                        <td className="hide-sm">{r.defaultFrequency ? FREQ_LABEL[r.defaultFrequency] : '—'}</td>
                        <td>{r.active ? <Badge tone="ok">Activa</Badge> : <Badge tone="muted">Inactiva</Badge>}</td>
                        {admin && <td className="right"><button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(r)} aria-label={`Editar ${r.name}`}><MdEdit /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
      </Card>
      <Simulator rates={rates || []} />
      {editing && <RateForm initial={editing} onClose={() => setEditing(null)} onSaved={(r, was) => { setEditing(null); toast(was ? 'Tasa actualizada' : 'Tasa creada'); load() }} />}
      {toastNode}
    </div>
  )
}

export default RatesPage
