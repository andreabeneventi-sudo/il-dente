import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errore, setErrore] = useState('')
  const [caricamento, setCaricamento] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')
    setCaricamento(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) return setErrore(data.errore || 'Errore durante il login')
      login(data.token)
      navigate('/')
    } catch {
      setErrore('Errore di connessione al server')
    } finally {
      setCaricamento(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg1)',
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '40px' }}>🦷</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tx1)', marginTop: '8px' }}>Il Dente</div>
          <div style={{ fontSize: '13px', color: 'var(--tx3)', marginTop: '4px' }}>Accedi al tuo account</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx2)' }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="nome@esempio.it"
              required
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg1)',
                color: 'var(--tx1)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx2)' }}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg1)',
                color: 'var(--tx1)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {errore && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#dc2626',
            }}>
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={caricamento}
            style={{
              padding: '11px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: caricamento ? 'not-allowed' : 'pointer',
              opacity: caricamento ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--tx3)' }}>
          Non hai un account?{' '}
          <Link to="/registrazione" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Registrati
          </Link>
        </div>
      </div>
    </div>
  )
}
