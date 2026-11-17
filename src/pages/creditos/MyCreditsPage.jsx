import React, { useEffect, useState } from 'react'
import { MdSavings } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, Kpi, PageHead, Spinner } from '../../components/ui'
import ScheduleTable from '../../components/ScheduleTable'
import { formatDate, formatMoney } from '../../utils/format'
import { CREDIT_STATUS, KIND_LABEL, frequencyText } from '../../utils/credit'
import { CreditSummary } from './CreditDetail'

// Portal del cliente: sus créditos, cuotas y saldos.
const MyCreditsPage = () => {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/mis-creditos').then(({ data }) => setRows(data)).catch((e) => { setRows([]); setError(errorMessage(e)) }) }, [])
  return (
    <div className="stack">
      <PageHead title="Mis créditos" subtitle="Tus cuotas, lo que has pagado y lo que te falta." />
      {error && <div className="alert bad">{error}</div>}
      {!rows ? <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>
        : !rows.length ? <Card><Empty icon={<MdSavings />}>No tienes créditos registrados.</Empty></Card>
          : rows.map((c) => (
            <Card key={c.id} title={`Crédito #${c.number} · ${KIND_LABEL[c.kind]}`} subtitle={`${c.installmentsCount} cuotas de ${formatMoney(c.installmentAmount)} · ${frequencyText(c)}`}
              actions={c.overdue > 0 ? <Badge tone="bad">En mora</Badge> : <Badge tone={CREDIT_STATUS[c.status][1]}>{CREDIT_STATUS[c.status][0]}</Badge>}>
              <div className="stack">
                <div className="grid grid-kpi">
                  <Kpi label="Saldo" value={formatMoney(c.balance)} tone="dark" />
                  <Kpi label="Pagado" value={formatMoney(c.paidAmount)} tone="brand" />
                  <Kpi label="Vencido" value={formatMoney(c.overdue)} tone={c.overdue ? 'bad' : ''} />
                  <Kpi label="Próxima cuota" value={c.nextDueDate ? formatDate(c.nextDueDate) : '—'} />
                </div>
                <div className="grid grid-2-1">
                  <ScheduleTable rows={c.installments} withStatus limit={10} />
                  <aside className="credit-box">
                    <h4>Condiciones del crédito</h4>
                    <CreditSummary c={c} />
                  </aside>
                </div>
              </div>
            </Card>
          ))}
    </div>
  )
}

export default MyCreditsPage
