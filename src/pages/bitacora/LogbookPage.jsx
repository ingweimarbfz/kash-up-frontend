import React, { useEffect, useMemo, useState } from 'react'
import { MdPayments, MdReceiptLong, MdRequestQuote, MdAccountBalanceWallet, MdPerson, MdLogin, MdWarning, MdPrint, MdPlace, MdMenuBook } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Badge, Card, Empty, PageHead, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'

// =====================================================================
// Bitácora del prestamista (KU-023): todo lo que movió dinero, en orden y con alertas.
// =====================================================================
const KINDS = {
  cobro: ['Cobros', MdPayments, '#0f766e'],
  gasto: ['Gastos', MdReceiptLong, '#b45309'],
  credito: ['Créditos', MdRequestQuote, '#4338ca'],
  caja: ['Caja', MdAccountBalanceWallet, '#0369a1'],
  cliente: ['Clientes', MdPerson, '#6d28d9'],
  sesion: ['Sesiones', MdLogin, '#64748b']
}
const shift = (iso, days) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
const time = (iso) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const dayOf = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso))
const NEGATIVE = ['Pago anulado', 'Gasto anulado', 'Crédito anulado', 'Devolvió capital']

const LogbookPage = () => {
  const { settings } = useSettings()
  const today = todayBogota()
  const [range, setRange] = useState([today, today])
  const [lender, setLender] = useState('')
  const [kinds, setKinds] = useState([])
  const [onlyFlags, setOnlyFlags] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setData(null); setError('')
    api.get('/bitacora', { params: { desde: range[0], hasta: range[1], prestamista: lender || undefined } })
      .then(({ data: d }) => setData(d)).catch((e) => setError(errorMessage(e)))
  }, [range, lender])
  const presets = [['Hoy', [today, today]], ['Ayer', [shift(today, -1), shift(today, -1)]], ['7 días', [shift(today, -6), today]], ['30 días', [shift(today, -29), today]]]
  const entries = useMemo(() => (data?.entries || []).filter((e) => (!kinds.length || kinds.includes(e.kind)) && (!onlyFlags || e.flags.length)), [data, kinds, onlyFlags])
  const days = useMemo(() => {
    const m = new Map()
    entries.forEach((e) => { const d = dayOf(e.at); if (!m.has(d)) m.set(d, []); m.get(d).push(e) })
    return [...m.entries()]
  }, [entries])
  const flagged = (data?.entries || []).filter((e) => e.flags.length).length
  const toggle = (k) => setKinds((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))
  const lenderName = data?.lenders.find((l) => String(l.id) === String(lender))?.fullName

  return (
    <div className="stack lb-page">
      <PageHead title="Bitácora" subtitle={`Lo que hicieron los prestamistas con el dinero · del ${formatDate(range[0])} al ${formatDate(range[1])}${lenderName ? ` · ${lenderName}` : ''}.`}>
        <button type="button" className="btn no-print" disabled={!data} onClick={() => window.print()}><MdPrint /> Imprimir</button>
      </PageHead>
      <div className="lb-print-head">
        <strong>{settings.businessName}</strong> · Bitácora de prestamistas · {formatDate(range[0])} al {formatDate(range[1])}{lenderName ? ` · ${lenderName}` : ''}
      </div>
      <Card flush className="no-print">
        <div className="toolbar">
          <div className="seg seg-wrap">{presets.map(([l, r]) => <button key={l} type="button" className={`btn btn-sm${range[0] === r[0] && range[1] === r[1] ? ' on' : ''}`} onClick={() => setRange(r)}>{l}</button>)}</div>
          <input type="date" value={range[0]} max={range[1]} onChange={(e) => e.target.value && setRange([e.target.value, range[1]])} aria-label="Desde" />
          <input type="date" value={range[1]} min={range[0]} max={today} onChange={(e) => e.target.value && setRange([range[0], e.target.value])} aria-label="Hasta" />
          <select value={lender} onChange={(e) => setLender(e.target.value)} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{(data?.lenders || []).map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>
        </div>
        <div className="toolbar lb-kinds">
          {Object.entries(KINDS).map(([k, [l, Icon, color]]) => (
            <button key={k} type="button" className={`lb-chip${kinds.includes(k) ? ' on' : ''}`} style={{ '--c': color }} onClick={() => toggle(k)}><Icon /> {l}</button>
          ))}
          <button type="button" className={`lb-chip warn${onlyFlags ? ' on' : ''}`} onClick={() => setOnlyFlags((x) => !x)}><MdWarning /> Solo alertas{flagged ? ` (${flagged})` : ''}</button>
        </div>
      </Card>
      {error && <div className="alert bad">{error}</div>}
      {!data && !error && <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>}
      {data && (
        <>
          {!!data.summary.length && (
            <div className="lb-summary">{data.summary.map((s) => (
              <Card key={s.lenderId} className="lb-card">
                <div className="lb-card-head"><strong>{s.lender}</strong>{s.flags > 0 ? <Badge tone="warn">{s.flags} alerta{s.flags === 1 ? '' : 's'}</Badge> : <Badge tone="ok">Sin alertas</Badge>}</div>
                <dl>
                  <div><dt>Cobrado</dt><dd className="money">{formatMoney(s.collected)}</dd><small>{s.payments} pago{s.payments === 1 ? '' : 's'}</small></div>
                  <div><dt>Gastos</dt><dd className="money">{formatMoney(s.expenses)}</dd></div>
                  <div><dt>Prestado</dt><dd className="money">{formatMoney(s.lent)}</dd></div>
                  <div><dt>Faltante</dt><dd className={`money${s.shortage ? ' text-bad' : ''}`}>{formatMoney(s.shortage)}</dd><small>{s.closures} cierre{s.closures === 1 ? '' : 's'}</small></div>
                </dl>
                {s.first && <small className="muted">Actividad: {range[0] === range[1] ? `de ${time(s.first)} a ${time(s.last)}` : `${s.days} día${s.days === 1 ? '' : 's'} · último movimiento ${formatDate(s.last)} ${time(s.last)}`}</small>}
              </Card>
            ))}</div>
          )}
          {!days.length ? <Card><Empty icon={<MdMenuBook />}>{data.entries.length ? 'Nada coincide con los filtros.' : 'Sin movimientos en estas fechas.'}</Empty></Card> : days.map(([d, list]) => (
            <Card key={d} title={formatDate(d)} subtitle={`${list.length} movimiento${list.length === 1 ? '' : 's'}`} flush>
              <ol className="lb-timeline">{list.map((e) => {
                const [, Icon, color] = KINDS[e.kind]
                return (
                  <li key={e.id} className={e.flags.length ? 'flag' : ''}>
                    <span className="lb-time">{time(e.at)}</span>
                    <span className="lb-icon" style={{ background: color }}><Icon /></span>
                    <div className="lb-body">
                      <div className="lb-line"><strong>{e.label}</strong>{e.ref && <small className="muted">{e.ref}</small>}{e.amount != null && e.amount !== 0 && <span className={`money lb-amount${NEGATIVE.includes(e.label) ? ' text-bad' : ''}`}>{formatMoney(e.amount)}</span>}</div>
                      {e.text && <small className="lb-text">{e.text}</small>}
                      <small className="muted">{e.lender}{e.byAdmin ? ` · hecho por ${e.by} (administrador)` : ''}</small>
                      {(e.flags.length > 0 || e.map) && (
                        <div className="chip-list">
                          {e.flags.map((f) => <Badge key={f} tone={/anulad|Faltante/.test(f) ? 'bad' : 'warn'}><MdWarning /> {f}</Badge>)}
                          {e.map && <a className="link-btn no-print" href={`https://maps.google.com/?q=${e.map.lat},${e.map.lng}`} target="_blank" rel="noreferrer"><MdPlace /> Ver ubicación</a>}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}</ol>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

export default LogbookPage
