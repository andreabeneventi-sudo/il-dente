import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

export default function Topbar({ active, onNav, offsetSettimana, onPrev, onNext, onOggi, onAggiungi, onApriLavoro, refreshKey, isMobile = false, onLogout }) {
  const [cercando,   setCercando]   = useState(false)
  const [query,      setQuery]      = useState('')
  const [risultati,  setRisultati]  = useState([])
  const [lavoriAll,  setLavoriAll]  = useState([])
  const inputRef = useRef(null)
  const boxRef   = useRef(null)
  const menuRef  = useRef(null)
  const [menuAperto, setMenuAperto] = useState(false)

  // Carica tutti i lavori una volta sola
  useEffect(() => {
    apiFetch('/api/lavori/tutti')
      .then(r => r.json())
      .then(data => setLavoriAll(data.filter(l => l.tipo_record !== 'evento')))
      .catch(() => {})
  }, [refreshKey])

  // Chiudi cliccando fuori
  useEffect(() => {
    function chiudi(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setCercando(false)
        setQuery('')
        setRisultati([])
      }
    }
    if (cercando) document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [cercando])

  // Chiudi menu profilo cliccando fuori
  useEffect(() => {
    function chiudi(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAperto(false)
    }
    if (menuAperto) document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [menuAperto])

  // Focus automatico sull'input
  useEffect(() => {
    if (cercando) setTimeout(() => inputRef.current?.focus(), 50)
  }, [cercando])

  function cerca(q) {
    setQuery(q)
    if (!q.trim()) { setRisultati([]); return }
    const q2 = q.toLowerCase()
    const trovati = lavoriAll
      .filter(l => (l.paziente || '').toLowerCase().includes(q2))
      .slice(0, 8)
    setRisultati(trovati)
  }

  function seleziona(lavoro) {
    setCercando(false)
    setQuery('')
    setRisultati([])
    onApriLavoro?.(lavoro)
  }

  function getLabelSettimana(offset) {
    const oggi = new Date()
    const lun = new Date(oggi)
    lun.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) + offset * 7)
    const sab = new Date(lun)
    sab.setDate(lun.getDate() + 5)
    const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
    if (lun.getMonth() === sab.getMonth()) {
      return `${lun.getDate()} — ${sab.getDate()} ${mesi[sab.getMonth()]} ${sab.getFullYear()}`
    }
    return `${lun.getDate()} ${mesi[lun.getMonth()]} — ${sab.getDate()} ${mesi[sab.getMonth()]} ${sab.getFullYear()}`
  }

  const pageLabels = {
    cal: 'Calendario', mese: 'Mese', giorno: 'Giorno', list: 'Lista lavori',
    urg: 'Urgenti', nodate: 'Senza data', clienti: 'Clienti',
    listini: 'Listini', conti: 'Conti mensili', fatture: 'Fatture',
    terminati: 'Terminati', drive: 'Google Drive', settings: 'Impostazioni',
  }

  // Su desktop: le 4 viste "calendario" mostrano il tab switcher
  const isCalendarDesktop = !isMobile && (active === 'cal' || active === 'mese' || active === 'giorno' || active === 'list')
  const btnStyle = { width:'28px', height:'28px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'7px', cursor:'pointer', fontSize:'14px', color:'var(--tx2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Instrument Sans, sans-serif' }

  // ── RENDER MOBILE ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        height:'50px', background:'var(--sur)', borderBottom:'1px solid var(--bor)',
        display:'flex', alignItems:'center', padding:'0 16px', gap:'10px', flexShrink:0,
      }}>
        {/* Logo / titolo app */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'26px', height:'26px', background:'var(--accent)', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>🦷</div>
          <span style={{ fontSize:'14px', fontWeight:700, letterSpacing:'-.3px' }}>
            {pageLabels[active] || 'Il Dente'}
          </span>
        </div>

        {/* Ricerca + Menu profilo */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>

        {/* Menu profilo */}
        <div ref={menuRef} style={{ position:'relative' }}>
          <div
            onClick={() => setMenuAperto(o => !o)}
            style={{ width:'34px', height:'34px', border:'1px solid var(--bor)', background: menuAperto ? 'var(--accent-l)' : 'var(--sur2)', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}
          >☰</div>
          {menuAperto && (
            <div style={{
              position:'fixed', top:'58px', right:'16px', zIndex:500,
              background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px',
              boxShadow:'var(--sh2)', overflow:'hidden', minWidth:'180px',
            }}>
              <div
                onClick={() => { setMenuAperto(false); onNav('settings') }}
                style={{ padding:'13px 16px', fontSize:'14px', fontWeight:500, color:'var(--tx)', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid var(--borl)' }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--sur2)'}
                onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>⚙️</span> Impostazioni
              </div>
              <div
                onClick={() => { setMenuAperto(false); onNav('account') }}
                style={{ padding:'13px 16px', fontSize:'14px', fontWeight:500, color:'var(--tx)', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid var(--borl)' }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--sur2)'}
                onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>👤</span> Account
              </div>
              <div
                onClick={() => { setMenuAperto(false); onLogout?.() }}
                style={{ padding:'13px 16px', fontSize:'14px', fontWeight:500, color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }}
                onTouchStart={e => e.currentTarget.style.background = 'var(--redb)'}
                onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>🚪</span> Logout
              </div>
            </div>
          )}
        </div>

        {/* Ricerca — si espande full width su mobile */}
        <div ref={boxRef} style={{ position:'relative' }}>
          {cercando ? (
            <div style={{
              position:'fixed', top:'50px', left:0, right:0, zIndex:400,
              background:'var(--sur)', borderBottom:'1px solid var(--bor)',
              padding:'10px 16px', display:'flex', alignItems:'center', gap:'10px',
            }}>
              <span style={{ fontSize:'14px', color:'var(--tx3)' }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => cerca(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setCercando(false)}
                placeholder="Cerca paziente..."
                style={{
                  flex:1, border:'none', outline:'none', fontSize:'14px',
                  fontFamily:'Instrument Sans, sans-serif', background:'transparent', color:'var(--tx)',
                }}
              />
              <span onClick={() => { setCercando(false); setQuery(''); setRisultati([]) }} style={{ fontSize:'13px', color:'var(--tx3)', cursor:'pointer', padding:'4px' }}>✕</span>
            </div>
          ) : (
            <div onClick={() => setCercando(true)} style={{ width:'34px', height:'34px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>🔍</div>
          )}

          {/* Dropdown risultati mobile */}
          {risultati.length > 0 && (
            <div style={{
              position:'fixed', top:'calc(50px + 54px)', left:0, right:0, zIndex:401,
              background:'var(--sur)', borderBottom:'1px solid var(--bor)',
              boxShadow:'var(--sh1)', overflow:'hidden', maxHeight:'50vh', overflowY:'auto',
            }}>
              {risultati.map(l => (
                <div key={l.id} onClick={() => seleziona(l)} style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--borl)' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'var(--tx)' }}>{l.paziente}</div>
                  <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'2px', display:'flex', gap:'8px' }}>
                    <span>{l.cliente_display || l.clinica || '—'}</span>
                    {l.tipo && <span>· {l.tipo}</span>}
                    {l.codice && <span style={{ fontFamily:'JetBrains Mono, monospace' }}>· {l.codice}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {query && risultati.length === 0 && cercando && (
            <div style={{
              position:'fixed', top:'calc(50px + 54px)', left:0, right:0, zIndex:401,
              background:'var(--sur)', borderBottom:'1px solid var(--bor)',
              padding:'16px', fontSize:'13px', color:'var(--tx3)', textAlign:'center',
            }}>
              Nessun paziente trovato
            </div>
          )}
        </div>
        </div>{/* fine flex ricerca+menu */}
      </div>
    )
  }

  // ── RENDER DESKTOP ─────────────────────────────────────────────────────────
  return (
    <div style={{ height:'54px', background:'var(--sur)', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', padding:'0 20px', gap:'12px', flexShrink:0 }}>

      {isCalendarDesktop ? (
        <div style={{ display:'flex', background:'var(--sur2)', borderRadius:'9px', padding:'3px', gap:'2px' }}>
          {[
            { id:'mese',   label:'🗓 Mese' },
            { id:'cal',    label:'📅 Settimana' },
            { id:'giorno', label:'📋 Giorno' },
            { id:'list',   label:'☰ Lista lavori' },
          ].map(v => (
            <button key={v.id} onClick={() => onNav(v.id)} style={{
              padding:'5px 12px', borderRadius:'7px', fontSize:'12px', fontWeight: active===v.id ? 600 : 500,
              cursor:'pointer', border:'none', fontFamily:'Instrument Sans, sans-serif',
              background: active===v.id ? 'var(--sur)' : 'none',
              color: active===v.id ? 'var(--accent)' : 'var(--tx2)',
              boxShadow: active===v.id ? 'var(--sh0)' : 'none',
            }}>{v.label}</button>
          ))}
        </div>
      ) : (
        <span style={{ fontSize:'14px', fontWeight:700, letterSpacing:'-.3px' }}>
          {pageLabels[active]}
        </span>
      )}

      {active === 'cal' && (
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <button style={btnStyle} onClick={onPrev}>‹</button>
          <span style={{ fontSize:'12px', fontWeight:600, color:'var(--tx2)', minWidth:'148px', textAlign:'center' }}>
            {getLabelSettimana(offsetSettimana)}
          </span>
          <button style={btnStyle} onClick={onNext}>›</button>
          <button style={{ ...btnStyle, width:'auto', padding:'0 8px', fontSize:'11px', fontWeight:700, color:'var(--accent)' }} onClick={onOggi}>Oggi</button>
        </div>
      )}

      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>

        {/* Ricerca paziente */}
        <div ref={boxRef} style={{ position:'relative' }}>
          {cercando ? (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--sur)', border:'1px solid var(--accent)', borderRadius:'8px', padding:'0 10px', height:'32px', width:'220px' }}>
              <span style={{ fontSize:'13px', color:'var(--tx3)' }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => cerca(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setCercando(false)}
                placeholder="Cerca paziente..."
                style={{ border:'none', outline:'none', fontSize:'12px', fontFamily:'Instrument Sans, sans-serif', background:'transparent', color:'var(--tx)', flex:1 }}
              />
              {query && <span onClick={() => cerca('')} style={{ fontSize:'13px', color:'var(--tx3)', cursor:'pointer' }}>×</span>}
            </div>
          ) : (
            <div onClick={() => setCercando(true)} style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>🔍</div>
          )}

          {/* Dropdown risultati */}
          {risultati.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, width:'280px', background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'10px', boxShadow:'var(--sh1)', overflow:'hidden', zIndex:200 }}>
              {risultati.map(l => (
                <div key={l.id} onClick={() => seleziona(l)} style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--borl)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sur2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize:'12px', fontWeight:700, color:'var(--tx)' }}>{l.paziente}</div>
                  <div style={{ fontSize:'10px', color:'var(--tx3)', marginTop:'2px', display:'flex', gap:'8px' }}>
                    <span>{l.cliente_display || l.clinica || '—'}</span>
                    {l.tipo && <span>· {l.tipo}</span>}
                    {l.codice && <span style={{ fontFamily:'JetBrains Mono, monospace' }}>· {l.codice}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && risultati.length === 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, width:'220px', background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'10px', boxShadow:'var(--sh1)', padding:'12px 14px', zIndex:200, fontSize:'12px', color:'var(--tx3)', textAlign:'center' }}>
              Nessun paziente trovato
            </div>
          )}
        </div>

        <div style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>🔔</div>
        <button onClick={onAggiungi} style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', padding:'7px 16px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', boxShadow:'0 2px 8px rgba(2,132,199,.3)' }}>
          + Aggiungi lavoro
        </button>
      </div>

    </div>
  )
}