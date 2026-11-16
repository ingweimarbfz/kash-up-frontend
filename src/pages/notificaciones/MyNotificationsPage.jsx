import React, { useEffect, useState } from 'react'
import { MdLink, MdNotificationsOff } from 'react-icons/md'
import { FaTelegramPlane } from 'react-icons/fa'
import api, { errorMessage } from '../../api/client'
import { Badge, Card, Empty, PageHead, Spinner, useToast } from '../../components/ui'

// Grupos de Telegram a los que el usuario puede unirse (el rutero, los de su sede).
const MyNotificationsPage = () => {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const [toast, toastNode] = useToast()
  useEffect(() => { api.get('/mis-notificaciones').then(({ data: d }) => setData(d)).catch((e) => { toast(errorMessage(e), 'bad'); setData({ enabled: false, groups: [] }) }) }, [toast])
  if (!data) return <div className="splash"><Spinner /></div>
  const join = async (g) => {
    setBusy(g.id)
    try { const { data: r } = await api.post(`/mis-notificaciones/${g.id}/unirme`); window.open(r.url, '_blank', 'noopener'); toast('Enlace abierto en Telegram. Es personal y vence en 24 horas.') } catch (e) { toast(errorMessage(e), 'bad') }
    setBusy(null)
  }
  return (
    <div className="stack">
      <PageHead title="Mis notificaciones" subtitle="Únete a los grupos de Telegram donde llegan los avisos de tu sede." />
      {!data.enabled || !data.groups.length ? (
        <Card><Empty icon={<MdNotificationsOff />}>{data.enabled ? 'Todavía no hay grupos de Telegram para tu sede. El administrador los crea en Notificaciones.' : 'Las notificaciones por Telegram no están activas en tu negocio.'}</Empty></Card>
      ) : (
        <div className="tg-groups">
          {data.groups.map((g) => (
            <div key={g.id} className="tg-group">
              <div className="row-between"><strong><FaTelegramPlane style={{ color: '#229ED9', verticalAlign: -2 }} /> {g.title}</strong><Badge tone="brand">{g.sectionLabel}</Badge></div>
              <small className="muted">{g.hint}</small>
              <small className="muted">📍 {g.siteName}</small>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy === g.id} onClick={() => join(g)}>{busy === g.id ? <Spinner /> : <MdLink />} Unirme al grupo</button>
            </div>
          ))}
        </div>
      )}
      {toastNode}
    </div>
  )
}

export default MyNotificationsPage
