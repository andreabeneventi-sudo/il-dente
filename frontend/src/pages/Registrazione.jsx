import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Registrazione() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', password: '', conferma: '' })
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  const [caricamento, setCaricamento] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')
    if (form.password !== form.conferma)
      return setErrore('Le password non coincidono')
    if (form.password.length < 8)
      return setErrore('La password deve essere di almeno 8 caratteri')

    setCaricamento(true)
    try {
      const res = await fetch('/api/auth/registrazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, email: form.email, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) return setErrore(data.errore || 'Errore durante la registrazione')
      setSuccesso(true)
    } catch {
      setErrore('Errore di connessione al server')
    } finally {
      setCaricamento(false)
    }
  }

  if (successo) return (
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
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--tx1)', marginBottom: '12px' }}>
          Controlla la tua email
        </div>
        <div style={{ fontSize: '14px', color: 'var(--tx3)', lineHeight: 1.6, marginBottom: '24px' }}>
          Abbiamo inviato un link di verifica a <strong style={{ color: 'var(--tx2)' }}>{form.email}</strong>.
          Clicca il link per attivare il tuo account.
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Vai al login
        </button>
      </div>
    </div>
  )

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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '40px' }}>🦷</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tx1)', marginTop: '8px' }}>Il Dente</div>
          <div style={{ fontSize: '13px', color: 'var(--tx3)', marginTop: '4px' }}>Crea il tuo account</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'nome', label: 'Nome laboratorio', type: 'text', placeholder: 'Es. Lab Rossi' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'nome@esempio.it' },
            { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            { key: 'conferma', label: 'Conferma password', type: 'password', placeholder: '••••••••' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx2)' }}>{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
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
          ))}

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
            {caricamento ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--tx3)' }}>
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Accedi
          </Link>
        </div>
      </div>
    </div>
  )
}
