import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdCheck, MdClose, MdPlaylistAddCheck } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'

const STATUS = { pendiente: ['Pendiente', 'warn'], aprobada: ['Aprobada', 'ok'], rechazada: ['Rechazada', 'bad'], cancelada: ['Cancelada', 'muted'] }
const FILTERS = [['pendiente', 'Pendientes'], ['', 'Todas']]

// Solicitudes de crédito adicional: el prestamista pide otro crédito para un cliente que ya tiene uno activo
// y el administrador lo aprueba (se crea y se entrega) o lo rechaza.
// Solicitudes para cambiar la fecha de cobro de un crédito (se aprueban o rechazan desde el crédito).
const ChangeRequestsCard = ({ admin }) => {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  useEffect(() => { api.get('/solicitudes-cambio-credito', { params: { estado: admin ? 'pendiente' : undefined } }).then(({ data }) => setRows(admin ? data : data.slice(0, 10))).catch(() => setRows([])) }, [admin])
  if (!rows?.length) return null
  return (
    <Card title={admin ? `Cambios de fecha por aprobar (${rows.length})` : 'Mis solicitudes de cambio de fecha'} subtitle={admin ? 'Abre el crédito para aprobar o rechazar.' : null} flush>
      <div className="stops">
        {rows.map((r) => {
          const first = r.changes[0]
          return (
            <div key={r.id} className="stop clickable" onClick={() => navigate(`/creditos/${r.creditId}`)}>
              <div className="grow">
                <strong>Crédito #{r.creditNumber} · {r.customer}</strong>
                <small>{first ? `Cuota ${first.number}: ${formatDate(first.from)} → ${formatDate(first.to)}${r.changes.length > 1 ? ` (+${r.changes.length - 1})` : ''} · ` : ''}“{r.reason}” · {admin ? `${r.requestedBy} · ` : ''}{formatDateTime(r.createdAt)}{r.resolution ? ` · ${r.resolution}` : ''}</small>
              </div>
              <Badge tone={STATUS[r.status][1]}>{r.statusLabel}</Badge>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const RequestsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const { state } = useLocation()
  const [filter, setFilter] = useState('pendiente')
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { setRows(null); api.get('/solicitudes-credito', { params: { estado: filter || undefined } }).then(({ data }) => setRows(data)).catch((e) => { toast(errorMessage(e), 'bad'); setRows([]) }) }, [filter, toast])
  useEffect(() => { load() }, [load])
  const close = () => { setOpen(null); setNote(''); setError(''); setBusy('') }
  const act = async (action) => {
    setError('')
    if (action === 'rechazar' && admin && !note.trim()) return setError('Escribe el motivo del rechazo.')
    setBusy(action)
    try {
      const { data } = await api.post(`/solicitudes-credito/${open.id}/${action}`, { note })
      close()
      if (action === 'aprobar') navigate(`/creditos/${data.creditId}`, { state: { created: true } })
      else { load(); toast(admin ? 'Solicitud rechazada' : 'Solicitud cancelada') }
    } catch (e) { setError(errorMessage(e)); setBusy('') }
  }

  return (
    <div className="stack">
      <PageHead title={admin ? 'Solicitudes de crédito' : 'Mis solicitudes'} subtitle={admin ? 'Créditos adicionales que piden los prestamistas para clientes que ya tienen uno activo.' : 'Créditos adicionales esperando la aprobación del administrador.'} />
      {state?.message && <div className="alert info"><MdPlaylistAddCheck /> <span>{state.message}</span></div>}
      <ChangeRequestsCard admin={admin} />
      <Card flush>
        <div className="toolbar"><div className="seg">{FILTERS.map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdPlaylistAddCheck />}>{filter ? 'No hay solicitudes pendientes.' : 'Aún no hay solicitudes.'}</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Solicitud</th><th>Cliente</th>{admin && <th className="hide-sm">Prestamista</th>}<th className="num">Valor</th><th className="hide-md">Plan</th><th>Estado</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => (r.status === 'aprobada' && r.creditId ? navigate(`/creditos/${r.creditId}`) : setOpen(r))}>
                  <td><strong>{r.number}</strong><br /><small>{formatDate(r.createdAt)}</small></td>
                  <td><div className="person">{r.customer?.photoThumb && <img className="thumb" src={r.customer.photoThumb} alt="" />}<div><strong>{r.customer?.fullName}</strong>{r.current && <small>Debe {formatMoney(r.current.balance)} en {r.current.credits} crédito(s){r.current.overdue ? ` · ${formatMoney(r.current.overdue)} vencido` : ''}</small>}</div></div></td>
                  {admin && <td className="hide-sm">{r.lender?.fullName || 'Negocio'}</td>}
                  <td className="num money"><strong>{formatMoney(r.principal)}</strong><br /><small>{r.kind === 'producto' ? 'Producto' : 'Efectivo'}</small></td>
                  <td className="hide-md"><small>{r.installmentsCount} cuota(s) {r.frequencyLabel?.toLowerCase()} de {formatMoney(r.installmentAmount)}</small></td>
                  <td><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
      </Card>
      {open && (
        <Modal title={`Solicitud ${open.number}`} onClose={close}
          footer={open.status === 'pendiente' ? (admin
            ? <><button type="button" className="btn" disabled={!!busy} onClick={() => act('rechazar')}>{busy === 'rechazar' ? <Spinner /> : <MdClose />} Rechazar</button><button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => act('aprobar')}>{busy === 'aprobar' ? <Spinner /> : <MdCheck />} Aprobar y crear crédito</button></>
            : <button type="button" className="btn" disabled={!!busy} onClick={() => act('rechazar')}>{busy ? <Spinner /> : <MdClose />} Cancelar solicitud</button>) : null}>
          <div className="stack">
            <dl className="stat-list">
              <div><dt>Cliente</dt><dd>{open.customer?.fullName}</dd></div>
              <div><dt>Prestamista</dt><dd>{open.lender?.fullName || 'Negocio'}</dd></div>
              {open.current && <div><dt>Ya debe</dt><dd>{formatMoney(open.current.balance)} en {open.current.credits} crédito(s){open.current.overdue ? <span className="text-bad"> · {formatMoney(open.current.overdue)} vencido</span> : ''}</dd></div>}
              <div><dt>Plan</dt><dd>{open.installmentsCount} cuota(s) {open.frequencyLabel?.toLowerCase()} de {formatMoney(open.installmentAmount)}</dd></div>
              {open.reason && <div><dt>Motivo</dt><dd>{open.reason}</dd></div>}
              {open.reviewNote && <div><dt>Respuesta</dt><dd>{open.reviewNote}{open.reviewer ? ` (${open.reviewer}, ${formatDateTime(open.reviewedAt)})` : ''}</dd></div>}
              <div className="total"><dt>Valor solicitado</dt><dd className="money">{formatMoney(open.principal)}</dd></div>
            </dl>
            {open.status === 'pendiente' && admin && (
              <>
                {open.current?.overdue > 0 && <div className="alert warn">El cliente tiene cuotas vencidas.</div>}
                <small className="hint">Al aprobar, el crédito se crea con fecha de hoy y el dinero sale de la caja del prestamista.</small>
                <Field label="Nota" htmlFor="rqn" hint="Obligatoria si rechazas"><input id="rqn" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              </>
            )}
            {error && <div className="alert bad">{error}</div>}
          </div>
        </Modal>
      )}
      {toastNode}
    </div>
  )
}

export default RequestsPage
