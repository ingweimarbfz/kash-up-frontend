import React, { useEffect, useState } from 'react'
import { MdLockOutline } from 'react-icons/md'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, PageHead, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'
import { CloseDayPanel } from './common'

// Cierre de jornada del prestamista y su historial.
const CloseDayPage = () => {
  const { user } = useAuth()
  const [history, setHistory] = useState(null)
  const load = () => api.get('/cierres').then(({ data }) => setHistory(data)).catch(() => setHistory([]))
  useEffect(() => { load() }, [])
  return (
    <div className="stack">
      <PageHead title="Cierre de jornada" subtitle="Cuadra el efectivo del día antes de terminar la ruta." />
      <div className="grid grid-2-1">
        <Card title={`Hoy, ${formatDate(todayBogota())}`} icon={<MdLockOutline />}><CloseDayPanel lenderId={user.id} day={todayBogota()} onClosed={load} /></Card>
        <Card title="Cierres anteriores" flush>
          {!history ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div>
            : !history.length ? <Empty icon={<MdLockOutline />}>Aún no hay cierres.</Empty> : (
              <div className="stops">
                {history.map((c) => (
                  <div key={c.id} className="stop">
                    <div className="grow"><strong>{formatDate(c.day)}</strong><small>Cobrado {formatMoney(c.collectedCash)} · gastos {formatMoney(c.expenses)}{c.delivered ? ` · entregó ${formatMoney(c.delivered)}` : ''}</small></div>
                    <Badge tone={c.difference === 0 ? 'ok' : 'warn'}>{c.difference === 0 ? 'Cuadrado' : `${c.difference < 0 ? '−' : '+'} ${formatMoney(Math.abs(c.difference))}`}</Badge>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>
    </div>
  )
}

export default CloseDayPage
