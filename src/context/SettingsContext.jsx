import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const DEFAULTS = { businessName: 'KashUp', shortName: null, logoUrl: null, currency: 'COP' }
const SettingsContext = createContext({ settings: DEFAULTS, refresh: () => {} })

// Configuración del negocio (nombre, logo). Se carga cuando hay sesión.
export const SettingsProvider = ({ children }) => {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)
  const refresh = useCallback(() => {
    if (!user) { setSettings(DEFAULTS); return }
    api.get('/configuracion').then(({ data }) => setSettings({ ...DEFAULTS, ...data })).catch(() => {})
  }, [user])
  useEffect(() => { refresh() }, [refresh])
  const value = useMemo(() => ({ settings, setSettings, refresh }), [settings, refresh])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
