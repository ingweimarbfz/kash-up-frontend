// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin desfases de zona horaria.
export const formatDate = (value) => {
  if (!value) return '—'
  const [y, m, d] = String(value).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : String(value)
}

export const formatDateTime = (value) =>
  value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value)) : '—'

export const formatMoney = (value) =>
  value === null || value === undefined || value === ''
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

// Cifras grandes en formato corto para ejes de gráficas: 1.2 M, 350 mil.
export const formatShort = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')} M`
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} mil`
  return String(v)
}

export const orDash = (value) => (value === null || value === undefined || value === '' ? '—' : value)
