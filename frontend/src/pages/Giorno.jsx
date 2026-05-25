import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

const ORE = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
const GIORNI_BREVI = ['Lun','Mar','Mer','Gio','Ven','Sab']
const GIORNI_FULL  = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

const SLOT_H     = 60
const ORA_INIZIO = 6

function getLunedi(offset = 0) {
  const oggi = new Date()
  const lun  = new Date(oggi)
  lun.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) + offset * 7)
  lun.setHours(0, 0, 0, 0)
  return lun
}
function getSettimana(lunedi) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lunedi); d.setDate(lunedi.getDate() + i); return d
  })
}
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getNowTop() {
  const ora = new Date()
  return Math.max(0, (ora.getHours() - ORA_INIZIO) * 60 + ora.getMinutes())
}
function parseData(str) {
  if (!str) return null
  return new Date(str.replace(' ', 'T'))
}
function testoAdattivo(bgHex) {
  const hex = (bgHex || '#0284C7').replace('#', '')
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? '#334155' : '#ffffff'
}
function getColoreEvento(ev, statiDB, staffDB) {
  if (ev.tipo_record === 'evento' && ev.utente_id) {
    const u = staffDB.find(u => u.id === ev.utente_id)
    if (u?.colore) return { bg: u.colore+'22', border: u.colore }
  }
  if (ev.tipo_record !== 'evento' && ev.stato_id) {
    const s = statiDB.find(s => s.id === ev.stato_id)
    if (s?.colore) return { bg: s.colore+'22', border: s.colore }
  }
  const fb = { sky:'#0284C7',red:'#ef4444',green:'#16a34a',amber:'#ca8a04',purple:'#9333ea',blue:'#3b82f6',slate:'#64748b',fuchsia:'#d946ef' }
  const hex = fb[ev.colore] || '#0284C7'
  return { bg: hex+'22', border: hex }
}
function calcolaLayout(lavori) {
  const events = lavori.map(ev => {
    if (!ev.data_inizio) return null
    const inizio = parseData(ev.data_inizio)
    const fine   = ev.data_fine ? parseData(ev.data_fine) : new Date(inizio.getTime()+30*60000)
    const top    = (inizio.getHours()-ORA_INIZIO)*60 + inizio.getMinutes()
    const h      = Math.max((fine-inizio)/60000, 24)
    return { ev, inizio, fine, top, h, col:0, totCols:1 }
  }).filter(Boolean)
  for (let i=0; i<events.length; i++)
    for (let j=i+1; j<events.length; j++) {
      const a=events[i], b=events[j]
      if (a.inizio<b.fine && a.fine>b.inizio) {
        b.col = a.col+1
        const mx = Math.max(a.totCols, b.col+1)
        events[i].totCols=mx; events[j].totCols=mx
      }
    }
  return events
}
function p2(n) { return String(n).padStart(2,'0') }

