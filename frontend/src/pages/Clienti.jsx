import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect } from 'react'
import FormCliente from '../components/FormCliente'

const INATTIVO_COLOR = '#c0392b'

const TIPI = {
  studio:  { label:'Studio dentistico',        color:'#0284C7', bg:'#dbeafe' },
  lab:     { label:'Laboratorio odontotecnico', color:'#16a34a', bg:'#dcfce7' },
  azienda: { label:'Azienda / Fornitore',       color:'#a17c0a', bg:'#fef9c3' },
}

const FILTRI_TIPO = [
  { id:'tutti',   label:'Tutti' },
  { id:'studio',  label:'Studi dentistici' },
  { id:'lab',     label:'Laboratori' },
  { id:'azienda', label:'Aziende' },
]

function Avatar({ nome, tipo, size = 40 }) {
  const iniziali = (nome || '?').trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('')
  const color = TIPI[tipo]?.color || '#0284C7'
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background: color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize: size > 32 ? '13px' : '11px', fontWeight:700, flexShrink:0 }}>
      {iniziali}
    </div>
  )
}

function VistaLista({ filtrati, onApri }) {
  const thStyle = { padding:'8px 12px', fontSize:'11px', fontWeight:700, color:'var(--tx3)', textAlign:'left', borderBottom:'1px solid var(--bor)', background:'var(--sur2)', whiteSpace:'nowrap' }
  const tdStyle = { padding:'9px 12px', fontSize:'12px', borderBottom:'1px solid var(--borl)', verticalAlign:'middle' }

  if (filtrati.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', flexDirection:'column', gap:'8px', color:'var(--tx3)' }}>
      <span style={{ fontSize:'32px' }}>👥</span>
      <span style={{ fontSize:'13px' }}>Nessun cliente trovato</span>
    </div>
  )

  return (
    <table style={{ width:'100%', borderCollapse:'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>Cliente</th>
          <th style={thStyle}>Indirizzo</th>
          <th style={thStyle}>Email</th>
          <th style={thStyle}>Telefono</th>
          <th style={thStyle}>P.IVA</th>
          <th style={thStyle}>Cod. Fiscale</th>
        </tr>
      </thead>
      <tbody>
        {filtrati.map(c => {
          const tipo = TIPI[c.tipo] || TIPI.studio
          return (
            <tr key={c.id}
              style={{ background: c.inattivo ? 'rgba(239,68,68,.03)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sur2)'}
              onMouseLeave={e => e.currentTarget.style.background = c.inattivo ? 'rgba(239,68,68,.03)' : 'transparent'}
            >
              <td style={tdStyle}>
                <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
                  <Avatar nome={c.nickname || c.nome} tipo={c.tipo} size={30} inattivo={c.inattivo} />
                  <div>
                    <div
                      onClick={() => onApri(c)}
                      style={{ fontWeight:700, color: c.inattivo ? 'var(--tx3)' : 'var(--accent)', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'2px' }}
                    >
                      {c.nome}
                      {c.inattivo && <span style={{ fontSize:'9px', fontWeight:700, color: INATTIVO_COLOR, background:'#fdecea', padding:'1px 5px', borderRadius:'3px' }}>INATTIVO</span>}
                    </div>
                    {c.nickname && <div style={{ fontSize:'10px', color:'var(--accent)', fontWeight:600 }}>"{c.nickname}"</div>}
                    <div style={{ fontSize:'10px', color: tipo.color }}>{tipo.label}</div>
                  </div>
                </div>
              </td>
              <td style={tdStyle}>
                <span style={{ color:'var(--tx2)' }}>
                  {[c.indirizzo, c.cap, c.citta, c.provincia ? `(${c.provincia})` : null].filter(Boolean).join(', ') || <span style={{ color:'var(--tx4)' }}>—</span>}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ color:'var(--tx2)', fontSize:'12px' }}>{c.email || <span style={{ color:'var(--tx4)' }}>—</span>}</span>
              </td>
              <td style={tdStyle}>
                <span style={{ color:'var(--tx2)' }}>{c.telefono || <span style={{ color:'var(--tx4)' }}>—</span>}</span>
              </td>
              <td style={tdStyle}>
                {c.piva
                  ? <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'11px', color:'var(--tx2)' }}>{c.piva}</span>
                  : <span style={{ color:'var(--tx4)' }}>—</span>}
              </td>
              <td style={tdStyle}>
                {c.cf
                  ? <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'11px', color:'var(--tx2)' }}>{c.cf}</span>
                  : <span style={{ color:'var(--tx4)' }}>—</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function VistaCard({ filtrati, onApri }) {
  if (filtrati.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', flexDirection:'column', gap:'8px', color:'var(--tx3)' }}>
      <span style={{ fontSize:'32px' }}>👥</span>
      <span style={{ fontSize:'13px' }}>Nessun cliente trovato</span>
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'14px' }}>
      {filtrati.map(c => {
        const tipo = TIPI[c.tipo] || TIPI.studio
        return (
          <div key={c.id} onClick={() => onApri(c)} style={{
            background:'var(--sur)', border:`1px solid ${c.inattivo ? 'rgba(239,68,68,.3)' : 'var(--bor)'}`,
            borderRadius:'12px', padding:'14px 16px', cursor:'pointer',
            boxShadow:'var(--sh0)', opacity: c.inattivo ? .7 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--sh1)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--sh0)' }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
              <Avatar nome={c.nickname || c.nome} tipo={c.tipo} inattivo={c.inattivo} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px' }}>
                  {c.nome}
                  {c.inattivo && <span style={{ fontSize:'9px', fontWeight:700, color: INATTIVO_COLOR, background:'#fdecea', padding:'1px 5px', borderRadius:'3px', flexShrink:0 }}>INATTIVO</span>}
                </div>
                {c.nickname && <div style={{ fontSize:'11px', color:'var(--accent)', fontWeight:600 }}>"{c.nickname}"</div>}
                <div style={{ fontSize:'10px', color: tipo.color, marginTop:'2px' }}>{tipo.label}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginBottom:'10px' }}>
              {(c.indirizzo || c.citta) && (
                <div style={{ fontSize:'11px', color:'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {[c.indirizzo, c.citta].filter(Boolean).join(', ')}
                </div>
              )}
              {c.telefono && <div style={{ fontSize:'11px', color:'var(--tx2)' }}>{c.telefono}</div>}
              {c.email    && <div style={{ fontSize:'11px', color:'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</div>}
              {c.piva     && <div style={{ fontSize:'11px', color:'var(--tx3)' }}>P.IVA: {c.piva}</div>}
            </div>
            <div style={{ display:'flex', alignItems:'center', borderTop:'1px solid var(--borl)', paddingTop:'8px', marginTop:'4px' }}>
              <span style={{ fontSize:'11px', color:'var(--tx3)' }}>
                {(() => {
                  const inCorso = Number(c.num_in_corso) || 0
                  const terminati = Number(c.num_terminati) || 0
                  if (inCorso === 0 && terminati === 0) return <span style={{ color:'var(--tx4)' }}>Nessun lavoro</span>
                  return <>
                    {inCorso > 0 && <><strong style={{ color:'var(--accent)' }}>{inCorso}</strong> in corso</>}
                    {inCorso > 0 && terminati > 0 && <span style={{ margin:'0 4px' }}>·</span>}
                    {terminati > 0 && <><strong style={{ color:'var(--tx2)' }}>{terminati}</strong> terminati</>}
                  </>
                })()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Clienti({ onSaved: onSavedParent }) {
  const [clienti,     setClienti]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [cerca,       setCerca]       = useState('')
  const [vista,       setVista]       = useState('lista')
  const [filtroTipo,  setFiltroTipo]  = useState('tutti')
  const [soloInattivi, setSoloInattivi] = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [selezionato, setSelezionato] = useState(null)

  function carica() {
    setLoading(true)
    apiFetch('/api/clienti')
      .then(r => r.json())
      .then(data => { setClienti(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carica() }, [])

  const filtrati = clienti.filter(c => {
    const q = cerca.toLowerCase()
    const matchCerca = !q || c.nome?.toLowerCase().includes(q) || c.nickname?.toLowerCase().includes(q) || c.citta?.toLowerCase().includes(q) || c.piva?.toLowerCase().includes(q)
    const matchTipo  = filtroTipo === 'tutti' || c.tipo === filtroTipo
    const matchAttivo = soloInattivi ? c.inattivo : !c.inattivo
    return matchCerca && matchTipo && matchAttivo
  })

  function apriNuovo()     { setSelezionato(null); setShowForm(true) }
  function apriModifica(c) { setSelezionato(c);    setShowForm(true) }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'10px', background:'var(--sur)', flexShrink:0, flexWrap:'wrap' }}>

        {/* Segmented control vista */}
        <div style={{ display:'flex', background:'var(--sur2)', borderRadius:'9px', padding:'3px', gap:'2px' }}>
          {[{ id:'lista', label:'Lista' }, { id:'card', label:'Card' }].map(v => (
            <button key={v.id} onClick={() => setVista(v.id)} style={{
              padding:'5px 14px', borderRadius:'7px', fontSize:'12px', fontWeight: vista===v.id ? 600 : 500,
              cursor:'pointer', border:'none', fontFamily:'Instrument Sans, sans-serif',
              background: vista===v.id ? 'var(--sur)' : 'none',
              color: vista===v.id ? 'var(--accent)' : 'var(--tx2)',
              boxShadow: vista===v.id ? 'var(--sh0)' : 'none',
            }}>{v.label}</button>
          ))}
        </div>

        {/* Filtri tipo */}
        <div style={{ display:'flex', background:'var(--sur2)', borderRadius:'9px', padding:'3px', gap:'2px' }}>
          {FILTRI_TIPO.map(f => (
            <button key={f.id} onClick={() => setFiltroTipo(f.id)} style={{
              padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight: filtroTipo===f.id ? 600 : 500,
              cursor:'pointer', border:'none', fontFamily:'Instrument Sans, sans-serif',
              background: filtroTipo===f.id ? 'var(--sur)' : 'none',
              color: filtroTipo===f.id ? 'var(--accent)' : 'var(--tx2)',
              boxShadow: filtroTipo===f.id ? 'var(--sh0)' : 'none',
            }}>{f.label}</button>
          ))}
        </div>

        {/* Toggle Attivi/Inattivi */}
        <div style={{ display:'flex', background:'var(--sur2)', borderRadius:'9px', padding:'3px', gap:'2px' }}>
          <button onClick={() => setSoloInattivi(false)} style={{
            padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight: !soloInattivi ? 600 : 500,
            cursor:'pointer', border:'none', fontFamily:'Instrument Sans, sans-serif',
            background: !soloInattivi ? 'var(--sur)' : 'none',
            color: !soloInattivi ? 'var(--grn)' : 'var(--tx2)',
            boxShadow: !soloInattivi ? 'var(--sh0)' : 'none',
          }}>Attivi</button>
          <button onClick={() => setSoloInattivi(true)} style={{
            padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight: soloInattivi ? 600 : 500,
            cursor:'pointer', border:'none', fontFamily:'Instrument Sans, sans-serif',
            background: soloInattivi ? 'var(--sur)' : 'none',
            color: soloInattivi ? 'var(--red)' : 'var(--tx2)',
            boxShadow: soloInattivi ? 'var(--sh0)' : 'none',
          }}>Inattivi</button>
        </div>

        {/* Ricerca */}
        <div style={{ position:'relative', maxWidth:'260px', flex:1 }}>
          <input
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            placeholder="Cerca cliente, P.IVA..."
            style={{ width:'100%', border:'1px solid var(--bor)', borderRadius:'8px', padding:'7px 11px 7px 32px', fontSize:'12px', fontFamily:'Instrument Sans, sans-serif', background:'var(--sur2)', outline:'none', color:'var(--tx)' }}
          />
          <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'var(--tx3)' }}>🔍</span>
        </div>

        <span style={{ fontSize:'11px', color:'var(--tx3)' }}>
          {filtrati.length} {filtrati.length === 1 ? 'cliente' : 'clienti'}
        </span>

        <button onClick={apriNuovo} style={{ marginLeft:'auto', padding:'7px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', boxShadow:'0 2px 8px rgba(2,132,199,.3)' }}>
          + Nuovo cliente
        </button>
      </div>

      {/* Contenuto */}
      <div style={{ flex:1, overflowY:'auto', overflowX: vista === 'lista' ? 'auto' : 'hidden', padding: vista === 'card' ? '20px' : '0' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', color:'var(--tx3)', fontSize:'13px' }}>Caricamento...</div>
        ) : vista === 'lista' ? (
          <VistaLista filtrati={filtrati} onApri={apriModifica} />
        ) : (
          <VistaCard filtrati={filtrati} onApri={apriModifica} />
        )}
      </div>

      {showForm && (
        <FormCliente
          cliente={selezionato}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); carica(); onSavedParent?.() }}
        />
      )}

    </div>
  )
}