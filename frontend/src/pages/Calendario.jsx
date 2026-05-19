import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

const ORE = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
const GIORNI = ['LUN','MAR','MER','GIO','VEN','SAB']

const colori = {
  sky:    { bg:'#dbeafe', border:'#0284C7', color:'#0c4a6e' },
  red:    { bg:'#fee2e2', border:'#ef4444', color:'#7f1d1d' },
  green:  { bg:'#dcfce7', border:'#16a34a', color:'#14532d' },
  amber:  { bg:'#fef9c3', border:'#ca8a04', color:'#713f12' },
  purple: { bg:'#f3e8ff', border:'#9333ea', color:'#581c87' },
  blue:   { bg:'#dbeafe', border:'#3b82f6', color:'#1e3a8a' },
  slate:  { bg:'#f1f5f9', border:'#64748b', color:'#334155' },
  fuchsia:{ bg:'#fdf4ff', border:'#d946ef', color:'#701a75' },
}

const DEFAULT_COLOR = colori.fuchsia

// Calcola il colore del testo in base alla luminosità dello sfondo
// Restituisce grigio scuro per sfondi chiari, bianco per sfondi scuri
function testoAdattivo(bgHex) {
  const hex = bgHex.replace('#', '')
  const r = parseInt(hex.slice(0,2), 16)
  const g = parseInt(hex.slice(2,4), 16)
  const b = parseInt(hex.slice(4,6), 16)
  // Formula luminosità percepita (standard W3C)
  const luminosita = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminosita > 0.55 ? '#334155' : '#ffffff'
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
  return d.toISOString().slice(0, 10)
}

function getNowTop() {
  const ora = new Date()
  const minDa6 = (ora.getHours() - 6) * 60 + ora.getMinutes()
  return Math.max(0, minDa6)
}

function eventoToStyle(ev, giorniSettimana) {
  if (!ev.data_inizio) return null
  const inizio = new Date(ev.data_inizio)
  const fine   = ev.data_fine ? new Date(ev.data_fine) : new Date(inizio.getTime() + 30 * 60000)
  const giornoIdx = giorniSettimana.findIndex(d => d.toDateString() === inizio.toDateString())
  if (giornoIdx === -1) return null
  const minDa6 = (inizio.getHours() - 6) * 60 + inizio.getMinutes()
  const durata = (fine - inizio) / 60000
  return { giornoIdx, top: minDa6, h: Math.max(durata, 32) }
}

function calcolaLayoutColonna(eventiColonna, giorniSettimana) {
  const items = eventiColonna.map(ev => {
    const s = eventoToStyle(ev, giorniSettimana)
    if (!s) return null
    const inizio = new Date(ev.data_inizio)
    const fine   = ev.data_fine ? new Date(ev.data_fine) : new Date(inizio.getTime() + 30 * 60000)
    return { ev, top: s.top, h: s.h, inizio, fine, col: 0, totCols: 1 }
  }).filter(Boolean)

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]
      if (a.inizio < b.fine && a.fine > b.inizio) {
        b.col = a.col + 1
        const maxCol = Math.max(a.totCols, b.col + 1)
        items[i].totCols = maxCol
        items[j].totCols = maxCol
      }
    }
  }
  return items
}

function Tooltip({ ev, x, y }) {
  const c = colori[ev.colore] || DEFAULT_COLOR
  const inizio = ev.data_inizio ? new Date(ev.data_inizio) : null
  const oraLabel = inizio
    ? `${String(inizio.getHours()).padStart(2,'0')}:${String(inizio.getMinutes()).padStart(2,'0')}`
    : null
  const clienteLabel = ev.cliente_display || ev.clinica

  return (
    <div style={{
      position:'fixed', left: x + 16, top: y - 10, zIndex:500,
      background:'var(--sur)', border:'1px solid var(--bor)',
      borderLeft:`5px solid ${c.border}`,
      borderRadius:'12px', padding:'16px 18px', width:'286px',
      boxShadow:'0 8px 32px rgba(15,23,42,.18)',
      pointerEvents:'none',
    }}>
      {oraLabel && (
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'13px', fontWeight:700, color: c.border, marginBottom:'8px', letterSpacing:'.3px' }}>
          {oraLabel}
        </div>
      )}
      <div style={{ fontSize:'17px', fontWeight:700, color:'var(--tx)', lineHeight:1.3, marginBottom:'4px' }}>
        {ev.paziente}
      </div>
      {clienteLabel && (
        <div style={{ fontSize:'14px', color:'var(--tx2)', marginBottom:'3px' }}>
          {clienteLabel}
        </div>
      )}
      {ev.tipo && (
        <div style={{ fontSize:'14px', color:'var(--tx3)' }}>
          {ev.tipo}{ev.tinta ? ` — ${ev.tinta}` : ''}
        </div>
      )}
      {ev.elementi && (
        <div style={{ fontSize:'13px', color:'var(--tx3)', marginTop:'3px' }}>
          {ev.elementi}
        </div>
      )}
      {ev.note && (
        <div style={{ fontSize:'13px', color:'var(--tx2)', marginTop:'4px', lineHeight:1.4 }}>
          {ev.note}
        </div>
      )}
      {ev.urgente && (
        <div style={{ marginTop:'8px', display:'inline-flex', alignItems:'center', gap:'4px', background:'var(--redb)', color:'var(--red)', padding:'3px 10px', borderRadius:'99px', fontSize:'12px', fontWeight:700 }}>
          ⚡ Urgente
        </div>
      )}
    </div>
  )
}

