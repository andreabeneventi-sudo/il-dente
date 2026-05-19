const BASE = 'http://localhost:3001'

// Patch globale: aggiunge automaticamente Authorization a tutte le chiamate verso il backend
const _originalFetch = window.fetch.bind(window)

window.fetch = function (input, options = {}) {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)

  if (url.startsWith(BASE)) {
    const token = localStorage.getItem('ildente_token')
    if (token) {
      options = {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      }
    }
  }

  return _originalFetch(input, options)
}

export function apiFetch(path, options = {}) {
  return window.fetch(`${BASE}${path}`, options)
}
