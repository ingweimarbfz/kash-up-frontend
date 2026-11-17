import React, { useEffect, useMemo, useState } from 'react'
import {
  MdCheck, MdRemove, MdArrowForward, MdStar, MdRequestQuote, MdPayments, MdRoute, MdInventory2, MdAccountBalanceWallet, MdTwoWheeler,
  MdBarChart, MdMenuBook, MdNotificationsActive, MdPhoneIphone, MdCloudDone, MdShield, MdPublic, MdLocationOn, MdTrendingUp
} from 'react-icons/md'
import api from '../api/client'
import { BrandLogo } from '../components/Logo'
import { Spinner } from '../components/ui'
import { CountrySelect, Flag, limitText, moneyIn } from '../utils/countries'
import './pricing.css'

// Contacto comercial: WhatsApp si está configurado, si no, correo.
const SALES_WA = import.meta.env.VITE_SALES_WHATSAPP || ''
const SALES_MAIL = import.meta.env.VITE_SALES_EMAIL || ''
const contactLink = (text) => (SALES_WA ? `https://wa.me/${SALES_WA}?text=${encodeURIComponent(text)}` : `mailto:${SALES_MAIL}?subject=${encodeURIComponent(text)}`)

const MODULES = [
  [MdRequestQuote, 'Créditos a tu medida', 'Cuotas diarias, semanales, quincenales o mensuales con interés fijo, sobre saldo o anticipado, y simulador antes de prestar.'],
  [MdPayments, 'Pagos con recibo', 'Cada cobro con su recibo y el saldo al día. Abonos a capital, renovaciones y anulaciones con motivo.'],
  [MdRoute, 'Rutas y cobro en calle', 'Rutero del día, visitas sin pago, gastos con soporte y cierre de jornada con el cuadre del efectivo.'],
  [MdInventory2, 'Productos a crédito', 'Catálogo con fotos, bodegas por sede, existencias y promociones por fechas y horarios.'],
  [MdAccountBalanceWallet, 'Capital y cajas', 'El capital del negocio, la caja de cada prestamista y las entregas de dinero, siempre cuadrados.'],
  [MdTwoWheeler, 'Flota de cobro', 'Motos y carros con SOAT, tecnomecánica, tanqueos y mantenimientos; el conductor ve su vehículo.'],
  [MdMenuBook, 'Bitácora del prestamista', 'Todo lo que movió dinero en el día, con alertas de faltantes, anulaciones y cobros fuera de horario.'],
  [MdBarChart, 'Reportes y avisos', 'Informes en PDF de recaudo, colocación y cartera, y avisos por Telegram para cada sede.']
]
const WHY = [[MdPhoneIphone, 'Funciona en el celular del prestamista'], [MdCloudDone, 'En la nube, sin instalar nada'], [MdShield, 'Cada negocio con su información aparte'], [MdPublic, 'Precios en la moneda de tu país']]
const LIMIT_ROWS = [['sites', 'Sedes'], ['admins', 'Administradores'], ['lenders', 'Prestamistas'], ['drivers', 'Conductores'], ['customers', 'Clientes'], ['clientUsers', 'Clientes con acceso al portal']]
const GROUPS = { cartera: 'Cartera', productos: 'Productos', cobro: 'Cobro en calle', flota: 'Flota', control: 'Control', clientes: 'Clientes' }

// Ilustración del día de cobro (datos de muestra).
const RouteMock = ({ fmt }) => (
  <div className="pr-mock" aria-hidden="true">
    <div className="pr-mock-bar"><span /><span /><span /><em>Mi ruta · hoy</em></div>
    <div className="pr-mock-body">
      <div className="pr-mock-kpis">
        <div><small>Recaudo del día</small><b>{fmt(1250000)}</b><i className="up"><MdTrendingUp /> 86 % de la meta</i></div>
        <div><small>Visitas</small><b>34 / 40</b><i>6 pendientes</i></div>
        <div><small>En mora</small><b>4</b><i className="warn">clientes</i></div>
      </div>
      <div className="pr-mock-stops">
        {[['Marta Gómez', 'Cuota 12 de 30', 45000, 'ok'], ['Tienda La Esquina', 'Cuota 5 de 20', 60000, 'ok'], ['Jorge Ríos', '2 cuotas atrasadas', 90000, 'bad'], ['Ana Pardo', 'Cuota 18 de 24', 35000, '']].map(([n, s, v, t], i) => (
          <div key={n} className={`pr-stop ${t}`}><span className="n">{i + 1}</span><div><b>{n}</b><small><MdLocationOn /> {s}</small></div><strong>{fmt(v)}</strong></div>
        ))}
      </div>
    </div>
  </div>
)

