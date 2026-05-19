import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function formatData(str) {
  if (!str) return null
  const d = new Date(str)
  return {
    data: `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`,
    ora:  `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
  }
}

function giorniAlla(str) {
  if (!str) return null
  const oggi = new Date(); oggi.setHours(0,0,0,0)
  const d    = new Date(str); d.setHours(0,0,0,0)
  return Math.round((d - oggi) / 86400000)
}

function BadgePriorita({ lavoro }) {
  const gg = giorniAlla(lavoro.data_inizio)
  if (lavoro.terminato) return <span style={{ background:'var(--grnb)', color:'var(--grn)', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px' }}>✓ IN ORARIO</span>
  if (gg === null) return <span style={{ fontSize:'11px', color:'var(--tx4)' }}>——</span>
  if (gg < 0)   return <span style={{ background:'var(--redb)', color:'var(--red)', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px' }}>IN RITARDO</span>
  if (gg <= 5)  return <span style={{ background:'var(--ambb)', color:'var(--amb)', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px' }}>0–5 gg</span>
  if (gg <= 10) return <span style={{ background:'var(--accent-l)', color:'var(--accent)', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px' }}>6–10 gg</span>
  return <span style={{ background:'var(--sur3)', color:'var(--tx3)', fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'4px' }}>✓ OK</span>
}

function BadgeStato({ lavoro, statiDB, onCambia }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const s = statiDB.find(x => x.id === lavoro.stato_id) || null

  useEffect(() => {
    function chiudi(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [open])

  if (statiDB.length === 0) return null

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <span onClick={e => { e.stopPropagation(); setOpen(o => !o) }} style={{
        background: s ? s.colore + '22' : 'var(--sur3)',
        color: s ? s.colore : 'var(--tx3)',
        fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'4px',
        cursor:'pointer', userSelect:'none', display:'inline-flex', alignItems:'center', gap:'4px',
        border: `1px solid ${s ? s.colore + '44' : 'var(--bor)'}`,
      }}>
        {s ? s.nome : '—'} ▾
      </span>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100, background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'8px', boxShadow:'var(--sh1)', overflow:'hidden', minWidth:'140px' }}>
          {statiDB.map(st => (
            <div key={st.id} onClick={e => { e.stopPropagation(); onCambia(st.id); setOpen(false) }} style={{
              padding:'8px 12px', fontSize:'11px', fontWeight:600, cursor:'pointer',
              color: st.colore,
              background: lavoro.stato_id === st.id ? st.colore + '22' : 'transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = st.colore + '22'}
            onMouseLeave={e => e.currentTarget.style.background = lavoro.stato_id === st.id ? st.colore + '22' : 'transparent'}
            >
              {st.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfermaTerminato({ lavoro, onConferma, onAnnulla }) {
  const clienteLabel = lavoro.cliente_display || lavoro.clinica
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--sur)', borderRadius:'14px', width:'400px', padding:'24px', boxShadow:'0 24px 64px rgba(15,23,42,.22)' }}>
        <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'8px' }}>✅ Segno come terminato?</div>
        <div style={{ fontSize:'11px', color:'var(--tx3)', marginBottom:'16px' }}>Il lavoro resterà visibile oggi e sparirà dalla lista attivi domani.</div>
        <div style={{ background:'var(--sur2)', borderRadius:'8px', padding:'10px 14px', marginBottom:'20px', border:'1px solid var(--bor)' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color:'var(--tx)' }}>{clienteLabel || '—'}</div>
          <div style={{ fontSize:'11px', color:'var(--tx2)', marginTop:'2px' }}>{lavoro.paziente}</div>
          {lavoro.tipo && <div style={{ fontSize:'10px', color:'var(--tx3)', marginTop:'2px' }}>{lavoro.tipo}{lavoro.tinta ? ` — ${lavoro.tinta}` : ''}</div>}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onAnnulla} style={{ flex:1, padding:'9px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Annulla</button>
          <button onClick={onConferma} style={{ flex:2, padding:'9px', border:'none', background:'var(--grn)', color:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>✅ Sì, segna come terminato</button>
        </div>
      </div>
    </div>
  )
}

const FILTRI = ['Attivi', 'Senza data', 'In ritardo', '0–5 gg', '6–10 gg', 'Terminati']

export default function Lista({ onEventoClick, refreshKey }) {
  const [lavori,       setLavori]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtro,       setFiltro]       = useState('Attivi')
  const [sortDir,      setSortDir]      = useState('asc')
  const [conferma,     setConferma]     = useState(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [clientiDB,    setClientiDB]    = useState([])
  const [statiDB,      setStatiDB]      = useState([])

  useEffect(() => {
    setLoading(true)
    apiFetch('/api/lavori/tutti')
      .then(r => r.json())
      .then(data => { setLavori(data); setLoading(false) })
      .catch(() => setLoading(false))
    apiFetch('/api/clienti')
      .then(r => r.json())
      .then(data => setClientiDB(data))
      .catch(() => {})
    apiFetch('/api/stati-lavoro')
      .then(r => r.json())
      .then(data => setStatiDB(data))
      .catch(() => {})
  }, [refreshKey])

  async function toggleTerminato(ev) {
    if (ev.terminato) {
      await apiFetch(`/api/lavori/${ev.id}/terminato`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminato: false }),
      })
      setLavori(ls => ls.map(l => l.id === ev.id ? { ...l, terminato: false } : l))
      return
    }
    setConferma(ev)
  }

  async function confermaProsegui() {
    const ev = conferma
    setConferma(null)
    await apiFetch(`/api/lavori/${ev.id}/terminato`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminato: true }),
    })
    setLavori(ls => ls.map(l => l.id === ev.id ? { ...l, terminato: true } : l))
  }

  async function cambiStato(ev, statoId) {
    await apiFetch(`/api/lavori/${ev.id}/stato`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato_id: statoId }),
    })
    setLavori(ls => ls.map(l => l.id === ev.id ? { ...l, stato_id: statoId } : l))
  }

  const soloLavori = lavori.filter(l => l.tipo_record !== 'evento')
  const oggi = new Date(); oggi.setHours(0,0,0,0)

  function calcolaLimiteVisibilita(dataInizio) {
    // Prende la data_inizio e aggiunge 24h, saltando weekend:
    // venerdì → limite lunedì stessa ora (+3 giorni)
    // sabato  → limite lunedì stessa ora (+2 giorni)
    // domenica→ limite lunedì stessa ora (+1 giorno)
    // tutti gli altri → +1 giorno (24h esatte)
    const d = new Date(dataInizio.replace(' ', 'T'))
    const giorno = d.getDay() // 0=dom, 1=lun, ..., 5=ven, 6=sab
    const giorniDaAggiungere = giorno === 5 ? 3 : giorno === 6 ? 2 : giorno === 0 ? 1 : 1
    const limite = new Date(d)
    limite.setDate(limite.getDate() + giorniDaAggiungere)
    return limite
  }

  function isVisibileInAttivi(l) {
    if (!l.terminato) return true
    if (!l.data_inizio) return false
    // Rimane visibile in Attivi (come terminato) fino a 24h dopo la consegna
    // con skip weekend: se consegna è venerdì, il limite è lunedì stessa ora
    const limite = calcolaLimiteVisibilita(l.data_inizio)
    return new Date() < limite
  }

  function applicaFiltroA(lista, f) {
    switch(f) {
      case 'Tutti':      return lista.filter(l => !l.terminato)
      case 'Attivi':     return lista.filter(l => isVisibileInAttivi(l))
      case 'Senza data': return lista.filter(l => !l.terminato && !l.data_inizio)
      case 'In ritardo': return lista.filter(l => !l.terminato && l.data_inizio && giorniAlla(l.data_inizio) < 0)
      case '0–5 gg':     return lista.filter(l => !l.terminato && l.data_inizio && giorniAlla(l.data_inizio) >= 0 && giorniAlla(l.data_inizio) <= 5)
      case '6–10 gg':    return lista.filter(l => !l.terminato && l.data_inizio && giorniAlla(l.data_inizio) >= 6 && giorniAlla(l.data_inizio) <= 10)
      case 'Terminati':  return lista.filter(l => l.terminato)
      default: return lista
    }
  }

  const filtrati = applicaFiltroA(soloLavori, filtro)
    .filter(l => !filtroCliente || String(l.cliente_id) === filtroCliente)
    .sort((a, b) => {
      // Senza data sempre in cima
      if (!a.data_inizio && !b.data_inizio) return 0
      if (!a.data_inizio) return -1
      if (!b.data_inizio) return 1
      const diff = new Date(a.data_inizio) - new Date(b.data_inizio)
      return sortDir === 'asc' ? diff : -diff
    })

  const thStyle = { padding:'8px 12px', fontSize:'11px', fontWeight:700, color:'var(--tx3)', textAlign:'left', borderBottom:'1px solid var(--bor)', background:'var(--sur2)', whiteSpace:'nowrap' }
  const tdStyle = { padding:'9px 12px', fontSize:'12px', borderBottom:'1px solid var(--borl)', verticalAlign:'middle' }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {conferma && (
        <ConfermaTerminato lavoro={conferma} onConferma={confermaProsegui} onAnnulla={() => setConferma(null)} />
      )}

      {/* Filtri tab */}
      <div style={{ display:'flex', padding:'0 20px', borderBottom:'1px solid var(--bor)', background:'var(--sur)', flexShrink:0, overflowX:'auto', alignItems:'center', gap:'8px' }}>
        <div style={{ display:'flex', flex:1 }}>
        {FILTRI.map(f => {
          const isActive = f === filtro
          const countF = applicaFiltroA(soloLavori, f).length
          const badgeBg = f === 'In ritardo' ? 'var(--red)' : f === 'Senza data' ? 'var(--ora)' : f === 'Terminati' ? 'var(--tx3)' : 'var(--accent)'
          return (
            <div key={f} onClick={() => setFiltro(f)} style={{
              padding:'10px 14px', cursor:'pointer', fontSize:'12px', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--accent)' : 'var(--tx2)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom:'-1px', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap',
            }}>
              {f}
              <span style={{
                background: isActive ? badgeBg : 'var(--sur3)',
                color: isActive ? '#fff' : 'var(--tx3)',
                fontSize:'10px', fontWeight:700, padding:'1px 6px', borderRadius:'99px', minWidth:'18px', textAlign:'center',
              }}>
                {countF}
              </span>
            </div>
          )
        })}
        </div>

        {/* Filtro cliente */}
        <select
          value={filtroCliente}
          onChange={e => setFiltroCliente(e.target.value)}
          style={{
            height:'30px', border:'1px solid var(--bor)', borderRadius:'7px', fontSize:'11px',
            fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)', background:'var(--sur)',
            padding:'0 8px', cursor:'pointer', flexShrink:0, minWidth:'160px',
          }}
        >
          <option value="">Tutti i clienti</option>
          {clientiDB.filter(c => !c.inattivo).map(c => (
            <option key={c.id} value={String(c.id)}>{c.nickname || c.nome}</option>
          ))}
        </select>
      </div>

      {/* Tabella */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', color:'var(--tx3)', fontSize:'13px' }}>Caricamento...</div>
        ) : filtrati.length === 0 ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', flexDirection:'column', gap:'8px', color:'var(--tx3)' }}>
            <span style={{ fontSize:'32px' }}>🦷</span>
            <span style={{ fontSize:'13px' }}>Nessun lavoro in questa categoria</span>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Codice</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Paziente</th>
                <th style={thStyle}>Lavoro</th>
                <th style={{ ...thStyle, cursor:'pointer' }} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  Consegna {sortDir === 'asc' ? '↑' : '↓'}
                </th>
                <th style={thStyle}>Priorità</th>
                <th style={thStyle}>Stato</th>
                <th style={{ ...thStyle, textAlign:'center' }}>Fine</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map(ev => {
                const data = formatData(ev.data_inizio)
                const gg   = giorniAlla(ev.data_inizio)
                const isRitardo = gg !== null && gg < 0 && !ev.terminato
                const isUrgente = gg !== null && gg <= 5 && gg >= 0 && !ev.terminato
                const clienteLabel = ev.cliente_display || ev.clinica

                const isSenzaData = !ev.data_inizio && !ev.terminato

                return (
                  <tr key={ev.id} style={{
                    cursor:'default',
                    background: ev.terminato ? 'transparent' : isSenzaData ? 'rgba(239,68,68,.05)' : isRitardo ? 'rgba(239,68,68,.04)' : isUrgente ? 'rgba(249,115,22,.03)' : 'transparent',
                    opacity: ev.terminato ? .55 : 1,
                  }}>
                    <td style={tdStyle}>
                      {ev.codice
                        ? <span
                            onClick={() => onEventoClick(ev)}
                            style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'11px', fontWeight:700, color:'var(--accent)', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'2px' }}
                          >{ev.codice}</span>
                        : <span style={{ fontSize:'11px', color:'var(--tx4)' }}>—</span>
                      }
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight:700, color: ev.terminato ? 'var(--tx3)' : 'var(--accent)' }}>
                        {clienteLabel || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>{ev.paziente}</td>
                    <td style={tdStyle}>
                      <span style={{ color:'var(--tx2)' }}>{ev.tipo || '—'}</span>
                      {ev.tinta && <span style={{ fontSize:'10px', color:'var(--tx3)', marginLeft:'4px' }}>{ev.tinta}</span>}
                    </td>
                    <td style={tdStyle}>
                      {data ? (
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:700, color: isRitardo ? 'var(--red)' : 'var(--tx)' }}>{data.data}</div>
                          <div style={{ fontSize:'10px', color:'var(--tx3)' }}>ore {data.ora}</div>
                        </div>
                      ) : (
                        <span style={{ background:'#c0392b', color:'#fff', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px' }}>SENZA DATA</span>
                      )}
                    </td>
                    <td style={tdStyle}><BadgePriorita lavoro={ev} /></td>
                    <td style={tdStyle}>
                      <BadgeStato lavoro={ev} statiDB={statiDB} onCambia={statoId => cambiStato(ev, statoId)} />
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <input type="checkbox" checked={ev.terminato ?? false}
                        onChange={e => { e.stopPropagation(); toggleTerminato(ev) }}
                        style={{ width:'16px', height:'16px', accentColor:'var(--grn)', cursor:'pointer' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}