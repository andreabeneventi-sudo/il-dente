import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef, useCallback } from 'react'

const ORE = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
const GIORNI_BREVI = ['Lun','Mar','Mer','Gio','Ven','Sab']
const GIORNI_FULL  = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

const SLOT_H = 60        // px per ora
const ORA_INIZIO = 6     // 06:00

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
  const minDa6 = (ora.getHours() - ORA_INIZIO) * 60 + ora.getMinutes()
  return Math.max(0, minDa6)
}

function parseData(str) {
  if (!str) return null
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
    const top    = (inizio.getHours() - ORA_INIZIO) * 60 + inizio.getMinutes()
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

// Arrotonda ai 15 minuti più vicini
function arrotondaMinuti(min) {
  return Math.round(min / 15) * 15
}

export default function Giorno({ offsetSettimana = 0, initialDIdx = null, onInitialDIdxConsumed, onOffsetChange, refreshKey = 0, onEventoClick, onNuovoPrecompilato }) {
  const oggi   = new Date()
  const lunedi = getLunedi(offsetSettimana)
  const giorni = getSettimana(lunedi)

  const defaultIdx = initialDIdx !== null ? initialDIdx : (giorni.findIndex(d => d.toDateString() === oggi.toDateString()) >= 0 ? giorni.findIndex(d => d.toDateString() === oggi.toDateString()) : 0)
  const [dIdx, setDIdx]     = useState(defaultIdx)
  const [lavori, setLavori] = useState([])
  const [loading, setLoading] = useState(true)
  const [statiDB, setStatiDB] = useState([])
  const [staffDB, setStaffDB] = useState([])

  // Drag state
  const [dragging, setDragging]   = useState(null)  // { id, offsetMin }
  const [dragTop,  setDragTop]    = useState(null)   // px top durante drag
  const [ghostOra, setGhostOra]   = useState(null)   // "HH:MM" label ghost

  // Ghost hover (nuovo slot)
  const [ghost, setGhost] = useState(null)  // { top, ora, oraFine }

  const bodyRef    = useRef(null)
  const gridRef    = useRef(null)
  const draggingRef = useRef(false) // ref sincrono per bloccare click dopo drag

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

  // Aggiorna dIdx quando torniamo da PaginaLavoro con un giorno specifico
  useEffect(() => {
    if (initialDIdx !== null) {
      setDIdx(initialDIdx)
      onInitialDIdxConsumed?.()  // resetta in App per non ripetere al prossimo render
    }
  }, [initialDIdx])

  // Aggiorna dIdx quando cambia settimana: cerca il giorno corrente nella nuova settimana
  useEffect(() => {
    const newGiorni = getSettimana(getLunedi(offsetSettimana))
    const idx = newGiorni.findIndex(d => d.toDateString() === oggi.toDateString())
    setDIdx(idx >= 0 ? idx : 0)
  }, [offsetSettimana])

  const giorno    = giorni[dIdx]
  const isOggi    = giorno.toDateString() === oggi.toDateString()
  const nowTop    = getNowTop()
  const giornoStr = formatDate(giorno)

  const lavoriGiorno = lavori.filter(ev => {
    if (!ev.data_inizio) return false
    return ev.data_inizio.slice(0, 10) === giornoStr
  })

  const layout = calcolaLayout(lavoriGiorno)

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  function pxToMinuti(pxFromTop) {
    // pxFromTop relativo alla colonna eventi (senza la colonna ore)
    return Math.max(0, pxFromTop)
  }

  function getGridTop(clientY) {
    if (!gridRef.current) return 0
    const rect = gridRef.current.getBoundingClientRect()
    return clientY - rect.top + (bodyRef.current?.scrollTop || 0)
  }

  function onDragStart(e, ev, top) {
    // offsetMin: quanti minuti dall'inizio dell'evento ha cliccato l'utente
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const offsetMin = Math.floor(clickY)   // px ≈ min (1px = 1min)
    draggingRef.current = false  // reset: diventa true solo se si muove
    setDragging({ id: ev.id, ev, offsetMin, originalTop: top })
    setDragTop(top)
    setGhost(null)
    // Calcola etichetta ora ghost
    const minTot = arrotondaMinuti(top)
    const h = Math.floor(minTot / 60) + ORA_INIZIO
    const m = minTot % 60
    setGhostOra(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    e.stopPropagation()
  }

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    draggingRef.current = true  // c'è stato movimento → non scattare click
    const rawTop  = getGridTop(e.clientY) - dragging.offsetMin
    const snapTop = arrotondaMinuti(Math.max(0, rawTop))
    setDragTop(snapTop)
    const minTot  = snapTop
    const h = Math.floor(minTot / 60) + ORA_INIZIO
    const m = minTot % 60
    setGhostOra(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }, [dragging])

  const onMouseUp = useCallback(async (e) => {
    if (!dragging) return
    const wasDragging = draggingRef.current
    const rawTop  = getGridTop(e.clientY) - dragging.offsetMin
    const snapMin = arrotondaMinuti(Math.max(0, rawTop))
    setDragging(null)
    setDragTop(null)
    setGhostOra(null)

    // Se non c'è stato movimento reale, non aggiornare (era un click)
    if (!wasDragging) return
    draggingRef.current = false

    // Calcola nuova data_inizio
    const ev = dragging.ev
    const nuovaInizio = new Date(giorno)
    nuovaInizio.setHours(ORA_INIZIO + Math.floor(snapMin / 60), snapMin % 60, 0, 0)

    // Calcola durata originale per mantenere data_fine
    const origInizio = parseData(ev.data_inizio)
    const origFine   = ev.data_fine ? parseData(ev.data_fine) : new Date(origInizio.getTime() + 30 * 60000)
    const durata     = origFine - origInizio  // ms

    const nuovaFine = new Date(nuovaInizio.getTime() + durata)

    function fmt(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    }

    // Ottimisticamente aggiorna UI
    setLavori(prev => prev.map(l => {
      if (l.id !== ev.id) return l
      return { ...l, data_inizio: fmt(nuovaInizio).replace('T',' '), data_fine: fmt(nuovaFine).replace('T',' ') }
    }))

    try {
      await apiFetch(`/api/lavori/${ev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_inizio: fmt(nuovaInizio), data_fine: fmt(nuovaFine) }),
      })
    } catch(err) {
      console.error('Errore aggiornamento orario:', err)
      // Rollback
      setLavori(prev => prev.map(l => l.id === ev.id ? ev : l))
    }
  }, [dragging, giorno])

  // Attach global listeners during drag
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, onMouseMove, onMouseUp])

  // ── Click su slot vuoto ───────────────────────────────────────────────────────
  function onSlotClick(e) {
    if (draggingRef.current) return  // stava draggando
    if (!onNuovoPrecompilato) return
    const rect = gridRef.current.getBoundingClientRect()
    const relY  = e.clientY - rect.top + (bodyRef.current?.scrollTop || 0)
    const minTot = arrotondaMinuti(Math.max(0, relY))
    const h = Math.floor(minTot / 60) + ORA_INIZIO
    const m = minTot % 60
    const ora = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    onNuovoPrecompilato({
      data: giornoStr,
      ora,
      tipo_form: 'evento',
    })
  }

  // ── Ghost hover (nuovo slot) ──────────────────────────────────────────────────
  function onGhostMove(e) {
    if (dragging) return  // durante drag non mostrare ghost hover
    if (e.target.closest('[data-evento]')) { setGhost(null); return }
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const relY   = e.clientY - rect.top + (bodyRef.current?.scrollTop || 0)
    const snapPx = Math.floor(relY / 30) * 30
    const mins   = Math.max(0, snapPx)
    const h      = ORA_INIZIO + Math.floor(mins / 60)
    const m      = mins % 60
    const eh     = ORA_INIZIO + Math.floor((mins + 30) / 60)
    const em     = (mins + 30) % 60
    const pad    = n => String(n).padStart(2, '0')
    setGhost({ top: snapPx, ora: `${pad(h)}:${pad(m)}`, oraFine: `${pad(eh)}:${pad(em)}` })
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--sur)', userSelect: dragging ? 'none' : 'auto' }}>

      {/* Tab giorni + frecce settimana */}
      <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0, padding:'0 8px', gap:'4px' }}>
        {/* Freccia sinistra */}
        <button
          onClick={() => onOffsetChange && onOffsetChange(offsetSettimana - 1)}
          style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', cursor:'pointer', fontSize:'16px', color:'var(--tx2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          title="Settimana precedente"
        >‹</button>

        {/* Tab giorni */}
        <div style={{ display:'flex', flex:1 }}>
          <div style={{ width:'44px', flexShrink:0 }} />
          {giorni.map((d, i) => {
            const isT   = d.toDateString() === oggi.toDateString()
            const isSel = i === dIdx
            return (
              <div key={i} onClick={() => setDIdx(i)} style={{
                flex:1, padding:'8px 4px', textAlign:'center', cursor:'pointer',
                borderBottom: isSel ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:'-1px',
              }}>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color: isSel ? 'var(--accent)' : 'var(--tx3)', marginBottom:'3px' }}>
                  {GIORNI_BREVI[i]}
                </div>
                <div style={{
                  fontSize: isT ? '13px' : '18px',
                  fontWeight: isT ? 700 : 300,
                  color: isT ? '#fff' : isSel ? 'var(--accent)' : 'var(--tx2)',
                  lineHeight: 1,
                  ...(isT ? { background:'var(--accent)', width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' } : {})
                }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Freccia destra */}
        <button
          onClick={() => onOffsetChange && onOffsetChange(offsetSettimana + 1)}
          style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', cursor:'pointer', fontSize:'16px', color:'var(--tx2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          title="Settimana successiva"
        >›</button>
      </div>

      {/* Titolo giorno */}
      <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--borl)', flexShrink:0, display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'13px', fontWeight:700 }}>
          {GIORNI_FULL[dIdx]} {giorno.getDate()} {MESI[giorno.getMonth()]} {giorno.getFullYear()}
        </span>
        <span style={{ background:'var(--accent-l)', color:'var(--accent)', fontSize:'11px', fontWeight:600, padding:'2px 10px', borderRadius:'99px' }}>
          {lavoriGiorno.length} {lavoriGiorno.length === 1 ? 'lavoro' : 'lavori'}
        </span>
        {/* Bottone aggiungi */}
        {onNuovoPrecompilato && (
          <button
            onClick={() => onNuovoPrecompilato({ data: giornoStr, tipo_form: 'lavoro' })}
            style={{ marginLeft:'auto', padding:'5px 12px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}
          >+ Aggiungi lavoro</button>
        )}
      </div>

      {/* Corpo */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'var(--tx3)', fontSize:'13px' }}>
            Caricamento...
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'44px 1fr', position:'relative' }}>

          {/* Linea "ora corrente" */}
          {isOggi && (
            <div style={{ position:'absolute', left:0, right:0, top:`${nowTop}px`, height:'2px', background:'rgba(239,68,68,.55)', zIndex:15, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'44px', top:'-4px', width:'8px', height:'8px', background:'var(--red)', borderRadius:'50%' }} />
              <span style={{ position:'absolute', left:'2px', top:'-8px', fontSize:'9px', fontFamily:'JetBrains Mono, monospace', background:'var(--red)', color:'#fff', padding:'1px 4px', borderRadius:'3px' }}>
                {String(new Date().getHours()).padStart(2,'0')}:{String(new Date().getMinutes()).padStart(2,'0')}
              </span>
            </div>
          )}

          {/* Colonna ore */}
          <div>
            {ORE.map(ora => (
              <div key={ora} style={{ height:`${SLOT_H}px`, borderBottom:'1px solid var(--borl)', display:'flex', alignItems:'flex-start', paddingTop:'2px', justifyContent:'flex-end', paddingRight:'6px' }}>
                <span style={{ fontSize:'9px', fontFamily:'JetBrains Mono, monospace', color:'var(--tx3)', marginTop:'-5px' }}>{ora}</span>
              </div>
            ))}
          </div>

          {/* Colonna eventi — cliccabile per nuovo slot */}
          <div
            ref={gridRef}
            onMouseMove={onGhostMove}
            onMouseLeave={() => setGhost(null)}
            onClick={onSlotClick}
            style={{ borderLeft:'1px solid var(--borl)', position:'relative', background: isOggi ? 'rgba(2,132,199,.015)' : 'transparent', cursor: onNuovoPrecompilato ? 'pointer' : 'default' }}
          >
            {ORE.map(ora => (
              <div key={ora} style={{ height:`${SLOT_H}px`, borderBottom:'1px solid var(--borl)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, right:0, top:'50%', height:'1px', background:'var(--borl)', opacity:.4 }} />
              </div>
            ))}

            {/* Ghost hover — nuovo slot */}
            {ghost && !dragging && (
              <div style={{
                position:'absolute', top:`${ghost.top}px`,
                left:'3px', right:'3px', height:'30px',
                background:'rgba(217,70,239,.12)',
                border:'1.5px dashed rgba(217,70,239,.45)',
                borderRadius:'5px', pointerEvents:'none', zIndex:3,
                display:'flex', alignItems:'center', padding:'0 6px',
                fontSize:'10px', fontWeight:600, color:'#d946ef',
              }}>
                {ghost.ora} – {ghost.oraFine}
              </div>
            )}

            {/* Ghost drag — spostamento evento */}
            {dragging && dragTop !== null && (
              <div style={{
                position:'absolute', top:`${dragTop}px`,
                left:'4px', right:'4px', height:'48px',
                background:'var(--accent)', opacity:.25,
                borderRadius:'7px', zIndex:20, pointerEvents:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ fontSize:'11px', fontWeight:700, color:'var(--accent)', background:'white', padding:'2px 8px', borderRadius:'4px', opacity:1 }}>
                  {ghostOra}
                </span>
              </div>
            )}

            {layout.map(({ ev, top, h, col, totCols }) => {
              const isDraggingThis = dragging?.id === ev.id
              const displayTop = isDraggingThis ? dragTop : top
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
                <div
                  key={ev.id}
                  data-evento="true"
                  onMouseDown={(e) => {
                    if (e.button !== 0) return
                    onDragStart(e, ev, top)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!draggingRef.current) onEventoClick(ev)
                  }}
                  style={{
                    position:'absolute',
                    top:`${displayTop}px`,
                    height:`${h}px`,
                    left:`calc(${leftPct}% + 4px)`,
                    width:`calc(${widthPct}% - 8px)`,
                    background: c.border,
                    borderLeft:`4px solid ${c.bg}`,
                    color: testoAdattivo(c.border),
                    borderRadius:'7px', padding:'4px 8px', cursor:'grab',
                    overflow:'hidden',
                    zIndex: isDraggingThis ? 50 : 10 + col,
                    boxShadow: isDraggingThis ? '0 4px 20px rgba(2,132,199,.35)' : '0 1px 4px rgba(15,23,42,.07)',
                    display:'flex', alignItems:'center', gap:'6px',
                    opacity: isDraggingThis ? 0.85 : 1,
                    transition: isDraggingThis ? 'none' : 'box-shadow .1s',
                  }}
                >
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px', fontWeight:700, opacity:.8, flexShrink:0 }}>
                    {isDraggingThis && ghostOra ? ghostOra : oraLabel}
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
