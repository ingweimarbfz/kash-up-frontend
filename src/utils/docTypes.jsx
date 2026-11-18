import React from 'react'
import { usePlan } from '../context/PlanContext'

// Tipos de documento de identidad según el país del negocio. El backend envía la lista en
// country.docTypes (/plan/modulos); esta copia es el respaldo y la usa la plataforma al crear negocios.
// El primero de cada lista es el que se propone por defecto.
const LISTS = {
  CO: [['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería'], ['TI', 'Tarjeta de identidad'], ['PPT', 'Permiso por protección temporal'], ['PA', 'Pasaporte'], ['NIT', 'NIT']],
  PA: [['CIP', 'Cédula de identidad personal'], ['CR', 'Carné de residente'], ['PA', 'Pasaporte'], ['RUC', 'RUC']],
  VE: [['V', 'Cédula de identidad (venezolano)'], ['E', 'Cédula de identidad (extranjero)'], ['PA', 'Pasaporte'], ['RIF', 'RIF']],
  EC: [['CI', 'Cédula de identidad'], ['PA', 'Pasaporte'], ['RUC', 'RUC']],
  PE: [['DNI', 'DNI'], ['CE', 'Carné de extranjería'], ['CPP', 'Carné de permiso temporal de permanencia'], ['PA', 'Pasaporte'], ['RUC', 'RUC']],
  BO: [['CI', 'Cédula de identidad'], ['CE', 'Cédula de extranjero'], ['PA', 'Pasaporte'], ['NIT', 'NIT']],
  BR: [['CPF', 'CPF'], ['RG', 'RG (carteira de identidade)'], ['CNH', 'CNH (carteira de motorista)'], ['RNM', 'RNM (estrangeiro)'], ['PA', 'Passaporte'], ['CNPJ', 'CNPJ']],
  PY: [['CI', 'Cédula de identidad'], ['PA', 'Pasaporte'], ['RUC', 'RUC']],
  CL: [['RUN', 'RUN (cédula de identidad)'], ['PA', 'Pasaporte'], ['RUT', 'RUT']],
  AR: [['DNI', 'DNI'], ['CUIL', 'CUIL'], ['PA', 'Pasaporte'], ['CUIT', 'CUIT']],
  UY: [['CI', 'Cédula de identidad'], ['PA', 'Pasaporte'], ['RUT', 'RUT']]
}

export const docTypesFor = (code) => (LISTS[String(code || '').toUpperCase()] || LISTS.CO).map(([c, label]) => ({ code: c, label }))

// Tipos del país del negocio con sesión iniciada.
export const useDocTypes = () => {
  const { country } = usePlan()
  return country?.docTypes?.length ? country.docTypes : docTypesFor(country?.code)
}
export const useDefaultDocType = () => useDocTypes()[0].code

// Selector del tipo de documento. Si la persona ya tenía guardado un tipo que no es del país
// (por ejemplo, CC en un negocio de Brasil), se muestra para no perderlo y se puede cambiar.
export const DocTypeSelect = ({ id, value, onChange, types: given, ...rest }) => {
  const fromPlan = useDocTypes()
  const types = given || fromPlan
  const current = value || types[0].code
  const known = types.some((t) => t.code === current)
  return (
    <select id={id} value={current} onChange={(e) => onChange(e.target.value)} {...rest}>
      {!known && <option value={current}>{current} (registrado antes)</option>}
      {types.map((t) => <option key={t.code} value={t.code}>{t.label.startsWith(t.code) ? t.label : `${t.code} · ${t.label}`}</option>)}
    </select>
  )
}
