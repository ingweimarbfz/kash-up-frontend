import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdSavings } from 'react-icons/md'
import api from '../../api/client'
import { Card, Kpi, PageHead, Spinner } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { MovementsTable } from './CapitalPage'

// Caja del prestamista: lo que el administrador le asignó menos lo que ha prestado.
const MyCashPage = () => {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/mi-caja').then(({ data: d }) => setData(d)).catch(() => setData({ balance: 0, movements: [] })) }, [])
  if (!data) return <div className="splash"><Spinner /></div>
  const sum = (types) => data.movements.filter((m) => types.includes(m.type)).reduce((s, m) => s + m.amount, 0)
  return (
    <div className="stack">
      <PageHead title="Mi caja" subtitle="Dinero que tienes disponible para prestar. Lo asigna el administrador.">
        <Link className="btn btn-primary" to="/creditos/nuevo"><MdAdd /> Nuevo crédito</Link>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Disponible para prestar" value={formatMoney(data.balance)} tone={data.balance ? 'brand' : 'warn'} icon={MdSavings} />
        <Kpi label="Asignado" value={formatMoney(sum(['asignacion', 'devolucion_asignacion']))} />
        <Kpi label="Prestado" value={formatMoney(-sum(['desembolso', 'reverso_desembolso']))} tone="dark" />
      </div>
      {!data.balance && <div className="alert warn">No tienes saldo para prestar. Pide al administrador que te asigne dinero.</div>}
      <Card flush title="Movimientos de mi caja"><MovementsTable rows={data.movements} showAccount={false} /></Card>
    </div>
  )
}

export default MyCashPage
