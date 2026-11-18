import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChevronRight, MdLockOutline, MdRoute } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Avatar, Badge, Card, Empty, Kpi, PageHead, Spinner } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'
import { ReopenRequestsCard } from './common'

// Administrador: avance de todas las rutas del día.
const RoutesPage = () => {
  const navigate = useNavigate()
  const [day, setDay] = useState(todayBogota())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { setData(null); api.get('/rutas', { params: { fecha: day } }).then(({ data: d }) => setData(d)).catch((e) => { setError(errorMessage(e)); setData({ rows: [] }) }) }, [day, reload])
  const rows = data?.rows || []
  const tot = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  return (
    <div className="stack">
      <PageHead title="Rutas y rutero" subtitle="Avance del cobro de cada prestamista en el día.">
        <input type="date" value={day} max={todayBogota()} onChange={(e) => setDay(e.target.value)} aria-label="Día" />
      </PageHead>
      {error && <div className="alert bad">{error}</div>}
      <ReopenRequestsCard onChange={() => setReload((n) => n + 1)} />
      <div className="grid grid-kpi">
        <Kpi label="A cobrar" value={formatMoney(tot('toCollect'))} tone="dark" note={`${tot('stops')} cliente(s) en ruta`} />
        <Kpi label="Cobrado" value={formatMoney(tot('collected'))} tone="brand" note={`${formatMoney(tot('collectedOther'))} por transferencia`} />
        <Kpi label="Pendiente" value={formatMoney(tot('pending'))} tone={tot('pending') ? 'warn' : ''} />
        <Kpi label="Gastos de ruta" value={formatMoney(tot('expenses'))} note={`${rows.filter((r) => r.closed).length} de ${rows.length} jornadas cerradas`} />
      </div>
      <Card flush>
        {!data ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdRoute />}>No hay prestamistas activos.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Prestamista</th><th className="num">A cobrar</th><th className="num">Cobrado</th><th className="hide-sm">Avance</th><th className="num hide-md">Gastos</th><th className="num hide-md">Caja</th><th>Jornada</th><th /></tr></thead>
              <tbody>{rows.map((r) => {
                const pct = r.stops ? Math.round(((r.paid + r.visited) / r.stops) * 100) : 0
                return (
                  <tr key={r.lender.id} className="clickable" onClick={() => navigate(`/rutas/${r.lender.id}`)}>
                    <td><div className="person"><Avatar user={r.lender} /><div><strong>{r.lender.fullName}</strong><small>{r.stops} cliente(s) · {r.paid} pagaron · {r.visited} visitados</small></div></div></td>
                    <td className="num money">{formatMoney(r.toCollect)}</td>
                    <td className="num money"><strong>{formatMoney(r.collected)}</strong></td>
                    <td className="hide-sm"><div className="progress"><span style={{ width: `${pct}%` }} /></div><small>{pct} %</small></td>
                    <td className="num money hide-md">{formatMoney(r.expenses)}</td>
                    <td className="num money hide-md">{formatMoney(r.cash)}</td>
                    <td>{r.closed ? <Badge tone={r.difference === 0 ? 'ok' : 'warn'}><MdLockOutline /> {r.difference === 0 ? 'Cuadrada' : `${r.difference < 0 ? 'Faltan' : 'Sobran'} ${formatMoney(Math.abs(r.difference))}`}</Badge> : <Badge>Abierta</Badge>}</td>
                    <td className="right"><MdChevronRight /></td>
                  </tr>
                )
              })}</tbody>
            </table></div>
          )}
      </Card>
    </div>
  )
}

export default RoutesPage
