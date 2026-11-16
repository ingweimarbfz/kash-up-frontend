import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdInventory2, MdRequestQuote, MdWarehouse, MdSchedule, MdImageNotSupported } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Spinner } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { PromoTag, promoValue, timeLeft, whenText } from './promotions'

// Ficha del producto tipo PDP: galería, precio (con promoción), existencias y promociones próximas.
const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  const [img, setImg] = useState(0)
  const [, tick] = useState(0)
  useEffect(() => { api.get(`/inventario/productos/${id}`).then(({ data }) => setP(data)).catch((e) => setError(errorMessage(e))) }, [id])
  // La cuenta regresiva de la promoción se refresca cada minuto.
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t) }, [])
  if (error) return <Card><Empty icon={<MdInventory2 />}>{error}</Empty></Card>
  if (!p) return <div className="splash"><Spinner /></div>
  const images = [p.photoUrl, ...(p.gallery || [])].filter(Boolean)
  const left = p.promo?.endsAt ? timeLeft(p.promo.endsAt) : null
  return (
    <div className="stack">
      <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => (user.role === 'administrador' ? navigate('/inventario?tab=productos') : navigate(-1))}><MdArrowBack /> {user.role === 'administrador' ? 'Productos' : 'Volver'}</button></div>
      <div className="pdp">
        <div className="pdp-gallery">
          <div className="pdp-main">
            {images.length ? <img src={images[img] || images[0]} alt={p.name} /> : <span className="pdp-noimg"><MdImageNotSupported /> Sin foto</span>}
            {p.promo && <span className="pdp-ribbon"><PromoTag p={p.promo} size="lg" /></span>}
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbs">{images.map((src, i) => (
              <button key={i} type="button" className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Imagen ${i + 1}`}><img src={src} alt="" /></button>
            ))}</div>
          )}
        </div>
        <div className="pdp-info">
          <div className="chip-list"><Badge>{p.category}</Badge>{!p.active && <Badge tone="muted">Inactivo</Badge>}{p.sku && <small className="muted">SKU {p.sku}</small>}</div>
          <h1>{p.name}</h1>
          {p.brand && <div className="muted">{p.brand}</div>}
          <div className="pdp-price">
            {p.promo ? <>
              <span className="pdp-final">{formatMoney(p.finalPrice)}</span>
              <span className="pdp-list"><s>{formatMoney(p.price)}</s> <b style={{ color: p.promo.color }}>{promoValue(p.promo)}</b></span>
              <span className="pdp-save">Ahorras {formatMoney(p.promo.savings)} con {p.promo.emoji} {p.promo.name}{left ? ` · termina en ${left}` : p.promo.timeTo ? ` · hoy hasta las ${p.promo.timeTo}` : ''}</span>
            </> : <span className="pdp-final">{formatMoney(p.price)}</span>}
            <small className="muted">Precio de venta a crédito</small>
          </div>
          <div className="pdp-stock">
            <strong className={p.stock ? '' : 'text-bad'}>{p.stock ? `${p.stock} disponible${p.stock === 1 ? '' : 's'}` : 'Agotado'}</strong>
            {p.lowStock && p.stock > 0 && <Badge tone="warn">Stock bajo</Badge>}
            {p.sold > 0 && <small className="muted">· {p.sold} entregado{p.sold === 1 ? '' : 's'} en créditos</small>}
          </div>
          {p.stock > 0 && p.active && <Link className="btn btn-primary" to={`/creditos/nuevo?producto=${p.id}`}><MdRequestQuote /> Crear crédito con este producto</Link>}
          {p.description && <div className="pdp-desc"><h3>Descripción</h3><p>{p.description}</p></div>}
          {user.role === 'administrador' && <dl className="stat-list"><div><dt>Costo</dt><dd className="money">{formatMoney(p.cost)}</dd></div><div><dt>Margen</dt><dd>{p.finalPrice ? `${Math.round(((p.finalPrice - p.cost) / p.finalPrice) * 100)} %` : '—'}</dd></div></dl>}
        </div>
      </div>
      <div className="grid grid-2">
        <Card title="Existencias por bodega" icon={<MdWarehouse />} flush>
          {!p.byWarehouse.length ? <Empty>Sin unidades en bodega.</Empty> : (
            <table className="table"><tbody>{p.byWarehouse.map((w) => <tr key={w.warehouseId}><td><strong>{w.name}</strong>{w.site && <small className="muted"> · {w.site}</small>}</td><td className="num"><strong>{w.stock}</strong></td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Próximas promociones" icon={<MdSchedule />}>
          {!p.upcoming.length ? <small className="muted">No hay otras promociones programadas para este producto.</small> : (
            <ul className="pdp-upcoming">{p.upcoming.map((x) => (
              <li key={x.id}><PromoTag p={x} size="sm" /><div><strong>{x.name} · {formatMoney(x.price)}</strong><small className="muted">{whenText(x)}</small></div></li>
            ))}</ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ProductDetail
