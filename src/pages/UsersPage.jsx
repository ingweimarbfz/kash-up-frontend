import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MdAdd, MdEdit, MdSearch, MdManageAccounts } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../api/client'
import { Avatar, Badge, Card, Empty, Field, Modal, PageHead, Spinner, useToast } from '../components/ui'
import { DocIcon, PhotoInput } from '../components/forms'
import { ROLE_LABELS } from '../utils/nav'
import { formatDateTime } from '../utils/format'

const EMPTY = { identification: '', name: '', lastName: '', username: '', email: '', phone: '', role: 'prestamista', password: '', resetPassword: false, active: true, siteId: '', photoUrl: null, avatarUrl: null, idPhotoUrl: null, idPhotoBackUrl: null }
const ROLE_TONE = { administrador: 'dark', prestamista: 'brand', cliente: '' }

const UserForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState(editing ? { ...EMPTY, ...initial, siteId: initial.siteId ?? '', password: '' } : { ...EMPTY, siteId: getSiteFilter() || '' })
  const [sites, setSites] = useState([])
  useEffect(() => { api.get('/sedes', { params: { activas: 1, sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [])
  // Las fotos no vienen en la lista: se cargan al abrir el usuario.
  const [loadingPhotos, setLoadingPhotos] = useState(editing)
  useEffect(() => {
    if (!editing) return
    api.get(`/usuarios/${initial.id}`).then(({ data }) => setForm((f) => ({ ...f, photoUrl: data.photoUrl, idPhotoUrl: data.idPhotoUrl, idPhotoBackUrl: data.idPhotoBackUrl })))
      .catch(() => {}).finally(() => setLoadingPhotos(false))
  }, [editing, initial?.id])
  const isClient = form.role === 'cliente'
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isClient && (!form.photoUrl || !form.idPhotoUrl || !form.idPhotoBackUrl)) return setError('Toma la foto de la persona y la de su documento por ambas caras.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/usuarios/${initial.id}`, form) : await api.post('/usuarios', form)
      onSaved(data, editing)
    } catch (err) {
      setError(errorMessage(err))
    } finally { setSaving(false) }
  }

  return (
    <Modal size="lg" title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="user-form" onSubmit={submit} className="form-grid" noValidate>
        {!isClient && (
          <div className="span-2 photo-row">
            <Field label="Foto de la persona" required>{loadingPhotos ? <Spinner /> : <PhotoInput value={form.photoUrl} withThumb capture="user" label="Tomar foto" onChange={({ photo, thumb }) => setForm((f) => ({ ...f, photoUrl: photo, avatarUrl: thumb }))} />}</Field>
            <Field label="Documento · frente" required>{loadingPhotos ? <Spinner /> : <PhotoInput doc value={form.idPhotoUrl} label="Frente" placeholder={<DocIcon side="front" />} onChange={(v) => setForm((f) => ({ ...f, idPhotoUrl: v }))} />}</Field>
            <Field label="Documento · reverso" required>{loadingPhotos ? <Spinner /> : <PhotoInput doc value={form.idPhotoBackUrl} label="Reverso" placeholder={<DocIcon side="back" />} onChange={(v) => setForm((f) => ({ ...f, idPhotoBackUrl: v }))} />}</Field>
          </div>
        )}
        <Field label="Rol" htmlFor="role" required>
          <select id="role" value={form.role} onChange={set('role')}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {form.role === 'prestamista' && (
          <Field label="Sede (cobro)" htmlFor="siteId" hint="La ciudad o cobro donde trabaja este rutero">
            <select id="siteId" value={form.siteId} onChange={set('siteId')}><option value="">Sin sede</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>)}</select>
          </Field>
        )}
        <Field label="Identificación" htmlFor="identification" required>
          <input id="identification" value={form.identification} onChange={set('identification')} inputMode="numeric" placeholder="1065123456" />
        </Field>
        <Field label="Nombres" htmlFor="name" required><input id="name" value={form.name} onChange={set('name')} /></Field>
        <Field label="Apellidos" htmlFor="lastName"><input id="lastName" value={form.lastName} onChange={set('lastName')} /></Field>
        <Field label="Usuario" htmlFor="username" required hint="Con este nombre inicia sesión">
          <input id="username" value={form.username} onChange={set('username')} autoCapitalize="none" placeholder="nombre.apellido" />
        </Field>
        {isClient || !editing ? (
          <Field label="Contraseña" htmlFor="password" hint={isClient ? 'El cliente siempre entra con su número de identificación' : 'Es el número de identificación. Al entrar la puede cambiar en "Mi perfil"'}>
            <input id="password" value={form.identification} readOnly disabled placeholder="Número de identificación" />
          </Field>
        ) : (
          <Field label="Nueva contraseña" htmlFor="password" hint="Déjala vacía para no cambiarla">
            <input id="password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" disabled={form.resetPassword} />
          </Field>
        )}
        <Field label="Celular" htmlFor="phone"><input id="phone" value={form.phone || ''} onChange={set('phone')} inputMode="numeric" placeholder="3001234567" /></Field>
        <Field label="Correo" htmlFor="email"><input id="email" type="email" value={form.email || ''} onChange={set('email')} placeholder="nombre@correo.com" /></Field>
        {editing && !isClient && <label className="check span-2"><input type="checkbox" checked={form.resetPassword} onChange={set('resetPassword')} /> Volver la contraseña al número de identificación</label>}
        <label className="check span-2"><input type="checkbox" checked={form.active} onChange={set('active')} /> Usuario activo</label>
        {error && <div className="alert bad span-2">{error}</div>}
      </form>
    </Modal>
  )
}

