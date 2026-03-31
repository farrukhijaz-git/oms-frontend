import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  withCredentials: true, // for refresh token cookie
})

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    // Don't retry if: already retried, or the failed request was the refresh itself
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh')
        // Update default header
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        original.headers['Authorization'] = `Bearer ${data.token}`
        return api(original)
      } catch {
        // Redirect to login only if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
