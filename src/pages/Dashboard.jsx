import React, { useEffect, useState } from 'react'
import { MdAccountBalanceWallet, MdPayments, MdWarningAmber, MdRequestQuote, MdPeople, MdBadge, MdRoute, MdEventAvailable, MdSavings, MdCheckCircle } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card, Kpi, PageHead, Spinner, Empty } from '../components/ui'
import { FlowChart, DonutChart, BarsChart } from '../components/charts'
import { formatMoney, formatDate } from '../utils/format'
import { CHART } from '../utils/brand'

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }).format(new Date()))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const AdminDashboard = ({ d }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Cartera activa" value={formatMoney(d.kpis.carteraActiva)} icon={MdAccountBalanceWallet} tone="dark" note="Capital pendiente de cobro" />
      <Kpi label="Recaudo de hoy" value={formatMoney(d.kpis.recaudoHoy)} icon={MdPayments} tone="brand" note="Pagos registrados hoy" />
      <Kpi label="En mora" value={formatMoney(d.kpis.enMora)} icon={MdWarningAmber} tone="bad" note="Cuotas vencidas sin pagar" />
      <Kpi label="Créditos activos" value={d.kpis.creditosActivos} icon={MdRequestQuote} />
      <Kpi label="Prestamistas" value={d.kpis.prestamistas} icon={MdBadge} />
      <Kpi label="Clientes con usuario" value={d.kpis.clientes} icon={MdPeople} />
    </div>
    <div className="grid grid-2-1">
      <Card title="Colocado vs. recaudado" subtitle="Últimos 6 meses"><FlowChart data={d.series} /></Card>
      <Card title="Estado de la cartera" subtitle="Al día frente a mora"><DonutChart data={d.cartera} /></Card>
    </div>
  </>
)

const LenderDashboard = ({ d }) => (
  <>
    <div className="grid grid-kpi">
      <Kpi label="Por cobrar hoy" value={formatMoney(d.kpis.porCobrarHoy)} icon={MdRoute} tone="dark" note="Según tu rutero del día" />
      <Kpi label="Cobrado hoy" value={formatMoney(d.kpis.cobradoHoy)} icon={MdPayments} tone="brand" />
      <Kpi label="Visitas pendientes" value={d.kpis.visitasPendientes} icon={MdEventAvailable} />
      <Kpi label="Clientes en mora" value={d.kpis.clientesEnMora} icon={MdWarningAmber} tone="bad" />
    </div>
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
    <Card title="Mis créditos">
      {d.creditos.length ? null : <Empty icon={<MdSavings />}>Aún no tienes créditos registrados.</Empty>}
    </Card>
  </>
)

const Dashboard = () => {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/dashboard').then(({ data: d }) => setData(d)).catch((e) => setError(errorMessage(e)))
  }, [])
  const subtitle = { administrador: 'Así va tu negocio hoy.', prestamista: 'Tu jornada de cobro de hoy.', cliente: 'El estado de tus créditos.' }[user.role]
  return (
    <div className="stack">
      <PageHead title={`${greeting()}, ${user.name}`} subtitle={subtitle} />
      {error && <div className="alert bad">{error}</div>}
      {!data && !error && <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>}
      {data && user.role === 'administrador' && <AdminDashboard d={data} />}
      {data && user.role === 'prestamista' && <LenderDashboard d={data} />}
      {data && user.role === 'cliente' && <ClientDashboard d={data} />}
    </div>
  )
}

export default Dashboard
