import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MdLocalOffer, MdStar, MdFavorite, MdCardGiftcard, MdHandshake, MdCake, MdEmojiEvents, MdLocalFireDepartment, MdPercent, MdPerson,
  MdAdd, MdDelete, MdMoveToInbox, MdLocalShipping, MdPlace, MdWarehouse
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Field, Modal, Spinner } from '../../components/ui'
import { MoneyInput } from '../../components/forms'
import { formatMoney } from '../../utils/format'

// ---------- Descuentos: ícono y color para reconocerlos de un vistazo ----------
export const DISCOUNT_ICONS = {
  tag: MdLocalOffer, star: MdStar, heart: MdFavorite, gift: MdCardGiftcard, handshake: MdHandshake,
  cake: MdCake, trophy: MdEmojiEvents, fire: MdLocalFireDepartment, percent: MdPercent, user: MdPerson
}
export const DISCOUNT_COLORS = ['#10B981', '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#06B6D4', '#EF4444', '#84CC16', '#3F3F46']
export const discountValue = (d) => (d.type === 'porcentaje' ? `${d.value} %` : formatMoney(d.value))

export const DiscountIcon = ({ d, size = 36 }) => {
  const I = DISCOUNT_ICONS[d.icon] || MdLocalOffer
  return <span className="icon-bubble" style={{ background: `${d.color}22`, color: d.color, width: size, height: size, fontSize: size * 0.5 }}><I /></span>
}
export const DiscountChip = ({ d }) => {
  const I = DISCOUNT_ICONS[d.icon] || MdLocalOffer
  return <span className="badge" style={{ background: `${d.color}1F`, color: d.color }}><I /> {d.name} · {discountValue(d)}</span>
}

// ---------- Sedes y bodegas ----------
export const useInventoryPlaces = () => {
  const [sites, setSites] = useState(null)
  const [warehouses, setWarehouses] = useState(null)
  const reload = useCallback(() => {
    api.get('/sedes').then(({ data }) => setSites(data)).catch(() => setSites([]))
    api.get('/inventario/bodegas').then(({ data }) => setWarehouses(data)).catch(() => setWarehouses([]))
  }, [])
  useEffect(() => { reload() }, [reload])
  const general = useMemo(() => (warehouses || []).find((w) => w.isGeneral) || null, [warehouses])
  return { sites, warehouses, general, reload }
}

