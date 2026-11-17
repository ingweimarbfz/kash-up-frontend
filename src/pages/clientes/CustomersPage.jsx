import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdAdd, MdSearch, MdPeople, MdChevronRight } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Kpi, PageHead, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { CUSTOMER_STATUS } from '../../utils/credit'
import CustomerForm from './CustomerForm'

const CustomersPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [lenders, setLenders] = useState([])
  const [query, setQuery] = useState('')
  const [lender, setLender] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [qs, setQs] = useSearchParams()
  // Acceso rápido desde el buscador (?nuevo=1).
  useEffect(() => { if (qs.get('nuevo') === '1') { setCreating(true); setQs({}, { replace: true }) } }, [qs, setQs])
  const [toast, toastNode] = useToast()

  const load = useCallback(() => {
    api.get('/clientes', { params: { prestamista: lender || undefined } }).then(({ data }) => setRows(data)).catch((e) => { setRows([]); toast(errorMessage(e), 'bad') })
  }, [lender, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/prestamistas').then(({ data }) => setLenders(data)).catch(() => {}) }, [admin])

  const shown = useMemo(() => (rows || []).filter((c) => (!status || (status === 'mora' ? c.overdue > 0 : c.status === status)) &&
    (!query || `${c.fullName} ${c.identification} ${c.phone || ''} ${c.neighborhood || ''}`.toLowerCase().includes(query.toLowerCase()))), [rows, query, status])
  const totals = useMemo(() => ({
    count: (rows || []).length,
    withCredit: (rows || []).filter((c) => c.activeCredits > 0).length,
    balance: (rows || []).reduce((s, c) => s + c.balance, 0),
    overdue: (rows || []).filter((c) => c.overdue > 0).length
  }), [rows])

  return (
    <div className="stack">
      <PageHead title={admin ? 'Clientes' : 'Mis clientes'} subtitle="Personas registradas con foto, datos de contacto y su cartera.">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Nuevo cliente</button>
      </PageHead>
      <div className="grid grid-kpi">
        <Kpi label="Clientes" value={totals.count} />
        <Kpi label="Con crédito activo" value={totals.withCredit} />
        <Kpi label="Saldo por cobrar" value={formatMoney(totals.balance)} tone="dark" />
        <Kpi label="En mora" value={totals.overdue} tone="bad" />
      </div>
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, documento, celular o barrio" /></div>
          {admin && (
            <select value={lender} onChange={(e) => setLender(e.target.value)} aria-label="Prestamista">
              <option value="">Todos los prestamistas</option>
              {lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}
            </select>
          )}
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
            <option value="">Todos</option>
            <option value="mora">En mora</option>
            {Object.entries(CUSTOMER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !shown.length ? <Empty icon={<MdPeople />}>{rows.length ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes. Registra el primero.'}</Empty>
            : (
              <>
                <div className="table-wrap">
                  <table className="table responsive">
                    <thead><tr><th>Cliente</th><th>Celular</th><th className="hide-md">Barrio</th>{admin && <th className="hide-md">Prestamista</th>}<th className="num">Saldo</th><th>Estado</th><th /></tr></thead>
                    <tbody>
                      {shown.map((c) => (
                        <tr key={c.id} className="clickable" onClick={() => navigate(`/clientes/${c.id}`)}>
                          <td><div className="person"><img className="thumb" src={c.photoThumb} alt="" /><div><strong>{c.fullName}</strong><small>{c.docType} {c.identification}</small></div></div></td>
                          <td>{c.phone}</td>
                          <td className="hide-md">{c.neighborhood || '—'}</td>
                          {admin && <td className="hide-md">{c.lender?.fullName || <span className="disabled-text">Sin asignar</span>}</td>}
                          <td className="num money">{formatMoney(c.balance)}{c.activeCredits > 1 && <small> · {c.activeCredits} créditos</small>}</td>
                          <td>{c.overdue > 0 ? <Badge tone="bad">En mora</Badge> : <Badge tone={CUSTOMER_STATUS[c.status][1]}>{CUSTOMER_STATUS[c.status][0]}</Badge>}</td>
                          <td className="right"><MdChevronRight /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="list-cards">
                  {shown.map((c) => (
                    <div key={c.id} className="list-card clickable" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <img className="thumb" src={c.photoThumb} alt="" />
                      <div className="grow"><strong>{c.fullName}</strong><small>{c.phone} · {c.neighborhood || c.address}</small></div>
                      <div className="right"><div className="money">{formatMoney(c.balance)}</div>{c.overdue > 0 && <Badge tone="bad">Mora</Badge>}</div>
                    </div>
                  ))}
                </div>
              </>
              )}
      </Card>
      {creating && <CustomerForm onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); toast('Cliente creado'); navigate(`/clientes/${c.id}`) }} />}
      {toastNode}
    </div>
  )
}

export default CustomersPage
