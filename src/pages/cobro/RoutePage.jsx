import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdPayments, MdPersonPinCircle, MdPhone, MdWhatsapp, MdSwapVert, MdArrowUpward, MdArrowDownward, MdSave, MdLockOutline, MdRoute, MdEventNote, MdDirections } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'
import { CloseDayPanel, CollectFlow, STOP_TONES, VisitModal } from './common'

const FILTERS = [['todos', 'Todos'], ['pendiente', 'Por visitar'], ['cobrado', 'Cobrados'], ['visitado', 'Visitados sin pago']]
const wa = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length === 10 ? `57${d}` : d }
const mapsUrl = (c) => (c.lat && c.lng ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.address || ''} ${c.neighborhood || ''}`)}`)

// Ruta del día de un prestamista: a quién cobrar, en qué orden, y lo cobrado.
const RoutePage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const { lenderId: param } = useParams()
  const lenderId = admin ? Number(param) : user.id
  const navigate = useNavigate()
  const [day, setDay] = useState(todayBogota())
  const [data, setData] = useState(null)
  const [lenderName, setLenderName] = useState('')
  const [filter, setFilter] = useState('todos')
  const [all, setAll] = useState(false)
  const [ordering, setOrdering] = useState(null)
  const [collect, setCollect] = useState(null)
  const [visit, setVisit] = useState(null)
  const [closing, setClosing] = useState(false)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/ruta', { params: { prestamista: admin ? lenderId : undefined, fecha: day, todos: all ? 1 : undefined } })
      .then(({ data: d }) => setData(d)).catch((e) => { setData({ rows: [], totals: {} }); toast(errorMessage(e), 'bad') })
  }, [admin, lenderId, day, all, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data: l }) => setLenderName(l.find((x) => x.id === lenderId)?.fullName || '')).catch(() => {}) }, [admin, lenderId])

  const rows = useMemo(() => (data?.rows || []).filter((r) => filter === 'todos' || (filter === 'pendiente' && r.status === 'pendiente') ||
    (filter === 'cobrado' && r.paidToday > 0) || (filter === 'visitado' && !r.paidToday && r.visit)), [data, filter])
  const t = data?.totals || {}
  const isToday = day === todayBogota()
  const progress = t.stops ? Math.round(((t.paid + t.visited) / t.stops) * 100) : 0

  const move = (i, d) => setOrdering((o) => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n })
  const saveOrder = async () => {
    try { await api.put('/ruta/orden', { customerIds: [...new Set(ordering.map((r) => r.customer.id))] }); setOrdering(null); load(); toast('Orden de la ruta guardado') } catch (e) { toast(errorMessage(e), 'bad') }
  }

  return (
    <div className="stack">
      <PageHead title={admin ? `Ruta de ${lenderName || '…'}` : 'Mi ruta'} subtitle={`${isToday ? 'Hoy' : 'Día'} ${formatDate(day)} · cuotas que vencen y vencidas, en el orden de visita.`}>
        {admin && <button type="button" className="btn btn-ghost" onClick={() => navigate('/rutas')}><MdArrowBack /> Rutas</button>}
        {admin && <input type="date" value={day} max={todayBogota()} onChange={(e) => setDay(e.target.value)} aria-label="Día" />}
        {!ordering && <button type="button" className="btn" onClick={() => setOrdering(data?.rows || [])} disabled={!data?.rows?.length}><MdSwapVert /> Ordenar ruta</button>}
        <button type="button" className="btn btn-primary" onClick={() => setClosing(true)}><MdLockOutline /> {data?.closed ? 'Jornada cerrada' : 'Cerrar jornada'}</button>
      </PageHead>
      {data?.closed && <div className="alert info"><MdLockOutline /> La jornada de este día está cerrada{admin ? '. Puedes reabrirla desde "Jornada cerrada".' : '. Si necesitas registrar algo más, pide al administrador que la reabra.'}</div>}

      <div className="grid grid-kpi">
        <Kpi label="A cobrar" value={formatMoney(t.toCollect || 0)} tone="dark" note={`${t.stops || 0} cliente(s) en ruta`} />
        <Kpi label="Cobrado" value={formatMoney(t.collected || 0)} tone="brand" note={`${t.paid || 0} pagaron`} />
        <Kpi label="Pendiente" value={formatMoney(t.pending || 0)} tone={t.pending ? 'warn' : ''} note={t.overdue ? `${formatMoney(t.overdue)} vencido de días anteriores` : null} />
        <Kpi label="Avance" value={`${progress} %`} note={`${(t.paid || 0) + (t.visited || 0)} de ${t.stops || 0} visitados`} />
      </div>

      {ordering ? (
        <Card title="Ordenar la ruta" subtitle="Sube o baja a cada cliente según el recorrido del día." actions={<div className="row-end"><button type="button" className="btn btn-sm" onClick={() => setOrdering(null)}>Cancelar</button><button type="button" className="btn btn-sm btn-primary" onClick={saveOrder}><MdSave /> Guardar orden</button></div>} flush>
          <div className="stops">
            {ordering.map((r, i) => (
              <div key={r.creditId} className="stop">
                <span className="stop-n">{i + 1}</span>
                <div className="grow"><strong>{r.customer.fullName}</strong><small>{r.customer.address}{r.customer.neighborhood ? ` · ${r.customer.neighborhood}` : ''}</small></div>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => move(i, -1)} disabled={!i} aria-label="Subir"><MdArrowUpward /></button>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => move(i, 1)} disabled={i === ordering.length - 1} aria-label="Bajar"><MdArrowDownward /></button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card flush>
          <div className="toolbar">
            <div className="seg">{FILTERS.map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
            <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Incluir clientes sin cuota hoy</label>
          </div>
          {!data ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
            : !rows.length ? <Empty icon={<MdRoute />}>{data.rows.length ? 'Nadie con ese filtro.' : 'No hay cuotas para cobrar este día.'}</Empty>
              : (
                <div className="stops">
                  {rows.map((r) => (
                    <div key={r.creditId} className={`stop ${r.status}`}>
                      <span className="stop-n">{data.rows.indexOf(r) + 1}</span>
                      <img className="thumb" src={r.customer.photoThumb} alt="" />
                      <div className="grow">
                        <strong className="clickable" onClick={() => navigate(`/creditos/${r.creditId}`)}>{r.customer.fullName}</strong>
                        <small>{r.customer.address}{r.customer.neighborhood ? ` · ${r.customer.neighborhood}` : ''}</small>
                        <small>Crédito #{r.number} · cuota {formatMoney(r.installmentAmount)} · saldo {formatMoney(r.balance)}</small>
                        {r.visit && <small className="visit-note"><MdEventNote /> {r.visit.label}{r.visit.promiseDate ? ` para el ${formatDate(r.visit.promiseDate)}` : ''}{r.visit.note ? ` · ${r.visit.note}` : ''}</small>}
                        <div className="stop-links">
                          <a href={`tel:${r.customer.phone}`} aria-label="Llamar"><MdPhone /> Llamar</a>
                          <a href={`https://wa.me/${wa(r.customer.phone)}`} target="_blank" rel="noreferrer"><MdWhatsapp /> WhatsApp</a>
                          <a href={mapsUrl(r.customer)} target="_blank" rel="noreferrer">{r.customer.lat ? <MdDirections /> : <MdPersonPinCircle />} Cómo llegar</a>
                        </div>
                      </div>
                      <div className="stop-side">
                        <div className="money"><strong>{formatMoney(r.dueAmount)}</strong></div>
                        {r.overdueCount > 0 && <small className="text-bad">{r.overdueCount} vencida(s) desde {formatDate(r.oldestDue)}</small>}
                        {r.paidToday > 0 && <small className="text-ok">Pagó {formatMoney(r.paidToday)}</small>}
                        <Badge tone={STOP_TONES[r.status]}>{r.statusLabel}</Badge>
                        {isToday && !data.closed && (
                          <div className="stop-actions">
                            {r.dueAmount > 0 || r.balance > 0 ? <button type="button" className="btn btn-sm btn-primary" onClick={() => setCollect(r.creditId)}><MdPayments /> Cobrar</button> : null}
                            {!r.paidToday && <button type="button" className="btn btn-sm" onClick={() => setVisit(r)}>Visita</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
        </Card>
      )}
      {collect && <CollectFlow creditId={collect} onClose={() => { setCollect(null); load() }} onDone={(r) => toast(`Pago ${r.number} registrado`)} />}
      {visit && <VisitModal stop={visit} onClose={() => setVisit(null)} onDone={() => { setVisit(null); load(); toast('Visita registrada') }} />}
      {closing && <Modal title={`Cierre de jornada · ${formatDate(day)}`} onClose={() => setClosing(false)}><CloseDayPanel lenderId={lenderId} day={day} onClosed={load} /></Modal>}
      {toastNode}
    </div>
  )
}

export default RoutePage
