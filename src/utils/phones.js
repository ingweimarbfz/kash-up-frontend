// Celulares y teléfonos según el país del negocio: número nacional, solo dígitos, sin el indicativo
// del país. El backend envía la regla en country.phone (/plan/modulos); esta copia es el respaldo
// y la usa la plataforma al crear negocios de otro país.
const RULES = {
  CO: { min: 7, max: 10, example: '3001234567' },
  PA: { min: 7, max: 8, example: '61234567' },
  VE: { min: 10, max: 10, example: '4121234567' },
  EC: { min: 8, max: 9, example: '991234567' },
  PE: { min: 8, max: 9, example: '912345678' },
  BO: { min: 7, max: 8, example: '71234567' },
  BR: { min: 10, max: 11, example: '11912345678' },
  PY: { min: 8, max: 9, example: '981234567' },
  CL: { min: 9, max: 9, example: '912345678' },
  AR: { min: 10, max: 10, example: '1123456789' },
  UY: { min: 8, max: 8, example: '94123456' }
}

export const phoneRuleFor = (code) => RULES[String(code || '').toUpperCase()] || RULES.CO

// Regla del negocio con sesión iniciada (la fija PlanContext al cargar el país).
let current = RULES.CO
export const setPhoneCountry = (country) => { current = country?.phone?.min ? country.phone : phoneRuleFor(country?.code) }
export const phoneRule = () => current

export const digitsText = ({ min, max }) => (min === max ? `${min} dígitos` : max === min + 1 ? `${min} u ${max} dígitos` : `${min} a ${max} dígitos`)
export const isValidPhone = (v, rule = current) => new RegExp(`^[0-9]{${rule.min},${rule.max}}$`).test(String(v ?? ''))

// Atributos del campo: solo números y la longitud del país. Se esparcen en el <input>.
export const phoneProps = (rule = current) => ({ inputMode: 'numeric', minLength: rule.min, maxLength: rule.max, placeholder: rule.example })
