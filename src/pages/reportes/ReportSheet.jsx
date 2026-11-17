import React, { useEffect, useState } from 'react'
import { MdArrowBack, MdPrint } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'

// =====================================================================
// Reporte en formato PDF (KU-022, modelo de integra-ips): hoja carta con encabezado del negocio,
// indicadores, tablas completas y pie con la fecha de impresión. "Imprimir / Guardar PDF" usa el
// diálogo del navegador; en pantalla se ve como la hoja que saldrá impresa.
// =====================================================================
const TITLES = { recaudo: 'Reporte de recaudo', colocacion: 'Reporte de colocación', cartera: 'Reporte de cartera', resultados: 'Estado de resultados' }
const pct = (v) => `${String(v ?? 0).replace('.', ',')} %`
const METHOD = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' }
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const label = (v) => (String(v).length === 7 ? `${MONTHS[Number(String(v).slice(5, 7)) - 1]} ${String(v).slice(0, 4)}` : formatDate(v))

const Kpis = ({ items }) => (
  <div className="rs-kpis" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map(([l, v, note, hl]) => <div key={l} className={hl ? 'hl' : ''}><span>{l}</span><strong>{v}</strong>{note && <small>{note}</small>}</div>)}
  </div>
)
const Section = ({ title, children }) => <section className="rs-section"><h3>{title}</h3>{children}</section>
const T = ({ head, rows, foot }) => (
  <table className="rs-table">
    <thead><tr>{head.map(([h, c]) => <th key={h} className={c}>{h}</th>)}</tr></thead>
    <tbody>{rows}</tbody>
    {foot && <tfoot>{foot}</tfoot>}
  </table>
)
// Barras horizontales simples (se imprimen igual en cualquier navegador).
const Bars = ({ rows, value, name, color = '#111' }) => {
  const max = Math.max(...rows.map(value), 1)
  return <div className="rs-bars">{rows.map((r) => <div key={name(r)}><span>{name(r)}</span><i><b style={{ width: `${(value(r) / max) * 100}%`, background: color }} /></i><em>{formatMoney(value(r))}</em></div>)}</div>
}

