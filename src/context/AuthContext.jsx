import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount using refresh token cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to refresh the access token using the cookie
        const { data: refreshData } = await api.post('/auth/refresh')
        const newToken = refreshData.token
        
        // Get user info
        const { data: userData } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${newToken}` }
        })
        
        setToken(newToken)
        setUser(userData)
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      } catch (error) {
        // No valid session - user stays logged out
        console.log('No active session')
      } finally {
        setLoading(false)
      }
    }
    
    restoreSession()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateToken, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
