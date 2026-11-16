import React, { useEffect, useState } from 'react'
import { MdPayments, MdChevronRight } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Card, Empty, Kpi, PageHead, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { PAY_KIND, PAY_METHOD } from '../../utils/credit'
import { ReceiptModal } from './common'

// Portal del cliente: sus pagos y recibos.
const MyPaymentsPage = () => {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  useEffect(() => { api.get('/mis-pagos').then(({ data }) => setRows(data)).catch((e) => { setRows([]); setError(errorMessage(e)) }) }, [])
  const paid = (rows || []).filter((p) => p.kind !== 'renovacion')
  return (
    <div className="stack">
      <PageHead title="Mis pagos" subtitle="Cada pago que has hecho, con su recibo." />
      {error && <div className="alert bad">{error}</div>}
      {rows && rows.length > 0 && (
        <div className="grid grid-kpi">
          <Kpi label="Total pagado" value={formatMoney(paid.reduce((s, p) => s + p.amount, 0))} tone="dark" note={`${paid.length} pago(s)`} />
          <Kpi label="Último pago" value={paid[0] ? formatMoney(paid[0].amount) : '—'} tone="brand" note={paid[0] ? formatDate(paid[0].paidOn) : null} />
        </div>
      )}
      <Card flush>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdPayments />}>Aún no tienes pagos registrados.</Empty>
            : (
              <div className="list-cards always">
                {rows.map((p) => (
                  <div key={p.id} className="list-card clickable" onClick={() => setReceipt(p.id)}>
                    <span className="icon-bubble"><MdPayments /></span>
                    <div className="grow"><strong>{PAY_KIND[p.kind]?.[0]} · crédito #{p.credit?.number}</strong><small>{p.number} · {formatDate(p.paidOn)} · {PAY_METHOD[p.method]}</small></div>
                    <div className="right money"><strong>{formatMoney(p.amount)}</strong></div>
                    <MdChevronRight />
                  </div>
                ))}
              </div>
              )}
      </Card>
      {receipt && <ReceiptModal paymentId={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}

export default MyPaymentsPage
