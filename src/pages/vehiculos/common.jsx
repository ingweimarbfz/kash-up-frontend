import React, { useEffect, useState } from 'react'
import { MdCheck, MdLocalGasStation, MdBuild, MdSpeed, MdTwoWheeler, MdDirectionsCar } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Field, Modal, Spinner } from '../../components/ui'
import { MoneyInput, PhotoInput, Tabs } from '../../components/forms'
import { formatMoney } from '../../utils/format'
import { todayBogota } from '../pagos/common'

export const KINDS = [['moto', 'Moto'], ['carro', 'Carro'], ['camioneta', 'Camioneta'], ['otro', 'Otro']]
export const STATUS = { activo: ['Activo', 'ok'], taller: ['En taller', 'warn'], inactivo: ['Inactivo', 'muted'] }
export const MAINT_KINDS = [['cambio_aceite', 'Cambio de aceite'], ['preventivo', 'Preventivo'], ['correctivo', 'Correctivo'], ['llantas', 'Llantas'], ['frenos', 'Frenos'], ['otro', 'Otro']]
export const VehicleIcon = ({ kind, ...p }) => (kind === 'moto' ? <MdTwoWheeler {...p} /> : <MdDirectionsCar {...p} />)
export const km = (v) => `${Number(v || 0).toLocaleString('es-CO')} km`

const EMPTY = {
  code: '', plate: '', kind: 'moto', brand: '', line: '', modelYear: '', color: '', engineCc: '', vin: '', ownerName: '', photoUrl: null, status: 'activo', odometer: '',
  collectorId: '', driverName: '', driverPhone: '', driverLicense: '', driverLicenseExpires: '', soatExpires: '', soatNumber: '', tecnoExpires: '',
  insuranceCompany: '', insurancePolicy: '', insuranceExpires: '', oilChangeKm: '', notes: ''
}

