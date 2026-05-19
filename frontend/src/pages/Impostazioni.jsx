import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

const PALETTE = [
  { id:'sky',    label:'Sky Blue',  accent:'#0284C7', accentH:'#0272ae', accentL:'#e0f2fe', bg:'#f4f6f9', sur:'#ffffff', bor:'#e2e8f0' },
  { id:'indigo', label:'Indigo',    accent:'#4f46e5', accentH:'#4338ca', accentL:'#e0e7ff', bg:'#f5f5ff', sur:'#ffffff', bor:'#e2e8f0' },
  { id:'violet', label:'Violet',    accent:'#7c3aed', accentH:'#6d28d9', accentL:'#ede9fe', bg:'#f7f5ff', sur:'#ffffff', bor:'#e2e8f0' },
  { id:'teal',   label:'Teal',      accent:'#0d9488', accentH:'#0f766e', accentL:'#ccfbf1', bg:'#f0fafa', sur:'#ffffff', bor:'#e2e8f0' },
  { id:'slate',  label:'Slate',     accent:'#475569', accentH:'#334155', accentL:'#f1f5f9', bg:'#f4f6f9', sur:'#ffffff', bor:'#e2e8f0' },
  { id:'rose',   label:'Rose',      accent:'#e11d48', accentH:'#be123c', accentL:'#ffe4e6', bg:'#fff5f7', sur:'#ffffff', bor:'#e2e8f0' },
]

function applicaPalette(p) {
  const r = document.documentElement.style
  r.setProperty('--accent',   p.accent)
  r.setProperty('--accent-h', p.accentH)
  r.setProperty('--accent-l', p.accentL)
  r.setProperty('--bg',       p.bg)
  r.setProperty('--sur',      p.sur)
  r.setProperty('--bor',      p.bor)
}

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

