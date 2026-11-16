import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSearch, MdWarningAmber, MdPhone, MdWhatsapp, MdEventNote } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, PageHead, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'

const TIER_LABEL = { '1-7': '1 a 7 días', '8-30': '8 a 30 días', '31-60': '31 a 60 días', '60+': 'Más de 60 días' }
const TIER_TONE = { '1-7': 'warn', '8-30': 'bad', '31-60': 'bad', '60+': 'dark' }
const wa = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length === 10 ? `57${d}` : d }

// Créditos con cuotas vencidas, por antigüedad de la mora, con el último pago y la última visita.
const DelinquentPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [lenders, setLenders] = useState([])
  const [filters, setFilters] = useState({ prestamista: '', tramo: '', q: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    setData(null)
    api.get('/morosos', { params: { prestamista: filters.prestamista || undefined } }).then(({ data: d }) => setData(d)).catch((e) => { setError(errorMessage(e)); setData({ rows: [], tiers: [], totals: {} }) })
  }, [filters.prestamista])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data: d }) => setLenders(d)).catch(() => {}) }, [admin])
  const rows = useMemo(() => (data?.rows || []).filter((r) => (!filters.tramo || r.tier === filters.tramo) &&
    (!filters.q || `${r.customer.fullName} ${r.customer.identification} ${r.number}`.toLowerCase().includes(filters.q.toLowerCase()))), [data, filters.tramo, filters.q])
  const msg = (r) => encodeURIComponent(`Hola ${r.customer.fullName}, le recordamos que su crédito #${r.number} tiene ${r.overdueCount} cuota(s) vencida(s) por ${formatMoney(r.overdue)}. Por favor póngase al día.`)

  return (
    <div className="stack">
      <PageHead title="Morosos" subtitle="Clientes con cuotas vencidas, del más atrasado al más reciente." />
      {error && <div className="alert bad">{error}</div>}
      <div className="tier-row">
        <button type="button" className={`tier${!filters.tramo ? ' on' : ''}`} onClick={() => setFilters((f) => ({ ...f, tramo: '' }))}>
          <span>Todos</span><strong>{data?.rows?.length ?? '…'}</strong><small>{formatMoney((data?.rows || []).reduce((s, r) => s + r.overdue, 0))} vencido</small>
        </button>
        {(data?.tiers || []).map((t) => (
          <button key={t.key} type="button" className={`tier ${TIER_TONE[t.key]}${filters.tramo === t.key ? ' on' : ''}`} onClick={() => setFilters((f) => ({ ...f, tramo: t.key }))}>
            <span>{TIER_LABEL[t.key]}</span><strong>{t.count}</strong><small>{formatMoney(t.overdue)}</small>
          </button>
        ))}
      </div>
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Buscar por cliente, documento o crédito" /></div>
          {admin && <select value={filters.prestamista} onChange={(e) => setFilters((f) => ({ ...f, prestamista: e.target.value }))} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
        </div>
        {!data ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdWarningAmber />}>{data.rows.length ? 'Nadie con ese filtro.' : 'No hay clientes en mora. ¡Bien!'}</Empty> : (
            <div className="stops">
              {rows.map((r) => (
                <div key={r.creditId} className="stop">
                  <img className="thumb" src={r.customer.photoThumb} alt="" />
                  <div className="grow">
                    <strong className="clickable" onClick={() => navigate(`/creditos/${r.creditId}`)}>{r.customer.fullName}</strong>
                    <small>{r.customer.identification} · crédito #{r.number}{admin && r.lender ? ` · cobra ${r.lender.fullName}` : ''}</small>
                    <small>{r.customer.address}{r.customer.neighborhood ? ` · ${r.customer.neighborhood}` : ''}</small>
                    <small>Último pago: {r.lastPayment ? `${formatMoney(r.lastPayment.amount)} el ${formatDate(r.lastPayment.paidOn)}` : 'ninguno'}</small>
                    {r.lastVisit && <small className="visit-note"><MdEventNote /> {formatDate(r.lastVisit.visitedOn)}: {r.lastVisit.label}{r.lastVisit.promiseDate ? ` para el ${formatDate(r.lastVisit.promiseDate)}` : ''}{r.lastVisit.note ? ` · ${r.lastVisit.note}` : ''}</small>}
                    <div className="stop-links">
                      <a href={`tel:${r.customer.phone}`}><MdPhone /> Llamar</a>
                      <a href={`https://wa.me/${wa(r.customer.phone)}?text=${msg(r)}`} target="_blank" rel="noreferrer"><MdWhatsapp /> Recordar por WhatsApp</a>
                    </div>
                  </div>
                  <div className="stop-side">
                    <div className="money text-bad"><strong>{formatMoney(r.overdue)}</strong></div>
                    <small>{r.overdueCount} cuota(s) · saldo {formatMoney(r.balance)}</small>
                    <Badge tone={TIER_TONE[r.tier]}>{r.daysLate} día(s) de mora</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  )
}

export default DelinquentPage
