// Helper centralizzato per tutte le chiamate API.
// - Usa percorsi relativi (/api/...) → funziona sia in locale che in produzione
// - Aggiunge automaticamente il token JWT da localStorage
// - Uso: apiFetch('/api/lavori') al posto di fetch('http://localhost:3001/api/lavori')

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('ildente_token')
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
}