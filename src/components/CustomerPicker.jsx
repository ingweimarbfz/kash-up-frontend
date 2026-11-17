import React, { useEffect, useRef, useState } from 'react'
import { MdSearch, MdClose } from 'react-icons/md'
import api from '../api/client'
import { Spinner } from './ui'
import { formatMoney } from '../utils/format'

// Buscador de clientes por nombre, apellido, documento o celular (consulta al servidor mientras se escribe).
// Sirve igual con 10 o con 10.000 clientes: solo trae los 20 que coinciden.
const CustomerPicker = ({ value, onChange, id = 'customer-picker', autoFocus = false, placeholder = 'Busca por nombre, documento o celular', locked = false }) => {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setLoading(true)
    const t = setTimeout(() => {
      api.get('/clientes', { params: { q: q.trim() || undefined, estado: 'activo', limit: 20 } })
        .then(({ data }) => { setRows(data); setActive(0) }).catch(() => setRows([])).finally(() => setLoading(false))
    }, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [q, open])

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (c) => { onChange(c); setOpen(false); setQ('') }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && open && rows[active]) { e.preventDefault(); pick(rows[active]) }
    if (e.key === 'Escape') setOpen(false)
  }

  if (value && !open) {
    return (
      <div className="picked">
        {value.photoThumb ? <img className="thumb" src={value.photoThumb} alt="" /> : <span className="thumb" />}
        <div className="grow"><strong>{value.fullName}</strong><small>{value.docType || 'CC'} {value.identification} · {value.phone}{value.address ? ` · ${value.address}` : ''}</small></div>
        <div className="right hide-sm"><small>Saldo actual</small><div className="money"><strong>{formatMoney(value.balance || 0)}</strong></div>{value.overdue > 0 && <small className="text-bad">En mora</small>}</div>
        {!locked && <button type="button" className="btn btn-sm" onClick={() => { setOpen(true); setQ('') }}>Cambiar</button>}
        {!locked && <button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar cliente" onClick={() => onChange(null)}><MdClose /></button>}
      </div>
    )
  }
  return (
    <div className="picker" ref={box}>
      <div className="input-icon"><MdSearch /><input id={id} value={q} autoFocus={autoFocus || Boolean(value)} autoComplete="off" placeholder={placeholder}
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`}
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onKeyDown={onKey} /></div>
      {open && (
        <ul className="picker-list" id={`${id}-list`} role="listbox">
          {loading && !rows.length ? <li className="picker-empty"><Spinner /> Buscando…</li>
            : !rows.length ? <li className="picker-empty">{q ? `Ningún cliente activo coincide con "${q}".` : 'Aún no hay clientes activos.'}</li>
              : rows.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === active}>
                  <button type="button" className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => pick(c)}>
                    {c.photoThumb ? <img className="thumb" src={c.photoThumb} alt="" /> : <span className="thumb" />}
                    <span className="grow"><strong>{c.fullName}</strong><small>{c.docType} {c.identification} · {c.phone}{c.neighborhood ? ` · ${c.neighborhood}` : ''}</small></span>
                    <span className="right"><small>{c.activeCredits ? `${c.activeCredits} activo${c.activeCredits === 1 ? '' : 's'}` : 'Sin créditos'}</small>{c.overdue > 0 && <small className="text-bad">En mora</small>}</span>
                  </button>
                </li>
              ))}
        </ul>
      )}
    </div>
  )
}

export default CustomerPicker
