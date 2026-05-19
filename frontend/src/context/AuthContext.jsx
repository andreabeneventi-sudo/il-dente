import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ildente_token'))
  const [utente, setUtente] = useState(() => {
    try {
      const t = localStorage.getItem('ildente_token')
      if (!t) return null
      return JSON.parse(atob(t.split('.')[1]))
    } catch { return null }
  })

  function login(nuovoToken) {
    localStorage.setItem('ildente_token', nuovoToken)
    setToken(nuovoToken)
    try {
      setUtente(JSON.parse(atob(nuovoToken.split('.')[1])))
    } catch { setUtente(null) }
  }

  function logout() {
    localStorage.removeItem('ildente_token')
    setToken(null)
    setUtente(null)
  }

  return (
    <AuthContext.Provider value={{ token, utente, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
