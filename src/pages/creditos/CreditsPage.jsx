import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdRequestQuote, MdChevronRight } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Kpi, PageHead, Spinner, useToast } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { CREDIT_STATUS, KIND_LABEL } from '../../utils/credit'

const CreditsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [lenders, setLenders] = useState([])
  const [filters, setFilters] = useState({ q: '', estado: 'activo', tipo: '', prestamista: '', mora: false })
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/creditos', { params: { estado: filters.estado || undefined, tipo: filters.tipo || undefined, prestamista: filters.prestamista || undefined } })
      .then(({ data }) => setRows(data)).catch((e) => { setRows([]); toast(errorMessage(e), 'bad') })
  }, [filters.estado, filters.tipo, filters.prestamista, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data }) => setLenders(data)).catch(() => {}) }, [admin])
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const shown = useMemo(() => (rows || []).filter((c) => (!filters.mora || c.overdue > 0) &&
    (!filters.q || `${c.number} ${c.customer?.fullName} ${c.customer?.identification}`.toLowerCase().includes(filters.q.toLowerCase()))), [rows, filters.q, filters.mora])
  const totals = useMemo(() => ({
    principal: shown.reduce((s, c) => s + c.principal, 0),
    balance: shown.reduce((s, c) => s + c.balance, 0),
    overdue: shown.reduce((s, c) => s + c.overdue, 0)
  }), [shown])

  return (
    <div className="stack">
      <PageHead title="Créditos" subtitle="Préstamos en efectivo y créditos de producto con su plan de cuotas.">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/creditos/nuevo')}><MdAdd /> Nuevo crédito</button>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Créditos" value={shown.length} />
        <Kpi label="Capital prestado" value={formatMoney(totals.principal)} />
        <Kpi label="Saldo por cobrar" value={formatMoney(totals.balance)} tone="dark" />
        <Kpi label="Vencido" value={formatMoney(totals.overdue)} tone="bad" />
      </div>
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={filters.q} onChange={set('q')} placeholder="Buscar por número, cliente o documento" /></div>
          <select value={filters.estado} onChange={set('estado')} aria-label="Estado"><option value="">Todos los estados</option>{Object.entries(CREDIT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={filters.tipo} onChange={set('tipo')} aria-label="Tipo"><option value="">Efectivo y producto</option><option value="efectivo">Efectivo</option><option value="producto">Producto</option></select>
          {admin && <select value={filters.prestamista} onChange={set('prestamista')} aria-label="Prestamista"><option value="">Todos los prestamistas</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>}
          <label className="check"><input type="checkbox" checked={filters.mora} onChange={set('mora')} /> Solo en mora</label>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !shown.length ? <Empty icon={<MdRequestQuote />}>No hay créditos con esos filtros.</Empty>
            : (
              <>
                <div className="table-wrap">
                  <table className="table responsive">
                    <thead><tr><th>N.º</th><th>Cliente</th><th className="hide-md">Plan</th><th className="num">Capital</th><th className="num">Saldo</th><th className="hide-sm">Próxima cuota</th><th>Estado</th><th /></tr></thead>
                    <tbody>
                      {shown.map((c) => (
                        <tr key={c.id} className={`clickable${c.overdue > 0 && c.status === 'activo' ? ' row-overdue' : ''}`} onClick={() => navigate(`/creditos/${c.id}`)}>
                          <td><strong>#{c.number}</strong><br /><small>{KIND_LABEL[c.kind]}</small></td>
                          <td><div className="person"><img className="thumb" src={c.customer?.photoThumb} alt="" /><div><strong>{c.customer?.fullName}</strong><small>{admin && c.lender ? `Cobra: ${c.lender.fullName}` : c.customer?.phone}</small></div></div></td>
                          <td className="hide-md"><small>{formatMoney(c.installmentAmount)} × {c.installmentsCount} · {c.frequencyLabel}<br />{c.paidCount} de {c.installmentsCount} pagadas</small></td>
                          <td className="num money">{formatMoney(c.principal)}</td>
                          <td className="num money"><strong>{formatMoney(c.balance)}</strong>{c.overdue > 0 && <><br /><small className="text-bad">{formatMoney(c.overdue)} vencido</small></>}</td>
                          <td className="hide-sm">{c.nextDueDate ? formatDate(c.nextDueDate) : '—'}</td>
                          <td>{c.overdue > 0 && c.status === 'activo' ? <Badge tone="bad">En mora</Badge> : <Badge tone={CREDIT_STATUS[c.status][1]}>{CREDIT_STATUS[c.status][0]}</Badge>}</td>
                          <td className="right"><MdChevronRight /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="list-cards">
                  {shown.map((c) => (
                    <div key={c.id} className="list-card clickable" onClick={() => navigate(`/creditos/${c.id}`)}>
                      <img className="thumb" src={c.customer?.photoThumb} alt="" />
                      <div className="grow"><strong>#{c.number} · {c.customer?.fullName}</strong><small>{formatMoney(c.installmentAmount)} × {c.installmentsCount} · {c.frequencyLabel}</small></div>
                      <div className="right"><div className="money"><strong>{formatMoney(c.balance)}</strong></div>{c.overdue > 0 && <Badge tone="bad">Mora</Badge>}</div>
                    </div>
                  ))}
                </div>
              </>
              )}
      </Card>
      {toastNode}
    </div>
  )
}

export default CreditsPage
