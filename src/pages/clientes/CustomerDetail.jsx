import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdEdit, MdAdd, MdPhone, MdPlace, MdWork, MdKey, MdArrowBack, MdRequestQuote, MdWhatsapp, MdSwapHoriz, MdReceiptLong, MdWarningAmber } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { CREDIT_STATUS, CUSTOMER_STATUS, FREQ_LABEL, KIND_LABEL } from '../../utils/credit'
import TransferModal from './TransferModal'
import { PhotoInput } from '../../components/forms'
import CustomerForm from './CustomerForm'

const SCORE_COLORS = { ok: '#10B981', brand: '#059669', warn: '#F59E0B', bad: '#EF4444', '': '#A1A1AA' }

const ScoreCard = ({ score }) => (
  <Card title="Scoring crediticio" subtitle="Según el historial de pagos de sus cuotas">
    <div className="score">
      <div className="score-ring" style={{ '--score': score.score ?? 0, '--score-color': SCORE_COLORS[score.tone] }}><span>{score.score ?? '—'}</span></div>
      <div>
        <Badge tone={score.tone}>{score.level}</Badge>
        <p className="disabled-text" style={{ margin: '6px 0 0', fontSize: 13 }}>
          {score.detail.evaluated
            ? `${score.detail.onTime} a tiempo · ${score.detail.late} tarde · ${score.detail.overdue} vencidas${score.detail.maxLateDays ? ` · máx. ${score.detail.maxLateDays} días de atraso` : ''}`
            : 'Sin cuotas vencidas para evaluar todavía.'}
        </p>
      </div>
    </div>
  </Card>
)

