import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function VerificaEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [stato, setStato] = useState('caricamento') // caricamento | successo | errore
  const [messaggio, setMessaggio] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStato('errore')
      setMessaggio('Link non valido — token mancante.')
      return
    }

    fetch(`http://localhost:3001/api/auth/verifica-email?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStato('successo')
          setMessaggio(data.messaggio)
        } else {
          setStato('errore')
          setMessaggio(data.errore || 'Verifica fallita.')
        }
      })
      .catch(() => {
        setStato('errore')
        setMessaggio('Errore di connessione al server.')
      })
  }, [])

  const config = {
    caricamento: { emoji: '⏳', titolo: 'Verifica in corso...', colore: 'var(--tx3)' },
    successo:    { emoji: '✅', titolo: 'Email verificata!',     colore: '#16a34a' },
    errore:      { emoji: '❌', titolo: 'Verifica fallita',      colore: '#dc2626' },
  }[stato]

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
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{config.emoji}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: config.colore, marginBottom: '12px' }}>
          {config.titolo}
        </div>
        {messaggio && (
          <div style={{ fontSize: '14px', color: 'var(--tx3)', marginBottom: '24px', lineHeight: 1.6 }}>
            {messaggio}
          </div>
        )}
        {stato !== 'caricamento' && (
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
        )}
      </div>
    </div>
  )
}