export default function Calendario({ offsetSettimana = 0, refreshKey = 0, onEventoClick, onNuovoClick }) {
  const [lavori, setLavori]   = useState([])
  const [staffDB, setStaffDB] = useState([])
  const [statiDB, setStatiDB] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [ghost, setGhost]     = useState(null)
  const bodyRef = useRef(null)

  const lunedi = getLunedi(offsetSettimana)
  const giorni = getSettimana(lunedi)
  const sabato = new Date(lunedi)
  sabato.setDate(lunedi.getDate() + 5)
  sabato.setHours(23, 59, 59)

  const oggi   = new Date()
  const nowTop = getNowTop()

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/lavori?dal=${formatDate(lunedi)}&al=${formatDate(sabato)}`)
      .then(r => r.json())
      .then(data => { setLavori(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [offsetSettimana, refreshKey])

  useEffect(() => {
    apiFetch('/api/utenti-staff')
      .then(r => r.json())
      .then(data => setStaffDB(data))
      .catch(() => {})
    apiFetch('/api/stati-lavoro')
      .then(r => r.json())
      .then(data => setStatiDB(data))
      .catch(() => {})
  }, [])

  function handleColMouseMove(e, colIdx) {
    if (e.target.closest('[data-evento]')) { setGhost(null); return }
    const col = e.currentTarget
    const rect = col.getBoundingClientRect()
    const relY = e.clientY - rect.top + col.scrollTop
    const snapPx = Math.floor(relY / 30) * 30
    const clampedPx = Math.max(0, snapPx)
    const minsFromStart = Math.floor(clampedPx / 60 * 60)
    const h = 6 + Math.floor(minsFromStart / 60)
    const m = minsFromStart % 60
    const eh = 6 + Math.floor((minsFromStart + 30) / 60)
    const em = (minsFromStart + 30) % 60
    const pad = n => String(n).padStart(2,'0')
    const d = giorni[colIdx]
    const dataLocale = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    setGhost({ colIdx, top: clampedPx, ora:`${pad(h)}:${pad(m)}`, oraFine:`${pad(eh)}:${pad(em)}`, data: dataLocale, h, m })
  }

  function handleColClick(e, colIdx) {
    if (e.target.closest('[data-evento]')) return
    if (!ghost || ghost.colIdx !== colIdx) return
    onNuovoClick?.({ data: ghost.data, ora: ghost.ora, tipo_form: 'lavoro' })
  }

  function getColoreEvento(ev) {
    // Eventi personali — colore dell'utente assegnato
    if (ev.tipo_record === 'evento' && ev.utente_id) {
      const utente = staffDB.find(u => u.id === ev.utente_id)
      if (utente) {
        const hex = utente.colore
        return { bg: hex + '22', border: hex, color: hex }
      }
    }
    // Lavori — colore dello stato
    if (ev.tipo_record !== 'evento' && ev.stato_id) {
      const stato = statiDB.find(s => s.id === ev.stato_id)
      if (stato) {
        const hex = stato.colore
        return { bg: hex + '22', border: hex, color: hex }
      }
    }
    return colori[ev.colore] || DEFAULT_COLOR
  }

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 120
  }, [])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--sur)' }}>

      {/* Header giorni */}
      <div style={{ display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0 }}>
        <div style={{ borderRight:'1px solid var(--borl)' }} />
        {giorni.map((d, i) => {
          const isOggi = d.toDateString() === oggi.toDateString()
          return (
            <div key={i} style={{ borderLeft:'1px solid var(--borl)', padding:'8px 6px 6px', textAlign:'center', cursor:'pointer' }}>
              <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--tx3)', marginBottom:'3px' }}>
                {GIORNI[i]}
              </div>
              <div style={{
                fontSize: isOggi ? '15px' : '20px',
                fontWeight: isOggi ? 700 : 300,
                color: isOggi ? '#fff' : 'var(--tx2)',
                lineHeight: 1,
                ...(isOggi ? { background:'var(--accent)', width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' } : {})
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Banda eventi multi-giorno — fissa sotto l'header */}
      {(() => {
        const multiday = lavori.filter(ev => {
          if (ev.multigiorno) return true
          if (ev.tipo_record === 'evento' && ev.data_inizio) {
            const inizio = new Date(ev.data_inizio)
            if (inizio.getHours() === 0 && inizio.getMinutes() === 0) return true
          }
          return false
        })
        if (multiday.length === 0) return null

        // Calcola righe per gestire sovrapposizioni
        const righe = []
        multiday.forEach(ev => {
          const inizio = new Date(ev.data_inizio); inizio.setHours(0,0,0,0)
          const fine   = ev.data_fine ? new Date(ev.data_fine) : new Date(inizio); fine.setHours(23,59,59)
          // Trova prima riga disponibile
          let riga = 0
          while (righe[riga]?.some(r => r.inizio <= fine && r.fine >= inizio)) riga++
          if (!righe[riga]) righe[riga] = []
          righe[riga].push({ ev, inizio, fine })
        })

        const nRighe = righe.length
        const altezzaRiga = 26

        return (
          <div style={{ position:'relative', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0, height: `${nRighe * altezzaRiga + 6}px` }}>
            {/* Colonne di sfondo */}
            <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', pointerEvents:'none' }}>
              <div style={{ borderRight:'1px solid var(--borl)' }} />
              {giorni.map((_, i) => <div key={i} style={{ borderLeft:'1px solid var(--borl)' }} />)}
            </div>

            {/* Overlay con stessa griglia per posizionamento preciso */}
            <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', pointerEvents:'none' }}>
              <div />
              {giorni.map((d, colIdx) => {
                const colEvents = righe.flatMap((riga, rigaIdx) =>
                  riga
                    .filter(({ ev, inizio, fine }) => {
                      const dc = new Date(d); dc.setHours(12,0,0,0)
                      return dc >= inizio && dc <= fine
                    })
                    .map(({ ev, inizio, fine }) => {
                      const c = getColoreEvento(ev)
                      const isFirst = new Date(d).toDateString() === new Date(inizio).toDateString() ||
                        colIdx === 0
                      const isLast  = new Date(d).toDateString() === new Date(fine).toDateString() ||
                        colIdx === 5
                      return (
                        <div
                          key={`${ev.id}-${colIdx}`}
                          onClick={() => onEventoClick(ev)}
                          style={{
                            position:'absolute',
                            top: `${rigaIdx * altezzaRiga + 3}px`,
                            height: `${altezzaRiga - 6}px`,
                            left: 0, right: 0,
                            background: c.border,
                            borderTop: `1px solid ${c.bg}`,
                            borderBottom: `1px solid ${c.bg}`,
                            borderLeft: isFirst ? `4px solid ${c.bg}` : 'none',
                            borderRight: isLast  ? `1px solid ${c.bg}` : 'none',
                            borderRadius: isFirst && isLast ? '5px' :
                              isFirst ? '5px 0 0 5px' : isLast ? '0 5px 5px 0' : '0',
                            color: testoAdattivo(c.border),
                            fontSize:'11px', fontWeight:700,
                            padding: isFirst ? '0 8px' : '0',
                            cursor:'pointer', pointerEvents:'all',
                            display:'flex', alignItems:'center',
                            overflow:'hidden', whiteSpace:'nowrap',
                            zIndex: 10 + rigaIdx,
                          }}
                        >
                          {isFirst && ev.paziente}
                        </div>
                      )
                    })
                )
                return (
                  <div key={colIdx} style={{ position:'relative' }}>
                    {colEvents}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Corpo scrollabile */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'var(--tx3)', fontSize:'13px' }}>
            Caricamento...
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'52px repeat(6, 1fr)', position:'relative' }}>

          {oggi >= lunedi && oggi <= sabato && (
            <div style={{ position:'absolute', left:0, right:0, top:`${nowTop}px`, height:'1px', background:'rgba(239,68,68,.55)', zIndex:15, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'52px', top:'-3px', width:'7px', height:'7px', background:'rgba(239,68,68,.7)', borderRadius:'50%' }} />
            </div>
          )}

          <div>
            {ORE.map(ora => (
              <div key={ora} style={{ height:'60px', borderBottom:'1px solid var(--borl)', display:'flex', alignItems:'flex-start', paddingTop:'2px', justifyContent:'flex-end', paddingRight:'6px' }}>
                <span style={{ fontSize:'9px', fontFamily:'JetBrains Mono, monospace', color:'var(--tx3)', marginTop:'-5px' }}>{ora}</span>
              </div>
            ))}
          </div>

          {giorni.map((d, colIdx) => {
            const isOggi   = d.toDateString() === oggi.toDateString()
            const isWeekend = colIdx === 5
            const eventiCol = lavori.filter(ev => {
              if (ev.multigiorno) return false
              // Escludi eventi che coprono l'intera giornata (salvati prima del flag multigiorno)
              if (ev.tipo_record === 'evento' && ev.data_inizio) {
                const inizio = new Date(ev.data_inizio)
                if (inizio.getHours() === 0 && inizio.getMinutes() === 0) return false
              }
              const s = eventoToStyle(ev, giorni)
              return s && s.giornoIdx === colIdx
            })

            return (
              <div
                key={colIdx}
                onMouseMove={e => handleColMouseMove(e, colIdx)}
                onMouseLeave={() => setGhost(null)}
                onClick={e => handleColClick(e, colIdx)}
                style={{
                  borderLeft:'1px solid var(--borl)', position:'relative',
                  background: isOggi ? 'rgba(2,132,199,.02)' : isWeekend ? 'rgba(148,163,184,.025)' : 'transparent',
                  cursor: 'pointer',
                }}>
                {ORE.map(ora => (
                  <div key={ora} style={{ height:'60px', borderBottom:'1px solid var(--borl)', position:'relative' }}>
                    <div style={{ position:'absolute', left:0, right:0, top:'50%', height:'1px', background:'var(--borl)', opacity:.4 }} />
                  </div>
                ))}

                {/* Ghost slot */}
                {ghost?.colIdx === colIdx && (
                  <div style={{
                    position:'absolute',
                    top: `${ghost.top}px`,
                    left:'3px', right:'3px',
                    height:'30px',
                    background:'rgba(217,70,239,.12)',
                    border:'1.5px dashed rgba(217,70,239,.45)',
                    borderRadius:'5px',
                    pointerEvents:'none',
                    zIndex:3,
                    display:'flex',
                    alignItems:'center',
                    padding:'0 6px',
                    fontSize:'10px',
                    fontWeight:600,
                    color:'#d946ef',
                  }}>
                    {ghost.ora} – {ghost.oraFine}
                  </div>
                )}

                {calcolaLayoutColonna(eventiCol, giorni).map(({ ev, top, h, col, totCols }) => {
                  const c = getColoreEvento(ev)
                  const widthPct = 100 / totCols
                  const leftPct  = col * widthPct
                  const clienteLabel = ev.cliente_display || ev.clinica
                  return (
                    <div
                      key={ev.id}
                      data-evento="true"
                      onClick={() => onEventoClick(ev)}
                      onMouseEnter={e => setTooltip({ ev, x: e.clientX, y: e.clientY })}
                      onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        position:'absolute', top:`${top}px`, height:`${h}px`,
                        left:`calc(${leftPct}% + 2px)`,
                        width:`calc(${widthPct}% - 4px)`,
                        background: c.border, borderLeft:`3px solid ${c.bg}`, color: testoAdattivo(c.border),
                        borderRadius:'5px', padding:'2px 5px', fontSize:'11px',
                        cursor:'pointer', overflow:'hidden', zIndex: 10 + col,
                        display:'flex', flexDirection:'column', justifyContent:'center', gap:'1px',
                      }}
                    >
                      <div style={{ fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
                        {clienteLabel ? `${clienteLabel} — ` : ''}{ev.paziente}
                      </div>
                      {ev.tipo && h > 28 && (
                        <div style={{ fontSize:'10px', opacity:.75, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
                          {ev.tipo}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {tooltip && <Tooltip ev={tooltip.ev} x={tooltip.x} y={tooltip.y} />}
    </div>
  )
}