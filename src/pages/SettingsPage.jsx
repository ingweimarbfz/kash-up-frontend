import React, { useEffect, useState } from 'react'
import { MdUpload, MdDelete, MdStorefront, MdLockClock } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useSettings } from '../context/SettingsContext'
import { Card, Field, PageHead, Spinner, useToast } from '../components/ui'
import { fileToDataUrl } from '../utils/image'
import { BrandLogo } from '../components/Logo'
import { phoneProps } from '../utils/phones'
import { usePlan } from '../context/PlanContext'

// Cierre automático de jornada: a la hora del país, a una hora propia o desactivado.
const AutoCloseCard = ({ initial, toast }) => {
  const { has, country } = usePlan()
  const [f, setF] = useState({ mode: initial?.mode || 'pais', time: initial?.ownTime || initial?.countryTime || '20:00' })
  const [rule, setRule] = useState(initial)
  const [saving, setSaving] = useState(false)
  if (!has('gastos')) return null
  const save = async () => {
    setSaving(true)
    try { const { data } = await api.put('/configuracion/cierre-automatico', f); setRule(data); toast('Cierre automático guardado') } catch (err) { toast(errorMessage(err), 'bad') } finally { setSaving(false) }
  }
  const countryName = country?.name || 'tu país'
  const tz = rule?.timezone || country?.timezone
  return (
    <Card title="Cierre automático de jornada" icon={<MdLockClock />} subtitle={`Las jornadas que sigan abiertas se cierran solas a esa hora (hora de ${countryName}${tz ? `, ${tz}` : ''}). Después, el prestamista debe pedirte reabrirla para registrar algo.`}>
      <div className="form-grid">
        <Field label="¿Cuándo se cierra?" htmlFor="acm">
          <select id="acm" value={f.mode} onChange={(e) => setF((x) => ({ ...x, mode: e.target.value }))}>
            <option value="pais">Hora definida para {countryName}{rule?.countryTime ? ` (${rule.countryTime})` : ' (sin hora definida)'}</option>
            <option value="hora">Hora propia del negocio</option>
            <option value="desactivado">No cerrar automáticamente</option>
          </select>
        </Field>
        {f.mode === 'hora' && <Field label="Hora del cierre" htmlFor="act" hint="Entre las 12:00 y las 23:59"><input id="act" type="time" min="12:00" max="23:59" value={f.time} onChange={(e) => setF((x) => ({ ...x, time: e.target.value }))} /></Field>}
      </div>
      <div className={`alert ${rule?.time ? 'ok' : 'warn'}`} style={{ marginTop: 12 }}>
        {rule?.time ? `Hoy las jornadas abiertas se cierran a las ${rule.time}. El efectivo se toma como cuadrado (sin conteo) y el cierre queda marcado como automático.` : rule?.mode === 'pais' && !rule?.countryTime ? `${countryName} aún no tiene hora de cierre automático. Elige una hora propia si la necesitas.` : 'El cierre automático está desactivado: cada prestamista cierra su jornada.'}
      </div>
      <div style={{ marginTop: 12 }}><button type="button" className="btn" onClick={save} disabled={saving}>{saving && <Spinner />} Guardar cierre automático</button></div>
    </Card>
  )
}

const SettingsPage = () => {
  const { settings, setSettings } = useSettings()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, toastNode] = useToast()

  useEffect(() => { api.get('/configuracion').then(({ data }) => setForm(data)).catch((e) => toast(errorMessage(e), 'bad')) }, [toast])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { setForm((f) => ({ ...f, logoUrl: null })); const url = await fileToDataUrl(file, { max: 400, type: 'image/png' }); setForm((f) => ({ ...f, logoUrl: url })) } catch (err) { toast(err.message, 'bad') }
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/configuracion', form)
      setForm(data)
      setSettings({ ...settings, ...data })
      toast('Configuración guardada')
    } catch (err) { toast(errorMessage(err), 'bad') } finally { setSaving(false) }
  }

  if (!form) return <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <PageHead title="Configuración" subtitle="Datos del negocio que aparecen en la app y en los comprobantes.">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar cambios</button>
      </PageHead>
      <div className="grid grid-2-1">
        <Card title="Datos del negocio" icon={<MdStorefront />}>
          <div className="form-grid">
            <Field label="Nombre del negocio" htmlFor="bn" required><input id="bn" value={form.businessName || ''} onChange={set('businessName')} /></Field>
            <Field label="Nombre corto" htmlFor="sn"><input id="sn" value={form.shortName || ''} onChange={set('shortName')} /></Field>
            <Field label="NIT o documento" htmlFor="nit"><input id="nit" data-only="nit" maxLength={15} value={form.nit || ''} onChange={set('nit')} placeholder="900123456-7" /></Field>
            <Field label="Teléfono" htmlFor="ph"><input {...phoneProps()} id="ph" value={form.phone || ''} onChange={set('phone')} /></Field>
            <Field label="Correo" htmlFor="em"><input id="em" type="email" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="Ciudad" htmlFor="ci"><input id="ci" data-only="letters" value={form.city || ''} onChange={set('city')} /></Field>
            <div className="span-2"><Field label="Dirección" htmlFor="ad"><input id="ad" value={form.address || ''} onChange={set('address')} /></Field></div>
            <div className="span-2"><Field label="Pie de los comprobantes" htmlFor="rf" hint="Texto al final de recibos y comprobantes de crédito"><textarea id="rf" rows={3} value={form.receiptFooter || ''} onChange={set('receiptFooter')} /></Field></div>
          </div>
        </Card>
        <Card title="Logo" subtitle="Se muestra en el menú lateral sobre fondo negro. PNG con fondo transparente.">
          <div className="logo-preview">
            {form.logoUrl ? <img src={form.logoUrl} alt="Logo del negocio" /> : <BrandLogo size={30} onDark />}
          </div>
          <div className="row-actions">
            <label className="btn"><MdUpload /> Subir logo<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
            {form.logoUrl && <button type="button" className="btn btn-ghost" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}><MdDelete /> Quitar</button>}
          </div>
        </Card>
      </div>
      <AutoCloseCard initial={form.autoClose} toast={toast} />
      {toastNode}
    </form>
  )
}

export default SettingsPage