// Crear o editar la hoja de vida del vehículo (administrador).
export const VehicleForm = ({ vehicle, onClose, onSaved }) => {
  const [form, setForm] = useState(() => (vehicle ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, k === 'collectorId' ? (vehicle.collector?.id ?? '') : (vehicle[k] ?? EMPTY[k])])) : EMPTY))
  const [lenders, setLenders] = useState([])
  const [tab, setTab] = useState('datos')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/prestamistas').then(({ data }) => setLenders(data)).catch(() => {}) }, [])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.code.trim() || !form.plate.trim()) { setTab('datos'); return setError('El número interno y la placa son obligatorios.') }
    setSaving(true)
    try {
      const { data } = vehicle ? await api.put(`/vehiculos/${vehicle.id}`, form) : await api.post('/vehiculos', form)
      onSaved(data)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const input = (k, label, props = {}) => <Field label={label} htmlFor={`v-${k}`} required={props.required}><input id={`v-${k}`} value={form[k] ?? ''} onChange={set(k)} {...props} required={undefined} /></Field>
  return (
    <Modal title={vehicle ? `Editar ${vehicle.plate}` : 'Nuevo vehículo'} size="lg" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="veh-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdCheck />} Guardar</button></>}>
      <form id="veh-form" className="stack" onSubmit={submit} noValidate>
        <Tabs value={tab} onChange={setTab} tabs={[['datos', 'Datos'], ['ruta', 'Conductor y cobro'], ['documentos', 'Documentos']]} />
        {tab === 'datos' && (
          <div className="form-grid">
            <div className="span-2"><PhotoInput value={form.photoUrl} onChange={set('photoUrl')} round={false} label="Foto del vehículo" /></div>
            {input('code', 'Número interno (móvil)', { required: true, placeholder: 'Ej.: M-01' })}
            {input('plate', 'Placa', { required: true, placeholder: 'ABC12D', style: { textTransform: 'uppercase' } })}
            <Field label="Tipo" htmlFor="v-kind"><select id="v-kind" value={form.kind} onChange={set('kind')}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Estado" htmlFor="v-status"><select id="v-status" value={form.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            {input('brand', 'Marca', { placeholder: 'Ej.: Yamaha' })}
            {input('line', 'Línea', { placeholder: 'Ej.: NMAX 155' })}
            {input('modelYear', 'Modelo (año)', { inputMode: 'numeric' })}
            {input('color', 'Color')}
            {input('engineCc', 'Cilindraje (cc)', { inputMode: 'numeric' })}
            {input('odometer', 'Kilometraje actual', { inputMode: 'numeric' })}
            {input('vin', 'Número de chasis / VIN')}
            {input('ownerName', 'Propietario (tarjeta de propiedad)')}
            {input('oilChangeKm', 'Cambio de aceite cada (km)', { inputMode: 'numeric', placeholder: 'Ej.: 2000' })}
            <div className="span-2">{input('notes', 'Observaciones')}</div>
          </div>
        )}
        {tab === 'ruta' && (
          <div className="form-grid">
            <div className="span-2"><Field label="Prestamista que cobra con este vehículo" htmlFor="v-col" hint="Verá el vehículo en su menú y podrá registrar tanqueos y kilometraje"><select id="v-col" value={form.collectorId} onChange={set('collectorId')}><option value="">Sin asignar</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select></Field></div>
            {input('driverName', 'Conductor', { placeholder: 'Vacío si el mismo prestamista maneja' })}
            {input('driverPhone', 'Celular del conductor', { inputMode: 'tel' })}
            {input('driverLicense', 'Licencia de conducción')}
            {input('driverLicenseExpires', 'Vence la licencia', { type: 'date' })}
          </div>
        )}
        {tab === 'documentos' && (
          <div className="form-grid">
            {input('soatNumber', 'Número del SOAT')}
            {input('soatExpires', 'Vence el SOAT', { type: 'date' })}
            <div className="span-2">{input('tecnoExpires', 'Vence la revisión técnico-mecánica', { type: 'date' })}</div>
            {input('insuranceCompany', 'Aseguradora (póliza)')}
            {input('insurancePolicy', 'Número de póliza')}
            {input('insuranceExpires', 'Vence la póliza', { type: 'date' })}
          </div>
        )}
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}

const PayChoice = ({ value, onChange, vehicle }) => {
  const { user } = useAuth()
  const opts = user.role === 'administrador'
    ? [['ninguna', 'No registrar gasto'], ['negocio', 'Caja del negocio'], ...(vehicle.collector ? [['prestamista', `Caja de ${vehicle.collector.fullName}`]] : [])]
    : [['prestamista', 'Lo pagué de mi caja'], ['ninguna', 'No salió de mi caja']]
  return <Field label="¿Quién lo pagó?" htmlFor="v-pay" hint="Si sale de una caja, queda registrado también como gasto"><select id="v-pay" value={value} onChange={(e) => onChange(e.target.value)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
}

// Registrar tanqueo, mantenimiento o kilometraje.
export const LogModal = ({ type, vehicle, onClose, onDone }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [form, setForm] = useState({ date: todayBogota(), odometer: '', amount: '', gallons: '', station: '', fullTank: true, kind: 'cambio_aceite', description: '', cost: '', workshop: '', nextDate: '', nextOdometer: '', photoUrl: null, note: '', pay: admin ? 'negocio' : 'prestamista' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const title = { tanqueos: 'Registrar tanqueo', mantenimientos: 'Registrar mantenimiento', kilometraje: 'Actualizar kilometraje' }[type]
  const Icon = { tanqueos: MdLocalGasStation, mantenimientos: MdBuild, kilometraje: MdSpeed }[type]
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (type !== 'mantenimientos' && !(Number(form.odometer) >= 0 && form.odometer !== '')) return setError('Ingresa el kilometraje del tablero.')
    if (type === 'tanqueos' && !(Number(form.amount) > 0)) return setError('Ingresa el valor del tanqueo.')
    if (type === 'mantenimientos' && !form.description.trim()) return setError('Describe qué se le hizo.')
    setSaving(true)
    try { await api.post(`/vehiculos/${vehicle.id}/${type}`, form); onDone() } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const nextOil = form.kind === 'cambio_aceite' && vehicle.oilChangeKm && form.odometer ? Number(form.odometer) + Number(vehicle.oilChangeKm) : null
  return (
    <Modal title={title} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="vlog-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <Icon />} Guardar</button></>}>
      <form id="vlog-form" className="stack" onSubmit={submit} noValidate>
        <small className="hint">{vehicle.plate} · Móvil {vehicle.code} · kilometraje actual {km(vehicle.odometer)}</small>
        {type === 'mantenimientos' && <div className="choice-grid">{MAINT_KINDS.map(([k, l]) => <button key={k} type="button" className={`btn btn-sm${form.kind === k ? ' on' : ''}`} onClick={() => setForm((f) => ({ ...f, kind: k }))}>{l}</button>)}</div>}
        <div className="form-grid">
          {admin && type !== 'kilometraje' && <Field label="Fecha" htmlFor="vl-d"><input id="vl-d" type="date" max={todayBogota()} value={form.date} onChange={set('date')} /></Field>}
          <Field label="Kilometraje del tablero" htmlFor="vl-o" required={type !== 'mantenimientos'}><input id="vl-o" inputMode="numeric" value={form.odometer} onChange={set('odometer')} placeholder={String(vehicle.odometer || 0)} autoFocus /></Field>
          {type === 'tanqueos' && (
            <>
              <Field label="Valor" htmlFor="vl-a" required><MoneyInput id="vl-a" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Galones" htmlFor="vl-g" hint="Para calcular el rendimiento"><input id="vl-g" inputMode="decimal" value={form.gallons} onChange={set('gallons')} /></Field>
              <Field label="Estación" htmlFor="vl-s"><input id="vl-s" value={form.station} onChange={set('station')} /></Field>
              <label className="check span-2"><input type="checkbox" checked={form.fullTank} onChange={set('fullTank')} /> Tanque lleno</label>
            </>
          )}
          {type === 'mantenimientos' && (
            <>
              <Field label="Costo" htmlFor="vl-c"><MoneyInput id="vl-c" value={form.cost} onChange={set('cost')} /></Field>
              <div className="span-2"><Field label="¿Qué se le hizo?" htmlFor="vl-de" required><input id="vl-de" value={form.description} onChange={set('description')} placeholder="Ej.: cambio de aceite y filtro" /></Field></div>
              <Field label="Taller" htmlFor="vl-w"><input id="vl-w" value={form.workshop} onChange={set('workshop')} /></Field>
              <Field label="Próximo (km)" htmlFor="vl-nk" hint={nextOil ? `Sugerido: ${km(nextOil)}` : null}><input id="vl-nk" inputMode="numeric" value={form.nextOdometer} onChange={set('nextOdometer')} /></Field>
              <Field label="Próximo (fecha)" htmlFor="vl-nd"><input id="vl-nd" type="date" min={todayBogota()} value={form.nextDate} onChange={set('nextDate')} /></Field>
            </>
          )}
          {type === 'kilometraje' && <Field label="Nota" htmlFor="vl-n"><input id="vl-n" value={form.note} onChange={set('note')} /></Field>}
        </div>
        {type !== 'kilometraje' && (
          <>
            <PayChoice value={form.pay} onChange={set('pay')} vehicle={vehicle} />
            {form.pay !== 'ninguna' && Number(type === 'tanqueos' ? form.amount : form.cost) > 0 && <small className="hint">Se registra un gasto de {formatMoney(type === 'tanqueos' ? form.amount : form.cost)} en la categoría {type === 'tanqueos' ? 'Combustible' : 'Mantenimiento'}.</small>}
            <Field label="Foto del recibo"><PhotoInput value={form.photoUrl} onChange={set('photoUrl')} round={false} label="Tomar foto" /></Field>
          </>
        )}
        {error && <div className="alert bad">{error}</div>}
      </form>
    </Modal>
  )
}
