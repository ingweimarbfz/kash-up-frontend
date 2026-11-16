import React, { useState } from 'react'
import { Badge } from './ui'
import { formatDate, formatMoney } from '../utils/format'
import { INSTALLMENT_STATUS } from '../utils/credit'

// Tabla del plan de cuotas. Con withStatus muestra lo pagado y el estado de cada cuota.
const ScheduleTable = ({ rows, withStatus = false, limit = 12, compact = false }) => {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, limit)
  const total = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>#</th><th>Vence</th>{!compact && <><th className="num">Capital</th><th className="num">Interés</th></>}<th className="num">Cuota</th>{withStatus && <><th className="num hide-sm">Pagado</th><th>Estado</th></>}</tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.number} className={r.overdue ? 'row-overdue' : ''}>
              <td>{r.number}</td>
              <td>{formatDate(r.dueDate)}</td>
              {!compact && <><td className="num money">{formatMoney(r.capital)}</td><td className="num money">{formatMoney(r.interest)}</td></>}
              <td className="num money"><strong>{formatMoney(r.amount)}</strong></td>
              {withStatus && (
                <>
                  <td className="num money hide-sm">{formatMoney(r.paidAmount)}</td>
                  <td>{r.overdue ? <Badge tone="bad">Vencida</Badge> : <Badge tone={INSTALLMENT_STATUS[r.status][1]}>{INSTALLMENT_STATUS[r.status][0]}</Badge>}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={2}><strong>Total</strong></td>{!compact && <><td className="num money"><strong>{formatMoney(total('capital'))}</strong></td><td className="num money"><strong>{formatMoney(total('interest'))}</strong></td></>}<td className="num money"><strong>{formatMoney(total('amount'))}</strong></td>{withStatus && <><td className="num money hide-sm"><strong>{formatMoney(total('paidAmount'))}</strong></td><td /></>}</tr>
        </tfoot>
      </table>
      {rows.length > limit && <div style={{ padding: 12, textAlign: 'center' }}><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAll((a) => !a)}>{all ? 'Ver menos' : `Ver las ${rows.length} cuotas`}</button></div>}
    </div>
  )
}

export default ScheduleTable
