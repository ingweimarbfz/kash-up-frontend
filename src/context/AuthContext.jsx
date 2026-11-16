import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Al abrir la app se valida el token guardado.
  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])

  useEffect(() => {
    window.addEventListener('ku:unauthorized', logout)
    return () => window.removeEventListener('ku:unauthorized', logout)
  }, [logout])

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/login', { username, password })
    tokenStore.set(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