const AccessModal = ({ customer, onClose, onSaved }) => {
  const [form, setForm] = useState({ username: customer.user?.username || customer.identification, active: customer.user?.active ?? true })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post(`/clientes/${customer.id}/usuario`, form); onSaved() } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal title={customer.user ? 'Acceso del cliente' : 'Dar acceso al cliente'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="access-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="access-form" className="form-grid" onSubmit={submit}>
        <p className="span-2 disabled-text" style={{ margin: 0 }}>Con este usuario el cliente entra a QuontUp360 y consulta sus créditos, cuotas y pagos.</p>
        <Field label="Usuario" htmlFor="au" required><input id="au" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoCapitalize="none" /></Field>
        <Field label="Contraseña" htmlFor="ap" hint="Siempre es el número de documento del cliente"><input id="ap" value={customer.identification} readOnly disabled /></Field>
        {customer.user && <label className="check span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Acceso activo</label>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const CustomerDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [access, setAccess] = useState(false)
  const [transfer, setTransfer] = useState(false)
  const [billBusy, setBillBusy] = useState(false)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => { api.get(`/clientes/${id}`).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [id])
  useEffect(() => { load() }, [load])

  if (error) return <div className="alert bad">{error}</div>
  if (!c) return <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>
  const active = c.credits.filter((k) => k.status === 'activo')
  const balance = active.reduce((s, k) => s + k.balance, 0)
  const overdue = active.reduce((s, k) => s + k.overdue, 0)
  const wa = c.phone ? `https://wa.me/57${c.phone}` : null

  return (
    <div className="stack">
      <PageHead title="Cliente">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/clientes')}><MdArrowBack /> Clientes</button>
        {admin && <button type="button" className="btn" onClick={() => setAccess(true)}><MdKey /> {c.user ? 'Acceso' : 'Dar acceso'}</button>}
        <button type="button" className="btn" onClick={() => setEditing(true)}><MdEdit /> Editar</button>
        <button type="button" className="btn" onClick={() => setTransfer(true)}><MdSwapHoriz /> Trasladar de ruta</button>
        {c.status === 'activo' && <button type="button" className="btn btn-primary" onClick={() => navigate(`/creditos/nuevo?cliente=${c.id}`)}><MdAdd /> Nuevo crédito</button>}
      </PageHead>

      <Card>
        <div className="hero-customer">
          <a href={c.photoUrl} target="_blank" rel="noreferrer"><img className="thumb lg" src={c.photoUrl} alt={c.fullName} /></a>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2>{c.fullName}</h2>
            <div className="meta-line">
              <span>{c.docType} {c.identification}</span>
              <Badge tone={CUSTOMER_STATUS[c.status][1]}>{CUSTOMER_STATUS[c.status][0]}</Badge>
              {overdue > 0 && <Badge tone="bad">En mora</Badge>}
              {c.user && <Badge tone="dark">Con acceso: {c.user.username}</Badge>}
            </div>
            <div className="meta-line">
              <span><MdPhone /> <a href={`tel:${c.phone}`}>{c.phone}</a>{c.phone2 ? ` · ${c.phone2}` : ''}</span>
              {wa && <a className="small-link" href={wa} target="_blank" rel="noreferrer"><MdWhatsapp /> WhatsApp</a>}
            </div>
            <div className="meta-line">
              <span><MdPlace /> {c.address}{c.neighborhood ? `, ${c.neighborhood}` : ''}{c.city ? ` · ${c.city}` : ''}</span>
              {c.lat && <a className="small-link" href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer">Ver en el mapa</a>}
            </div>
            {c.occupation && <div className="meta-line"><span><MdWork /> {c.occupation}{c.businessAddress ? ` · ${c.businessAddress}` : ''}</span></div>}
          </div>
          <dl className="stat-list" style={{ minWidth: 220 }}>
            <div><dt>Saldo por cobrar</dt><dd className="money">{formatMoney(balance)}</dd></div>
            <div><dt>Vencido</dt><dd className={`money${overdue ? ' text-bad' : ''}`}>{formatMoney(overdue)}</dd></div>
            <div><dt>Prestamista</dt><dd>{c.lender?.fullName || 'Sin asignar'}</dd></div>
            <div><dt>Cupo</dt><dd>{c.creditLimit === null ? 'Sin límite' : formatMoney(c.creditLimit)}</dd></div>
          </dl>
        </div>
      </Card>

      <div className="grid grid-2-1">
        <Card title="Créditos" subtitle={`${active.length} activo(s) de ${c.credits.length}`} flush>
          {!c.credits.length ? <Empty icon={<MdRequestQuote />}>Aún no tiene créditos.</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>N.º</th><th>Tipo</th><th className="hide-sm">Plan</th><th className="num">Capital</th><th className="num">Saldo</th><th>Estado</th></tr></thead>
                <tbody>
                  {c.credits.map((k) => (
                    <tr key={k.id} className={`clickable${k.overdue > 0 && k.status === 'activo' ? ' row-overdue' : ''}`} onClick={() => navigate(`/creditos/${k.id}`)}>
                      <td><strong>#{k.number}</strong><br /><small>{formatDate(k.disbursementDate)}</small></td>
                      <td>{KIND_LABEL[k.kind]}</td>
                      <td className="hide-sm"><small>{k.installmentsCount} cuotas · {FREQ_LABEL[k.frequency]}<br />{k.paidCount} pagadas</small></td>
                      <td className="num money">{formatMoney(k.principal)}</td>
                      <td className="num money">{formatMoney(k.balance)}{k.overdue > 0 && k.status === 'activo' && <><br /><small className="text-bad">{k.overdueCount} vencida(s)</small></>}</td>
                      <td><Badge tone={CREDIT_STATUS[k.status][1]}>{CREDIT_STATUS[k.status][0]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="stack">
          <ScoreCard score={c.score} />
          {!c.utilityBillUrl && (
            <Card title="Recibo de servicios" icon={<MdReceiptLong />}>
              <div className="stack">
                <div className="alert warn"><MdWarningAmber /> Falta la foto del recibo de servicios. Sin ella no se le puede prestar.</div>
                <PhotoInput doc value={null} label={billBusy ? 'Subiendo…' : 'Tomar foto del recibo'} placeholder={<MdReceiptLong size={34} />} onChange={async (v) => {
                  if (!v) return
                  setBillBusy(true)
                  try { await api.put(`/clientes/${c.id}/recibo`, { utilityBillUrl: v }); toast('Recibo guardado'); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBillBusy(false) }
                }} />
              </div>
            </Card>
          )}
          {(c.idPhotoUrl || c.idPhotoBackUrl || c.utilityBillUrl || c.notes) && (
            <Card title="Documento, recibo y notas">
              {(c.idPhotoUrl || c.idPhotoBackUrl || c.utilityBillUrl) && (
                <div className="doc-photos">
                  {[['Documento delantera', c.idPhotoUrl], ['Documento trasera', c.idPhotoBackUrl], [`Recibo de servicios${c.utilityBillAt ? ` · ${formatDate(c.utilityBillAt)}` : ''}`, c.utilityBillUrl]].filter(([, u]) => u).map(([label, u]) => (
                    <a key={label} href={u} target="_blank" rel="noreferrer"><img src={u} alt={label} /><span>{label}</span></a>
                  ))}
                </div>
              )}
              {c.notes && <p style={{ margin: 0 }}>{c.notes}</p>}
            </Card>
          )}
          {c.transfers?.length > 0 && (
            <Card title="Traslados de ruta" icon={<MdSwapHoriz />}>
              <div className="stack" style={{ gap: 10 }}>
                {c.transfers.map((t) => (
                  <div key={t.id} className="transfer-item">
                    <strong>{t.from || 'Sin asignar'} → {t.to || 'Sin asignar'}</strong>
                    <small>{formatDate(t.createdAt)} · {t.user}{t.creditsMoved ? ` · ${t.creditsMoved} crédito(s) por ${formatMoney(t.balanceMoved)}` : ''}</small>
                    {t.newAddress !== t.oldAddress && <small>Se mudó: {t.oldAddress} → {t.newAddress}</small>}
                    {t.note && <small>{t.note}</small>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {editing && <CustomerForm initial={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); toast('Cliente actualizado'); load() }} />}
      {transfer && <TransferModal customer={c} onClose={() => setTransfer(false)} onDone={(d, to) => { setTransfer(false); if (user.role === 'prestamista') navigate('/clientes', { replace: true }); else { toast(`Cliente trasladado a la ruta de ${to?.fullName || d.lender?.fullName}`); load() } }} />}
      {access && <AccessModal customer={c} onClose={() => setAccess(false)} onSaved={() => { setAccess(false); toast('Acceso guardado'); load() }} />}
      {toastNode}
      <p className="disabled-text" style={{ fontSize: 12 }}><Link to="/clientes">← Volver a clientes</Link></p>
    </div>
  )
}

export default CustomerDetail
