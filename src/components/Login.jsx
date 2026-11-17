import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdErrorOutline, MdRequestQuote, MdRoute, MdInventory2, MdInsights } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'
import { Spinner } from './ui'
import { BrandLogo } from './Logo'
import { BRAND, BRAND_TAGLINE } from '../utils/brand'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', pass: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim() || !form.pass) { setError('Ingresa tu usuario y contraseña.'); return }
    setLoading(true)
    try {
      await login(form.username.trim(), form.pass)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'No se pudo iniciar sesión.'))
      setForm((f) => ({ ...f, pass: '' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <section className="login-hero">
        <BrandLogo size={40} onDark />
        <div>
          <span className="login-tag">{BRAND_TAGLINE}</span>
          <h2>Tu cartera bajo control, cuota a cuota.</h2>
          <p>Créditos en efectivo y de productos, rutas de cobro y recaudo diario en un solo lugar, desde el computador o el celular.</p>
          <div className="login-points">
            <div><MdRequestQuote /><span><b>Créditos</b> · tasa fija, sobre saldo o anticipada, con cuotas diarias, semanales, quincenales o mensuales.</span></div>
            <div><MdRoute /><span><b>Cobro en campo</b> · rutero automático, pagos, abonos a capital y cierre de caja.</span></div>
            <div><MdInventory2 /><span><b>Productos a crédito</b> · inventario, descuentos y entrega vinculada al crédito.</span></div>
            <div><MdInsights /><span><b>Dashboards</b> · cartera, mora y recaudo para cada rol.</span></div>
          </div>
        </div>
        <div className="login-foot">© {new Date().getFullYear()} {BRAND} · Información protegida (Ley 1581 de 2012)</div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-brand"><BrandLogo size={38} /></div>
          <h1>Iniciar sesión</h1>
          <p>Ingresa con el usuario que te asignó el administrador.</p>

          <div className="field">
            <label htmlFor="username">Usuario</label>
            <div className="input-icon">
              <MdPerson />
              <input id="username" name="username" autoComplete="username" autoFocus autoCapitalize="none" value={form.username} onChange={handleChange} placeholder="tu.usuario" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <div className="input-icon">
              <MdLock />
              <input id="pass" name="pass" type={showPass ? 'text' : 'password'} autoComplete="current-password" value={form.pass} onChange={handleChange} placeholder="••••••••" />
              <button type="button" className="btn btn-ghost btn-icon addon" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPass ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          {error && <div className="alert bad" role="alert"><MdErrorOutline /> <span>{error}</span></div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><Spinner /> Ingresando…</> : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default Login