const pickInitial = () => {
  const q = new URLSearchParams(window.location.search).get('pais')
  if (q) return q.toUpperCase()
  try { return localStorage.getItem('ku_pais') || 'CO' } catch { return 'CO' }
}

// Página de presentación de planes para clientes (KU-026): precios en la moneda del país elegido.
const PricingPage = () => {
  const [code, setCode] = useState(pickInitial)
  const [d, setD] = useState(null)
  const [cycle, setCycle] = useState('mensual')
  useEffect(() => {
    api.get('/publico/precios', { params: { pais: code } }).then(({ data }) => setD(data)).catch(() => setD((x) => x || { plans: [], countries: [], features: [], country: null }))
    try { localStorage.setItem('ku_pais', code) } catch { /* sin almacenamiento */ }
    const url = new URL(window.location.href); url.searchParams.set('pais', code); window.history.replaceState(null, '', url)
  }, [code])
  useEffect(() => { const t = document.title; document.title = 'Planes y precios · QuontUp360'; return () => { document.title = t } }, [])
  const groups = useMemo(() => (d ? Object.entries(GROUPS).map(([g, l]) => [g, l, d.features.filter((f) => f.group === g)]).filter(([, , fs]) => fs.length) : []), [d])
  if (!d) return <div className="pr pr-loading"><Spinner /></div>
  const c = d.country
  const fmt = (v) => moneyIn(v, c?.currency || 'COP', c?.locale || 'es-CO')
  // Los montos de la ilustración se escalan a la moneda del país (proporcional al precio del primer plan).
  const ratio = d.plans[0] ? d.plans[0].priceMonth / 89900 : 1
  const mockFmt = (v) => { const x = v * ratio; const step = x >= 10000 ? 1000 : x >= 100 ? 5 : 1; return fmt(Math.round(x / step) * step) }
  const price = (p) => (cycle === 'anual' ? p.priceYear / 12 : p.priceMonth)
  const disc = d.plans[0]?.annualDiscount ?? 16.7
  return (
    <div className="pr">
      <header className="pr-nav">
        <div className="pr-wrap pr-nav-in">
          <BrandLogo size={30} onDark />
          <nav><a href="#modulos">Módulos</a><a href="#planes">Planes</a><a href="#comparar">Comparar</a></nav>
          <div className="pr-nav-right">
            <CountrySelect countries={d.countries} value={c?.code} onChange={setCode} dark />
            <a className="pr-login" href="/login">Ingresar</a>
          </div>
        </div>
      </header>

      <div className="pr-wrap">
        <section className="pr-hero">
          <div>
            <div className="pr-eyebrow">Software para negocios de préstamos y ventas a crédito</div>
            <h1>Tu cartera bajo control, cuota a cuota.</h1>
            <p className="pr-lead">Créditos en efectivo y de productos, rutas de cobro, cajas de cada prestamista y reportes en un solo lugar. Desde el computador o el celular, en {c?.name || 'tu país'} y en {c?.currency || 'tu moneda'}.</p>
            <div className="pr-ctas">
              <a className="pr-cta" href="#planes">Ver planes en {c?.currency} <MdArrowForward /></a>
              <a className="pr-ghost" href={contactLink(`Quiero una demostración de QuontUp360 (${c?.name || ''})`)} target="_blank" rel="noreferrer">Solicitar una demostración</a>
            </div>
            <div className="pr-why">{WHY.map(([I, t]) => <span key={t}><I /> {t}</span>)}</div>
          </div>
          <RouteMock fmt={mockFmt} />
        </section>

        <section className="pr-modules" id="modulos">
          <h2>Todo lo que necesita tu negocio de crédito</h2>
          <div className="pr-mod-grid">{MODULES.map(([I, t, x]) => <div key={t} className="pr-mod"><span><I /></span><b>{t}</b><p>{x}</p></div>)}</div>
        </section>

        <section id="planes">
          <div className="pr-top">
            <div>
              <div className="pr-eyebrow">Planes y precios · <Flag code={c?.code} size={12} /> {c?.name} · {c?.currency}</div>
              <h2>Un plan para cada tamaño de cartera</h2>
            </div>
            <div className="pr-cycle" role="tablist" aria-label="Ciclo de pago">
              <button type="button" className={cycle === 'mensual' ? 'on' : ''} onClick={() => setCycle('mensual')}>Mensual</button>
              <button type="button" className={cycle === 'anual' ? 'on' : ''} onClick={() => setCycle('anual')}>Anual <em>−{String(disc).replace('.', ',')} %</em></button>
            </div>
          </div>
          {!d.plans.length ? <p className="pr-lead">Pronto tendremos planes para {c?.name}. Escríbenos y te contamos.</p> : (
            <div className="pr-tiers">
              {d.plans.map((p) => (
                <div key={p.id} className={`pr-tier${p.highlight ? ' hl' : ''}`}>
                  {p.highlight && <div className="ribbon"><MdStar /> {p.badge || 'Recomendado'}</div>}
                  <h3>{p.name}</h3>
                  <p className="tag">{p.tagline}</p>
                  <div className="amount">{fmt(price(p))}<small>/mes</small></div>
                  <div className="note">{cycle === 'anual' ? `Pago anual de ${fmt(p.priceYear)}` : 'Pago mensual'} · {p.currency}{p.trialDays ? ` · ${p.trialDays} días de prueba` : ''}</div>
                  <a className="cta" href={contactLink(`Quiero el plan ${p.name} (${cycle}) de QuontUp360 en ${c?.name}`)} target="_blank" rel="noreferrer">Elegir {p.name} <MdArrowForward /></a>
                  <hr />
                  <ul>{p.bullets.map((b) => <li key={b}><MdCheck /> {b}</li>)}</ul>
                  <div className="foot">Soporte: {p.support || 'WhatsApp'}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!!d.plans.length && (
          <section className="pr-compare" id="comparar">
            <h2>Compara los planes</h2>
            <div className="pr-table-wrap">
              <table>
                <thead><tr><th>Incluye</th>{d.plans.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
                <tbody>
                  <tr><td>Precio {cycle === 'anual' ? '(mes, pago anual)' : 'mensual'}</td>{d.plans.map((p) => <td key={p.id}><b>{fmt(price(p))}</b></td>)}</tr>
                  {LIMIT_ROWS.map(([k, l]) => <tr key={k}><td>{l}</td>{d.plans.map((p) => <td key={p.id}>{p.limits[k] === 0 ? <MdRemove className="no" /> : limitText(p.limits[k])}</td>)}</tr>)}
                  {groups.map(([g, l, fs]) => (
                    <React.Fragment key={g}>
                      <tr className="grp"><td colSpan={d.plans.length + 1}>{l}</td></tr>
                      {fs.map((f) => <tr key={f.key}><td title={f.description}>{f.label}</td>{d.plans.map((p) => <td key={p.id}>{p.features.includes(f.key) ? <MdCheck className="yes" /> : <MdRemove className="no" />}</td>)}</tr>)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="pr-countries">
          <h3><MdNotificationsActive /> QuontUp360 en Latinoamérica</h3>
          <div className="pr-flag-list">
            {d.countries.map((x) => (
              <button key={x.code} type="button" className={x.code === c?.code ? 'on' : ''} onClick={() => { setCode(x.code); document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' }) }}>
                <Flag code={x.code} size={16} /> {x.name} <b>{x.currency}</b>
              </button>
            ))}
          </div>
        </section>
        <p className="pr-legal">Precios en {c?.currencyName} ({c?.currency}) para negocios en {c?.name}. Impuestos según la ley de cada país. © {new Date().getFullYear()} QuontUp360.</p>
      </div>
    </div>
  )
}

export default PricingPage
