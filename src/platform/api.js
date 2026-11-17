import axios from 'axios'
import { API_BASE } from '../api/client'

// Sesión de la plataforma de KashUp: token aparte del de la app.
const KEY = 'ku_plt_token'
export const pltToken = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(KEY, t) } catch { /* sin almacenamiento */ } },
  clear: () => { try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }
}

const papi = axios.create({ baseURL: API_BASE, timeout: 30000 })
papi.interceptors.request.use((c) => {
  const t = pltToken.get()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
papi.interceptors.response.use((r) => r, (e) => {
  if ([401, 403].includes(e.response?.status) && !e.config?.url?.includes('/login')) window.dispatchEvent(new CustomEvent('ku:plt-out'))
  return Promise.reject(e)
})

export default papi
