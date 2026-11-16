import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MdDownload, MdPrint } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, Kpi, PageHead, Spinner } from '../../components/ui'
import { DonutChart, SeriesBars } from '../../components/charts'
import { CHART } from '../../utils/brand'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'

const TABS = [['recaudo', 'Recaudo'], ['colocacion', 'Colocación'], ['cartera', 'Cartera'], ['resultados', 'Resultados']]
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// Etiqueta del eje: "16 nov" si es día, "nov 26" si es mes.
const tick = (v) => {
  const s = String(v || '')
  if (s.length === 7) return `${MONTHS[Number(s.slice(5, 7)) - 1]} ${s.slice(2, 4)}`
  if (s.length === 10) return `${Number(s.slice(8, 10))} ${MONTHS[Number(s.slice(5, 7)) - 1]}`
  return s
}
const pct = (v) => `${String(v ?? 0).replace('.', ',')} %`
const addDays = (d, k) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10) }

const PRESETS = [
  ['hoy', 'Hoy', (t) => [t, t]],
  ['7d', '7 días', (t) => [addDays(t, -6), t]],
  ['mes', 'Este mes', (t) => [`${t.slice(0, 8)}01`, t]],
  ['mesant', 'Mes anterior', (t) => { const f = new Date(`${t.slice(0, 8)}01T12:00:00Z`); f.setUTCMonth(f.getUTCMonth() - 1); const a = f.toISOString().slice(0, 10); return [a, addDays(`${t.slice(0, 8)}01`, -1)] }],
  ['6m', '6 meses', (t) => { const f = new Date(`${t.slice(0, 8)}01T12:00:00Z`); f.setUTCMonth(f.getUTCMonth() - 5); return [f.toISOString().slice(0, 10), t] }],
  ['anio', 'Este año', (t) => [`${t.slice(0, 4)}-01-01`, t]]
]

