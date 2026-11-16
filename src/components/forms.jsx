import React, { useRef, useState } from 'react'
import { MdPhotoCamera, MdDelete, MdMyLocation } from 'react-icons/md'
import { fileToDataUrl } from '../utils/image'
import { Spinner } from './ui'

// Campo de dinero: muestra separadores de miles y entrega un número.
export const MoneyInput = ({ value, onChange, id, placeholder = '0', ...rest }) => {
  const shown = value === '' || value === null || value === undefined ? '' : Number(value).toLocaleString('es-CO')
  return (
    <div className="input-prefix">
      <span>$</span>
      <input id={id} inputMode="numeric" value={shown} placeholder={placeholder} {...rest}
        onChange={(e) => { const digits = e.target.value.replace(/\D/g, ''); onChange(digits === '' ? '' : Number(digits)) }} />
    </div>
  )
}

// Foto tomada con la cámara (en celular) o subida desde el equipo. Entrega { photo, thumb } en data URL.
export const PhotoInput = ({ value, onChange, label = 'Tomar foto', round = true, capture = 'environment', withThumb = false }) => {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      const photo = await fileToDataUrl(file, { max: 640, quality: 0.8 })
      const thumb = withThumb ? await fileToDataUrl(file, { max: 120, quality: 0.75 }) : null
      onChange(withThumb ? { photo, thumb } : photo)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <div className={`photo-input${round ? ' round' : ''}`}>
      <button type="button" className="photo-box" onClick={() => ref.current?.click()} aria-label={label}>
        {value ? <img src={value} alt="" /> : busy ? <Spinner /> : <MdPhotoCamera />}
      </button>
      <div className="photo-actions">
        <button type="button" className="btn btn-sm" onClick={() => ref.current?.click()}>{busy ? <Spinner /> : <MdPhotoCamera />} {value ? 'Cambiar' : label}</button>
        {value && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(withThumb ? { photo: null, thumb: null } : null)}><MdDelete /> Quitar</button>}
        {error && <small className="error">{error}</small>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture={capture} hidden onChange={pick} />
    </div>
  )
}

// Botón para tomar la ubicación actual del dispositivo.
export const LocationButton = ({ lat, lng, onChange }) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locate = () => {
    if (!navigator.geolocation) { setError('Este dispositivo no permite ubicar'); return }
    setBusy(true); setError('')
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onChange({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }) },
      () => { setBusy(false); setError('No se pudo obtener la ubicación. Revisa el permiso del navegador.') },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }
  return (
    <div className="location-input">
      <button type="button" className="btn btn-sm" onClick={locate} disabled={busy}>{busy ? <Spinner /> : <MdMyLocation />} {lat ? 'Actualizar ubicación' : 'Usar mi ubicación'}</button>
      {lat && lng ? <a className="small-link" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">{lat}, {lng}</a> : <small>Sin ubicación</small>}
      {error && <small className="error">{error}</small>}
    </div>
  )
}

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs" role="tablist">
    {tabs.map(([k, label]) => (
      <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{label}</button>
    ))}
  </div>
)
