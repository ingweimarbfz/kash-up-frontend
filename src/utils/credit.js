// Etiquetas y tonos de créditos, cuotas y clientes.
export const FREQUENCIES = [
  ['diaria', 'Diaria'], ['semanal', 'Semanal'], ['quincenal', 'Quincenal'], ['mensual', 'Mensual'], ['personalizada', 'Personalizada']
]
export const FREQ_LABEL = Object.fromEntries(FREQUENCIES)
export const METHODS = [
  ['fija', 'Tasa fija', 'Interés plano sobre el capital: cuotas iguales.'],
  ['sobre_saldo', 'Tasa variable (sobre saldo)', 'Cuota fija; el interés se calcula sobre el saldo y baja cada cuota.'],
  ['anticipada', 'Interés anticipado', 'El interés se descuenta al desembolsar; las cuotas solo pagan capital.']
]
export const METHOD_LABEL = Object.fromEntries(METHODS.map(([k, v]) => [k, v]))
export const BASIS_LABEL = { mensual: 'mensual', total: 'por todo el crédito' }
export const rateText = (r) => `${String(r.rate).replace('.', ',')} % ${BASIS_LABEL[r.rateBasis]}`

export const CREDIT_STATUS = { activo: ['Activo', 'brand'], pagado: ['Pagado', 'ok'], renovado: ['Renovado', 'dark'], anulado: ['Anulado', 'muted'], castigado: ['Castigado', 'bad'] }
export const INSTALLMENT_STATUS = { pendiente: ['Pendiente', ''], parcial: ['Parcial', 'warn'], pagada: ['Pagada', 'ok'], anulada: ['Anulada', 'muted'] }
export const CUSTOMER_STATUS = { activo: ['Activo', 'ok'], bloqueado: ['Bloqueado', 'bad'], inactivo: ['Inactivo', 'muted'] }
export const KIND_LABEL = { efectivo: 'Efectivo', producto: 'Producto' }

export const frequencyText = (c) => (c.frequency === 'personalizada' ? `Cada ${c.intervalDays} días` : FREQ_LABEL[c.frequency])

// Pagos
export const PAY_KIND = { cuota: ['Pago de cuota', 'brand'], abono_capital: ['Abono a capital', 'ok'], renovacion: ['Cierre por renovación', 'dark'] }
export const PAY_METHOD = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro', renovacion: 'Renovación' }
export const PAY_STATUS = { aplicado: ['Aplicado', 'ok'], anulado: ['Anulado', 'muted'] }

// Plazo en palabras según la modalidad de cobro y el número de cuotas.
// Ej.: semanal y 4 cuotas → "1 cuota cada semana durante 4 semanas (≈ 1 mes)".
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const monthsText = (days) => {
  if (days < 25) return ''
  const m = Math.max(1, Math.round((days / 30) * 2) / 2)
  return ` (≈ ${String(m).replace('.', ',')} ${m === 1 ? 'mes' : 'meses'})`
}
export const termText = ({ frequency, count, customDays, skipSundays }) => {
  const n = Number(count)
  if (!(n >= 1)) return null
  if (frequency === 'diaria') return `1 cuota cada día${skipSundays ? ' (de lunes a sábado)' : ''} durante ${plural(n, 'día de cobro', 'días de cobro')}${monthsText(skipSundays ? n * 7 / 6 : n)}`
  if (frequency === 'semanal') return `1 cuota cada semana durante ${plural(n, 'semana', 'semanas')}${monthsText(n * 7)}`
  if (frequency === 'quincenal') return `1 cuota cada 15 días durante ${plural(n, 'quincena', 'quincenas')}${monthsText(n * 15)}`
  if (frequency === 'mensual') return `1 cuota cada mes durante ${plural(n, 'mes', 'meses')}`
  const d = Number(customDays)
  return d >= 1 ? `1 cuota cada ${plural(d, 'día', 'días')} durante ${n * d} días${monthsText(n * d)}` : null
}