const UsersPage = () => {
  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [editing, setEditing] = useState(null)
  const [toast, toastNode] = useToast()

  const load = useCallback(() => {
    api.get('/usuarios').then(({ data }) => setUsers(data)).catch((e) => { setUsers([]); toast(errorMessage(e), 'bad') })
  }, [toast])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (users || []).filter((u) => (!role || u.role === role) &&
    (!query || `${u.fullName} ${u.username} ${u.identification}`.toLowerCase().includes(query.toLowerCase()))), [users, query, role])

  const onSaved = (u, wasEditing) => {
    setUsers((list) => (wasEditing ? list.map((x) => (x.id === u.id ? u : x)) : [...list, u]))
    setEditing(null)
    toast(wasEditing ? 'Usuario actualizado' : 'Usuario creado')
  }

  return (
    <div className="stack">
      <PageHead title="Usuarios" subtitle="Administradores, prestamistas y clientes con acceso a la app.">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><MdAdd /> Nuevo usuario</button>
      </PageHead>
      <Card flush>
        <div className="toolbar">
          <div className="input-icon grow"><MdSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, usuario o identificación" /></div>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {!users ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !shown.length ? <Empty icon={<MdManageAccounts />}>No hay usuarios con ese filtro.</Empty>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Usuario</th><th>Rol</th><th className="hide-sm">Contacto</th><th className="hide-md">Último ingreso</th><th>Estado</th><th /></tr></thead>
                  <tbody>
                    {shown.map((u) => (
                      <tr key={u.id}>
                        <td><div className="person"><Avatar user={u} size="sm" /><div><strong>{u.fullName}</strong><small>{u.username} · {u.identification}</small></div></div></td>
                        <td><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>{u.site && <><br /><small>{u.site.name}</small></>}</td>
                        <td className="hide-sm"><small>{u.phone || '—'}<br />{u.email || ''}</small></td>
                        <td className="hide-md"><small>{formatDateTime(u.lastLoginAt)}</small></td>
                        <td>{u.active ? <Badge tone="ok">Activo</Badge> : <Badge tone="muted">Inactivo</Badge>}</td>
                        <td className="right"><button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(u)} aria-label={`Editar ${u.fullName}`}><MdEdit /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
      </Card>
      {editing && <UserForm initial={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {toastNode}
    </div>
  )
}

export default UsersPage
