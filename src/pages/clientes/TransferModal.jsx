import React, { useEffect, useState } from 'react'
import { MdSwapHoriz, MdReceiptLong } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Field, Modal, Spinner } from '../../components/ui'
import { LocationButton, PhotoInput } from '../../components/forms'
import { formatMoney } from '../../utils/format'

// Traslado de ruta: el cliente se muda (o se reasigna) y sus créditos activos pasan al prestamista de la nueva ruta.
const TransferModal = ({ customer, onClose, onDone }) => {
  const { user } = useAuth()
  const [lenders, setLenders] = useState([])
  const [moving, setMoving] = useState(true)
  const [form, setForm] = useState({ lenderId: '', address: '', neighborhood: '', city: customer.city || '', lat: null, lng: null, utilityBillUrl: null, note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/prestamistas').then(({ data }) => setLenders(data.filter((l) => l.id !== customer.lenderId))).catch(() => {}) }, [customer.lenderId])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const active = (customer.credits || []).filter((k) => k.status === 'activo')
  const balance = active.reduce((s, k) => s + k.balance, 0)
  const target = lenders.find((l) => String(l.id) === String(form.lenderId))

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.lenderId) return setError('Elige el prestamista de la nueva ruta.')
    if (moving && !form.address.trim()) return setError('Escribe la nueva dirección.')
    if (moving && !form.utilityBillUrl) return setError('Toma la foto del recibo de servicios de la nueva dirección.')
    setSaving(true)
    try {
      const body = moving ? form : { lenderId: form.lenderId, note: form.note }
      const { data } = await api.post(`/clientes/${customer.id}/traslado`, body)
      onDone(data, target)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal size="lg" title={`Trasladar de ruta · ${customer.fullName}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="tr-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdSwapHoriz />} Trasladar</button></>}>
      <form id="tr-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2 alert info"><span>Hoy lo cobra <strong>{customer.lender?.fullName || 'nadie'}</strong>. Al trasladarlo, {active.length ? <>sus {active.length} crédito(s) activo(s) por <strong>{formatMoney(balance)}</strong> pasan</> : 'pasa'} al prestamista de la nueva ruta, que desde ese momento hace el cobro.</span></div>
        <div className="span-2"><Field label="Prestamista de la nueva ruta" htmlFor="trl" required>
          <select id="trl" value={form.lenderId} onChange={set('lenderId')}><option value="">Elige…</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>
        </Field></div>
        <label className="check span-2"><input type="checkbox" checked={moving} onChange={(e) => setMoving(e.target.checked)} /> El cliente se mudó de casa</label>
        {moving && (
          <>
            <div className="span-2 hint">Dirección anterior: {customer.address}{customer.neighborhood ? `, ${customer.neighborhood}` : ''}</div>
            <Field label="Nueva dirección" htmlFor="tra" required><input id="tra" value={form.address} onChange={set('address')} placeholder="Calle 45 # 12-30" /></Field>
            <Field label="Barrio" htmlFor="trn"><input id="trn" value={form.neighborhood} onChange={set('neighborhood')} /></Field>
            <Field label="Ciudad" htmlFor="trc"><input id="trc" data-only="letters" value={form.city} onChange={set('city')} /></Field>
            <Field label="Ubicación en el mapa"><LocationButton lat={form.lat} lng={form.lng} onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))} /></Field>
            <div className="span-2"><Field label="Recibo de servicios de la nueva casa" required hint="Agua, luz o gas: comprueba la nueva dirección.">
              <PhotoInput doc value={form.utilityBillUrl} label="Recibo" placeholder={<MdReceiptLong size={34} />} onChange={set('utilityBillUrl')} />
            </Field></div>
          </>
        )}
        <div className="span-2"><Field label="Motivo o nota" htmlFor="trno"><input id="trno" value={form.note} onChange={set('note')} placeholder="Ej.: se mudó al barrio Kennedy" /></Field></div>
        {user.role === 'prestamista' && <div className="span-2 alert warn">Después del traslado dejarás de ver a este cliente y sus créditos.</div>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

export default TransferModal
