import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  const login = useCallback((newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    // Set token on axios instance
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }, [])

  const updateToken = useCallback((newToken) => {
    setToken(newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateToken, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
