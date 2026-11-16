import React, { useEffect, useState } from 'react'
import { MdHistory } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Badge, Card, Empty, PageHead, Spinner } from '../components/ui'
import { formatDateTime } from '../utils/format'

const ACTIONS = { login: 'Inicio de sesión', crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó', cambio_contrasena: 'Cambió la contraseña' }
const TONES = { login: '', crear: 'ok', editar: 'dark', eliminar: 'bad', cambio_contrasena: 'warn' }

const AuditPage = () => {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/auditoria', { params: { limit: 100 } }).then(({ data }) => setRows(data)).catch((e) => { setRows([]); setError(errorMessage(e)) }) }, [])
  return (
    <div className="stack">
      <PageHead title="Auditoría" subtitle="Últimas 100 acciones registradas en el negocio." />
      {error && <div className="alert bad">{error}</div>}
      <Card flush>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>
          : !rows.length ? <Empty icon={<MdHistory />}>Todavía no hay movimientos.</Empty>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Sobre</th><th className="hide-sm">IP</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td><small>{formatDateTime(r.createdAt)}</small></td>
                        <td>{r.user ? <><strong>{r.user.fullName}</strong><br /><small>{r.user.username}</small></> : '—'}</td>
                        <td><Badge tone={TONES[r.action]}>{ACTIONS[r.action] || r.action}</Badge></td>
                        <td>{r.entity}{r.entityId ? ` #${r.entityId}` : ''}</td>
                        <td className="hide-sm"><small>{r.ip || '—'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
      </Card>
    </div>
  )
}

export default AuditPage
