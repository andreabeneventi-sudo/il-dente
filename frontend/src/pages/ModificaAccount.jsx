import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// ── Stile identico a Impostazioni.jsx ─────────────────────────────────────────
const inp = {
  border:'1px solid var(--bor)', borderRadius:'8px', padding:'7px 11px',
  fontSize:'12px', fontFamily:'Instrument Sans, sans-serif',
  background:'var(--sur2)', outline:'none', color:'var(--tx)',
  width:'100%', boxSizing:'border-box',
}
const fd  = { display:'flex', flexDirection:'column', gap:'4px', flex:1 }
const lbl = { fontSize:'11px', fontWeight:600, color:'var(--tx2)' }
const sec = { fontSize:'15px', fontWeight:700, color:'var(--accent)', marginBottom:'4px' }
const divider = { height:'1px', background:'var(--borl)', margin:'4px 0' }
const COLORI_PIANO = {
  'Free':       { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }, // verde
  'Starter':    { color: '#0284C7', bg: '#e0f2fe', border: '#7dd3fc' }, // sky blue
  'Pro':        { color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' }, // viola
  'Business':   { color: '#d97706', bg: '#fef9c3', border: '#fde68a' }, // ambra
  'Enterprise': { color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4' }, // teal
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={fd}>
      <label style={lbl}>{label}</label>
      <input
        type={type}
        style={inp}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Messaggio({ testo, tipo }) {
  if (!testo) return null
  const c = tipo === 'ok'
    ? { bg:'#f0fdf4', border:'#bbf7d0', color:'#16a34a' }
    : { bg:'#fef2f2', border:'#fecaca', color:'#dc2626' }
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'8px', padding:'8px 11px', fontSize:'12px', color:c.color }}>
      {testo}
    </div>
  )
}

function BtnSalva({ loading, label = 'Salva' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding:'7px 18px', borderRadius:'8px', border:'none',
        background:'var(--accent)', color:'#fff',
        fontSize:'12px', fontWeight:600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        alignSelf:'flex-start',
      }}
    >
      {loading ? 'Salvataggio...' : label}
    </button>
  )
}