const Recaudo = ({ d }) => (
  <>
    <Kpis items={[['Recaudado', formatMoney(d.totals.amount), `${d.totals.count} pagos`, true], ['Efectivo', formatMoney(d.totals.cash), `${formatMoney(d.totals.other)} otros medios`], ['Intereses', formatMoney(d.totals.interest), `${formatMoney(d.totals.capital)} capital`], ['Promedio diario', formatMoney(Math.round(d.totals.amount / Math.max(d.totals.days, 1))), `${d.totals.days} días`]]} />
    <Section title="Por prestamista">
      <T head={[['Prestamista'], ['Pagos', 'num'], ['Efectivo', 'num'], ['Abonos a capital', 'num'], ['Recaudado', 'num'], ['%', 'num']]}
        rows={d.byLender.map((r) => <tr key={r.lender}><td><b>{r.lender}</b></td><td className="num">{r.count}</td><td className="num">{formatMoney(r.cash)}</td><td className="num">{formatMoney(r.capital)}</td><td className="num"><b>{formatMoney(r.amount)}</b></td><td className="num">{d.totals.amount ? pct(Math.round((r.amount / d.totals.amount) * 1000) / 10) : '—'}</td></tr>)}
        foot={<tr><td>Total</td><td className="num">{d.totals.count}</td><td className="num">{formatMoney(d.totals.cash)}</td><td className="num">{formatMoney(d.totals.abonos)}</td><td className="num">{formatMoney(d.totals.amount)}</td><td className="num">100 %</td></tr>} />
    </Section>
    <Section title="Recaudo por periodo"><Bars rows={d.series.filter((s) => s.efectivo + s.otros > 0)} value={(s) => s.efectivo + s.otros} name={(s) => label(s.label)} color="#10B981" /></Section>
    {d.rows?.length > 0 && (
      <Section title={`Detalle de pagos (${d.rows.length})`}>
        <T head={[['Recibo'], ['Fecha'], ['Cliente'], ['Crédito'], ['Prestamista'], ['Medio'], ['Valor', 'num']]}
          rows={d.rows.map((r) => <tr key={r.id}><td>{r.number}</td><td>{formatDate(r.date)}</td><td>{r.customer}<div className="rs-sub">{r.identification}</div></td><td>#{r.credit}{r.kind === 'abono_capital' && <div className="rs-sub">Abono a capital</div>}</td><td>{r.lender}</td><td>{METHOD[r.method] || r.method}</td><td className="num">{formatMoney(r.amount)}</td></tr>)} />
      </Section>
    )}
  </>
)

const Colocacion = ({ d }) => (
  <>
    <Kpis items={[['Colocado', formatMoney(d.totals.principal), `${d.totals.count} créditos`, true], ['Intereses pactados', formatMoney(d.totals.interest), `Total ${formatMoney(d.totals.total)}`], ['Efectivo entregado', formatMoney(d.totals.cashOut), `${d.totals.renewals} renovaciones`], ['Ticket promedio', formatMoney(d.totals.avgTicket), `${formatMoney(d.totals.product)} en productos`]]} />
    <Section title="Por prestamista">
      <T head={[['Prestamista'], ['Créditos', 'num'], ['Renovaciones', 'num'], ['Capital', 'num'], ['Intereses', 'num']]}
        rows={d.byLender.map((r) => <tr key={r.lender}><td><b>{r.lender}</b></td><td className="num">{r.count}</td><td className="num">{r.renewals}</td><td className="num"><b>{formatMoney(r.principal)}</b></td><td className="num">{formatMoney(r.interest)}</td></tr>)}
        foot={<tr><td>Total</td><td className="num">{d.totals.count}</td><td className="num">{d.totals.renewals}</td><td className="num">{formatMoney(d.totals.principal)}</td><td className="num">{formatMoney(d.totals.interest)}</td></tr>} />
    </Section>
    {d.rows?.length > 0 && (
      <Section title={`Créditos del periodo (${d.rows.length})`}>
        <T head={[['Crédito'], ['Fecha'], ['Cliente'], ['Prestamista'], ['Tipo'], ['Capital', 'num'], ['Interés', 'num']]}
          rows={d.rows.map((r) => <tr key={r.id}><td>#{r.number}</td><td>{formatDate(r.date)}</td><td>{r.customer}</td><td>{r.lender}</td><td>{r.kind === 'producto' ? 'Producto' : 'Efectivo'}{r.renewal && <div className="rs-sub">Renovación</div>}{r.status === 'anulado' && <div className="rs-sub bad">Anulado</div>}</td><td className="num">{formatMoney(r.principal)}</td><td className="num">{formatMoney(r.interest)}</td></tr>)} />
      </Section>
    )}
  </>
)

const Cartera = ({ d }) => (
  <>
    <Kpis items={[['Saldo en cartera', formatMoney(d.totals.balance), `${d.totals.credits} créditos · ${d.totals.customers} clientes`, true], ['Capital por recuperar', formatMoney(d.totals.capital)], ['Vencido', formatMoney(d.totals.overdue), `${d.totals.lateCredits} créditos atrasados`], ['Cartera en riesgo', pct(d.totals.par), `Más de 30 días: ${pct(d.totals.par30)}`]]} />
    <Section title="Saldo por días de atraso">
      <T head={[['Atraso'], ['Créditos', 'num'], ['Saldo', 'num'], ['Vencido', 'num'], ['% del saldo', 'num']]}
        rows={d.tiers.map((t) => <tr key={t.key}><td><b>{t.key === 'Al día' ? t.key : `${t.key} días`}</b></td><td className="num">{t.credits}</td><td className="num">{formatMoney(t.balance)}</td><td className="num">{formatMoney(t.overdue)}</td><td className="num">{d.totals.balance ? pct(Math.round((t.balance / d.totals.balance) * 1000) / 10) : '—'}</td></tr>)} />
    </Section>
    <Section title="Por prestamista">
      <T head={[['Prestamista'], ['Créditos', 'num'], ['Clientes', 'num'], ['Saldo', 'num'], ['Vencido', 'num'], ['En riesgo', 'num']]}
        rows={d.byLender.map((r) => <tr key={r.lender} className={r.par > 20 ? 'rs-bad' : ''}><td><b>{r.lender}</b></td><td className="num">{r.credits}</td><td className="num">{r.customers}</td><td className="num">{formatMoney(r.balance)}</td><td className="num">{formatMoney(r.overdue)}</td><td className="num">{pct(r.par)}</td></tr>)} />
    </Section>
    {d.late?.length > 0 && (
      <Section title={`Créditos atrasados (${d.late.length})`}>
        <T head={[['Crédito'], ['Cliente'], ['Prestamista'], ['Días', 'num'], ['Cuotas', 'num'], ['Vencido', 'num'], ['Saldo', 'num']]}
          rows={d.late.map((r) => <tr key={r.credit} className={r.daysLate > 30 ? 'rs-bad' : ''}><td>#{r.credit}</td><td>{r.customer}<div className="rs-sub">{[r.phone, r.neighborhood].filter(Boolean).join(' · ')}</div></td><td>{r.lender}</td><td className="num"><b>{r.daysLate}</b></td><td className="num">{r.overdueCount}</td><td className="num">{formatMoney(r.overdue)}</td><td className="num">{formatMoney(r.balance)}</td></tr>)} />
      </Section>
    )}
  </>
)

const Resultados = ({ d }) => (
  <>
    <Kpis items={[['Intereses cobrados', formatMoney(d.totals.interest), null, true], ['Gastos', formatMoney(d.totals.expenses)], ['Utilidad', formatMoney(d.totals.profit), `Margen ${pct(d.totals.margin)}`, d.totals.profit < 0], ['Descuentos otorgados', formatMoney(d.totals.discounts)]]} />
    <Section title="Intereses, gastos y utilidad por periodo">
      <T head={[['Periodo'], ['Intereses', 'num'], ['Gastos', 'num'], ['Utilidad', 'num']]}
        rows={d.series.filter((r) => r.intereses || r.gastos).map((r) => <tr key={r.label} className={r.utilidad < 0 ? 'rs-bad' : ''}><td>{label(r.label)}</td><td className="num">{formatMoney(r.intereses)}</td><td className="num">{formatMoney(r.gastos)}</td><td className="num"><b>{formatMoney(r.utilidad)}</b></td></tr>)}
        foot={<tr><td>Total</td><td className="num">{formatMoney(d.totals.interest)}</td><td className="num">{formatMoney(d.totals.expenses)}</td><td className="num">{formatMoney(d.totals.profit)}</td></tr>} />
    </Section>
    {d.expensesByCategory.length > 0 && <Section title="Gastos por categoría"><Bars rows={d.expensesByCategory} value={(r) => r.amount} name={(r) => r.label} color="#EF4444" /></Section>}
    <p className="rs-note">Los intereses cobrados se calculan con la parte de interés de cada cuota pagada. Los abonos a capital cuentan solo como capital.</p>
  </>
)
const VIEWS = { recaudo: Recaudo, colocacion: Colocacion, cartera: Cartera, resultados: Resultados }

// tabs: uno o varios reportes (informe completo). params: desde, hasta, prestamista.
const ReportSheet = ({ tabs, params, scope, onBack }) => {
  const { settings } = useSettings()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all(tabs.map((t) => api.get(`/reportes/${t}`, { params: { ...params, prestamista: t === 'resultados' ? undefined : params.prestamista, detalle: 1 } }).then((r) => [t, r.data])))
      .then((all) => setData(Object.fromEntries(all))).catch((e) => setError(errorMessage(e)))
  }, [tabs, params])
  const title = tabs.length > 1 ? 'Informe general del negocio' : TITLES[tabs[0]]
  useEffect(() => { const p = document.title; document.title = `${title} ${params.desde}_${params.hasta}`.replace(/\s+/g, '_'); return () => { document.title = p } }, [title, params])
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  const period = tabs.length === 1 && tabs[0] === 'cartera' ? `Corte al ${formatDate(todayBogota())}` : `Del ${formatDate(params.desde)} al ${formatDate(params.hasta)}`
  return (
    <div className="rs-page">
      <div className="rs-toolbar no-print">
        <button type="button" className="btn" onClick={onBack}><MdArrowBack /> Volver a reportes</button>
        <button type="button" className="btn btn-primary" disabled={!data} onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="rs-sheet">
        <header className="rs-header">
          {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="rs-logo" /> : <span className="rs-logo rs-mono">{(settings.businessName || 'K').slice(0, 1)}</span>}
          <div className="rs-heading">
            <p className="rs-kicker">{settings.businessName}{settings.nit ? ` · NIT ${settings.nit}` : ''}</p>
            <h2>{title}</h2>
            <p className="rs-scope">{period}{scope ? ` · ${scope}` : ''}</p>
          </div>
          <dl className="rs-meta">
            <div><dt>Generado</dt><dd>{formatDate(new Date().toISOString())}</dd></div>
            {tabs.length > 1 && <div><dt>Secciones</dt><dd>{tabs.length}</dd></div>}
          </dl>
        </header>
        {error && <p className="rs-note bad">{error}</p>}
        {!data && !error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>}
        {data && tabs.map((t) => {
          const V = VIEWS[t]
          return (
            <div key={t} className="rs-block">
              {tabs.length > 1 && <h2 className="rs-block-title">{TITLES[t]}{t === 'cartera' ? ` · corte al ${formatDate(todayBogota())}` : ''}</h2>}
              <V d={data[t]} />
            </div>
          )
        })}
        <footer className="rs-footer">
          <span>{settings.businessName}{settings.address ? ` · ${settings.address}` : ''}{settings.phone ? ` · ${settings.phone}` : ''}</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default ReportSheet
