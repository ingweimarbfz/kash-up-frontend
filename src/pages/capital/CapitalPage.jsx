import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdRemove, MdAccountBalance, MdSavings, MdShield, MdEdit, MdHistory, MdPerson, MdTrendingUp } from 'react-icons/md'
import { CashTransfers } from './CashTransfers'
import api, { errorMessage } from '../../api/client'
import { Avatar, Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { MoneyInput } from '../../components/forms'
import { formatDateTime, formatMoney } from '../../utils/format'

const MOVE_TONES = { aporte: 'ok', retiro: 'bad', asignacion: 'dark', devolucion_asignacion: 'warn', desembolso: 'dark', reverso_desembolso: 'brand', recaudo: 'ok', ajuste: 'warn', gasto: 'bad', reverso_gasto: 'brand', traslado: 'warn' }

export const MovementsTable = ({ rows, showAccount = true }) => (
  !rows ? <div className="splash" style={{ minHeight: 140 }}><Spinner /></div>
    : !rows.length ? <Empty icon={<MdHistory />}>Sin movimientos todavía.</Empty> : (
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Fecha</th><th>Movimiento</th>{showAccount && <th className="hide-sm">Caja</th>}<th className="num">Valor</th><th className="num hide-sm">Saldo</th><th className="hide-md">Detalle</th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.id}>
            <td><small>{formatDateTime(m.createdAt)}</small></td>
            <td><Badge tone={MOVE_TONES[m.type]}>{m.typeLabel}</Badge>{m.ref && <small className="block">{m.ref}</small>}</td>
            {showAccount && <td className="hide-sm">{m.account}{m.counterpart && <small className="block">{m.amount < 0 ? 'hacia' : 'desde'} {m.counterpart}</small>}</td>}
            <td className={`num money ${m.amount > 0 ? 'text-ok' : 'text-bad'}`}><strong>{m.amount > 0 ? '+' : '−'} {formatMoney(Math.abs(m.amount))}</strong></td>
            <td className="num money hide-sm">{formatMoney(m.balanceAfter)}</td>
            <td className="hide-md"><small>{m.creditNumber ? `Crédito #${m.creditNumber}` : m.note || '—'}{m.user ? ` · ${m.user}` : ''}</small></td>
          </tr>
        ))}</tbody>
      </table></div>
    )
)