// Selector de lugar: sede y, dentro de ella, bodega. Vacío = todo el negocio.
export const PlaceFilter = ({ sites, warehouses, value, onChange }) => {
  const list = (warehouses || []).filter((w) => !value.sede || w.siteId === Number(value.sede))
  return (
    <div className="place-filter">
      <MdPlace aria-hidden="true" />
      <select aria-label="Sede" value={value.sede} onChange={(e) => onChange({ sede: e.target.value, bodega: '' })}>
        <option value="">Todas las sedes</option>
        {(sites || []).filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select aria-label="Bodega" value={value.bodega} onChange={(e) => onChange({ ...value, bodega: e.target.value })}>
        <option value="">{value.sede ? 'Todas las bodegas de la sede' : 'Todas las bodegas'}</option>
        {list.map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (principal)' : ''}</option>)}
      </select>
    </div>
  )
}
export const placeParams = (p) => ({ sede: p.bodega ? undefined : p.sede || undefined, bodega: p.bodega || undefined })

export const WarehouseOptions = ({ sites, warehouses, exclude }) => (sites || []).map((s) => {
  const ws = (warehouses || []).filter((w) => w.siteId === s.id && w.active && w.id !== Number(exclude))
  return ws.length ? <optgroup key={s.id} label={s.name}>{ws.map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (principal)' : ''}</option>)}</optgroup> : null
})

// ---------- Entrada, ajuste o baja en una bodega ----------
export const MovementModal = ({ products, sites, warehouses, defaults = {}, onClose, onSaved }) => {
  const [f, setF] = useState({ type: 'entrada', productId: '', warehouseId: '', quantity: '', unitCost: '', supplier: '', invoice: '', note: '', ...defaults })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const product = products.find((p) => p.id === Number(f.productId))
  const here = product?.byWarehouse?.find((w) => w.warehouseId === Number(f.warehouseId))?.stock ?? 0
  useEffect(() => { if (product && f.unitCost === '') setF((x) => ({ ...x, unitCost: product.cost })) }, [product]) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!product) return setError('Selecciona el producto.')
    if (!f.warehouseId) return setError('Selecciona la bodega.')
    setSaving(true)
    try {
      await api.post('/inventario/movimientos', { ...f, quantity: Number(f.quantity) })
      const w = warehouses.find((x) => x.id === Number(f.warehouseId))
      onSaved(`${f.type === 'entrada' ? 'Entrada' : f.type === 'baja' ? 'Baja' : 'Ajuste'} de ${product.name} registrada en ${w?.name}`)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Entrada, ajuste o baja" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="move-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdMoveToInbox />} Registrar</button></>}>
      <form id="move-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Tipo" htmlFor="mt"><select id="mt" value={f.type} onChange={set('type')}><option value="entrada">Entrada (compra)</option><option value="ajuste">Ajuste (+ o −)</option><option value="baja">Baja (daño o pérdida)</option></select></Field>
        <Field label="Bodega" htmlFor="mw" required><select id="mw" value={f.warehouseId} onChange={set('warehouseId')}><option value="">Selecciona…</option><WarehouseOptions sites={sites} warehouses={warehouses} /></select></Field>
        <div className="span-2"><Field label="Producto" htmlFor="mp" required hint={product && f.warehouseId ? `En esta bodega hay ${here} · total ${product.stock}` : null}>
          <select id="mp" value={f.productId} onChange={set('productId')}><option value="">Selecciona…</option><ProductOptions products={products.filter((p) => p.active)} /></select>
        </Field></div>
        <Field label="Cantidad" htmlFor="mq" required hint={f.type === 'ajuste' ? 'Negativo para restar' : null}><input id="mq" type="number" value={f.quantity} onChange={set('quantity')} /></Field>
        {f.type === 'entrada' && <Field label="Costo unitario" htmlFor="mc"><MoneyInput id="mc" value={f.unitCost} onChange={set('unitCost')} /></Field>}
        {f.type === 'entrada' && <Field label="Proveedor" htmlFor="ms"><input id="ms" value={f.supplier} onChange={set('supplier')} /></Field>}
        {f.type === 'entrada' && <Field label="N.º de factura" htmlFor="mi"><input id="mi" value={f.invoice} onChange={set('invoice')} /></Field>}
        <div className="span-2"><Field label={f.type === 'entrada' ? 'Nota' : 'Motivo'} htmlFor="mn" required={f.type !== 'entrada'}><input id="mn" value={f.note} onChange={set('note')} /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

// Productos agrupados por categoría.
export const ProductOptions = ({ products, stockOf }) => {
  const groups = {}
  for (const p of products) (groups[p.category || 'Sin categoría'] ||= []).push(p)
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, ps]) => (
    <optgroup key={cat} label={cat}>{ps.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ''}{stockOf ? ` — disp. ${stockOf(p)}` : ''}</option>)}</optgroup>
  ))
}

