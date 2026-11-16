import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MdAdd, MdEdit, MdSearch, MdInventory2, MdSwapVert, MdLocalOffer, MdCategory, MdWarningAmber, MdWarehouse, MdLocalShipping,
  MdMoveToInbox, MdPerson, MdPlace, MdStore, MdArrowForward
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { MoneyInput, PhotoInput, Tabs } from '../../components/forms'
import { DonutChart } from '../../components/charts'
import { formatDateTime, formatMoney } from '../../utils/format'
import {
  DISCOUNT_COLORS, DISCOUNT_ICONS, DiscountIcon, discountValue, MovementModal, PlaceFilter, placeParams, SiteForm, TransferModal,
  useInventoryPlaces, WarehouseForm, WarehouseOptions
} from './common'

// ---------------------------------------------------------------- Producto
const ProductForm = ({ initial, categories, sites, warehouses, general, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState({ sku: '', name: '', categoryId: '', brand: '', description: '', cost: '', price: '', minStock: 0, initialStock: 0, warehouseId: general?.id || '', photoUrl: null, active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.categoryId) return setError('Selecciona la categoría del producto. Si no existe, créala en "Categorías y descuentos".')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/inventario/productos/${initial.id}`, form) : await api.post('/inventario/productos', form)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const margin = Number(form.price) && Number(form.cost) ? Math.round(((form.price - form.cost) / form.price) * 100) : null
  const activeCats = categories.filter((c) => c.active || c.id === Number(form.categoryId))
  return (
    <Modal size="lg" title={editing ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="product-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="product-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2"><PhotoInput value={form.photoUrl} round={false} label="Foto del producto" onChange={set('photoUrl')} /></div>
        <Field label="Nombre" htmlFor="pn" required><input id="pn" value={form.name} onChange={set('name')} /></Field>
        <Field label="Categoría" htmlFor="pc" required hint={activeCats.length ? null : 'Primero crea una categoría'}>
          <select id="pc" value={form.categoryId || ''} onChange={set('categoryId')}><option value="">Selecciona…</option>{activeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Código (SKU)" htmlFor="ps"><input id="ps" value={form.sku || ''} onChange={set('sku')} /></Field>
        <Field label="Marca" htmlFor="pb"><input id="pb" value={form.brand || ''} onChange={set('brand')} /></Field>
        <Field label="Costo" htmlFor="pco" hint="Se actualiza con cada entrada"><MoneyInput id="pco" value={form.cost} onChange={set('cost')} /></Field>
        <Field label="Precio de venta a crédito" htmlFor="ppr" required hint={margin !== null ? `Margen ${margin} %` : null}><MoneyInput id="ppr" value={form.price} onChange={set('price')} /></Field>
        <Field label="Stock mínimo por bodega" htmlFor="pmin" hint="Avisa cuando queden pocas unidades"><input id="pmin" type="number" min="0" value={form.minStock} onChange={set('minStock')} /></Field>
        {editing && <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={form.active} onChange={set('active')} /> Producto activo</label>}
        {!editing && <>
          <Field label="Stock inicial" htmlFor="pini"><input id="pini" type="number" min="0" value={form.initialStock} onChange={set('initialStock')} /></Field>
          <div className="span-2"><Field label="Bodega del stock inicial" htmlFor="pwh"><select id="pwh" value={form.warehouseId} onChange={set('warehouseId')}><WarehouseOptions sites={sites} warehouses={warehouses} /></select></Field></div>
        </>}
        <div className="span-2"><Field label="Descripción" htmlFor="pd"><textarea id="pd" rows={2} value={form.description || ''} onChange={set('description')} /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------- Resumen
const SummaryTab = ({ place, warehouses, go }) => {
  const [s, setS] = useState(null)
  const [low, setLow] = useState(null)
  useEffect(() => {
    setS(null)
    api.get('/inventario/resumen', { params: placeParams(place) }).then(({ data }) => setS(data)).catch(() => setS({}))
    api.get('/inventario/existencias', { params: { ...placeParams(place), todos: 1 } }).then(({ data }) => setLow(data.filter((r) => r.low))).catch(() => setLow([]))
  }, [place])
  const whs = (warehouses || []).filter((w) => (!place.sede || w.siteId === Number(place.sede)) && (!place.bodega || w.id === Number(place.bodega)))
  if (!s) return <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
  return (
    <>
      <div className="grid grid-kpi">
        <Kpi label="Productos con stock" value={s.products ?? 0} icon={MdInventory2} />
        <Kpi label="Unidades" value={s.units ?? 0} />
        <Kpi label="Valor al costo" value={formatMoney(s.costValue)} tone="dark" />
        <Kpi label="Valor de venta" value={formatMoney(s.saleValue)} tone="brand" note={s.saleValue ? `Margen ${formatMoney(s.saleValue - s.costValue)}` : null} />
        <Kpi label="Stock bajo" value={s.lowStock ?? 0} tone={s.lowStock ? 'warn' : ''} icon={MdWarningAmber} />
      </div>
      <div className="grid grid-2">
        <Card title="Valor de venta por categoría" subtitle="Lo que vale lo que hay en el lugar elegido">
          <DonutChart data={(s.byCategory || []).map((c) => ({ name: c.name, value: c.value }))} />
        </Card>
        <Card flush title="Bodegas" subtitle={`${whs.length} en el lugar elegido`} icon={<MdWarehouse />}>
          {!whs.length ? <Empty icon={<MdWarehouse />}>Sin bodegas.</Empty> : (
            <ul className="wh-list">
              {whs.map((w) => (
                <li key={w.id}>
                  <span className="icon-bubble dark"><MdWarehouse /></span>
                  <div className="grow"><strong>{w.name}</strong> {w.isGeneral && <Badge tone="dark">Principal</Badge>} {!w.active && <Badge tone="muted">Inactiva</Badge>}<small>{w.siteName} · {w.units} unidades · {formatMoney(w.saleValue)}</small></div>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Ver existencias" title="Ver existencias" onClick={() => go('existencias', { sede: String(w.siteId), bodega: String(w.id) })}><MdArrowForward /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card flush title="Productos con stock bajo" subtitle="Igual o por debajo del mínimo en su bodega" icon={<MdWarningAmber />}>
        {!low ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : !low.length ? <Empty>Todo el stock está sobre el mínimo.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Producto</th><th>Bodega</th><th className="num">Stock</th><th className="num">Mínimo</th></tr></thead>
            <tbody>{low.map((r) => (
              <tr key={`${r.warehouseId}-${r.productId}`}><td><strong>{r.name}</strong><small className="block">{r.category}</small></td><td>{r.warehouse}<small className="block">{r.site}</small></td><td className="num"><Badge tone={r.stock ? 'warn' : 'bad'}>{r.stock}</Badge></td><td className="num">{r.minStock}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  )
}

// ---------------------------------------------------------------- Existencias por bodega
const StockTab = ({ place, categories, admin, onMove }) => {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  useEffect(() => {
    setRows(null)
    api.get('/inventario/existencias', { params: placeParams(place) }).then(({ data }) => setRows(data)).catch(() => setRows([]))
  }, [place])
  const shown = useMemo(() => (rows || []).filter((r) => (!cat || (cat === 'bajo' ? r.low : r.category === cat)) && (!q || `${r.name} ${r.sku || ''} ${r.brand || ''}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, cat])
  const total = shown.reduce((a, r) => ({ units: a.units + r.stock, value: a.value + r.saleValue }), { units: 0, value: 0 })
  return (
    <Card flush>
      <div className="toolbar">
        <div className="input-icon grow"><MdSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, código o marca" /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría"><option value="">Todas las categorías</option><option value="bajo">Con stock bajo</option>{(categories || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
        {admin && <button type="button" className="btn" onClick={onMove}><MdMoveToInbox /> Entrada</button>}
      </div>
      {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
        : !shown.length ? <Empty icon={<MdInventory2 />}>{rows.length ? 'Ningún producto coincide.' : 'No hay existencias en el lugar elegido.'}</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Producto</th><th className="hide-sm">Categoría</th><th>Bodega</th><th className="num">Stock</th><th className="num hide-sm">Valor venta</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={`${r.warehouseId}-${r.productId}`}>
                <td><strong>{r.name}</strong><small className="block">{[r.sku, r.brand].filter(Boolean).join(' · ') || '—'}</small></td>
                <td className="hide-sm">{r.category}</td>
                <td>{r.warehouse} {r.isGeneral && <Badge tone="dark">Principal</Badge>}<small className="block">{r.site}</small></td>
                <td className="num">{r.low ? <Badge tone={r.stock ? 'warn' : 'bad'}>{r.stock}</Badge> : <strong>{r.stock}</strong>}</td>
                <td className="num money hide-sm">{formatMoney(r.saleValue)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td className="num"><strong>{total.units}</strong></td><td className="num money hide-sm"><strong>{formatMoney(total.value)}</strong></td></tr></tfoot>
          </table></div>
        )}
    </Card>
  )
}

// ---------------------------------------------------------------- Catálogo de productos
const ProductsTab = ({ admin, products, categories, onEdit, onNew }) => {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const shown = useMemo(() => (products || []).filter((p) => (!cat || (cat === 'bajo' ? p.lowStock : String(p.categoryId) === cat)) && (!query || `${p.name} ${p.sku || ''} ${p.brand || ''}`.toLowerCase().includes(query.toLowerCase()))), [products, query, cat])
  return (
    <Card flush>
      <div className="toolbar">
        <div className="input-icon grow"><MdSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, código o marca" /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría"><option value="">Todas las categorías</option><option value="bajo">Con stock bajo</option>{(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {admin && <button type="button" className="btn btn-primary" onClick={onNew}><MdAdd /> Producto</button>}
      </div>
      {!products ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
        : !shown.length ? <Empty icon={<MdInventory2 />}>{products.length ? 'Ningún producto coincide.' : 'Aún no hay productos.'}</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Producto</th><th className="hide-sm">Categoría</th><th className="num hide-md">Costo</th><th className="num">Precio</th><th className="num">Total</th><th className="hide-md">Por bodega</th>{admin && <th />}</tr></thead>
            <tbody>{shown.map((p) => (
              <tr key={p.id}>
                <td><div className="person">{p.photoUrl ? <img className="thumb sq" src={p.photoUrl} alt="" /> : <span className="thumb sq" />}<div><strong>{p.name}</strong><small>{[p.sku, p.brand].filter(Boolean).join(' · ') || '—'}{!p.active && ' · inactivo'}</small></div></div></td>
                <td className="hide-sm"><Badge>{p.category}</Badge></td>
                <td className="num money hide-md">{formatMoney(p.cost)}</td>
                <td className="num money">{formatMoney(p.price)}</td>
                <td className="num"><strong>{p.stock}</strong></td>
                <td className="hide-md"><small>{p.byWarehouse?.length ? p.byWarehouse.map((w) => `${w.name}: ${w.stock}`).join(' · ') : '—'}</small></td>
                {admin && <td className="right"><button type="button" className="btn btn-ghost btn-icon" title="Editar" aria-label="Editar" onClick={() => onEdit(p)}><MdEdit /></button></td>}
              </tr>
            ))}</tbody>
          </table></div>
        )}
    </Card>
  )
}

// ---------------------------------------------------------------- Movimientos
const MOVE_TONES = { entrada: 'ok', traslado_entrada: 'ok', traslado_salida: 'dark', salida_credito: 'dark', devolucion: 'brand', ajuste: 'warn', baja: 'bad' }
const MOVE_TYPES = [['', 'Todos los tipos'], ['entrada', 'Entradas'], ['salida_credito', 'Entregas en crédito'], ['traslado_salida', 'Traslados enviados'], ['traslado_entrada', 'Traslados recibidos'], ['devolucion', 'Devoluciones'], ['ajuste', 'Ajustes'], ['baja', 'Bajas']]
const MovementsTab = ({ place, version }) => {
  const [rows, setRows] = useState(null)
  const [type, setType] = useState('')
  useEffect(() => {
    setRows(null)
    api.get('/inventario/movimientos', { params: { ...placeParams(place), tipo: type || undefined } }).then(({ data }) => setRows(data)).catch(() => setRows([]))
  }, [place, type, version])
  return (
    <Card flush>
      <div className="toolbar"><select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo">{MOVE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
        : !rows.length ? <Empty icon={<MdSwapVert />}>Sin movimientos en el lugar elegido.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="hide-sm">Bodega</th><th className="num">Cant.</th><th className="hide-md">Detalle</th></tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id}>
                <td><small>{formatDateTime(m.createdAt)}</small></td>
                <td><strong>{m.product?.name}</strong></td>
                <td><Badge tone={MOVE_TONES[m.type]}>{m.typeLabel}</Badge>{m.ref && <small className="block">{m.ref}</small>}</td>
                <td className="hide-sm">{m.warehouse?.name}</td>
                <td className={`num ${m.quantity > 0 ? 'text-ok' : 'text-bad'}`}><strong>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</strong></td>
                <td className="hide-md"><small>{m.creditNumber ? `Crédito #${m.creditNumber}` : m.note || '—'}{m.user ? ` · ${m.user}` : ''}</small></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
    </Card>
  )
}

// ---------------------------------------------------------------- Sedes y bodegas
const PlacesTab = ({ admin, sites, warehouses, reload, toast, go }) => {
  const [modal, setModal] = useState(null)
  if (!sites || !warehouses) return <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
  return (
    <div className="stack">
      {admin && <div className="row-end"><button type="button" className="btn btn-primary" onClick={() => setModal({ site: {} })}><MdStore /> Nueva sede</button></div>}
      {sites.map((s) => {
        const list = warehouses.filter((w) => w.siteId === s.id)
        return (
          <Card key={s.id} flush title={s.name} subtitle={[s.city, s.address, `${list.length} bodega${list.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')} icon={<MdStore />}
            actions={admin && <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ site: s })}><MdEdit /> Sede</button>
              <button type="button" className="btn btn-sm" onClick={() => setModal({ wh: { siteId: s.id } })}><MdAdd /> Bodega</button>
            </>}>
            {!s.active && <div className="alert warn" style={{ margin: '0 16px 12px' }}>Sede inactiva</div>}
            {!list.length ? <Empty icon={<MdWarehouse />}>Esta sede aún no tiene bodegas.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Bodega</th><th className="hide-sm">Responsable · ubicación</th><th className="num">Productos</th><th className="num">Unidades</th><th className="num hide-sm">Valor venta</th><th /></tr></thead>
                <tbody>{list.map((w) => (
                  <tr key={w.id} style={w.active ? undefined : { opacity: 0.55 }}>
                    <td><strong>{w.name}</strong> {w.isGeneral && <Badge tone="dark">Principal</Badge>} {!w.active && <Badge tone="muted">Inactiva</Badge>}{w.description && <small className="block">{w.description}</small>}</td>
                    <td className="hide-sm"><small className="block">{w.responsible ? <><MdPerson style={{ verticalAlign: -2 }} /> {w.responsible}</> : '—'}</small>{w.location && <small className="block"><MdPlace style={{ verticalAlign: -2 }} /> {w.location}</small>}</td>
                    <td className="num">{w.products}</td>
                    <td className="num"><strong>{w.units}</strong></td>
                    <td className="num money hide-sm">{formatMoney(w.saleValue)}</td>
                    <td className="right" style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-icon" title="Ver existencias" aria-label="Ver existencias" onClick={() => go('existencias', { sede: String(s.id), bodega: String(w.id) })}><MdArrowForward /></button>
                      {admin && <button type="button" className="btn btn-ghost btn-icon" title="Editar" aria-label="Editar" onClick={() => setModal({ wh: w })}><MdEdit /></button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        )
      })}
      {modal?.site && <SiteForm initial={modal.site.id ? modal.site : null} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); reload(); toast(e ? 'Sede actualizada' : `Sede ${d.name} creada con su bodega`) }} />}
      {modal?.wh && <WarehouseForm initial={modal.wh} sites={sites} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); reload(); toast(e ? 'Bodega actualizada' : `Bodega ${d.name} creada`) }} />}
    </div>
  )
}

// ---------------------------------------------------------------- Categorías y descuentos
const DiscountForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({ name: '', type: 'porcentaje', value: '', icon: 'tag', color: DISCOUNT_COLORS[0], description: '', active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre es requerido.')
    if (!(Number(f.value) > 0)) return setError('Ingresa un valor mayor que cero.')
    if (f.type === 'porcentaje' && Number(f.value) > 100) return setError('El porcentaje no puede superar 100.')
    setSaving(true)
    try { const body = { ...f, value: Number(f.value) }; editing ? await api.put(`/descuentos/${f.id}`, body) : await api.post('/descuentos', body); onSaved(editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar descuento' : 'Nuevo descuento'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="disc-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="disc-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2 disc-preview"><DiscountIcon d={f} size={44} /><div><strong>{f.name || 'Nombre del descuento'}</strong><small className="block">{f.value ? discountValue({ ...f, value: Number(f.value) }) : '—'}{f.description ? ` · ${f.description}` : ''}</small></div></div>
        <div className="span-2"><Field label="Nombre" htmlFor="dn" required><input id="dn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej. Cliente fiel, Promo de temporada" autoFocus /></Field></div>
        <Field label="Tipo" htmlFor="dt"><select id="dt" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="porcentaje">Porcentaje (%)</option><option value="valor">Valor fijo ($)</option></select></Field>
        <Field label={f.type === 'porcentaje' ? 'Porcentaje' : 'Valor'} htmlFor="dv" required>{f.type === 'porcentaje' ? <input id="dv" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="10" /> : <MoneyInput id="dv" value={f.value} onChange={(v) => setF({ ...f, value: v })} />}</Field>
        <div className="span-2"><Field label="Ícono">
          <div className="disc-icons">{Object.entries(DISCOUNT_ICONS).map(([k, I]) => (
            <button key={k} type="button" className={f.icon === k ? 'on' : ''} aria-label={k} aria-pressed={f.icon === k} onClick={() => setF({ ...f, icon: k })} style={f.icon === k ? { borderColor: f.color, color: f.color, background: `${f.color}14` } : undefined}><I /></button>
          ))}</div>
        </Field></div>
        <div className="span-2"><Field label="Color" hint="Identifica el descuento en créditos y reportes">
          <div className="disc-colors">{DISCOUNT_COLORS.map((c) => (
            <button key={c} type="button" className={f.color === c ? 'on' : ''} style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={f.color === c} onClick={() => setF({ ...f, color: c })} />
          ))}</div>
        </Field></div>
        <div className="span-2"><Field label="Descripción" htmlFor="dd"><input id="dd" value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="A quién aplica" /></Field></div>
        {editing && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo</label>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const CategoryForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState({ name: '', description: '', active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { f.id ? await api.put(`/inventario/categorias/${f.id}`, f) : await api.post('/inventario/categorias', f); onSaved() } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={f.id ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="cat-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="cat-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="span-2"><Field label="Nombre" htmlFor="cn" required><input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej. Electrodomésticos, Tecnología, Arte" autoFocus /></Field></div>
        <div className="span-2"><Field label="Descripción" htmlFor="cd"><input id="cd" value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
        {f.id && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activa</label>}
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const CatalogsTab = ({ admin, categories, reloadCategories, toast }) => {
  const [discounts, setDiscounts] = useState(null)
  const [modal, setModal] = useState(null)
  const loadDiscounts = useCallback(() => { api.get('/descuentos').then(({ data }) => setDiscounts(data)).catch(() => setDiscounts([])) }, [])
  useEffect(() => { loadDiscounts() }, [loadDiscounts])
  return (
    <div className="grid grid-2">
      <Card flush title="Categorías" subtitle="Cada producto pertenece a una" icon={<MdCategory />} actions={admin && <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ cat: {} })}><MdAdd /> Categoría</button>}>
        {!categories ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : !categories.length ? <Empty>Sin categorías.</Empty> : (
          <ul className="wh-list">{categories.map((c) => (
            <li key={c.id} style={c.active ? undefined : { opacity: 0.55 }}>
              <span className="icon-bubble"><MdCategory /></span>
              <div className="grow"><strong>{c.name}</strong> {!c.active && <Badge tone="muted">Inactiva</Badge>}<small>{c.products ?? 0} producto{c.products === 1 ? '' : 's'}{c.description ? ` · ${c.description}` : ''}</small></div>
              {admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ cat: c })}><MdEdit /></button>}
            </li>
          ))}</ul>
        )}
      </Card>
      <Card flush title="Descuentos" subtitle="Se aplican en los créditos de producto" icon={<MdLocalOffer />} actions={admin && <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal({ disc: {} })}><MdAdd /> Descuento</button>}>
        {!discounts ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : !discounts.length ? <Empty>Sin descuentos.</Empty> : (
          <ul className="wh-list">{discounts.map((d) => (
            <li key={d.id} style={d.active ? undefined : { opacity: 0.55 }}>
              <DiscountIcon d={d} />
              <div className="grow"><strong>{d.name} <span className="badge" style={{ background: `${d.color}1F`, color: d.color }}>{discountValue(d)}</span></strong> {!d.active && <Badge tone="muted">Inactivo</Badge>}<small>{d.description || (d.type === 'porcentaje' ? 'Porcentaje sobre el valor de los productos' : 'Valor fijo')}</small></div>
              {admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ disc: d })}><MdEdit /></button>}
            </li>
          ))}</ul>
        )}
      </Card>
      {modal?.cat && <CategoryForm initial={modal.cat.id ? modal.cat : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Categoría guardada'); reloadCategories() }} />}
      {modal?.disc && <DiscountForm initial={modal.disc.id ? modal.disc : null} onClose={() => setModal(null)} onSaved={(e) => { setModal(null); toast(e ? 'Descuento actualizado' : 'Descuento creado'); loadDiscounts() }} />}
    </div>
  )
}

// ---------------------------------------------------------------- Página
const TABS = [['resumen', 'Resumen'], ['existencias', 'Existencias'], ['productos', 'Productos'], ['movimientos', 'Movimientos'], ['bodegas', 'Sedes y bodegas'], ['catalogos', 'Categorías y descuentos']]
const PLACE_TABS = ['resumen', 'existencias', 'movimientos']

const InventoryPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [tab, setTab] = useState('resumen')
  const [place, setPlace] = useState({ sede: '', bodega: '' })
  const [categories, setCategories] = useState(null)
  const [products, setProducts] = useState(null)
  const [modal, setModal] = useState(null)
  const [version, setVersion] = useState(0)
  const [toast, toastNode] = useToast()
  const { sites, warehouses, general, reload: reloadPlaces } = useInventoryPlaces()
  const loadCategories = useCallback(() => { api.get('/inventario/categorias').then(({ data }) => setCategories(data)).catch(() => setCategories([])) }, [])
  const loadProducts = useCallback(() => { api.get('/inventario/productos').then(({ data }) => setProducts(data)).catch((e) => { setProducts([]); toast(errorMessage(e), 'bad') }) }, [toast])
  useEffect(() => { loadCategories(); loadProducts() }, [loadCategories, loadProducts])
  const changed = (msg) => { setModal(null); toast(msg); loadProducts(); reloadPlaces(); loadCategories(); setVersion((v) => v + 1); setPlace((p) => ({ ...p })) }
  const go = (t, p) => { setTab(t); if (p) setPlace(p) }
  const defaultsFromPlace = { warehouseId: place.bodega || (general ? String(general.id) : '') }

  return (
    <div className="stack">
      <PageHead title="Inventario" subtitle="Bodega principal y bodegas por sede. El stock baja al entregar un crédito de producto y vuelve a su bodega si el crédito se anula.">
        {admin && <>
          <button type="button" className="btn" onClick={() => setModal('move')}><MdMoveToInbox /> Entrada</button>
          <button type="button" className="btn btn-primary" onClick={() => setModal('transfer')}><MdLocalShipping /> Traslado</button>
        </>}
      </PageHead>
      <div className="inv-bar">
        <Tabs value={tab} onChange={setTab} tabs={TABS} />
        {PLACE_TABS.includes(tab) && <PlaceFilter sites={sites} warehouses={warehouses} value={place} onChange={setPlace} />}
      </div>
      {tab === 'resumen' && <SummaryTab key={version} place={place} warehouses={warehouses} go={go} />}
      {tab === 'existencias' && <StockTab key={version} place={place} categories={categories} admin={admin} onMove={() => setModal('move')} />}
      {tab === 'productos' && <ProductsTab admin={admin} products={products} categories={categories} onNew={() => setModal({ product: {} })} onEdit={(p) => setModal({ product: p })} />}
      {tab === 'movimientos' && <MovementsTab place={place} version={version} />}
      {tab === 'bodegas' && <PlacesTab admin={admin} sites={sites} warehouses={warehouses} reload={reloadPlaces} toast={toast} go={go} />}
      {tab === 'catalogos' && <CatalogsTab admin={admin} categories={categories} reloadCategories={loadCategories} toast={toast} />}

      {modal === 'move' && products && <MovementModal products={products} sites={sites} warehouses={warehouses} defaults={defaultsFromPlace} onClose={() => setModal(null)} onSaved={changed} />}
      {modal === 'transfer' && products && <TransferModal products={products} sites={sites} warehouses={warehouses} defaults={{ fromWarehouseId: place.bodega || (general ? String(general.id) : '') }} onClose={() => setModal(null)} onSaved={changed} />}
      {modal?.product && <ProductForm initial={modal.product.id ? modal.product : null} categories={categories || []} sites={sites} warehouses={warehouses} general={general}
        onClose={() => setModal(null)} onSaved={(p, was) => changed(was ? 'Producto actualizado' : 'Producto creado')} />}
      {toastNode}
    </div>
  )
}

export default InventoryPage