const MoneyModal = ({ title, label, info, submitLabel, children, onClose, onSubmit }) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!(Number(amount) > 0)) return setError('Ingresa un valor mayor que cero.')
    setSaving(true)
    try { await onSubmit({ amount: Number(amount), note }) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={title} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="money-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} {submitLabel}</button></>}>
      <form id="money-form" className="form-grid" onSubmit={submit} noValidate>
        {info && <div className="alert info span-2">{info}</div>}
        {children}
        <div className="span-2"><Field label={label} htmlFor="mm" required><MoneyInput id="mm" value={amount} onChange={setAmount} autoFocus /></Field></div>
        <div className="span-2"><Field label="Nota" htmlFor="mnote"><input id="mnote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo, soporte o comentario" /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const CapitalPage = () => {
  const [data, setData] = useState(null)
  const [moves, setMoves] = useState(null)
  const [account, setAccount] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/capital').then(({ data: d }) => setData(d)).catch((e) => toast(errorMessage(e), 'bad'))
  }, [toast])
  const loadMoves = useCallback(() => {
    setMoves(null)
    api.get('/capital/movimientos', { params: { cuenta: account || undefined } }).then(({ data: d }) => setMoves(d)).catch(() => setMoves([]))
  }, [account])
  useEffect(() => { load() }, [load])
  useEffect(() => { loadMoves() }, [loadMoves])
  const done = (msg) => { setModal(null); toast(msg); load(); loadMoves() }

  if (!data) return <div className="splash"><Spinner /></div>
  const b = data.business
  const lender = modal?.lender
  return (
    <div className="stack">
      <PageHead title={b.site ? `Capital de ${b.site.name}` : 'Capital y cajas'} subtitle={b.site ? 'Esta sede maneja su capital aparte: los aportes, retiros y asignaciones de sus ruteros salen de aquí.' : 'Dinero del negocio y lo que cada prestamista tiene para prestar. Sin saldo no se puede prestar ni asignar.'}>
        <button type="button" className="btn" onClick={() => setModal({ kind: 'retiro' })}><MdRemove /> Retiro</button>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'aporte' })}><MdAdd /> Aporte de capital</button>
      </PageHead>

      <div className="grid grid-kpi">
        <Kpi label="Capital aportado" value={formatMoney(b.capital)} icon={MdAccountBalance} note="Aportes menos retiros" />
        <Kpi label={b.site ? `Saldo de ${b.site.name}` : 'Saldo del negocio'} value={formatMoney(b.balance)} tone="dark" note="Sin asignar a prestamistas" />
        <Kpi label={`Reserva mínima (${b.reservePct} %)`} value={formatMoney(b.reserve)} icon={MdShield} note="No se puede usar" />
        <Kpi label="Disponible para asignar" value={formatMoney(b.available)} tone="brand" icon={MdSavings} />
        <Kpi label="En cajas de prestamistas" value={formatMoney(data.totals.lendersBalance)} note={`Cartera en la calle ${formatMoney(data.totals.portfolio)}`} icon={MdTrendingUp} />
      </div>

      {data.siteAccounts?.length > 0 && (
        <div className="alert info"><MdAccountBalance /> <span>Sedes con capital aparte: {data.siteAccounts.map((a) => `${a.siteName} (${formatMoney(a.balance)})`).join(', ')}. Sus ruteros reciben y devuelven dinero de ese capital; elige la sede arriba para hacerle aportes o retiros.</span></div>
      )}
      <div className="reserve-bar" aria-label="Uso del saldo del negocio">
        <div className="reserve-track">
          <span className="used" style={{ width: `${b.balance ? Math.min(100, (b.available / b.balance) * 100) : 0}%` }} />
          <span className="kept" style={{ width: `${b.balance ? Math.min(100, (Math.min(b.reserve, b.balance) / b.balance) * 100) : 0}%` }} />
        </div>
        <div className="reserve-legend">
          <span><i className="dot brand" /> Disponible {formatMoney(b.available)}</span>
          <span><i className="dot dark" /> Reserva {formatMoney(Math.min(b.reserve, b.balance))}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'reserva' })}><MdEdit /> Cambiar reserva</button>
        </div>
      </div>

      <CashTransfers onChanged={() => { load(); loadMoves() }} toast={toast} />

      <Card flush title="Prestamistas" subtitle="Asigna o quita dinero según el comportamiento de cada ruta" icon={<MdPerson />}>
        {!data.lenders.length ? <Empty icon={<MdPerson />}>No hay prestamistas. Créalos en Usuarios.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Prestamista</th><th className="num">Caja disponible</th><th className="num hide-sm">Asignado</th><th className="num hide-md">Prestado</th><th className="num hide-sm">Cartera</th><th className="num hide-md">En mora</th><th /></tr></thead>
            <tbody>{data.lenders.map((l) => (
              <tr key={l.id} style={l.active ? undefined : { opacity: 0.55 }}>
                <td><div className="person"><Avatar user={{ fullName: l.fullName, avatarUrl: l.avatarUrl }} /><div><strong>{l.fullName}</strong><small>{l.activeCredits} crédito{l.activeCredits === 1 ? '' : 's'} activo{l.activeCredits === 1 ? '' : 's'}{!l.active && ' · inactivo'}</small></div></div></td>
                <td className="num money"><strong className={l.balance ? '' : 'text-bad'}>{formatMoney(l.balance)}</strong></td>
                <td className="num money hide-sm">{formatMoney(l.assigned)}</td>
                <td className="num money hide-md">{formatMoney(l.lent)}</td>
                <td className="num money hide-sm">{formatMoney(l.portfolio)}</td>
                <td className="num money hide-md">{l.overdue ? <span className="text-bad">{formatMoney(l.overdue)}</span> : '—'}</td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'quitar', lender: l })} disabled={!l.balance}><MdRemove /> Quitar</button>{' '}
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ kind: 'asignar', lender: l })} disabled={!l.active}><MdAdd /> Asignar</button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <Card flush title="Movimientos" icon={<MdHistory />} actions={
        <select value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Caja">
          <option value="">Todas las cajas</option><option value="negocio">Negocio</option>
          {data.lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}
        </select>}>
        <MovementsTable rows={moves} />
      </Card>

      {modal?.kind === 'aporte' && <MoneyModal title="Aporte de capital" label="Valor del aporte" submitLabel="Registrar aporte" onClose={() => setModal(null)}
        onSubmit={async (f) => { await api.post('/capital/aportes', { ...f, type: 'aporte' }); done(`Aporte de ${formatMoney(f.amount)} registrado`) }} />}
      {modal?.kind === 'retiro' && <MoneyModal title="Retiro de capital" label="Valor del retiro" submitLabel="Registrar retiro" info={`Puedes retirar hasta lo disponible; la cuenta conserva la reserva del ${b.reservePct} %.`} onClose={() => setModal(null)}
        onSubmit={async (f) => { await api.post('/capital/aportes', { ...f, type: 'retiro' }); done(`Retiro de ${formatMoney(f.amount)} registrado`) }} />}
      {modal?.kind === 'asignar' && <MoneyModal title={`Asignar a ${lender.fullName}`} label="Valor a asignar" submitLabel="Asignar" info={`Disponible en el negocio: ${formatMoney(b.available)}. Caja actual de ${lender.fullName}: ${formatMoney(lender.balance)}.`} onClose={() => setModal(null)}
        onSubmit={async (f) => { const { data: r } = await api.post('/capital/asignaciones', { ...f, action: 'asignar', lenderId: lender.id }); done(`${r.ref}: ${formatMoney(f.amount)} asignados a ${lender.fullName}`) }} />}
      {modal?.kind === 'quitar' && <MoneyModal title={`Quitar a ${lender.fullName}`} label="Valor a devolver al negocio" submitLabel="Quitar" info={`Caja disponible de ${lender.fullName}: ${formatMoney(lender.balance)}. El dinero vuelve a la cuenta del negocio.`} onClose={() => setModal(null)}
        onSubmit={async (f) => { const { data: r } = await api.post('/capital/asignaciones', { ...f, action: 'quitar', lenderId: lender.id }); done(`${r.ref}: ${formatMoney(f.amount)} devueltos al negocio`) }} />}
      {modal?.kind === 'reserva' && <ReserveModal current={b.reservePct} onClose={() => setModal(null)} onSaved={() => done('Reserva actualizada')} />}
      {toastNode}
    </div>
  )
}

const ReserveModal = ({ current, onClose, onSaved }) => {
  const [pct, setPct] = useState(current)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.put('/capital/reserva', { pct: Number(pct) }); onSaved() } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Reserva mínima del negocio" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="res-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="res-form" className="form-grid" onSubmit={submit}>
        <p className="span-2" style={{ margin: 0 }}>Porcentaje del capital aportado que la cuenta del negocio debe conservar siempre. Con ese margen la cuenta nunca queda en cero.</p>
        <Field label="Porcentaje" htmlFor="rp"><div className="input-prefix suffix"><input id="rp" type="number" min="0" max="100" step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} /><span>%</span></div></Field>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

export default CapitalPage