// ---------- Traslado entre bodegas ----------
export const TransferModal = ({ products, sites, warehouses, defaults = {}, onClose, onSaved }) => {
  const [from, setFrom] = useState(defaults.fromWarehouseId || '')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [pick, setPick] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const stockIn = (p) => p.byWarehouse?.find((w) => w.warehouseId === Number(from))?.stock ?? 0
  const available = products.filter((p) => p.active && stockIn(p) > 0 && !items.some((i) => i.product.id === p.id))
  const add = () => {
    const p = products.find((x) => x.id === Number(pick))
    if (!p) return
    setItems([...items, { product: p, quantity: qty || 1 }]); setPick(''); setQty('')
  }
  const submit = async () => {
    setError('')
    if (!from || !to) return setError('Selecciona la bodega de origen y la de destino.')
    if (!items.length) return setError('Agrega al menos un producto.')
    const bad = items.find((i) => !(Number(i.quantity) > 0) || Number(i.quantity) > stockIn(i.product))
    if (bad) return setError(`Revisa la cantidad de ${bad.product.name} (disponible ${stockIn(bad.product)}).`)
    setSaving(true)
    try {
      const { data } = await api.post('/inventario/traslados', { fromWarehouseId: Number(from), toWarehouseId: Number(to), note, items: items.map((i) => ({ productId: i.product.id, quantity: Number(i.quantity) })) })
      onSaved(`Traslado ${data.ref} registrado`)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal size="lg" title="Traslado entre bodegas" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdLocalShipping />} Registrar traslado</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid">
          <Field label="Desde" htmlFor="tf" required><select id="tf" value={from} onChange={(e) => { setFrom(e.target.value); setItems([]) }}><option value="">Bodega de origen…</option><WarehouseOptions sites={sites} warehouses={warehouses} /></select></Field>
          <Field label="Hacia" htmlFor="tt" required><select id="tt" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Bodega de destino…</option><WarehouseOptions sites={sites} warehouses={warehouses} exclude={from} /></select></Field>
        </div>
        {from && (
          <div className="item-row">
            <select aria-label="Producto" value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
              <option value="">{available.length ? 'Agregar producto…' : 'No hay más productos con stock en esta bodega'}</option>
              <ProductOptions products={available} stockOf={stockIn} />
            </select>
            <input aria-label="Cantidad" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cant." style={{ width: 90 }} />
            <button type="button" className="btn" onClick={add} disabled={!pick}><MdAdd /> Agregar</button>
          </div>
        )}
        {items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Producto</th><th className="num">Disponible</th><th className="num">Cantidad</th><th /></tr></thead>
              <tbody>{items.map((i, n) => (
                <tr key={i.product.id}>
                  <td><strong>{i.product.name}</strong><br /><small>{i.product.category}</small></td>
                  <td className="num">{stockIn(i.product)}</td>
                  <td className="num"><input type="number" min="1" max={stockIn(i.product)} value={i.quantity} onChange={(e) => setItems(items.map((x, j) => (j === n ? { ...x, quantity: e.target.value } : x)))} style={{ width: 90, textAlign: 'right' }} aria-label="Cantidad" /></td>
                  <td className="right"><button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar" onClick={() => setItems(items.filter((_, j) => j !== n))}><MdDelete /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <Field label="Nota" htmlFor="tn"><input id="tn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo o quién recibe" /></Field>
        {error && <div className="alert bad">{error}</div>}
      </div>
    </Modal>
  )
}

// ---------- Sede y bodega ----------
export const SiteForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({ name: '', city: '', address: '', phone: '', active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { const { data } = editing ? await api.put(`/sedes/${initial.id}`, f) : await api.post('/sedes', f); onSaved(data, editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar sede' : 'Nueva sede'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="site-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="site-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2"><Field label="Nombre de la sede" htmlFor="sn" required><input id="sn" value={f.name} onChange={set('name')} placeholder="Ej. Sede Norte, Punto Soledad" autoFocus /></Field></div>
        <Field label="Ciudad" htmlFor="sc"><input id="sc" value={f.city || ''} onChange={set('city')} /></Field>
        <Field label="Teléfono" htmlFor="sp"><input id="sp" value={f.phone || ''} onChange={set('phone')} inputMode="numeric" /></Field>
        <div className="span-2"><Field label="Dirección" htmlFor="sa"><input id="sa" value={f.address || ''} onChange={set('address')} /></Field></div>
        {!editing && <p className="span-2 hint" style={{ margin: 0 }}>Se crea con su propia bodega; luego puedes agregarle más.</p>}
        {editing && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={set('active')} /> Sede activa</label>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

export const WarehouseForm = ({ initial, sites, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({ name: '', siteId: '', responsible: '', location: '', description: '', active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { const { data } = editing ? await api.put(`/inventario/bodegas/${initial.id}`, f) : await api.post('/inventario/bodegas', f); onSaved(data, editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.name}` : 'Nueva bodega'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="wh-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="wh-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2"><Field label="Nombre de la bodega" htmlFor="wn" required><input id="wn" value={f.name} onChange={set('name')} placeholder="Ej. Bodega Norte, Moto de cobro 1" autoFocus /></Field></div>
        <Field label="Sede" htmlFor="ws" required>
          <select id="ws" value={f.siteId} onChange={set('siteId')} disabled={initial?.isGeneral}><option value="">Selecciona la sede…</option>{(sites || []).filter((s) => s.active || s.id === Number(f.siteId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </Field>
        <Field label="Responsable" htmlFor="wr"><input id="wr" value={f.responsible || ''} onChange={set('responsible')} /></Field>
        <div className="span-2"><Field label="Ubicación" htmlFor="wl"><input id="wl" value={f.location || ''} onChange={set('location')} placeholder="Dirección, local, piso…" /></Field></div>
        <div className="span-2"><Field label="Descripción" htmlFor="wd"><input id="wd" value={f.description || ''} onChange={set('description')} placeholder="Qué se guarda aquí" /></Field></div>
        {editing && !initial.isGeneral && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={set('active')} /> Bodega activa</label>}
        {initial?.isGeneral && <p className="span-2 hint" style={{ margin: 0 }}><MdWarehouse style={{ verticalAlign: -2 }} /> Es la bodega principal del negocio: siempre está activa y no cambia de sede.</p>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}
