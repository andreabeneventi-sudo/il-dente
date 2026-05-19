import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

const ORE = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
const GIORNI_BREVI = ['Lun','Mar','Mer','Gio','Ven','Sab']
const GIORNI_FULL  = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

const colori = {
  sky:    { bg:'#dbeafe', border:'#0284C7', color:'#0c4a6e' },
  red:    { bg:'#fee2e2', border:'#ef4444', color:'#7f1d1d' },
  green:  { bg:'#dcfce7', border:'#16a34a', color:'#14532d' },
  amber:  { bg:'#fef9c3', border:'#ca8a04', color:'#713f12' },
  purple: { bg:'#f3e8ff', border:'#9333ea', color:'#581c87' },
  blue:   { bg:'#dbeafe', border:'#3b82f6', color:'#1e3a8a' },
  slate:  { bg:'#f1f5f9', border:'#64748b', color:'#334155' },
}

function getLunedi(offset = 0) {
  const oggi = new Date()
  const lun = new Date(oggi)
  lun.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) + offset * 7)
  lun.setHours(0, 0, 0, 0)
  return lun
}

function getSettimana(lunedi) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lunedi)
    d.setDate(lunedi.getDate() + i)
    return d
  })
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getNowTop() {
  const ora = new Date()
  const minDa6 = (ora.getHours() - 6) * 60 + ora.getMinutes()
  return Math.max(0, minDa6)
}

function parseData(str) {
  if (!str) return null
  // Safari non accetta "2026-05-15 09:00:00" — serve la T come separatore
  return new Date(str.replace(' ', 'T'))
}

function testoAdattivo(bgHex) {
  const hex = (bgHex || '#0284C7').replace('#', '')
  const r = parseInt(hex.slice(0,2), 16)
  const g = parseInt(hex.slice(2,4), 16)
  const b = parseInt(hex.slice(4,6), 16)
  const luminosita = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminosita > 0.55 ? '#334155' : '#ffffff'
}

function getColoreEvento(ev, statiDB, staffDB) {
  if (ev.tipo_record === 'evento' && ev.utente_id) {
    const utente = staffDB.find(u => u.id === ev.utente_id)
    if (utente?.colore) {
      const hex = utente.colore
      return { bg: hex + '22', border: hex }
    }
  }
  if (ev.tipo_record !== 'evento' && ev.stato_id) {
    const stato = statiDB.find(s => s.id === ev.stato_id)
    if (stato?.colore) {
      const hex = stato.colore
      return { bg: hex + '22', border: hex }
    }
  }
  const fallback = {
    sky:'#0284C7', red:'#ef4444', green:'#16a34a', amber:'#ca8a04',
    purple:'#9333ea', blue:'#3b82f6', slate:'#64748b', fuchsia:'#d946ef'
  }
  const hex = fallback[ev.colore] || '#0284C7'
  return { bg: hex + '22', border: hex }
}

function calcolaLayout(lavori) {
  const events = lavori.map(ev => {
    if (!ev.data_inizio) return null
    const inizio = parseData(ev.data_inizio)
    const fine   = ev.data_fine ? parseData(ev.data_fine) : new Date(inizio.getTime() + 30 * 60000)
    const top    = (inizio.getHours() - 6) * 60 + inizio.getMinutes()
    const h      = Math.max((fine - inizio) / 60000, 24)
    return { ev, inizio, fine, top, h, col: 0, totCols: 1 }
  }).filter(Boolean)

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j]
      if (a.inizio < b.fine && a.fine > b.inizio) {
        b.col = a.col + 1
        const maxCol = Math.max(a.totCols, b.col + 1)
        events[i].totCols = maxCol
        events[j].totCols = maxCol
      }
    }
  }
  return events
}