function Campo({ label, value, onChange, placeholder, mono }) {
  return (
    <div style={fd}>
      <label style={lbl}>{label}</label>
      <input
        style={{ ...inp, ...(mono ? { fontFamily:'JetBrains Mono, monospace', fontSize:'11px' } : {}) }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function Impostazioni() {
  const [form, setForm] = useState({
    lab_nome:           '',
    lab_indirizzo:      '',
    lab_citta:          '',
    lab_provincia:      '',
    lab_telefono:       '',
    lab_email:          '',
    lab_piva:           '',
    lab_cf:             '',
    lab_pec:            '',
    lab_itca:           '',
    email_mittente_nome:'',
    email_destinatari:  '',
  })
  const [palette,       setPalette]       = useState('sky')
  const [logo,          setLogo]          = useState(null)
  const [stampaAuto,    setStampaAuto]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [emailInput,    setEmailInput]    = useState('')
  const [emailList,     setEmailList]     = useState([])
  const fileRef = useRef(null)

  // Google Calendar
  const [googleStato,    setGoogleStato]    = useState(null) // null=caricamento, false=disconnesso, true=connesso
  const [calendariStato, setCalendariStato] = useState({})   // { gcal_stato_in_corso: '...', ... }
  const [calSaving,      setCalSaving]      = useState(false)
  const [calSaved,       setCalSaved]       = useState(false)

  // Google Drive
  const [driveCartellaRadice, setDriveCartellaRadice] = useState('')
  const [driveSaving,         setDriveSaving]         = useState(false)
  const [driveSaved,          setDriveSaved]           = useState(false)

  // Staff calendario
  const [staff,         setStaff]         = useState([])
  const [nuovoNome,     setNuovoNome]     = useState('')
  const [nuovoColore,   setNuovoColore]   = useState('#0284C7')
  const [staffSaving,   setStaffSaving]   = useState(false)
  const [editingStaff,  setEditingStaff]  = useState(null)

  // Stati lavoro
  const [statiLavoro,   setStatiLavoro]   = useState([])
  const [nuovoStato,    setNuovoStato]    = useState({ nome:'', colore:'#0284C7' })
  const [editingStato,  setEditingStato]  = useState(null)
  const [statoSaving,   setStatoSaving]   = useState(false)

  useEffect(() => {
    apiFetch('/api/impostazioni')
      .then(r => r.json())
      .then(data => {
        setForm({
          lab_nome:           data.lab_nome           || '',
          lab_indirizzo:      data.lab_indirizzo      || '',
          lab_citta:          data.lab_citta          || '',
          lab_provincia:      data.lab_provincia      || '',
          lab_telefono:       data.lab_telefono       || '',
          lab_email:          data.lab_email          || '',
          lab_piva:           data.lab_piva           || '',
          lab_cf:             data.lab_cf             || '',
          lab_pec:            data.lab_pec            || '',
          lab_itca:           data.lab_itca           || '',
          email_mittente_nome:data.email_mittente_nome|| '',
          email_destinatari:  data.email_destinatari  || '',
        })
        if (data.palette_attiva) setPalette(data.palette_attiva)
        if (data.lab_logo)       setLogo(data.lab_logo)
        if (data.email_stampa_auto === 'true') setStampaAuto(true)
        if (data.email_destinatari) {
          setEmailList(data.email_destinatari.split(',').filter(Boolean))
        }
        if (data.drive_cartella_radice_id) setDriveCartellaRadice(data.drive_cartella_radice_id)
        // Carica ID calendari Google per stato
        const calObj = {}
        Object.keys(data).forEach(k => {
          if (k.startsWith('gcal_stato_')) calObj[k] = data[k]
        })
        setCalendariStato(calObj)

        const p = PALETTE.find(x => x.id === data.palette_attiva)
        if (p) applicaPalette(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    apiFetch('/api/google/stato')
      .then(r => r.json())
      .then(d => setGoogleStato(d.connesso))
      .catch(() => setGoogleStato(false))

    apiFetch('/api/utenti-staff')
      .then(r => r.json())
      .then(data => setStaff(data))
      .catch(() => {})

    apiFetch('/api/stati-lavoro')
      .then(r => r.json())
      .then(data => setStatiLavoro(data))
      .catch(() => {})
  }, [])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function onLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  function scegliPalette(p) {
    setPalette(p.id)
    applicaPalette(p)
  }

  function aggiungiEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (emailList.includes(email)) return
    setEmailList(l => [...l, email])
    setEmailInput('')
  }

  function rimuoviEmail(email) {
    setEmailList(l => l.filter(e => e !== email))
  }

  // ── Google Calendar ──────────────────────────────────────────────────────────

  function apriLoginGoogle() {
    apiFetch('/api/google/auth-url')
      .then(r => r.json())
      .then(d => {
        const popup = window.open(d.url, 'google-auth', 'width=500,height=650')
        const interval = setInterval(() => {
        if (popup?.closed) {
        clearInterval(interval)
        apiFetch('/api/google/stato')
        .then(r => r.json())
        .then(d => {
        setGoogleStato(d.connesso)
        window.location.reload()
      })
  }
}, 500)
        window.addEventListener('message', e => {
          if (e.data === 'google-auth-success') {
            clearInterval(interval)
            setGoogleStato(true)
          }
        }, { once: true })
      })
  }

  async function disconnettiGoogle() {
    await apiFetch('/api/google/disconnetti', { method: 'DELETE' })
    setGoogleStato(false)
  }

  async function salvaCalendariStato() {
    setCalSaving(true)
    await apiFetch('/api/impostazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calendariStato),
    })
    setCalSaving(false)
    setCalSaved(true)
    setTimeout(() => setCalSaved(false), 2000)
  }

  async function salvaDriveImpostazioni() {
    setDriveSaving(true)
    await apiFetch('/api/impostazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drive_cartella_radice_id: driveCartellaRadice.trim() }),
    })
    setDriveSaving(false)
    setDriveSaved(true)
    setTimeout(() => setDriveSaved(false), 2000)
  }

  async function salvaCalendarioStaff(id, calId) {
    const utente = staff.find(s => s.id === id)
    if (!utente) return
    await apiFetch(`/api/utenti-staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: utente.nome, colore: utente.colore, google_calendar_id: calId }),
    })
    setStaff(s => s.map(u => u.id === id ? { ...u, google_calendar_id: calId } : u))
  }

  // ── Staff ────────────────────────────────────────────────────────────────────

  async function aggiungiStato() {
    if (!nuovoStato.nome.trim()) return
    setStatoSaving(true)
    try {
      const res = await apiFetch('/api/stati-lavoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nuovoStato.nome.trim(), colore: nuovoStato.colore, ordine: statiLavoro.length }),
      })
      const data = await res.json()
      setStatiLavoro(s => [...s, data])
      setNuovoStato({ nome:'', colore:'#0284C7' })
    } catch {}
    setStatoSaving(false)
  }

  async function salvaStato(stato) {
    try {
      const res = await apiFetch(`/api/stati-lavoro/${stato.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stato),
      })
      const data = await res.json()
      setStatiLavoro(s => s.map(x => x.id === data.id ? data : x))
      setEditingStato(null)
    } catch {}
  }

  async function eliminaStato(id) {
    try {
      await apiFetch(`/api/stati-lavoro/${id}`, { method: 'DELETE' })
      setStatiLavoro(s => s.filter(x => x.id !== id))
    } catch {}
  }

  async function aggiungiStaff() {
    if (!nuovoNome.trim()) return
    setStaffSaving(true)
    try {
      const res = await apiFetch('/api/utenti-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nuovoNome.trim(), colore: nuovoColore }),
      })
      const data = await res.json()
      setStaff(s => [...s, data])
      setNuovoNome('')
      setNuovoColore('#0284C7')
    } catch {}
    setStaffSaving(false)
  }

  async function salvaStaff(utente) {
    try {
      const res = await apiFetch(`/api/utenti-staff/${utente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: utente.nome, colore: utente.colore }),
      })
      const data = await res.json()
      setStaff(s => s.map(u => u.id === data.id ? data : u))
      setEditingStaff(null)
    } catch {}
  }

  async function eliminaStaff(id) {
    try {
      await apiFetch(`/api/utenti-staff/${id}`, { method: 'DELETE' })
      setStaff(s => s.filter(u => u.id !== id))
    } catch {}
  }

  async function salva() {
    setSaving(true)
    try {
      await apiFetch('/api/impostazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          palette_attiva:     palette,
          email_stampa_auto:  String(stampaAuto),
          email_destinatari:  emailList.join(','),
        }),
      })
      if (logo) {
        await apiFetch('/api/impostazioni/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo }),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {}
    setSaving(false)
  }

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tx3)', fontSize:'13px' }}>
      Caricamento...
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
      <div style={{ maxWidth:'640px', margin:'0 auto', padding:'32px 24px 96px', display:'flex', flexDirection:'column', gap:'24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'var(--tx)', marginBottom:'4px' }}>Impostazioni</div>
            <div style={{ fontSize:'12px', color:'var(--tx3)' }}>Configura il laboratorio, il tema e le integrazioni</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            {saved && (
              <span style={{ fontSize:'12px', color:'var(--accent)', fontWeight:600 }}>✓ Salvato</span>
            )}
            <button
              onClick={salva}
              disabled={saving}
              style={{
                padding:'9px 22px', border:'none', background:'var(--accent)',
                color:'#fff', borderRadius:'9px', fontSize:'13px', fontWeight:700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily:'Instrument Sans, sans-serif',
                opacity: saving ? .6 : 1,
              }}
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>

        {/* Card: Identita laboratorio */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={sec}>Identita Laboratorio</div>

          {/* Logo */}
          <div style={fd}>
            <label style={lbl}>Logo</label>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'72px', height:'72px', border:'1px solid var(--bor)', borderRadius:'10px', background:'var(--sur2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {logo
                  ? <img src={logo} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                  : <span style={{ fontSize:'28px' }}>?</span>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <button onClick={() => fileRef.current.click()} style={{ padding:'7px 16px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>
                  Scegli immagine
                </button>
                {logo && (
                  <button onClick={() => setLogo(null)} style={{ padding:'5px 16px', border:'1px solid var(--bor)', background:'none', borderRadius:'8px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx3)' }}>
                    Rimuovi
                  </button>
                )}
                <span style={{ fontSize:'10px', color:'var(--tx3)' }}>PNG o SVG, sfondo trasparente consigliato</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={onLogoChange} style={{ display:'none' }} />
          </div>

          <div style={divider} />
          <Campo label="Nome laboratorio" value={form.lab_nome} onChange={v => set('lab_nome', v)} placeholder="Es. Laboratorio Odontotecnico Beneventi" />

          <div style={{ display:'flex', gap:'12px' }}>
            <div style={{ ...fd, flex:2 }}>
              <Campo label="Indirizzo" value={form.lab_indirizzo} onChange={v => set('lab_indirizzo', v)} placeholder="Es. Via Roma 14" />
            </div>
            <Campo label="Citta" value={form.lab_citta} onChange={v => set('lab_citta', v)} placeholder="Es. Torino" />
            <div style={{ ...fd, flex:'0 0 80px' }}>
              <Campo label="Prov." value={form.lab_provincia} onChange={v => set('lab_provincia', v)} placeholder="TO" />
            </div>
          </div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="Telefono" value={form.lab_telefono} onChange={v => set('lab_telefono', v)} placeholder="Es. 011 123 4567" />
            <Campo label="Email" value={form.lab_email} onChange={v => set('lab_email', v)} placeholder="Es. info@lab.it" />
          </div>

          <div style={divider} />
          <div style={sec}>Dati Fiscali</div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="Partita IVA" value={form.lab_piva} onChange={v => set('lab_piva', v)} placeholder="Es. IT12345678901" mono />
            <Campo label="Codice Fiscale" value={form.lab_cf} onChange={v => set('lab_cf', v)} placeholder="Codice fiscale" mono />
          </div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="PEC" value={form.lab_pec} onChange={v => set('lab_pec', v)} placeholder="Es. lab@pec.it" />
            <Campo label="Codice ITCA" value={form.lab_itca} onChange={v => set('lab_itca', v)} placeholder="Es. LB-TO-1234" mono />
          </div>
        </div>

        {/* Card: Aspetto */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={sec}>Aspetto</div>
          <label style={lbl}>Palette colori</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'10px' }}>
            {PALETTE.map(p => {
              const isActive = palette === p.id
              return (
                <div key={p.id} onClick={() => scegliPalette(p)} style={{
                  border: isActive ? `2px solid ${p.accent}` : '2px solid var(--bor)',
                  borderRadius:'10px', padding:'12px 14px', cursor:'pointer',
                  background: isActive ? p.accentL : 'var(--sur2)',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: p.accent, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:'12px', fontWeight: isActive ? 700 : 500, color: isActive ? p.accent : 'var(--tx)' }}>{p.label}</div>
                    <div style={{ fontSize:'10px', fontFamily:'JetBrains Mono, monospace', color:'var(--tx3)' }}>{p.accent}</div>
                  </div>
                  {isActive && <span style={{ marginLeft:'auto', fontSize:'14px', color: p.accent }}>✓</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Card: Google Calendar */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <div style={{ ...sec, color:'var(--accent)' }}>Google Calendar</div>
            <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'4px' }}>Collega il tuo account Google e associa un calendario a ogni stato lavoro e membro staff.</div>
          </div>

          {/* Stato connessione */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'var(--sur2)', border:'1px solid var(--bor)', borderRadius:'10px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'50%', flexShrink:0, background: googleStato ? '#22c55e' : '#94a3b8' }} />
            <span style={{ fontSize:'12px', fontWeight:600, color:'var(--tx)', flex:1 }}>
              {googleStato === null ? 'Verifica connessione...' : googleStato ? 'Account Google connesso ✓' : 'Nessun account connesso'}
            </span>
            {googleStato
              ? <button onClick={disconnettiGoogle} style={{ padding:'5px 12px', border:'1px solid var(--bor)', background:'none', borderRadius:'7px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--red)' }}>Disconnetti</button>
              : <button onClick={apriLoginGoogle} style={{ padding:'6px 14px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Collega Google</button>
            }
          </div>

          {googleStato && (
            <div style={{ fontSize:'12px', color:'var(--tx3)', padding:'10px 14px', background:'var(--sur2)', border:'1px solid var(--bor)', borderRadius:'8px' }}>
              ✓ Account connesso. Configura i calendari nella sezione <strong>Stati lavoro</strong> e <strong>Calendario eventi</strong>.
            </div>
          )}
        </div>

        {/* Card: Google Drive */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <div style={{ ...sec, color:'var(--accent)' }}>Google Drive</div>
            <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'4px' }}>Configura dove salvare le cartelle dei lavori su Google Drive. Usa lo stesso account Google connesso sopra.</div>
          </div>

          {!googleStato && (
            <div style={{ fontSize:'12px', color:'var(--tx3)', padding:'10px 14px', background:'var(--sur2)', border:'1px solid var(--bor)', borderRadius:'8px' }}>
              Collega prima un account Google nella sezione Google Calendar qui sopra.
            </div>
          )}

          {googleStato && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={fd}>
                <label style={lbl}>Cartella di destinazione (ID)</label>
                <input
                  style={{ ...inp, fontFamily:'JetBrains Mono, monospace', fontSize:'11px' }}
                  value={driveCartellaRadice}
                  onChange={e => setDriveCartellaRadice(e.target.value)}
                  placeholder="Lascia vuoto per usare il root di Google Drive"
                />
                <div style={{ fontSize:'10px', color:'var(--tx3)', marginTop:'2px' }}>
                  Per usare una sottocartella: aprila su{' '}
                  <a href="https://drive.google.com" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>drive.google.com</a>
                  {' '}e copia l'ID dall'URL: <span style={{ fontFamily:'JetBrains Mono, monospace' }}>drive.google.com/drive/folders/<strong>QUESTO-ID</strong></span>
                </div>
              </div>
              <button
                onClick={salvaDriveImpostazioni}
                disabled={driveSaving}
                style={{ alignSelf:'flex-start', padding:'7px 18px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', opacity: driveSaving ? .5 : 1 }}
              >
                {driveSaved ? '✓ Salvato' : driveSaving ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          )}
        </div>

        {/* Card: Stati lavoro */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <div style={{ ...sec, color:'var(--accent)' }}>Stati lavoro</div>
            <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'4px' }}>Gestisci gli stati dei lavori. Ogni stato ha un colore e può essere collegato a un calendario Google.</div>
          </div>

          {statiLavoro.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {statiLavoro.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'var(--sur2)', border:'1px solid var(--bor)', borderRadius:'10px' }}>
                  {editingStato?.id === s.id ? (
                    <>
                      <input
                        type="color"
                        value={editingStato.colore}
                        onChange={e => setEditingStato(x => ({ ...x, colore: e.target.value }))}
                        style={{ width:'32px', height:'32px', border:'none', borderRadius:'6px', cursor:'pointer', padding:0, background:'none' }}
                      />
                      <input
                        style={{ ...inp, flex:1 }}
                        value={editingStato.nome}
                        onChange={e => setEditingStato(x => ({ ...x, nome: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && salvaStato(editingStato)}
                        placeholder="Nome stato"
                      />
                      {googleStato && (
                        <input
                          style={{ ...inp, flex:2, fontFamily:'JetBrains Mono, monospace', fontSize:'11px' }}
                          value={editingStato.google_calendar_id || ''}
                          onChange={e => setEditingStato(x => ({ ...x, google_calendar_id: e.target.value }))}
                          placeholder="Google Calendar ID"
                        />
                      )}
                      <button onClick={() => salvaStato(editingStato)} style={{ padding:'5px 12px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Salva</button>
                      <button onClick={() => setEditingStato(null)} style={{ padding:'5px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'7px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Annulla</button>
                    </>
                  ) : (
                    <>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: s.colore, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:'13px', fontWeight:600, color:'var(--tx)' }}>{s.nome}</span>
                      {googleStato && s.google_calendar_id && (
                        <span style={{ fontSize:'10px', color:'var(--tx3)', fontFamily:'JetBrains Mono, monospace', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.google_calendar_id}
                        </span>
                      )}
                      <button onClick={() => setEditingStato({ ...s })} style={{ padding:'4px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Modifica</button>
                      <button onClick={() => eliminaStato(s.id)} style={{ padding:'4px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--red)' }}>Elimina</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <input
              type="color"
              value={nuovoStato.colore}
              onChange={e => setNuovoStato(x => ({ ...x, colore: e.target.value }))}
              style={{ width:'36px', height:'36px', border:'1px solid var(--bor)', borderRadius:'8px', cursor:'pointer', padding:'2px', background:'var(--sur2)', flexShrink:0 }}
            />
            <input
              style={{ ...inp, flex:1 }}
              placeholder="Nome stato (es. Sospeso)"
              value={nuovoStato.nome}
              onChange={e => setNuovoStato(x => ({ ...x, nome: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && aggiungiStato()}
            />
            <button onClick={aggiungiStato} disabled={statoSaving || !nuovoStato.nome.trim()} style={{
              padding:'7px 16px', border:'none', background:'var(--accent)', color:'#fff',
              borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer',
              fontFamily:'Instrument Sans, sans-serif', flexShrink:0,
              opacity: statoSaving || !nuovoStato.nome.trim() ? .4 : 1,
            }}>
              Aggiungi
            </button>
          </div>
        </div>

        {/* Card: Calendario eventi */}
        <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'14px', padding:'22px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <div style={{ ...sec, color:'var(--accent)' }}>Calendario eventi</div>
            <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'4px' }}>Aggiungi i membri dello staff. Ogni membro avrà un colore associato agli eventi del calendario.</div>
          </div>

          {/* Lista staff esistente */}
          {staff.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {staff.map(u => (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'var(--sur2)', border:'1px solid var(--bor)', borderRadius:'10px' }}>
                  {editingStaff?.id === u.id ? (
                    <>
                      <input
                        type="color"
                        value={editingStaff.colore}
                        onChange={e => setEditingStaff(s => ({ ...s, colore: e.target.value }))}
                        style={{ width:'32px', height:'32px', border:'none', borderRadius:'6px', cursor:'pointer', padding:0, background:'none' }}
                      />
                      <input
                        style={{ ...inp, flex:1 }}
                        value={editingStaff.nome}
                        onChange={e => setEditingStaff(s => ({ ...s, nome: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && salvaStaff(editingStaff)}
                      />
                      {googleStato && (
                        <input
                          style={{ ...inp, flex:2, fontFamily:'JetBrains Mono, monospace', fontSize:'11px' }}
                          value={editingStaff.google_calendar_id || ''}
                          onChange={e => setEditingStaff(s => ({ ...s, google_calendar_id: e.target.value }))}
                          placeholder="Google Calendar ID"
                        />
                      )}
                      <button onClick={() => salvaStaff(editingStaff)} style={{ padding:'5px 12px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Salva</button>
                      <button onClick={() => setEditingStaff(null)} style={{ padding:'5px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'7px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Annulla</button>
                    </>
                  ) : (
                    <>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: u.colore, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:'13px', fontWeight:600, color:'var(--tx)' }}>{u.nome}</span>
                      {googleStato && u.google_calendar_id && (
                        <span style={{ fontSize:'10px', color:'var(--tx3)', fontFamily:'JetBrains Mono, monospace', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {u.google_calendar_id}
                        </span>
                      )}
                      <button onClick={() => setEditingStaff({ ...u })} style={{ padding:'4px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Modifica</button>
                      <button onClick={() => eliminaStaff(u.id)} style={{ padding:'4px 10px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--red)' }}>Elimina</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Aggiungi nuovo */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <input
              type="color"
              value={nuovoColore}
              onChange={e => setNuovoColore(e.target.value)}
              style={{ width:'36px', height:'36px', border:'1px solid var(--bor)', borderRadius:'8px', cursor:'pointer', padding:'2px', background:'var(--sur2)', flexShrink:0 }}
            />
            <input
              style={{ ...inp, flex:1 }}
              placeholder="Nome membro staff"
              value={nuovoNome}
              onChange={e => setNuovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aggiungiStaff()}
            />
            <button onClick={aggiungiStaff} disabled={staffSaving || !nuovoNome.trim()} style={{
              padding:'7px 16px', border:'none', background:'var(--accent)', color:'#fff',
              borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer',
              fontFamily:'Instrument Sans, sans-serif', flexShrink:0,
              opacity: staffSaving || !nuovoNome.trim() ? .4 : 1,
            }}>
              Aggiungi
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}