export default function ModificaAccount() {
  const { utente, login } = useAuth()

  // Dati laboratorio
  const [nome, setNome]       = useState('')
  const [email, setEmail]     = useState('')
  const [msgNome, setMsgNome] = useState({ testo:'', tipo:'' })
  const [salvNome, setSalvNome] = useState(false)

  // Cambio email
  const [nuovaEmail, setNuovaEmail]   = useState('')
  const [pwEmail, setPwEmail]         = useState('')
  const [msgEmail, setMsgEmail]       = useState({ testo:'', tipo:'' })
  const [salvEmail, setSalvEmail]     = useState(false)

  // Cambio password
  const [pwAttuale, setPwAttuale]     = useState('')
  const [pwNuova, setPwNuova]         = useState('')
  const [pwConferma, setPwConferma]   = useState('')
  const [msgPw, setMsgPw]             = useState({ testo:'', tipo:'' })
  const [salvPw, setSalvPw]           = useState(false)

  // Piano
  const [piano, setPiano] = useState(null)

  useEffect(() => {
    apiFetch('/api/account')
      .then(r => r.json())
      .then(data => {
        setNome(data.nome || '')
        setEmail(data.email || '')
        setNuovaEmail(data.email || '')
        setPiano(data.piano)
      })
      .catch(() => {})
  }, [])

  async function salvaNome(e) {
    e.preventDefault()
    setMsgNome({ testo:'', tipo:'' })
    if (!nome.trim()) return setMsgNome({ testo:'Il nome è obbligatorio', tipo:'errore' })
    setSalvNome(true)
    try {
      const res = await apiFetch('/api/account', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ nome }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgNome({ testo: data.errore, tipo:'errore' })
      if (data.token) login(data.token)
      setMsgNome({ testo:'Nome aggiornato', tipo:'ok' })
    } catch {
      setMsgNome({ testo:'Errore di connessione', tipo:'errore' })
    } finally {
      setSalvNome(false)
    }
  }

  async function salvaEmail(e) {
    e.preventDefault()
    setMsgEmail({ testo:'', tipo:'' })
    if (!nuovaEmail || !pwEmail) return setMsgEmail({ testo:'Compila tutti i campi', tipo:'errore' })
    setSalvEmail(true)
    try {
      const res = await apiFetch('/api/account/email', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email: nuovaEmail, password: pwEmail }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgEmail({ testo: data.errore, tipo:'errore' })
      if (data.token) login(data.token)
      setMsgEmail({ testo:'Email aggiornata', tipo:'ok' })
      setPwEmail('')
    } catch {
      setMsgEmail({ testo:'Errore di connessione', tipo:'errore' })
    } finally {
      setSalvEmail(false)
    }
  }

  async function salvaPassword(e) {
    e.preventDefault()
    setMsgPw({ testo:'', tipo:'' })
    if (pwNuova !== pwConferma) return setMsgPw({ testo:'Le password non coincidono', tipo:'errore' })
    if (pwNuova.length < 8) return setMsgPw({ testo:'Minimo 8 caratteri', tipo:'errore' })
    setSalvPw(true)
    try {
      const res = await apiFetch('/api/account/password', {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ password_attuale: pwAttuale, password_nuova: pwNuova }),
      })
      const data = await res.json()
      if (!res.ok) return setMsgPw({ testo: data.errore, tipo:'errore' })
      setMsgPw({ testo:'Password aggiornata', tipo:'ok' })
      setPwAttuale(''); setPwNuova(''); setPwConferma('')
    } catch {
      setMsgPw({ testo:'Errore di connessione', tipo:'errore' })
    } finally {
      setSalvPw(false)
    }
  }

  // ── Stile card sezione (uguale a Impostazioni) ────────────────────────────
  const card = {
    background:'var(--sur)', border:'1px solid var(--bor)',
    borderRadius:'12px', padding:'20px 24px',
    display:'flex', flexDirection:'column', gap:'14px',
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'24px 32px 96px', background:'var(--bg)' }}>
      <div style={{ maxWidth:'560px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* Titolo */}
        <div>
          <div style={{ fontSize:'15px', fontWeight:700, color:'var(--tx)' }}>Il mio account</div>
          <div style={{ fontSize:'12px', color:'var(--tx3)', marginTop:'3px' }}>Gestisci i dati di accesso del laboratorio</div>
        </div>

        {/* Piano attivo */}
        <div style={card}>
          <div style={sec}>Piano attivo</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:(COLORI_PIANO[piano?.nome] || COLORI_PIANO['Free']).color }}>{piano?.nome || 'Free'}</div>
              <div style={{ fontSize:'12px', color:'var(--tx3)', marginTop:'3px' }}>
                {piano?.descrizione || 'Piano base gratuito — tutte le funzioni incluse'}
              </div>
            </div>
            <span style={{
              padding:'3px 12px', borderRadius:'99px',
              background: (COLORI_PIANO[piano?.nome] || COLORI_PIANO['Free']).bg,
              color: (COLORI_PIANO[piano?.nome] || COLORI_PIANO['Free']).color,
              border: `1px solid ${(COLORI_PIANO[piano?.nome] || COLORI_PIANO['Free']).border}`,
              fontSize:'11px', fontWeight:700,
            }}>
              Attivo
            </span>
          </div>
          <div style={{ ...divider }} />
          <div style={{ fontSize:'11px', color:'var(--tx3)' }}>
            💡 I piani a pagamento con funzioni avanzate saranno disponibili prossimamente.
          </div>
        </div>

        {/* Nome laboratorio */}
        <div style={card}>
          <div style={sec}>Nome laboratorio</div>
          <form onSubmit={salvaNome} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <Campo label="Nome" value={nome} onChange={setNome} placeholder="Es. Lab Rossi" />
            <Messaggio testo={msgNome.testo} tipo={msgNome.tipo} />
            <BtnSalva loading={salvNome} label="Aggiorna nome" />
          </form>
        </div>

        {/* Cambio email */}
        <div style={card}>
          <div style={sec}>Cambia email</div>
          <form onSubmit={salvaEmail} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <Campo label="Nuova email" type="email" value={nuovaEmail} onChange={setNuovaEmail} placeholder="nuova@email.it" />
            <Campo label="Conferma con la tua password attuale" type="password" value={pwEmail} onChange={setPwEmail} placeholder="••••••••" />
            <Messaggio testo={msgEmail.testo} tipo={msgEmail.tipo} />
            <BtnSalva loading={salvEmail} label="Aggiorna email" />
          </form>
        </div>

        {/* Cambio password */}
        <div style={card}>
          <div style={sec}>Cambia password</div>
          <form onSubmit={salvaPassword} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <Campo label="Password attuale" type="password" value={pwAttuale} onChange={setPwAttuale} placeholder="••••••••" />
            <Campo label="Nuova password" type="password" value={pwNuova} onChange={setPwNuova} placeholder="Minimo 8 caratteri" />
            <Campo label="Conferma nuova password" type="password" value={pwConferma} onChange={setPwConferma} placeholder="••••••••" />
            <Messaggio testo={msgPw.testo} tipo={msgPw.tipo} />
            <BtnSalva loading={salvPw} label="Aggiorna password" />
          </form>
        </div>

      </div>
    </div>
  )
}