export default function Giorno({ offsetSettimana = 0, refreshKey = 0, onEventoClick }) {
  const oggi   = new Date()
  const lunedi = getLunedi(offsetSettimana)
  const giorni = getSettimana(lunedi)

  const defaultIdx = giorni.findIndex(d => d.toDateString() === oggi.toDateString())
  const [dIdx, setDIdx]     = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const [lavori, setLavori] = useState([])
  const [loading, setLoading] = useState(true)
  const [statiDB, setStatiDB] = useState([])
  const [staffDB, setStaffDB] = useState([])
  const bodyRef = useRef(null)

  const giorno = giorni[dIdx]
  const isOggi = giorno.toDateString() === oggi.toDateString()
  const nowTop = getNowTop()

  useEffect(() => {
    apiFetch('/api/stati-lavoro').then(r => r.json()).then(setStatiDB).catch(() => {})
    apiFetch('/api/utenti-staff').then(r => r.json()).then(setStaffDB).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const sabato = new Date(lunedi)
    sabato.setDate(lunedi.getDate() + 6)
    apiFetch(`/api/lavori?dal=${formatDate(lunedi)}&al=${formatDate(sabato)}`)
      .then(r => r.json())
      .then(data => { setLavori(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [offsetSettimana, refreshKey])
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 120
  }, [])

  const giornoStr = formatDate(giorno)
  const lavoriGiorno = lavori.filter(ev => {
    if (!ev.data_inizio) return false
    return ev.data_inizio.slice(0, 10) === giornoStr
  })

  console.log('lavoriGiorno:', lavoriGiorno.length, giorno.toDateString())
console.log('tutti i lavori:', lavori.length)

  const layout = calcolaLayout(lavoriGiorno)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--sur)' }}>

      {/* Tab giorni */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0, padding:'0 16px' }}>
        <div style={{ width:'52px', flexShrink:0 }} />
        {giorni.map((d, i) => {
          const isT   = d.toDateString() === oggi.toDateString()
          const isSel = i === dIdx
          return (
            <div key={i} onClick={() => setDIdx(i)} style={{
              flex:1, padding:'8px 6px', textAlign:'center', cursor:'pointer',
              borderBottom: isSel ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom:'-1px',
            }}>
              <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color: isSel ? 'var(--accent)' : 'var(--tx3)', marginBottom:'3px' }}>
                {GIORNI_BREVI[i]}
              </div>
              <div style={{
                fontSize: isT ? '15px' : '20px',
                fontWeight: isT ? 700 : 300,
                color: isT ? '#fff' : isSel ? 'var(--accent)' : 'var(--tx2)',
                lineHeight: 1,
                ...(isT ? { background:'var(--accent)', width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' } : {})
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Titolo giorno */}
      <div style={{ padding:'10px 20px 8px', borderBottom:'1px solid var(--borl)', flexShrink:0, display:'flex', alignItems:'center', gap:'10px' }}>
        <span style={{ fontSize:'13px', fontWeight:700 }}>
          {GIORNI_FULL[dIdx]} {giorno.getDate()} {MESI[giorno.getMonth()]} {giorno.getFullYear()}
        </span>
        <span style={{ background:'var(--accent-l)', color:'var(--accent)', fontSize:'11px', fontWeight:600, padding:'2px 10px', borderRadius:'99px' }}>
          {lavoriGiorno.length} {lavoriGiorno.length === 1 ? 'lavoro' : 'lavori'}
        </span>
      </div>

      {/* Corpo */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'var(--tx3)', fontSize:'13px' }}>
            Caricamento...
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'52px 1fr', position:'relative' }}>

          {isOggi && (
            <div style={{ position:'absolute', left:0, right:0, top:`${nowTop}px`, height:'2px', background:'rgba(239,68,68,.55)', zIndex:15, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'52px', top:'-4px', width:'8px', height:'8px', background:'var(--red)', borderRadius:'50%' }} />
              <span style={{ position:'absolute', left:'4px', top:'-8px', fontSize:'9px', fontFamily:'JetBrains Mono, monospace', background:'var(--red)', color:'#fff', padding:'1px 4px', borderRadius:'3px' }}>
                {String(new Date().getHours()).padStart(2,'0')}:{String(new Date().getMinutes()).padStart(2,'0')}
              </span>
            </div>
          )}

          <div>
            {ORE.map(ora => (
              <div key={ora} style={{ height:'60px', borderBottom:'1px solid var(--borl)', display:'flex', alignItems:'flex-start', paddingTop:'2px', justifyContent:'flex-end', paddingRight:'8px' }}>
                <span style={{ fontSize:'9px', fontFamily:'JetBrains Mono, monospace', color:'var(--tx3)', marginTop:'-5px' }}>{ora}</span>
              </div>
            ))}
          </div>

          <div style={{ borderLeft:'1px solid var(--borl)', position:'relative', background: isOggi ? 'rgba(2,132,199,.015)' : 'transparent' }}>
            {ORE.map(ora => (
              <div key={ora} style={{ height:'60px', borderBottom:'1px solid var(--borl)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, right:0, top:'50%', height:'1px', background:'var(--borl)', opacity:.4 }} />
              </div>
            ))}

            {layout.map(({ ev, top, h, col, totCols }) => {
              const c = getColoreEvento(ev, statiDB, staffDB)
              const inizio = parseData(ev.data_inizio)
              const oraLabel = `${String(inizio.getHours()).padStart(2,'0')}:${String(inizio.getMinutes()).padStart(2,'0')}`
              const widthPct = 100 / totCols
              const leftPct  = col * widthPct
              const clienteLabel = ev.cliente_display || ev.clinica

              const rigaInfo = [
                clienteLabel,
                ev.paziente,
                ev.tipo ? `${ev.tipo}${ev.tinta ? ` ${ev.tinta}` : ''}` : null,
                ev.elementi || null,
              ].filter(Boolean).join(' — ')

              return (
                <div key={ev.id} onClick={() => onEventoClick(ev)} style={{
                  position:'absolute', top:`${top}px`, height:`${h}px`,
                  left:`calc(${leftPct}% + 4px)`, width:`calc(${widthPct}% - 8px)`,
                  background: c.border, borderLeft:`4px solid ${c.bg}`, color: testoAdattivo(c.border),
                  borderRadius:'7px', padding:'4px 8px', cursor:'pointer',
                  overflow:'hidden', zIndex: 10 + col, boxShadow:'0 1px 4px rgba(15,23,42,.07)',
                  display:'flex', alignItems:'center', gap:'6px',
                }}>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px', fontWeight:700, opacity:.8, flexShrink:0 }}>
                    {oraLabel}
                  </span>
                  <span style={{ fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                    {rigaInfo}
                  </span>
                  {ev.urgente && (
                    <span style={{ fontSize:'9px', background:'var(--red)', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontWeight:700, flexShrink:0 }}>⚡</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}