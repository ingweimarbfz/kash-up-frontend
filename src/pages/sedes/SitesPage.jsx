import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAdd, MdEdit, MdGroups, MdPlace, MdArrowForward, MdAccountBalance } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, Modal, PageHead, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import { SiteForm } from '../inventario/common'

// Asignar ruteros (prestamistas) a una sede.
const LendersModal = ({ site, onClose, onSaved }) => {
  const [all, setAll] = useState(null)
  const [sel, setSel] = useState(() => new Set(site.lenders.map((l) => l.id)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/usuarios', { params: { rol: 'prestamista', sede: undefined } }).then(({ data }) => setAll(data)).catch((e) => setError(errorMessage(e))) }, [])
  const toggle = (id) => setSel((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x })
  const save = async () => {
    setSaving(true); setError('')
    try { await api.put(`/sedes/${site.id}/ruteros`, { lenderIds: [...sel] }); onSaved() } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={`Ruteros de ${site.name}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" disabled={saving || !all} onClick={save}>{saving && <Spinner />} Guardar</button></>}>
      <div className="stack">
        <small className="hint">Marca los prestamistas que cobran en esta sede. Si un rutero estaba en otra sede, pasa a esta. Sus clientes, créditos y caja lo acompañan.</small>
        {!all ? <Spinner /> : !all.length ? <Empty>No hay prestamistas. Créalos en Usuarios.</Empty> : (
          <div className="check-list">
            {all.map((u) => (
              <label key={u.id} className="check">
                <input type="checkbox" checked={sel.has(u.id)} onChange={() => toggle(u.id)} />
                <span>{u.fullName}{!u.active && ' (inactivo)'}{u.site && u.site.id !== site.id && <small className="muted"> · hoy en {u.site.name}</small>}</span>
              </label>
            ))}
          </div>
        )}
        {error && <div className="alert bad">{error}</div>}
      </div>
    </Modal>
  )
}

// Tarjeta con los números de una sede (también la usa el dashboard en "Todas las sedes").
export const SiteStats = ({ r }) => (
  <div className="site-stats">
    <div><small>Cartera</small><strong>{formatMoney(r.portfolio)}</strong></div>
    <div><small>En mora</small><strong className={r.overdue ? 'text-bad' : ''}>{formatMoney(r.overdue)}</strong>{r.portfolio > 0 && <small>{String(r.overduePct).replace('.', ',')} %</small>}</div>
    <div><small>Recaudo hoy</small><strong>{formatMoney(r.collectedToday)}</strong></div>
    <div><small>Recaudo del mes</small><strong>{formatMoney(r.collectedMonth)}</strong></div>
    <div><small>Colocado del mes</small><strong>{formatMoney(r.placedMonth)}</strong></div>
    <div><small>Cajas de ruteros</small><strong>{formatMoney(r.cash)}</strong></div>
  </div>
)

export const goToSite = (id, navigate) => { window.dispatchEvent(new CustomEvent('ku:set-site', { detail: id })); navigate('/') }

// Sedes: cobros en otras ciudades, cada uno con sus ruteros y, si se quiere, su propio capital.
const SitesPage = () => {
  const navigate = useNavigate()
  const [sites, setSites] = useState(null)
  const [stats, setStats] = useState({ rows: [] })
  const [modal, setModal] = useState(null)
  const [toast, toastNode] = useToast()
  const load = useCallback(() => {
    api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch((e) => { toast(errorMessage(e), 'bad'); setSites([]) })
    api.get('/dashboard/sedes', { params: { sede: undefined } }).then(({ data }) => setStats(data)).catch(() => {})
  }, [toast])
  useEffect(() => { load() }, [load])
  if (!sites) return <div className="splash"><Spinner /></div>
  const loose = stats.rows.find((r) => r.id === null)
  return (
    <div className="stack">
      <PageHead title="Sedes" subtitle="Cobros en otras ciudades: cada sede tiene sus ruteros y puede usar el capital del negocio o uno aparte.">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ site: {} })}><MdAdd /> Nueva sede</button>
      </PageHead>
      {loose && <div className="alert warn"><MdGroups /> <span>{loose.lenders} rutero(s) sin sede. Asígnalos con el botón "Ruteros" de una sede.</span></div>}
      {!sites.length ? <Card><Empty icon={<MdPlace />}>Aún no hay sedes.</Empty></Card> : (
        <div className="site-grid">
          {sites.map((s) => {
            const r = stats.rows.find((x) => x.id === s.id)
            return (
              <Card key={s.id} className="site-card" title={s.name} subtitle={[s.city, s.address].filter(Boolean).join(' · ') || null} icon={<MdPlace />}
                actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ site: s })}><MdEdit /> Editar</button>}>
                <div className="chip-list">
                  {!s.active && <Badge tone="muted">Inactiva</Badge>}
                  <Badge tone={s.ownCapital ? 'brand' : ''}><MdAccountBalance /> {s.ownCapital ? `Capital aparte${r?.capital != null ? ` · ${formatMoney(r.capital)}` : ''}` : 'Capital del negocio'}</Badge>
                </div>
                {r && <SiteStats r={r} />}
                <div className="stack" style={{ gap: 6 }}>
                  <small className="muted">Ruteros ({s.lenders.length})</small>
                  <div className="chip-list">{s.lenders.length ? s.lenders.map((l) => <Badge key={l.id} tone={l.active ? 'dark' : 'muted'}>{l.fullName}</Badge>) : <small>Sin ruteros asignados</small>}</div>
                </div>
                <div className="row-between" style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-sm" onClick={() => setModal({ lenders: s })}><MdGroups /> Ruteros</button>
                  {s.active && <button type="button" className="btn btn-sm btn-primary" onClick={() => goToSite(s.id, navigate)}>Ver esta sede <MdArrowForward /></button>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {modal?.site && <SiteForm initial={modal.site.id ? modal.site : null} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Sede actualizada' : `Sede ${d.name} creada`) }} />}
      {modal?.lenders && <LendersModal site={modal.lenders} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Ruteros actualizados') }} />}
      {toastNode}
    </div>
  )
}

export default SitesPage
