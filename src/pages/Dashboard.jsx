import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAccountBalanceWallet, MdPayments, MdWarningAmber, MdRequestQuote, MdPeople, MdBadge, MdRoute, MdEventAvailable, MdSavings, MdCheckCircle, MdAccountBalance, MdLockOutline, MdChevronRight, MdEventNote, MdShield, MdNotificationsActive } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../api/client'
import { goToSite } from './sedes/SitesPage'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, Card, Kpi, PageHead, Spinner, Empty } from '../components/ui'
import { FlowChart, DonutChart, BarsChart, TrendChart } from '../components/charts'
import { formatMoney, formatDate } from '../utils/format'
import { CHART } from '../utils/brand'

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }).format(new Date()))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayTick = (v) => (v ? `${Number(v.slice(8, 10))} ${MONTHS[Number(v.slice(5, 7)) - 1]}` : '')
const pct = (v) => `${String(v ?? 0).replace('.', ',')} %`
const TIER_COLORS = [CHART.recaudo, CHART.alerta, '#F97316', CHART.mora, '#7F1D1D']

// Avance de las rutas del día, por prestamista.
const RoutesToday = ({ routes }) => {
  const navigate = useNavigate()
  return (
    <Card title="Rutas de hoy" actions={<Link className="btn btn-sm" to="/rutas">Ver rutas</Link>} flush>
      {!routes.length ? <Empty icon={<MdRoute />}>No hay prestamistas activos.</Empty> : (
        <div className="mini-list">
          {routes.map((r) => {
            const p = r.toCollect ? Math.min(100, Math.round((r.collected / r.toCollect) * 100)) : 0
            return (
              <button key={r.id} type="button" className="mini-row" onClick={() => navigate(`/rutas/${r.id}`)}>
                <Avatar user={{ fullName: r.lender }} size="sm" />
                <div className="grow">
                  <strong>{r.lender}</strong>
                  <div className="progress"><span style={{ width: `${p}%` }} /></div>
                  <small>{formatMoney(r.collected)} de {formatMoney(r.toCollect)} · {r.done}/{r.stops} visitados</small>
                </div>
                {r.closed ? <Badge tone="ok"><MdLockOutline /> Cerrada</Badge> : <Badge>Abierta</Badge>}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

const TopLate = ({ rows }) => {
  const navigate = useNavigate()
  return (
    <Card title="Mayores atrasos" actions={<Link className="btn btn-sm" to="/morosos">Ver morosos</Link>} flush>
      {!rows.length ? <Empty icon={<MdCheckCircle />}>Nadie está atrasado. ¡Excelente!</Empty> : (
        <div className="mini-list">
          {rows.map((r) => (
            <button key={r.creditId} type="button" className="mini-row" onClick={() => navigate(`/creditos/${r.creditId}`)}>
              {r.photoThumb ? <img className="thumb" src={r.photoThumb} alt="" /> : <Avatar user={{ fullName: r.customer }} size="sm" />}
              <div className="grow"><strong>{r.customer}</strong><small>Crédito #{r.number} · {r.daysLate} día(s) de atraso</small></div>
              <strong className="money text-bad">{formatMoney(r.overdue)}</strong>
              <MdChevronRight className="muted-icon" />
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

const Extra = ({ x, admin }) => {
  if (!x) return <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
  const total = x.daily.reduce((s, r) => s + r.recaudado, 0)
  const pend = x.pending || {}
  return (
    <>
      {admin && (pend.creditRequests > 0 || pend.cashTransfers > 0 || pend.vehicleAlerts > 0) && (
        <div className="alert warn pending-alert">
          <MdNotificationsActive />
          <span>Tienes pendientes por revisar:{pend.creditRequests > 0 && <> <Link to="/solicitudes">{pend.creditRequests} solicitud(es) de crédito</Link></>}{pend.creditRequests > 0 && pend.cashTransfers > 0 && ' y'}{pend.cashTransfers > 0 && <> <Link to="/capital">{pend.cashTransfers} traslado(s) de dinero</Link></>}{(pend.creditRequests > 0 || pend.cashTransfers > 0) && pend.vehicleAlerts > 0 && ' y'}{pend.vehicleAlerts > 0 && <> <Link to="/vehiculos">{pend.vehicleAlerts} vehículo(s) con documentos vencidos o aceite atrasado</Link></>}.</span>
        </div>
      )}
      <div className="grid grid-2-1">
        <Card title={admin ? 'Recaudo diario' : 'Mi recaudo diario'} subtitle={`Últimos 14 días · ${formatMoney(total)} en total`}>
          <TrendChart data={x.daily} dataKey="recaudado" name="Recaudado" tickFormatter={dayTick} />
        </Card>
        <Card title="Salud de la cartera" subtitle={`${x.portfolio.lateCredits} de ${x.portfolio.credits} crédito(s) con atraso`} icon={<MdShield />}>
          <div className="health">
            <div className={`health-num ${x.portfolio.par > 20 ? 'bad' : x.portfolio.par > 5 ? 'warn' : 'ok'}`}><strong>{pct(x.portfolio.par)}</strong><span>cartera en riesgo</span></div>
            <div className="tier-bar">{x.tiers.map((t, i) => (x.portfolio.balance ? <span key={t.key} title={`${t.key}: ${formatMoney(t.balance)}`} style={{ flex: t.balance, background: TIER_COLORS[i] }} /> : null))}</div>
            <ul className="tier-legend">{x.tiers.map((t, i) => <li key={t.key}><span className="dot" style={{ background: TIER_COLORS[i] }} />{t.key === 'Al día' ? t.key : `${t.key} días`}<strong>{formatMoney(t.balance)}</strong></li>)}</ul>
          </div>
        </Card>
      </div>
      {admin ? (
        <div className="grid grid-2">
          <RoutesToday routes={x.routes || []} />
          <TopLate rows={x.topLate || []} />
        </div>
      ) : (
        <Card title="Promesas de pago" subtitle="Lo que tus clientes prometieron pagar." flush>
          {!x.promises?.length ? <Empty icon={<MdEventNote />}>No tienes promesas de pago pendientes.</Empty> : (
            <div className="mini-list">{x.promises.map((p) => (
              <Link key={p.id} className="mini-row" to={`/creditos/${p.creditId}`}>
                <MdEventNote className="muted-icon" />
                <div className="grow"><strong>{p.customer}</strong><small>{p.note || 'Sin nota'}</small></div>
                <Badge tone={p.date === x.daily[x.daily.length - 1].label ? 'warn' : ''}>{formatDate(p.date)}</Badge>
              </Link>
            ))}</div>
          )}
        </Card>
      )}
    </>
  )
}

// Comparativo de sedes (vista "Todas las sedes").
const SitesSummary = ({ rows }) => {
  const navigate = useNavigate()
  const tot = (k) => rows.reduce((t, r) => t + r[k], 0)
  return (
    <Card title="Por sede" subtitle="Toca una sede para ver solo su información" flush actions={<Link className="btn btn-sm" to="/sedes">Sedes</Link>}>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Sede</th><th className="num hide-sm">Ruteros</th><th className="num">Cartera</th><th className="num">En mora</th><th className="num">Recaudo hoy</th><th className="num hide-md">Recaudo mes</th><th className="num hide-md">Colocado mes</th><th className="num hide-md">Capital</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id ?? 'sin'} className={r.id ? 'clickable' : ''} onClick={() => r.id && goToSite(r.id, navigate)}>
            <td><strong>{r.name}</strong>{r.city && <><br /><small>{r.city}</small></>}</td>
            <td className="num hide-sm">{r.lenders}</td>
            <td className="num">{formatMoney(r.portfolio)}</td>
            <td className="num"><span className={r.overdue ? 'text-bad' : ''}>{formatMoney(r.overdue)}</span><br /><small>{pct(r.overduePct)}</small></td>
            <td className="num">{formatMoney(r.collectedToday)}</td>
            <td className="num hide-md">{formatMoney(r.collectedMonth)}</td>
            <td className="num hide-md">{formatMoney(r.placedMonth)}</td>
            <td className="num hide-md">{r.ownCapital ? formatMoney(r.capital) : <small>Del negocio</small>}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr><td><strong>Total</strong></td><td className="num hide-sm">{tot('lenders')}</td><td className="num"><strong>{formatMoney(tot('portfolio'))}</strong></td><td className="num"><strong>{formatMoney(tot('overdue'))}</strong></td><td className="num"><strong>{formatMoney(tot('collectedToday'))}</strong></td><td className="num hide-md"><strong>{formatMoney(tot('collectedMonth'))}</strong></td><td className="num hide-md"><strong>{formatMoney(tot('placedMonth'))}</strong></td><td className="hide-md" /></tr></tfoot>
      </table></div>
    </Card>
  )
}

const AdminDashboard = ({ d, x, sites }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Cartera activa" value={formatMoney(d.kpis.carteraActiva)} icon={MdAccountBalanceWallet} tone="dark" note="Capital pendiente de cobro" />
      <Kpi label="Recaudo de hoy" value={formatMoney(d.kpis.recaudoHoy)} icon={MdPayments} tone="brand" note="Pagos registrados hoy" />
      <Kpi label="En mora" value={formatMoney(d.kpis.enMora)} icon={MdWarningAmber} tone="bad" note="Cuotas vencidas sin pagar" />
      <Kpi label="Créditos activos" value={d.kpis.creditosActivos} icon={MdRequestQuote} note={d.kpis.clientesEnMora ? `${d.kpis.clientesEnMora} cliente(s) en mora` : null} />
      <Kpi label={d.kpis.capitalSede ? `Capital de ${d.kpis.capitalSede}` : 'Saldo del negocio'} value={formatMoney(d.kpis.saldoNegocio || 0)} icon={MdAccountBalance} note={`En cajas de prestamistas ${formatMoney(d.kpis.cajasPrestamistas || 0)}`} />
      <Kpi label="Prestamistas" value={d.kpis.prestamistas} icon={MdBadge} />
      <Kpi label={getSiteFilter() ? 'Clientes con crédito' : 'Clientes con usuario'} value={d.kpis.clientes} icon={MdPeople} />
    </div>
    {sites?.length > 1 && <SitesSummary rows={sites} />}
    <div className="grid grid-2-1">
      <Card title="Colocado vs. recaudado" subtitle="Últimos 6 meses"><FlowChart data={d.series} /></Card>
      <Card title="Estado de la cartera" subtitle="Al día frente a mora"><DonutChart data={d.cartera} /></Card>
    </div>
    <Extra x={x} admin />
  </>
)

const LenderDashboard = ({ d, x }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Por cobrar hoy" value={formatMoney(d.kpis.porCobrarHoy)} icon={MdRoute} tone="dark" note="Según tu rutero del día" />
      <Kpi label="Cobrado hoy" value={formatMoney(d.kpis.cobradoHoy)} icon={MdPayments} tone="brand" />
      <Kpi label="Mi caja" value={formatMoney(d.kpis.miCaja || 0)} icon={MdAccountBalance} note="Disponible para prestar" />
      <Kpi label="Visitas pendientes" value={d.kpis.visitasPendientes} icon={MdEventAvailable} />
      <Kpi label="Clientes en mora" value={d.kpis.clientesEnMora} icon={MdWarningAmber} tone="bad" />
    </div>
    {x?.route && x.route.stops > 0 && (
      <Card title="Avance de mi ruta" actions={<Link className="btn btn-sm btn-primary" to="/mi-ruta"><MdRoute /> Ir a mi ruta</Link>}>
        <div className="route-progress">
          <div className="progress lg"><span style={{ width: `${Math.round(((x.route.paid + x.route.visited) / x.route.stops) * 100)}%` }} /></div>
          <small>{x.route.paid + x.route.visited} de {x.route.stops} clientes visitados · {x.route.paid} pagaron · faltan {formatMoney(x.route.pending)}</small>
        </div>
      </Card>
    )}
    <Extra x={x} />
    <Card title="Mi recaudo" subtitle="Últimos 6 meses"><BarsChart data={d.series} dataKey="recaudado" name="Recaudado" color={CHART.recaudo} /></Card>
  </>
)

const ClientDashboard = ({ d }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Saldo pendiente" value={formatMoney(d.kpis.saldoPendiente)} icon={MdAccountBalanceWallet} tone="dark" />
      <Kpi label="Próxima cuota" value={d.kpis.proximaCuota ? formatMoney(d.kpis.proximaCuota.valor) : '—'} note={d.kpis.proximaCuota ? `Vence el ${formatDate(d.kpis.proximaCuota.fecha)}` : 'Sin cuotas pendientes'} icon={MdEventAvailable} tone="brand" />
      <Kpi label="Cuotas pagadas" value={d.kpis.cuotasPagadas} icon={MdCheckCircle} />
      <Kpi label="Créditos activos" value={d.kpis.creditosActivos} icon={MdSavings} />
    </div>
    {d.kpis.enMora > 0 && <div className="alert bad">Tienes {formatMoney(d.kpis.enMora)} en cuotas vencidas. Ponte al día con tu prestamista.</div>}
    <Card title="Mis créditos" actions={<Link className="btn btn-sm" to="/mis-creditos">Ver cuotas</Link>}>
      {d.kpis.creditosActivos ? <p style={{ margin: 0 }}>Tienes {d.kpis.creditosActivos} crédito(s) activo(s). Revisa el detalle de cada cuota en <Link className="small-link" to="/mis-creditos">Mis créditos</Link>.</p> : <Empty icon={<MdSavings />}>Aún no tienes créditos registrados.</Empty>}
    </Card>
  </>
)

const Dashboard = () => {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [extra, setExtra] = useState(null)
  const [error, setError] = useState('')
  const [sites, setSites] = useState(null)
  useEffect(() => {
    if (user.role === 'administrador' && !getSiteFilter()) api.get('/dashboard/sedes').then(({ data: d }) => setSites(d.rows)).catch(() => {})
    api.get('/dashboard').then(({ data: d }) => setData(d)).catch((e) => setError(errorMessage(e)))
    if (user.role !== 'cliente') api.get('/dashboard/extra').then(({ data: d }) => setExtra(d)).catch(() => setExtra(false))
  }, [user.role])
  const subtitle = { administrador: 'Así va tu negocio hoy.', prestamista: 'Tu jornada de cobro de hoy.', cliente: 'El estado de tus créditos.' }[user.role]
  return (
    <div className="stack">
      <PageHead title={`${greeting()}, ${user.name}`} subtitle={subtitle} />
      {error && <div className="alert bad">{error}</div>}
      {!data && !error && <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>}
      {data && user.role === 'administrador' && <AdminDashboard d={data} x={extra || null} sites={sites} />}
      {data && user.role === 'prestamista' && <LenderDashboard d={data} x={extra || null} />}
      {data && user.role === 'cliente' && <ClientDashboard d={data} />}
    </div>
  )
}

export default Dashboard
