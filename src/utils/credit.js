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

export const CREDIT_STATUS = { activo: ['Activo', 'brand'], pagado: ['Pagado', 'ok'], anulado: ['Anulado', 'muted'], castigado: ['Castigado', 'bad'] }
export const INSTALLMENT_STATUS = { pendiente: ['Pendiente', ''], parcial: ['Parcial', 'warn'], pagada: ['Pagada', 'ok'], anulada: ['Anulada', 'muted'] }
export const CUSTOMER_STATUS = { activo: ['Activo', 'ok'], bloqueado: ['Bloqueado', 'bad'], inactivo: ['Inactivo', 'muted'] }
export const DOC_TYPES = ['CC', 'CE', 'TI', 'PA', 'PPT', 'NIT']
export const KIND_LABEL = { efectivo: 'Efectivo', producto: 'Producto' }

export const frequencyText = (c) => (c.frequency === 'personalizada' ? `Cada ${c.intervalDays} días` : FREQ_LABEL[c.frequency])
