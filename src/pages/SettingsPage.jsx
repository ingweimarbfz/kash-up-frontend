import React, { useEffect, useState } from 'react'
import { MdUpload, MdDelete, MdStorefront } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useSettings } from '../context/SettingsContext'
import { Card, Field, PageHead, Spinner, useToast } from '../components/ui'
import { fileToDataUrl } from '../utils/image'
import { KashLogo } from '../components/Logo'

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
            <Field label="NIT o documento" htmlFor="nit"><input id="nit" value={form.nit || ''} onChange={set('nit')} placeholder="900123456-7" /></Field>
            <Field label="Teléfono" htmlFor="ph"><input id="ph" value={form.phone || ''} onChange={set('phone')} inputMode="numeric" /></Field>
            <Field label="Correo" htmlFor="em"><input id="em" type="email" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="Ciudad" htmlFor="ci"><input id="ci" value={form.city || ''} onChange={set('city')} /></Field>
            <div className="span-2"><Field label="Dirección" htmlFor="ad"><input id="ad" value={form.address || ''} onChange={set('address')} /></Field></div>
            <div className="span-2"><Field label="Pie de los comprobantes" htmlFor="rf" hint="Texto al final de recibos y comprobantes de crédito"><textarea id="rf" rows={3} value={form.receiptFooter || ''} onChange={set('receiptFooter')} /></Field></div>
          </div>
        </Card>
        <Card title="Logo" subtitle="Se muestra en el menú lateral sobre fondo negro. PNG con fondo transparente.">
          <div className="logo-preview">
            {form.logoUrl ? <img src={form.logoUrl} alt="Logo del negocio" /> : <KashLogo size={30} onDark />}
          </div>
          <div className="row-actions">
            <label className="btn"><MdUpload /> Subir logo<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
            {form.logoUrl && <button type="button" className="btn btn-ghost" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}><MdDelete /> Quitar</button>}
          </div>
        </Card>
      </div>
      {toastNode}
    </form>
  )
}

export default SettingsPage
