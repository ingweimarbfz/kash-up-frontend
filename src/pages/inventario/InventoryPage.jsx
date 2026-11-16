import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MdAdd, MdEdit, MdSearch, MdInventory2, MdSwapVert, MdLocalOffer, MdCategory, MdWarningAmber } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Field, Kpi, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { MoneyInput, PhotoInput, Tabs } from '../../components/forms'
import { formatDateTime, formatMoney } from '../../utils/format'

const ProductForm = ({ initial, categories, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState({ sku: '', name: '', categoryId: '', brand: '', description: '', cost: '', price: '', minStock: 0, initialStock: 0, photoUrl: null, active: true, ...(initial || {}) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const { data } = editing ? await api.put(`/inventario/productos/${initial.id}`, form) : await api.post('/inventario/productos', form)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  const margin = Number(form.price) && Number(form.cost) ? Math.round(((form.price - form.cost) / form.price) * 100) : null
  return (
    <Modal size="lg" title={editing ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="product-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="product-form" className="form-grid" onSubmit={submit}>
        <div className="span-2"><PhotoInput value={form.photoUrl} round={false} label="Foto del producto" onChange={set('photoUrl')} /></div>
        <Field label="Nombre" htmlFor="pn" required><input id="pn" value={form.name} onChange={set('name')} /></Field>
        <Field label="Código (SKU)" htmlFor="ps"><input id="ps" value={form.sku || ''} onChange={set('sku')} /></Field>
        <Field label="Categoría" htmlFor="pc"><select id="pc" value={form.categoryId || ''} onChange={set('categoryId')}><option value="">Sin categoría</option>{categories.filter((c) => c.active || c.id === form.categoryId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Marca" htmlFor="pb"><input id="pb" value={form.brand || ''} onChange={set('brand')} /></Field>
        <Field label="Costo" htmlFor="pco" hint="Se actualiza con cada entrada"><MoneyInput id="pco" value={form.cost} onChange={set('cost')} /></Field>
        <Field label="Precio de venta a crédito" htmlFor="ppr" required hint={margin !== null ? `Margen ${margin} %` : null}><MoneyInput id="ppr" value={form.price} onChange={set('price')} /></Field>
        <Field label="Stock mínimo" htmlFor="pmin" hint="Avisa cuando queden pocas unidades"><input id="pmin" type="number" min="0" value={form.minStock} onChange={set('minStock')} /></Field>
        {!editing ? <Field label="Stock inicial" htmlFor="pini"><input id="pini" type="number" min="0" value={form.initialStock} onChange={set('initialStock')} /></Field>
          : <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={form.active} onChange={set('active')} /> Producto activo</label>}
        <div className="span-2"><Field label="Descripción" htmlFor="pd"><textarea id="pd" rows={2} value={form.description || ''} onChange={set('description')} /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const MovementForm = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({ type: 'entrada', quantity: '', unitCost: product.cost, note: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { const { data } = await api.post('/inventario/movimientos', { ...form, productId: product.id, quantity: Number(form.quantity) }); onSaved(data) } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal title={`Movimiento · ${product.name}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="move-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Registrar</button></>}>
      <form id="move-form" className="form-grid" onSubmit={submit}>
        <p className="span-2" style={{ margin: 0 }}>Stock actual: <strong>{product.stock}</strong> unidades.</p>
        <Field label="Tipo" htmlFor="mt"><select id="mt" value={form.type} onChange={set('type')}><option value="entrada">Entrada (compra)</option><option value="ajuste">Ajuste (+ o −)</option><option value="baja">Baja (daño o pérdida)</option></select></Field>
        <Field label="Cantidad" htmlFor="mq" hint={form.type === 'ajuste' ? 'Negativo para restar' : null}><input id="mq" type="number" value={form.quantity} onChange={set('quantity')} /></Field>
        {form.type === 'entrada' && <Field label="Costo unitario" htmlFor="mc"><MoneyInput id="mc" value={form.unitCost} onChange={set('unitCost')} /></Field>}
        <div className="span-2"><Field label={form.type === 'entrada' ? 'Nota (proveedor, factura)' : 'Motivo'} htmlFor="mn" required={form.type !== 'entrada'}><input id="mn" value={form.note} onChange={set('note')} /></Field></div>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const ProductsTab = ({ admin, categories, toast }) => {
  const [rows, setRows] = useState(null)
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState(null)
  const [moving, setMoving] = useState(null)
  const load = useCallback(() => {
    api.get('/inventario/productos').then(({ data }) => setRows(data)).catch((e) => { setRows([]); toast(errorMessage(e), 'bad') })
    api.get('/inventario/resumen').then(({ data }) => setSummary(data)).catch(() => {})
  }, [toast])
  useEffect(() => { load() }, [load])
  const shown = useMemo(() => (rows || []).filter((p) => (!cat || (cat === 'bajo' ? p.lowStock : String(p.categoryId) === cat)) && (!query || `${p.name} ${p.sku || ''} ${p.brand || ''}`.toLowerCase().includes(query.toLowerCase()))), [rows, query, cat])
  return (
    <>
      {summary && (
        <div className="grid grid-kpi">
          <Kpi label="Productos activos" value={summary.products} />
          <Kpi label="Unidades" value={summary.units} />
          <Kpi label="Valor al costo" value={formatMoney(summary.costValue)} tone="dark" />
          <Kpi label="Valor de venta" value={formatMoney(summary.saleValue)} tone="brand" />
          <Kpi label="Stock bajo" value={summary.lowStock} tone={summary.lowStock ? 'warn' : ''} icon={MdWarningAmber} />
        </div>
      )}
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, código o marca" /></div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría"><option value="">Todas las categorías</option><option value="bajo">Con stock bajo</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {admin && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><MdAdd /> Producto</button>}
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
          : !shown.length ? <Empty icon={<MdInventory2 />}>{rows.length ? 'Ningún producto coincide.' : 'Aún no hay productos.'}</Empty>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Producto</th><th className="hide-sm">Categoría</th><th className="num hide-md">Costo</th><th className="num">Precio</th><th className="num">Stock</th>{admin && <th />}</tr></thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id}>
                        <td><div className="person">{p.photoUrl ? <img className="thumb sq" src={p.photoUrl} alt="" /> : <span className="thumb sq" />}<div><strong>{p.name}</strong><small>{[p.sku, p.brand].filter(Boolean).join(' · ') || '—'}{!p.active && ' · inactivo'}</small></div></div></td>
                        <td className="hide-sm">{p.category || '—'}</td>
                        <td className="num money hide-md">{formatMoney(p.cost)}</td>
                        <td className="num money">{formatMoney(p.price)}</td>
                        <td className="num">{p.lowStock ? <Badge tone={p.stock ? 'warn' : 'bad'}>{p.stock}</Badge> : <strong>{p.stock}</strong>}</td>
                        {admin && <td className="right" style={{ whiteSpace: 'nowrap' }}>
                          <button type="button" className="btn btn-ghost btn-icon" title="Entrada, ajuste o baja" onClick={() => setMoving(p)}><MdSwapVert /></button>
                          <button type="button" className="btn btn-ghost btn-icon" title="Editar" onClick={() => setEditing(p)}><MdEdit /></button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
      </Card>
      {editing && <ProductForm initial={editing} categories={categories} onClose={() => setEditing(null)} onSaved={(p, was) => { setEditing(null); toast(was ? 'Producto actualizado' : 'Producto creado'); load() }} />}
      {moving && <MovementForm product={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); toast('Movimiento registrado'); load() }} />}
    </>
  )
}

const MovementsTab = ({ toast }) => {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.get('/inventario/movimientos').then(({ data }) => setRows(data)).catch((e) => { setRows([]); toast(errorMessage(e), 'bad') }) }, [toast])
  const TONES = { entrada: 'ok', salida_credito: 'dark', devolucion: 'brand', ajuste: 'warn', baja: 'bad' }
  return (
    <Card flush>
      {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
        : !rows.length ? <Empty icon={<MdSwapVert />}>Sin movimientos todavía.</Empty>
          : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="num">Cantidad</th><th className="hide-sm">Detalle</th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td><small>{formatDateTime(m.createdAt)}</small></td>
                      <td><strong>{m.product?.name}</strong></td>
                      <td><Badge tone={TONES[m.type]}>{m.typeLabel}</Badge></td>
                      <td className={`num ${m.quantity > 0 ? 'text-ok' : 'text-bad'}`}><strong>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</strong></td>
                      <td className="hide-sm"><small>{m.creditNumber ? `Crédito #${m.creditNumber}` : m.note || '—'}{m.user ? ` · ${m.user}` : ''}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
    </Card>
  )
}

// Lista editable simple (categorías y descuentos).
const SimpleList = ({ title, icon, rows, render, onAdd, onEdit, admin, empty }) => (
  <Card title={title} icon={icon} actions={admin && <button type="button" className="btn btn-sm btn-primary" onClick={onAdd}><MdAdd /> Agregar</button>} flush>
    {!rows ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : !rows.length ? <Empty>{empty}</Empty> : (
      <table className="table"><tbody>{rows.map((r) => (
        <tr key={r.id}>{render(r)}{admin && <td className="right"><button type="button" className="btn btn-ghost btn-icon" onClick={() => onEdit(r)} aria-label="Editar"><MdEdit /></button></td>}</tr>
      ))}</tbody></table>
    )}
  </Card>
)

const NameModal = ({ title, initial, fields, onClose, onSubmit }) => {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await onSubmit(form) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={title} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="name-form" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Guardar</button></>}>
      <form id="name-form" className="form-grid" onSubmit={submit}>{fields(form, setForm)}{error && <div className="alert bad span-2">{error}</div>}</form>
    </Modal>
  )
}

const CatalogsTab = ({ admin, categories, reloadCategories, toast }) => {
  const [discounts, setDiscounts] = useState(null)
  const [modal, setModal] = useState(null)
  const loadDiscounts = useCallback(() => { api.get('/descuentos').then(({ data }) => setDiscounts(data)).catch(() => setDiscounts([])) }, [])
  useEffect(() => { loadDiscounts() }, [loadDiscounts])
  const saveCategory = async (f) => {
    if (f.id) await api.put(`/inventario/categorias/${f.id}`, f); else await api.post('/inventario/categorias', f)
    setModal(null); toast('Categoría guardada'); reloadCategories()
  }
  const saveDiscount = async (f) => {
    const body = { ...f, value: Number(f.value) }
    if (f.id) await api.put(`/descuentos/${f.id}`, body); else await api.post('/descuentos', body)
    setModal(null); toast('Descuento guardado'); loadDiscounts()
  }
  return (
    <div className="grid grid-2">
      <SimpleList title="Categorías" icon={<MdCategory />} rows={categories} admin={admin} empty="Sin categorías."
        onAdd={() => setModal({ kind: 'cat', data: { name: '', active: true } })} onEdit={(r) => setModal({ kind: 'cat', data: r })}
        render={(r) => <td><strong>{r.name}</strong> {!r.active && <Badge tone="muted">Inactiva</Badge>}</td>} />
      <SimpleList title="Descuentos" icon={<MdLocalOffer />} rows={discounts} admin={admin} empty="Sin descuentos."
        onAdd={() => setModal({ kind: 'disc', data: { name: '', type: 'porcentaje', value: '', active: true } })} onEdit={(r) => setModal({ kind: 'disc', data: r })}
        render={(r) => <td><strong>{r.name}</strong><br /><small>{r.type === 'porcentaje' ? `${r.value} %` : formatMoney(r.value)}{!r.active && ' · inactivo'}</small></td>} />
      {modal?.kind === 'cat' && <NameModal title={modal.data.id ? 'Editar categoría' : 'Nueva categoría'} initial={modal.data} onClose={() => setModal(null)} onSubmit={saveCategory}
        fields={(f, set) => <>
          <div className="span-2"><Field label="Nombre" htmlFor="cn" required><input id="cn" value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} /></Field></div>
          {f.id && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={(e) => set({ ...f, active: e.target.checked })} /> Activa</label>}
        </>} />}
      {modal?.kind === 'disc' && <NameModal title={modal.data.id ? 'Editar descuento' : 'Nuevo descuento'} initial={modal.data} onClose={() => setModal(null)} onSubmit={saveDiscount}
        fields={(f, set) => <>
          <div className="span-2"><Field label="Nombre" htmlFor="dn" required><input id="dn" value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} placeholder="Promo 10 %" /></Field></div>
          <Field label="Tipo" htmlFor="dt"><select id="dt" value={f.type} onChange={(e) => set({ ...f, type: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="valor">Valor fijo</option></select></Field>
          <Field label={f.type === 'porcentaje' ? 'Porcentaje' : 'Valor'} htmlFor="dv">{f.type === 'porcentaje' ? <input id="dv" inputMode="decimal" value={f.value} onChange={(e) => set({ ...f, value: e.target.value })} /> : <MoneyInput id="dv" value={f.value} onChange={(v) => set({ ...f, value: v })} />}</Field>
          {f.id && <label className="check span-2"><input type="checkbox" checked={f.active} onChange={(e) => set({ ...f, active: e.target.checked })} /> Activo</label>}
        </>} />}
    </div>
  )
}

const InventoryPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [tab, setTab] = useState('productos')
  const [categories, setCategories] = useState(null)
  const [toast, toastNode] = useToast()
  const loadCategories = useCallback(() => { api.get('/inventario/categorias').then(({ data }) => setCategories(data)).catch(() => setCategories([])) }, [])
  useEffect(() => { loadCategories() }, [loadCategories])
  return (
    <div className="stack">
      <PageHead title="Inventario" subtitle="Productos que entregas a crédito. El stock baja solo al crear un crédito de producto y vuelve si el crédito se anula.">
        <Tabs value={tab} onChange={setTab} tabs={[['productos', 'Productos'], ['movimientos', 'Movimientos'], ['catalogos', 'Categorías y descuentos']]} />
      </PageHead>
      {tab === 'productos' && <ProductsTab admin={admin} categories={categories || []} toast={toast} />}
      {tab === 'movimientos' && <MovementsTab toast={toast} />}
      {tab === 'catalogos' && <CatalogsTab admin={admin} categories={categories} reloadCategories={loadCategories} toast={toast} />}
      {toastNode}
    </div>
  )
}

export default InventoryPage