export default function Giorno({ offsetSettimana=0, onOffsetChange, refreshKey=0, onEventoClick, onNuovoPrecompilato }) {
  const oggi   = new Date()
  const lunedi = getLunedi(offsetSettimana)
  const giorni = getSettimana(lunedi)

  const oggiIdx = giorni.findIndex(d => d.toDateString() === oggi.toDateString())
  const [dIdx, setDIdx] = useState(oggiIdx >= 0 ? oggiIdx : 0)
  const [lavori,  setLavori]  = useState([])
  const [loading, setLoading] = useState(true)
  const [statiDB, setStatiDB] = useState([])
  const [staffDB, setStaffDB] = useState([])
  const [ghost,   setGhost]   = useState(null)

  const bodyRef = useRef(null)
  const colRef  = useRef(null)  // ref sulla colonna eventi per posizione assoluta

  useEffect(() => {
    apiFetch('/api/stati-lavoro').then(r=>r.json()).then(setStatiDB).catch(()=>{})
    apiFetch('/api/utenti-staff').then(r=>r.json()).then(setStaffDB).catch(()=>{})
  }, [])

  useEffect(() => {
    setLoading(true)
    const sabato = new Date(lunedi); sabato.setDate(lunedi.getDate()+6)
    apiFetch(`/api/lavori?dal=${formatDate(lunedi)}&al=${formatDate(sabato)}`)
      .then(r=>r.json()).then(data => { setLavori(data); setLoading(false) })
      .catch(()=>setLoading(false))
  }, [offsetSettimana, refreshKey])

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 120 }, [])

  useEffect(() => {
    const ng  = getSettimana(getLunedi(offsetSettimana))
    const idx = ng.findIndex(d => d.toDateString() === oggi.toDateString())
    setDIdx(idx >= 0 ? idx : 0)
  }, [offsetSettimana])

  const giorno    = giorni[dIdx]
  const isOggi    = giorno.toDateString() === oggi.toDateString()
  const nowTop    = getNowTop()
  const giornoStr = formatDate(giorno)
  const lavoriGiorno = lavori.filter(ev => ev.data_inizio?.slice(0,10) === giornoStr)
  const layout       = calcolaLayout(lavoriGiorno)

  function getRelY(e) {
    // Funziona sia per mouse che per touch
    const col  = colRef.current
    const body = bodyRef.current
    if (!col || !body) return 0
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return clientY - col.getBoundingClientRect().top + body.scrollTop
  }

  function onColMouseMove(e) {
    if (e.target.closest('[data-evento]')) { setGhost(null); return }
    const relY   = getRelY(e)
    const snapPx = Math.max(0, Math.floor(relY / 30) * 30)
    const h  = ORA_INIZIO + Math.floor(snapPx / 60)
    const m  = snapPx % 60
    const eh = ORA_INIZIO + Math.floor((snapPx + 30) / 60)
    const em = (snapPx + 30) % 60
    setGhost({ top: snapPx, ora:`${p2(h)}:${p2(m)}`, oraFine:`${p2(eh)}:${p2(em)}` })
  }

  function onColClick(e) {
    if (e.target.closest('[data-evento]')) return
    if (!onNuovoPrecompilato) return
    // Calcola l'ora direttamente dal click — non dipende dal ghost (funziona su mobile)
    const relY   = getRelY(e)
    const snapPx = Math.max(0, Math.floor(relY / 30) * 30)
    const h  = ORA_INIZIO + Math.floor(snapPx / 60)
    const m  = snapPx % 60
    const ora = `${p2(h)}:${p2(m)}`
    onNuovoPrecompilato({ data: giornoStr, ora, tipo_form: 'lavoro' })
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--sur)' }}>

      {/* Tab giorni + frecce */}
      <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0, padding:'0 8px', gap:'4px' }}>
        <button onClick={() => onOffsetChange?.(offsetSettimana-1)}
          style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', cursor:'pointer', fontSize:'16px', color:'var(--tx2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>

        <div style={{ display:'flex', flex:1 }}>
          <div style={{ width:'44px', flexShrink:0 }} />
          {giorni.map((d,i) => {
            const isT=d.toDateString()===oggi.toDateString(), isSel=i===dIdx
            return (
              <div key={i} onClick={()=>setDIdx(i)} style={{ flex:1, padding:'8px 4px', textAlign:'center', cursor:'pointer', borderBottom:isSel?'2px solid var(--accent)':'2px solid transparent', marginBottom:'-1px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:isSel?'var(--accent)':'var(--tx3)', marginBottom:'3px' }}>{GIORNI_BREVI[i]}</div>
                <div style={{ fontSize:isT?'13px':'18px', fontWeight:isT?700:300, lineHeight:1, color:isT?'#fff':isSel?'var(--accent)':'var(--tx2)',
                  ...(isT?{background:'var(--accent)',width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}:{}) }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={() => onOffsetChange?.(offsetSettimana+1)}
          style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', cursor:'pointer', fontSize:'16px', color:'var(--tx2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>›</button>
      </div>

      {/* Titolo giorno */}
      <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--borl)', flexShrink:0, display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'13px', fontWeight:700 }}>{GIORNI_FULL[dIdx]} {giorno.getDate()} {MESI[giorno.getMonth()]} {giorno.getFullYear()}</span>
        <span style={{ background:'var(--accent-l)', color:'var(--accent)', fontSize:'11px', fontWeight:600, padding:'2px 10px', borderRadius:'99px' }}>
          {lavoriGiorno.length} {lavoriGiorno.length===1?'lavoro':'lavori'}
        </span>
        {onNuovoPrecompilato && (
          <button onClick={() => onNuovoPrecompilato({ data:giornoStr, tipo_form:'lavoro' })}
            style={{ marginLeft:'auto', padding:'5px 12px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
            + Aggiungi lavoro
          </button>
        )}
      </div>

      {/* Corpo */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', position:'relative' }}>
        {loading && <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'var(--tx3)', fontSize:'13px' }}>Caricamento...</div>}

        <div style={{ display:'grid', gridTemplateColumns:'44px 1fr', position:'relative' }}>

          {isOggi && (
            <div style={{ position:'absolute', left:0, right:0, top:`${nowTop}px`, height:'2px', background:'rgba(239,68,68,.55)', zIndex:15, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'44px', top:'-4px', width:'8px', height:'8px', background:'var(--red)', borderRadius:'50%' }} />
              <span style={{ position:'absolute', left:'2px', top:'-8px', fontSize:'9px', fontFamily:'JetBrains Mono, monospace', background:'var(--red)', color:'#fff', padding:'1px 4px', borderRadius:'3px' }}>
                {p2(new Date().getHours())}:{p2(new Date().getMinutes())}
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

          {/* Colonna eventi */}
          <div
            ref={colRef}
            onMouseMove={onColMouseMove}
            onMouseLeave={() => setGhost(null)}
            onClick={onColClick}
            style={{ borderLeft:'1px solid var(--borl)', position:'relative', background:isOggi?'rgba(2,132,199,.015)':'transparent', cursor:onNuovoPrecompilato?'pointer':'default' }}
          >
            {ORE.map(ora => (
              <div key={ora} style={{ height:`${SLOT_H}px`, borderBottom:'1px solid var(--borl)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, right:0, top:'50%', height:'1px', background:'var(--borl)', opacity:.4 }} />
              </div>
            ))}

            {ghost && (
              <div style={{ position:'absolute', top:`${ghost.top}px`, left:'3px', right:'3px', height:'30px',
                background:'rgba(217,70,239,.12)', border:'1.5px dashed rgba(217,70,239,.45)',
                borderRadius:'5px', pointerEvents:'none', zIndex:3,
                display:'flex', alignItems:'center', padding:'0 6px', fontSize:'10px', fontWeight:600, color:'#d946ef' }}>
                {ghost.ora} – {ghost.oraFine}
              </div>
            )}

            {layout.map(({ ev, top, h, col, totCols }) => {
              const c = getColoreEvento(ev, statiDB, staffDB)
              const inizio = parseData(ev.data_inizio)
              const oraLabel = `${p2(inizio.getHours())}:${p2(inizio.getMinutes())}`
              const widthPct=100/totCols, leftPct=col*widthPct
              const clienteLabel = ev.cliente_display || ev.clinica
              const rigaInfo = [clienteLabel, ev.paziente, ev.tipo?`${ev.tipo}${ev.tinta?` ${ev.tinta}`:''}`:null, ev.elementi||null].filter(Boolean).join(' — ')
              return (
                <div key={ev.id} data-evento="true"
                  onClick={e => { e.stopPropagation(); onEventoClick(ev) }}
                  style={{ position:'absolute', top:`${top}px`, height:`${h}px`,
                    left:`calc(${leftPct}% + 4px)`, width:`calc(${widthPct}% - 8px)`,
                    background:c.border, borderLeft:`4px solid ${c.bg}`, color:testoAdattivo(c.border),
                    borderRadius:'7px', padding:'4px 8px', cursor:'pointer', overflow:'hidden', zIndex:10+col,
                    boxShadow:'0 1px 4px rgba(15,23,42,.07)', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px', fontWeight:700, opacity:.8, flexShrink:0 }}>{oraLabel}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{rigaInfo}</span>
                  {ev.urgente && <span style={{ fontSize:'9px', background:'var(--red)', color:'#fff', padding:'1px 5px', borderRadius:'3px', fontWeight:700, flexShrink:0 }}>⚡</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
