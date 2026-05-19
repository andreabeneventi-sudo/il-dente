import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect } from 'react'

// ── Costanti ──────────────────────────────────────────────────────────────────
const MESI_FULL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI_HDR  = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const GIORNI_FULL = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

const colori = {
  sky:    { bg:'#dbeafe', border:'#0284C7', color:'#0c4a6e', dot:'#0284C7' },
  red:    { bg:'#fee2e2', border:'#ef4444', color:'#7f1d1d', dot:'#ef4444' },
  green:  { bg:'#dcfce7', border:'#16a34a', color:'#14532d', dot:'#16a34a' },
  amber:  { bg:'#fef9c3', border:'#ca8a04', color:'#713f12', dot:'#ca8a04' },
  purple: { bg:'#f3e8ff', border:'#9333ea', color:'#581c87', dot:'#9333ea' },
  blue:   { bg:'#dbeafe', border:'#3b82f6', color:'#1e3a8a', dot:'#3b82f6' },
  slate:  { bg:'#f1f5f9', border:'#64748b', color:'#334155', dot:'#64748b' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function primoGiornoMese(anno, mese) {
  const d = new Date(anno, mese, 1)
  return (d.getDay() + 6) % 7  // Lun=0 … Dom=6
}

function giorniNelMese(anno, mese) {
  return new Date(anno, mese + 1, 0).getDate()
}

function buildGriglia(anno, mese) {
  const offset = primoGiornoMese(anno, mese)
  const totale = giorniNelMese(anno, mese)
  const celle  = []
  for (let i = 0; i < offset; i++) celle.push(null)
  for (let g = 1; g <= totale; g++) celle.push(new Date(anno, mese, g))
  while (celle.length % 7 !== 0) celle.push(null)
  return celle
}

function buildSettimane(celle) {
  const sett = []
  for (let i = 0; i < celle.length; i += 7) sett.push(celle.slice(i, i + 7))
  return sett
}

function formatOra(str) {
  if (!str) return null
  const d = new Date(str)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function badgePrioritaStyle(lavoro) {
  const gg = lavoro.data_inizio
    ? Math.round((new Date(lavoro.data_inizio).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
    : null
  if (lavoro.terminato) return { bg:'var(--grnb)', color:'var(--grn)', label:'✓ OK' }
  if (gg === null)      return null
  if (gg < 0)           return { bg:'var(--redb)',     color:'var(--red)',    label:'In ritardo' }
  if (gg <= 5)          return { bg:'var(--ambb)',     color:'var(--amb)',    label:'0–5 gg' }
  if (gg <= 10)         return { bg:'var(--accent-l)', color:'var(--accent)', label:'6–10 gg' }
  return { bg:'var(--sur3)', color:'var(--tx3)', label:'OK' }
}

// ── Card singolo lavoro ───────────────────────────────────────────────────────
function CardLavoro({ lavoro, onClick }) {
  const c     = colori[lavoro.colore] || colori.sky
  const ora   = formatOra(lavoro.data_inizio)
  const badge = badgePrioritaStyle(lavoro)
  const clienteLabel = lavoro.cliente_display || lavoro.clinica || '—'

  return (
    <div
      onClick={() => onClick(lavoro)}
      style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'10px 14px', borderRadius:'10px',
        background:'var(--sur)', border:'1px solid var(--bor)',
        borderLeft:`4px solid ${c.border}`,
        cursor:'pointer', transition:'box-shadow .12s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {ora && (
        <span style={{
          fontFamily:'JetBrains Mono, monospace', fontSize:'11px', fontWeight:700,
          color: c.color, background: c.bg, padding:'3px 7px', borderRadius:'5px',
          flexShrink:0, minWidth:'44px', textAlign:'center',
        }}>
          {ora}
        </span>
      )}

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
          <span style={{ fontSize:'13px', fontWeight:700, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {lavoro.paziente || '—'}
          </span>
          {lavoro.urgente && (
            <span style={{ fontSize:'9px', background:'var(--red)', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontWeight:700, flexShrink:0 }}>⚡ URG</span>
          )}
        </div>
        <div style={{ fontSize:'11px', color:'var(--tx2)', display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center' }}>
          <span>{clienteLabel}</span>
          {lavoro.tipo && <><span style={{ color:'var(--tx4)' }}>·</span><span>{lavoro.tipo}</span></>}
          {lavoro.tinta && <><span style={{ color:'var(--tx4)' }}>·</span><span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px' }}>{lavoro.tinta}</span></>}
          {lavoro.elementi && <><span style={{ color:'var(--tx4)' }}>·</span><span style={{ fontSize:'10px' }}>{lavoro.elementi}</span></>}
        </div>
      </div>

      {badge && (
        <span style={{
          fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px',
          background: badge.bg, color: badge.color, flexShrink:0,
        }}>
          {badge.label}
        </span>
      )}

      {lavoro.codice && (
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px', color:'var(--tx3)', flexShrink:0 }}>
          {lavoro.codice}
        </span>
      )}
    </div>
  )
}

// ── Pannello dettaglio giorno ─────────────────────────────────────────────────
function DettaglioGiorno({ data, lavori, loading, onLavoroClick }) {
  const oggi     = new Date()
  const isOggi   = isSameDay(data, oggi)
  const dowIndex = (data.getDay() + 6) % 7

  const lavoriFiltrati = lavori.filter(l => l.tipo_record !== 'evento')
  const eventi         = lavori.filter(l => l.tipo_record === 'evento')

  return (
    <div style={{
      borderTop:'2px solid var(--accent)', background:'var(--bg)',
      display:'flex', flexDirection:'column', overflow:'hidden', flex:1,
    }}>
      {/* Header */}
      <div style={{
        padding:'12px 20px', background:'var(--sur)',
        borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'12px',
        flexShrink:0,
      }}>
        <div style={{
          width:'36px', height:'36px', borderRadius:'9px',
          background: isOggi ? 'var(--accent)' : 'var(--accent-l)',
          color: isOggi ? '#fff' : 'var(--accent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'16px', fontWeight:700, flexShrink:0,
        }}>
          {data.getDate()}
        </div>
        <div>
          <div style={{ fontSize:'13px', fontWeight:700, color:'var(--tx)' }}>
            {GIORNI_FULL[dowIndex]} {data.getDate()} {MESI_FULL[data.getMonth()]} {data.getFullYear()}
          </div>
          <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'1px' }}>
            {loading
              ? 'Caricamento...'
              : lavori.length === 0
                ? 'Nessun lavoro'
                : `${lavoriFiltrati.length} ${lavoriFiltrati.length === 1 ? 'lavoro' : 'lavori'}${eventi.length > 0 ? ` · ${eventi.length} ${eventi.length === 1 ? 'evento' : 'eventi'}` : ''}`
            }
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:'6px' }}>

        {loading && (
          <div style={{ color:'var(--tx3)', fontSize:'12px', padding:'20px 0', textAlign:'center' }}>
            Caricamento...
          </div>
        )}

        {!loading && lavori.length === 0 && (
          <div style={{ color:'var(--tx3)', fontSize:'12px', padding:'24px 0', textAlign:'center' }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>📭</div>
            Nessun lavoro in questa giornata
          </div>
        )}

        {!loading && lavoriFiltrati.map(l => (
          <CardLavoro key={l.id} lavoro={l} onClick={onLavoroClick} />
        ))}

        {!loading && eventi.length > 0 && (
          <>
            {lavoriFiltrati.length > 0 && (
              <div style={{ fontSize:'10px', fontWeight:700, color:'var(--tx4)', letterSpacing:'.8px', textTransform:'uppercase', padding:'8px 0 2px' }}>
                EVENTI
              </div>
            )}
            {eventi.map(ev => (
              <div key={ev.id} onClick={() => onLavoroClick(ev)} style={{
                padding:'10px 14px', borderRadius:'10px',
                background:'var(--sur)', border:'1px solid var(--bor)',
                borderLeft:'4px solid var(--sla)',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'10px',
              }}>
                <span style={{ fontSize:'13px' }}>📌</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--tx)' }}>{ev.paziente || ev.titolo || 'Evento'}</div>
                  {formatOra(ev.data_inizio) && (
                    <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'2px' }}>
                      {formatOra(ev.data_inizio)}{ev.data_fine ? ` — ${formatOra(ev.data_fine)}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function CalendarioMese({ refreshKey = 0, onEventoClick }) {
  const oggi = new Date()

  const [anno,        setAnno]        = useState(oggi.getFullYear())
  const [mese,        setMese]        = useState(oggi.getMonth())
  const [selezionato, setSelezionato] = useState(oggi)
  const [lavoriMese,  setLavoriMese]  = useState([])
  const [loading,     setLoading]     = useState(true)

  // ── Unica fetch per tutto il mese ─────────────────────────────────────────
  // refreshKey cambia ogni volta che si salva un lavoro → aggiornamento automatico
  useEffect(() => {
    setLoading(true)
    const dal = formatDate(new Date(anno, mese, 1))
    const al  = formatDate(new Date(anno, mese + 1, 0))
    apiFetch(`/api/lavori?dal=${dal}&al=${al}`)
      .then(r => r.json())
      .then(data => { setLavoriMese(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anno, mese, refreshKey])

  // ── Mappa giorno → lavori per i pallini ──────────────────────────────────
  const mapaGiorno = {}
  lavoriMese.forEach(l => {
    if (!l.data_inizio) return
    const k = l.data_inizio.slice(0, 10)
    if (!mapaGiorno[k]) mapaGiorno[k] = []
    mapaGiorno[k].push(l)
  })

  // ── Lavori del giorno selezionato — filtro client-side, istantaneo ────────
  const lavoriGiornoSelezionato = selezionato
    ? lavoriMese.filter(l => {
        if (!l.data_inizio) return false
        return isSameDay(new Date(l.data_inizio), selezionato)
      })
    : []

  // ── Navigazione mese ──────────────────────────────────────────────────────
  function prevMese() {
    if (mese === 0) { setAnno(a => a - 1); setMese(11) }
    else setMese(m => m - 1)
  }
  function nextMese() {
    if (mese === 11) { setAnno(a => a + 1); setMese(0) }
    else setMese(m => m + 1)
  }
  function tornaOggi() {
    setAnno(oggi.getFullYear())
    setMese(oggi.getMonth())
    setSelezionato(oggi)
  }

  const griglia   = buildGriglia(anno, mese)
  const settimane = buildSettimane(griglia)

  const btnNav = {
    width:'30px', height:'30px', border:'1px solid var(--bor)', background:'var(--sur)',
    borderRadius:'8px', cursor:'pointer', fontSize:'16px', color:'var(--tx2)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'Instrument Sans, sans-serif',
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── Griglia mese ── */}
        <div style={{
          background:'var(--sur)', borderBottom:'1px solid var(--bor)',
          display:'flex', flexDirection:'column', flexShrink:0, padding:'0 0 8px',
        }}>

          {/* Navigazione */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 20px 12px' }}>
            <button style={btnNav} onClick={prevMese}>‹</button>
            <span style={{ fontSize:'16px', fontWeight:700, letterSpacing:'-.4px', minWidth:'160px' }}>
              {MESI_FULL[mese]} {anno}
            </span>
            <button style={btnNav} onClick={nextMese}>›</button>
            {!(anno === oggi.getFullYear() && mese === oggi.getMonth()) && (
              <button
                onClick={tornaOggi}
                style={{ ...btnNav, width:'auto', padding:'0 10px', fontSize:'11px', fontWeight:700, color:'var(--accent)', border:'1px solid var(--accent-m)' }}
              >
                Oggi
              </button>
            )}
            {loading && (
              <span style={{ fontSize:'11px', color:'var(--tx3)', marginLeft:'auto' }}>Caricamento...</span>
            )}
          </div>

          {/* Intestazioni giorni */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', padding:'0 12px', marginBottom:'4px' }}>
            {GIORNI_HDR.map(g => (
              <div key={g} style={{ textAlign:'center', fontSize:'10px', fontWeight:700, color:'var(--tx3)', letterSpacing:'.5px', textTransform:'uppercase', padding:'4px 0' }}>
                {g}
              </div>
            ))}
          </div>

          {/* Celle */}
          <div style={{ padding:'0 12px' }}>
            {settimane.map((sett, si) => (
              <div key={si} style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'2px', marginBottom:'2px' }}>
                {sett.map((data, di) => {
                  if (!data) return <div key={di} />

                  const k         = formatDate(data)
                  const lavoriQ   = mapaGiorno[k] || []
                  const isOggiD   = isSameDay(data, oggi)
                  const isSel     = selezionato && isSameDay(data, selezionato)
                  const isDom     = di === 6

                  const dotsColors = [...new Set(lavoriQ.map(l => (colori[l.colore] || colori.sky).dot))].slice(0, 3)

                  return (
                    <div
                      key={di}
                      onClick={() => setSelezionato(data)}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'center',
                        padding:'6px 4px 5px', borderRadius:'9px', cursor:'pointer',
                        transition:'background .1s',
                        background: isSel ? 'var(--accent-l)' : 'transparent',
                        outline: isSel ? '2px solid var(--accent)' : 'none',
                        outlineOffset:'-2px',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--sur2)' }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width:'28px', height:'28px', borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'13px', fontWeight: isOggiD ? 700 : 400,
                        background: isOggiD ? 'var(--accent)' : 'transparent',
                        color: isOggiD ? '#fff' : isDom ? 'var(--red)' : isSel ? 'var(--accent)' : 'var(--tx)',
                      }}>
                        {data.getDate()}
                      </div>

                      {/* Pallini */}
                      <div style={{ display:'flex', gap:'3px', marginTop:'3px', height:'5px', alignItems:'center' }}>
                        {dotsColors.map((col, ci) => (
                          <div key={ci} style={{ width:'5px', height:'5px', borderRadius:'50%', background: col }} />
                        ))}
                        {lavoriQ.length > 3 && (
                          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'var(--tx4)' }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Dettaglio giorno ── */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {selezionato ? (
            <DettaglioGiorno
              data={selezionato}
              lavori={lavoriGiornoSelezionato}
              loading={loading}
              onLavoroClick={onEventoClick}
            />
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tx3)', fontSize:'13px', flexDirection:'column', gap:'8px' }}>
              <span style={{ fontSize:'32px' }}>👆</span>
              Clicca un giorno per vedere i lavori
            </div>
          )}
        </div>

      </div>
    </div>
  )
}