// Exporta una tabla a CSV (separador ; y BOM para que Excel en español lo abra bien).
const downloadCsv = (name, head, rows) => {
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const text = [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const Table = ({ head, rows, foot }) => (
  <div className="table-wrap"><table className="table">
    <thead><tr>{head.map(([l, cls]) => <th key={l} className={cls}>{l}</th>)}</tr></thead>
    <tbody>{rows}</tbody>
    {foot && <tfoot>{foot}</tfoot>}
  </table></div>
)

const Recaudo = ({ d, csv }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Recaudado" value={formatMoney(d.totals.amount)} tone="brand" note={`${d.totals.count} pago(s) · ${formatMoney(Math.round(d.totals.amount / Math.max(d.totals.days, 1)))} por día`} />
      <Kpi label="En efectivo" value={formatMoney(d.totals.cash)} tone="dark" note={`${formatMoney(d.totals.other)} por transferencia`} />
      <Kpi label="Intereses cobrados" value={formatMoney(d.totals.interest)} note={`${formatMoney(d.totals.capital)} es capital`} />
      <Kpi label="Abonos a capital" value={formatMoney(d.totals.abonos)} />
    </div>
    <Card title="Recaudo en el periodo" subtitle="Efectivo y transferencias.">
      <SeriesBars data={d.series} stacked tickFormatter={tick} series={[{ key: 'efectivo', name: 'Efectivo', color: CHART.recaudo }, { key: 'otros', name: 'Transferencia', color: CHART.colocado }]} />
    </Card>
    <Card title="Por prestamista" flush actions={<button type="button" className="btn btn-sm" onClick={() => csv('recaudo-por-prestamista', ['Prestamista', 'Pagos', 'Recaudado', 'Efectivo', 'Abonos a capital'], d.byLender.map((r) => [r.lender, r.count, r.amount, r.cash, r.capital]))}><MdDownload /> CSV</button>}>
      {!d.byLender.length ? <Empty>No hubo pagos en ese periodo.</Empty> : (
        <Table head={[['Prestamista'], ['Pagos', 'num'], ['Recaudado', 'num'], ['Efectivo', 'num hide-sm'], ['Abonos a capital', 'num hide-md'], ['Participación', 'hide-sm']]}
          rows={d.byLender.map((r) => (
            <tr key={r.lender}><td><strong>{r.lender}</strong></td><td className="num">{r.count}</td><td className="num money"><strong>{formatMoney(r.amount)}</strong></td><td className="num money hide-sm">{formatMoney(r.cash)}</td><td className="num money hide-md">{formatMoney(r.capital)}</td>
              <td className="hide-sm"><div className="progress"><span style={{ width: `${d.totals.amount ? (r.amount / d.totals.amount) * 100 : 0}%` }} /></div></td></tr>
          ))} />
      )}
    </Card>
  </>
)

const Colocacion = ({ d, csv }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Colocado" value={formatMoney(d.totals.principal)} tone="dark" note={`${d.totals.count} crédito(s) · ticket ${formatMoney(d.totals.avgTicket)}`} />
      <Kpi label="Intereses pactados" value={formatMoney(d.totals.interest)} tone="brand" note={`Total a recaudar ${formatMoney(d.totals.total)}`} />
      <Kpi label="Efectivo entregado" value={formatMoney(d.totals.cashOut)} note={`${d.totals.renewals} renovación(es)`} />
      <Kpi label="En productos" value={formatMoney(d.totals.product)} />
    </div>
    <Card title="Colocación en el periodo" subtitle="Créditos en efectivo y de productos (capital).">
      <SeriesBars data={d.series} stacked tickFormatter={tick} series={[{ key: 'efectivo', name: 'Efectivo', color: CHART.colocado }, { key: 'producto', name: 'Producto', color: CHART.pendiente }]} />
    </Card>
    <div className="grid grid-2">
      <Card title="Por prestamista" flush>
        {!d.byLender.length ? <Empty>Sin créditos en ese periodo.</Empty> : (
          <Table head={[['Prestamista'], ['Créditos', 'num'], ['Capital', 'num'], ['Intereses', 'num hide-sm']]}
            rows={d.byLender.map((r) => <tr key={r.lender}><td><strong>{r.lender}</strong>{r.renewals ? <small> · {r.renewals} renov.</small> : null}</td><td className="num">{r.count}</td><td className="num money"><strong>{formatMoney(r.principal)}</strong></td><td className="num money hide-sm">{formatMoney(r.interest)}</td></tr>)} />
        )}
      </Card>
      <Card title="Créditos del periodo" flush actions={<button type="button" className="btn btn-sm" onClick={() => csv('colocacion', ['Crédito', 'Fecha', 'Cliente', 'Prestamista', 'Tipo', 'Capital', 'Interés', 'Renovación', 'Estado'], d.rows.map((r) => [r.number, r.date, r.customer, r.lender, r.kind, r.principal, r.interest, r.renewal ? 'Sí' : 'No', r.status]))}><MdDownload /> CSV</button>}>
        {!d.rows.length ? <Empty>Sin créditos en ese periodo.</Empty> : (
          <div className="scroll-y">
            <Table head={[['Crédito'], ['Cliente'], ['Capital', 'num']]}
              rows={d.rows.map((r) => <tr key={r.id}><td><strong>#{r.number}</strong><br /><small>{formatDate(r.date)}</small></td><td>{r.customer}<br /><small>{r.kind === 'producto' ? 'Producto' : 'Efectivo'}{r.renewal ? ' · renovación' : ''}</small></td><td className="num money">{formatMoney(r.principal)}</td></tr>)} />
          </div>
        )}
      </Card>
    </div>
  </>
)

const TIER_TONE = { 'Al día': 'ok', '1-7': 'warn', '8-30': 'warn', '31-60': 'bad', '60+': 'bad' }
const Cartera = ({ d, csv }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Saldo en cartera" value={formatMoney(d.totals.balance)} tone="dark" note={`${d.totals.credits} crédito(s) · ${d.totals.customers} cliente(s)`} />
      <Kpi label="Capital por recuperar" value={formatMoney(d.totals.capital)} tone="brand" />
      <Kpi label="Vencido" value={formatMoney(d.totals.overdue)} tone={d.totals.overdue ? 'bad' : ''} note={`${d.totals.lateCredits} crédito(s) atrasado(s)`} />
      <Kpi label="Cartera en riesgo" value={pct(d.totals.par)} tone={d.totals.par > 10 ? 'warn' : ''} note={`Más de 30 días: ${pct(d.totals.par30)}`} />
    </div>
    <div className="grid grid-2">
      <Card title="Saldo por días de atraso" subtitle="Foto de hoy.">
        <DonutChart data={d.tiers.map((t) => ({ name: t.key, value: t.balance }))} colors={[CHART.recaudo, CHART.alerta, '#F97316', CHART.mora, '#7F1D1D']} />
      </Card>
      <Card title="Detalle por atraso" flush>
        <Table head={[['Atraso'], ['Créditos', 'num'], ['Saldo', 'num'], ['Vencido', 'num hide-sm']]}
          rows={d.tiers.map((t) => <tr key={t.key}><td><Badge tone={TIER_TONE[t.key]}>{t.key === 'Al día' ? t.key : `${t.key} días`}</Badge></td><td className="num">{t.credits}</td><td className="num money">{formatMoney(t.balance)}</td><td className="num money hide-sm">{formatMoney(t.overdue)}</td></tr>)} />
      </Card>
    </div>
    <Card title="Cartera por prestamista" flush actions={<button type="button" className="btn btn-sm" onClick={() => csv('cartera-por-prestamista', ['Prestamista', 'Créditos', 'Clientes', 'Saldo', 'Capital', 'Vencido', 'Créditos atrasados', 'Cartera en riesgo %', 'Riesgo >30 días %'], d.byLender.map((r) => [r.lender, r.credits, r.customers, r.balance, r.capital, r.overdue, r.lateCredits, r.par, r.par30]))}><MdDownload /> CSV</button>}>
      {!d.byLender.length ? <Empty>No hay créditos activos.</Empty> : (
        <Table head={[['Prestamista'], ['Créditos', 'num hide-sm'], ['Saldo', 'num'], ['Vencido', 'num'], ['En riesgo', 'num']]}
          rows={d.byLender.map((r) => <tr key={r.lender}><td><strong>{r.lender}</strong><br /><small>{r.customers} cliente(s)</small></td><td className="num hide-sm">{r.credits}</td><td className="num money">{formatMoney(r.balance)}</td><td className="num money">{r.overdue ? <span className="text-bad">{formatMoney(r.overdue)}</span> : formatMoney(0)}</td><td className="num"><Badge tone={r.par > 20 ? 'bad' : r.par > 0 ? 'warn' : 'ok'}>{pct(r.par)}</Badge></td></tr>)} />
      )}
    </Card>
  </>
)

const Resultados = ({ d, csv }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Intereses cobrados" value={formatMoney(d.totals.interest)} tone="brand" />
      <Kpi label="Gastos" value={formatMoney(d.totals.expenses)} tone="dark" />
      <Kpi label="Utilidad" value={formatMoney(d.totals.profit)} tone={d.totals.profit < 0 ? 'bad' : ''} note={`Margen ${pct(d.totals.margin)}`} />
      <Kpi label="Descuentos otorgados" value={formatMoney(d.totals.discounts)} note="En créditos del periodo" />
    </div>
    <Card title="Intereses vs. gastos" subtitle="Lo que gana el negocio con lo efectivamente cobrado." actions={<button type="button" className="btn btn-sm" onClick={() => csv('resultados', ['Periodo', 'Intereses cobrados', 'Gastos', 'Utilidad'], d.series.map((r) => [r.label, r.intereses, r.gastos, r.utilidad]))}><MdDownload /> CSV</button>}>
      <SeriesBars data={d.series} tickFormatter={tick} series={[{ key: 'intereses', name: 'Intereses', color: CHART.recaudo }, { key: 'gastos', name: 'Gastos', color: CHART.mora }]} />
    </Card>
    <Card title="Gastos por categoría" flush>
      {!d.expensesByCategory.length ? <Empty>Sin gastos en ese periodo.</Empty> : (
        <Table head={[['Categoría'], ['Valor', 'num'], ['Participación', 'hide-sm']]}
          rows={d.expensesByCategory.map((r) => <tr key={r.key}><td><strong>{r.label}</strong></td><td className="num money">{formatMoney(r.amount)}</td><td className="hide-sm"><div className="progress"><span style={{ width: `${(r.amount / d.totals.expenses) * 100}%`, background: 'var(--bad)' }} /></div></td></tr>)} />
      )}
    </Card>
    <small className="hint">Los intereses cobrados se calculan con la parte de interés de cada cuota pagada. Los abonos a capital cuentan solo como capital.</small>
  </>
)

const VIEWS = { recaudo: Recaudo, colocacion: Colocacion, cartera: Cartera, resultados: Resultados }

const ReportsPage = () => {
  const [params, setParams] = useSearchParams()
  const tab = VIEWS[params.get('tab')] ? params.get('tab') : 'recaudo'
  const today = todayBogota()
  const [preset, setPreset] = useState('mes')
  const [range, setRange] = useState(PRESETS[2][2](today))
  const [lender, setLender] = useState('')
  const [lenders, setLenders] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/prestamistas').then(({ data: d }) => setLenders(d)).catch(() => {}) }, [])
  useEffect(() => {
    setData(null); setError('')
    api.get(`/reportes/${tab}`, { params: { desde: range[0], hasta: range[1], prestamista: lender || undefined } })
      .then(({ data: d }) => setData({ ...d, tab })).catch((e) => setError(errorMessage(e)))
  }, [tab, range, lender])
  const choose = (k) => { setPreset(k); setRange(PRESETS.find((p) => p[0] === k)[2](today)) }
  const setDate = (i) => (e) => { setPreset(''); setRange((r) => (i ? [r[0], e.target.value] : [e.target.value, r[1]])) }
  const View = VIEWS[tab]
  const lenderLabel = useMemo(() => lenders.find((l) => String(l.id) === String(lender))?.fullName, [lenders, lender])
  const csv = (name, head, rows) => downloadCsv(`${name}-${tab === 'cartera' ? today : `${range[0]}_${range[1]}`}`, head, rows)

  return (
    <div className="stack">
      <PageHead title="Reportes" subtitle={tab === 'cartera' ? `Foto de la cartera activa al ${formatDate(today)}${lenderLabel ? ` · ${lenderLabel}` : ''}.` : `Del ${formatDate(range[0])} al ${formatDate(range[1])}${lenderLabel ? ` · ${lenderLabel}` : ''}.`}>
        <button type="button" className="btn hide-sm" onClick={() => window.print()}><MdPrint /> Imprimir</button>
      </PageHead>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setParams({ tab: k })}>{l}</button>)}</div>
      <Card flush>
        <div className="toolbar">
          {tab !== 'cartera' && (
            <>
              <div className="seg seg-wrap">{PRESETS.map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${preset === k ? ' on' : ''}`} onClick={() => choose(k)}>{l}</button>)}</div>
              <input type="date" value={range[0]} max={range[1]} onChange={setDate(0)} aria-label="Desde" />
              <input type="date" value={range[1]} min={range[0]} max={today} onChange={setDate(1)} aria-label="Hasta" />
            </>
          )}
          {tab !== 'resultados' && <select value={lender} onChange={(e) => setLender(e.target.value)} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
        </div>
      </Card>
      {error && <div className="alert bad">{error}</div>}
      {!data || data.tab !== tab ? (!error && <div className="splash" style={{ minHeight: 260 }}><Spinner /></div>) : <View d={data} csv={csv} />}
    </div>
  )
}

export default ReportsPage
