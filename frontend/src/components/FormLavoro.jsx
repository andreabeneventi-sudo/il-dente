import { apiFetch } from '../utils/apiFetch'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import OraInput from './OraInput'
import { generaPDF, apriPDFStorico } from '../utils/generaPDF'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const FIELD_H = '36px'
const base = {
  border:'1px solid var(--bor)', borderRadius:'8px', padding:'0 11px',
  fontSize:'12px', fontFamily:'Instrument Sans, sans-serif',
  background:'var(--sur2)', outline:'none', color:'var(--tx)',
  width:'100%', height:FIELD_H, boxSizing:'border-box',
}
const inp = { ...base }
const sel = { ...base, cursor:'pointer', appearance:'auto' }
const fd      = { display:'flex', flexDirection:'column', gap:'4px', flex:1 }
const lbl     = { fontSize:'11px', fontWeight:600, color:'var(--tx2)' }
const rq      = { color:'var(--red)', marginLeft:'2px' }
const divider = { height:'1px', background:'var(--borl)', margin:'2px 0' }

function formatDatetimeLocal(str) {
  if (!str) return { data:'', ora:'', min:'' }
  const d = new Date(str)
  const data = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const ora  = String(d.getHours()).padStart(2,'0')
  const min  = String(Math.floor(d.getMinutes()/5)*5).padStart(2,'0')
  return { data, ora, min }
}

function formatDataDisplay(str) {
  if (!str) return 'Seleziona data...'
  const d = new Date(str + 'T00:00:00')
  const giorni = ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato']
  const mesi   = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`
}

function formatAggiornato(str) {
  if (!str) return null
  const d = new Date(str)
  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
  const mesi   = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()} alle ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function DropdownStorico({ lavoroId, label, onApri }) {
  const [open,    setOpen]    = useState(false)
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const MESI_S   = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  const GIORNI_S = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

  function formatVersione(str) {
    const d = new Date(str)
    return `${GIORNI_S[d.getDay()]} ${d.getDate()} ${MESI_S[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  async function toggle() {
    if (!open) {
      setLoading(true)
      try {
        const res  = await apiFetch(`/api/lavori/${lavoroId}/pdf-storico`)
        const data = await res.json()
        setStorico(data)
      } catch {}
      setLoading(false)
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    function chiudi(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [open])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <span onClick={toggle} style={{
        fontSize:'12px', color:'var(--tx2)', fontWeight:600,
        background:'var(--sur2)', border:'1px solid var(--bor)',
        padding:'3px 8px', borderRadius:'6px', cursor:'pointer',
        userSelect:'none', display:'inline-flex', alignItems:'center', gap:'4px',
      }}>
        {label} {String.fromCharCode(9662)}
      </span>

      {open && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 6px)', left:0, zIndex:200,
          background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'10px',
          boxShadow:'var(--sh2)', minWidth:'280px', overflow:'hidden',
        }}>
          <div style={{ padding:'8px 12px', fontSize:'10px', fontWeight:700, color:'var(--tx3)', letterSpacing:'.5px', textTransform:'uppercase', borderBottom:'1px solid var(--borl)' }}>
            Storico versioni PDF
          </div>
          {loading ? (
            <div style={{ padding:'16px', textAlign:'center', fontSize:'12px', color:'var(--tx3)' }}>Caricamento...</div>
          ) : storico.length === 0 ? (
            <div style={{ padding:'16px', textAlign:'center', fontSize:'12px', color:'var(--tx3)' }}>Nessuna versione salvata</div>
          ) : (
            storico.map(s => (
              <div key={s.id} onClick={() => { onApri(s.id, s.versione); setOpen(false) }}
                style={{ padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid var(--borl)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--sur2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'10px', fontWeight:700, color:'var(--accent)', background:'var(--accent-l)', padding:'2px 7px', borderRadius:'4px', flexShrink:0 }}>
                  V{s.versione}
                </span>
                <span style={{ fontSize:'11px', color:'var(--tx2)' }}>
                  {formatVersione(s.creato_il)}
                </span>
                <span style={{ marginLeft:'auto', fontSize:'11px', color:'var(--tx3)' }}>🖨️</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const MESI_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GG = ['L','M','M','G','V','S','D']

function MiniCalendario({ value, onChange, onClose }) {
  const parseVal = v => v ? new Date(v + 'T00:00:00') : new Date()
  const [view, setView] = useState(() => {
    const d = parseVal(value)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const selDate = value ? new Date(value + 'T00:00:00') : null
  const oggi = new Date(); oggi.setHours(0,0,0,0)

  function navMese(dir) {
    setView(v => {
      let m = v.m + dir, y = v.y
      if (m < 0)  { m = 11; y-- }
      if (m > 11) { m = 0;  y++ }
      return { y, m }
    })
  }

  function buildDays() {
    const first = new Date(view.y, view.m, 1).getDay()
    const off   = first === 0 ? 6 : first - 1
    const dim   = new Date(view.y, view.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < off; i++) cells.push(null)
    for (let d = 1; d <= dim; d++) cells.push(d)
    return cells
  }

  return (
    <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:200, background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px', boxShadow:'var(--sh2)', padding:'12px', width:'248px' }}>
      <div style={{ display:'flex', alignItems:'center', marginBottom:'10px' }}>
        <button onClick={() => navMese(-1)} style={{ width:'26px', height:'26px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', cursor:'pointer', fontSize:'14px', color:'var(--tx2)' }}>&#8249;</button>
        <span style={{ flex:1, textAlign:'center', fontSize:'12px', fontWeight:700 }}>{MESI_FULL[view.m]} {view.y}</span>
        <button onClick={() => navMese(1)}  style={{ width:'26px', height:'26px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', cursor:'pointer', fontSize:'14px', color:'var(--tx2)' }}>&#8250;</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'4px' }}>
        {GG.map((g,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'9px', fontWeight:700, color: i>=5 ? 'var(--ora)' : 'var(--tx3)', padding:'2px 0' }}>{g}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
        {buildDays().map((d, i) => {
          if (!d) return <div key={i} />
          const date   = new Date(view.y, view.m, d)
          const isOggi = date.toDateString() === oggi.toDateString()
          const isSel  = selDate && date.toDateString() === selDate.toDateString()
          const isWknd = i % 7 >= 5
          return (
            <div key={i} onClick={() => {
              const str = `${view.y}-${String(view.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              onChange(str); onClose()
            }} style={{
              textAlign:'center', padding:'5px 2px', borderRadius:'6px', cursor:'pointer', fontSize:'11px',
              fontWeight: isSel || isOggi ? 700 : 400,
              background: isSel ? 'var(--accent)' : isOggi ? 'var(--accent-l)' : 'transparent',
              color: isSel ? '#fff' : isOggi ? 'var(--accent)' : isWknd ? 'var(--ora)' : 'var(--tx)',
            }}>{d}</div>
          )
        })}
      </div>
      <div style={{ marginTop:'8px', borderTop:'1px solid var(--borl)', paddingTop:'8px', textAlign:'center' }}>
        <button onClick={() => { onChange(today()); onClose() }} style={{ fontSize:'11px', fontWeight:600, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
          Oggi
        </button>
      </div>
    </div>
  )
}

function DatePicker({ value, onChange, label, required, isMob = false }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top:0, left:0, sopra:false })
  const ref = useRef(null)

  function toggleOpen() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spazioBasso = window.innerHeight - rect.bottom
      const sopra = spazioBasso < 320
      setPos({ top: sopra ? rect.top - 8 : rect.bottom + 6, left: rect.left, sopra })
    }
    setOpen(o => !o)
  }

  function chiudi() { setOpen(false) }

  if (isMob) {
    return (
      <div style={{ ...fd }}>
        {label && <label style={lbl}>{label}{required && <span style={rq}>*</span>}</label>}
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onFocus={e => e.stopPropagation()}
          style={{ ...base, cursor:'pointer', colorScheme:'light' }}
        />
      </div>
    )
  }

  return (
    <div ref={ref} style={{ ...fd, position:'relative' }}>
      {label && <label style={lbl}>{label}{required && <span style={rq}>*</span>}</label>}
      <div onClick={toggleOpen} style={{ ...base, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', color: value ? 'var(--tx)' : 'var(--tx3)' }}>
        <span style={{ fontSize:'12px' }}>{formatDataDisplay(value)}</span>
        <span style={{ fontSize:'13px', color:'var(--tx3)', flexShrink:0 }}>📅</span>
      </div>
      {open && (
        <>
          <div onClick={chiudi} style={{ position:'fixed', inset:0, zIndex:199 }} />
          <div style={{
            position:'fixed',
            top: pos.sopra ? 'auto' : pos.top,
            bottom: pos.sopra ? window.innerHeight - pos.top : 'auto',
            left: pos.left,
            zIndex:300,
          }}>
            <MiniCalendario value={value} onChange={v => { onChange(v); chiudi() }} onClose={chiudi} />
          </div>
        </>
      )}
    </div>
  )
}

export default function FormLavoro({ onClose, onSaved, lavoro = null, precompilato = null, onEspandi, isMobile = false, onSalvaReady }) {
  const isEdit = !!lavoro
  const ini    = formatDatetimeLocal(lavoro?.data_inizio)

const [clientiDB,      setClientiDB]      = useState([])
const [staffDB,        setStaffDB]        = useState([])
const [statiDB,        setStatiDB]        = useState([])
const [impostazioni,   setImpostazioni]   = useState({})
const [stampando,      setStampando]      = useState(false)
const [inviando,       setInviando]       = useState(false)
const [lavoroCorrente, setLavoroCorrente] = useState(lavoro)

  useEffect(() => {
    apiFetch('/api/clienti')
      .then(r => r.json())
      .then(data => setClientiDB(data))
      .catch(() => {})
    apiFetch('/api/impostazioni')
      .then(r => r.json())
      .then(data => setImpostazioni(data))
      .catch(() => {})
    apiFetch('/api/utenti-staff')
      .then(r => r.json())
      .then(data => setStaffDB(data))
      .catch(() => {})
    apiFetch('/api/stati-lavoro')
      .then(r => r.json())
      .then(data => setStatiDB(data))
      .catch(() => {})
  }, [])

  const isMultigiorno = lavoro?.multigiorno ||
    (lavoro?.tipo_record === 'evento' && lavoro?.data_inizio &&
      new Date(lavoro.data_inizio).getHours() === 0 &&
      new Date(lavoro.data_inizio).getMinutes() === 0)

  const [form, setForm] = useState({
    tipo_form:      precompilato?.tipo_form ?? (lavoro?.tipo_record === 'evento' ? 'evento' : 'lavoro'),
    cliente_id:     lavoro?.cliente_id   ?? '',
    clinica:        lavoro?.clinica      ?? '',
    paziente:       lavoro?.paziente     ?? '',
    tipo:           lavoro?.tipo         ?? '',
    tinta:          lavoro?.tinta        ?? '',
    elementi:       lavoro?.elementi     ?? '',
    data:           precompilato?.data ?? (isEdit ? ini.data : ''),
    ora_inizio:     precompilato?.ora ?? (isEdit && !isMultigiorno && ini.ora && ini.min ? `${ini.ora}:${ini.min}` : ''),
    ora_fine:       '',
    data_ricezione: today(),
    note:           lavoro?.note         ?? '',
    note_interne:   lavoro?.note_interne ?? '',
    utente_id:      lavoro?.utente_id    ?? '',
    multigiorno:    isMultigiorno,
    data_fine_mg:   isEdit && isMultigiorno && lavoro?.data_fine
                      ? lavoro.data_fine.slice(0,10)
                      : '',
    stato_id:       lavoro?.stato_id != null ? String(lavoro.stato_id) : '',
    terminato:      lavoro?.terminato ?? false,
  })

  // Imposta stato default quando statiDB è caricato e non c'è uno stato selezionato
  useEffect(() => {
    if (statiDB.length > 0 && !form.stato_id) {
      const inCorso = statiDB.find(s => s.nome.toLowerCase().includes('corso')) || statiDB[0]
      set('stato_id', String(inCorso.id))
    }
  }, [statiDB])

  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [errore,       setErrore]       = useState('')
  const [conferma,     setConferma]     = useState(false)
  const [confSenza,    setConfSenza]    = useState(false)
  const [salvato,      setSalvato]      = useState(false)
  const [pannelloPDF,  setPannelloPDF]  = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function apriStoricoNelPannello(id, versione) {
    try {
      const res  = await apiFetch(`/api/pdf-storico/${id}`)
      const data = await res.json()
      const bin  = atob(data.pdf_data)
      const arr  = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      const blob = new Blob([arr], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      setPannelloPDF({ url, versione, nome: `PDF_v${versione}.pdf` })
    } catch {}
  }

  const isEvento = form.tipo_form === 'evento'
  const mostraPDF = lavoroCorrente && lavoroCorrente.tipo_record !== 'evento'

  async function eseguiSalvataggio(conData) {
    setSaving(true); setErrore('')
    let data_inizio = null, data_fine = null

    if (isEvento && form.multigiorno) {
      if (form.data) {
        data_inizio = `${form.data}T00:00`
        const fine = form.data_fine_mg || form.data
        data_fine = `${fine}T23:59`
      }
    } else if (conData && form.data && form.ora_inizio) {
      data_inizio = `${form.data}T${form.ora_inizio}`
      const dt = new Date(data_inizio)
      if (isEvento && form.ora_fine) {
        const [h, m] = form.ora_fine.split(':')
        dt.setHours(parseInt(h), parseInt(m))
      } else {
        dt.setMinutes(dt.getMinutes() + 30)
      }
      data_fine = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
    }
    try {
      const url    = lavoroCorrente ? `/api/lavori/${lavoroCorrente.id}` : '/api/lavori'
      const method = lavoroCorrente ? 'PUT' : 'POST'
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica: form.clinica, cliente_id: form.cliente_id || null,
          paziente: form.paziente, tipo: form.tipo,
          tinta: form.tinta, elementi: form.elementi, colore: 'sky',
          data_inizio, data_fine, note: form.note, note_interne: form.note_interne,
          tipo_record: form.tipo_form, data_ricezione: form.data_ricezione,
          utente_id: form.utente_id || null,
          multigiorno: form.multigiorno ?? false,
          stato_id: form.stato_id || null,
          terminato: form.terminato ?? false,
        }),
      })
      if (!res.ok) throw new Error()
      const salvato = await res.json()
      setLavoroCorrente(salvato)

      if (form.tipo_form !== 'evento' && data_inizio) {
        try {
          const { base64 } = await generaPDF(salvato, impostazioni)
          await apiFetch(`/api/lavori/${salvato.id}/pdf-storico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf_data: base64 }),
          })
        } catch(e) {
          console.warn('Errore salvataggio PDF storico:', e)
        }
        if (impostazioni.email_stampa_auto === 'true') {
          await inviaPDF(salvato)
        }
      }

      onSaved()
      setSalvato(true)
      setTimeout(() => setSalvato(false), 3000)
    } catch {
      setErrore('Errore durante il salvataggio. Riprova.')
    }
    setSaving(false)
  }

  function salva() {
    if (!isEvento) {
      if (!form.clinica)  { setErrore('Il campo Cliente è obbligatorio');     return }
      if (!form.paziente) { setErrore('Il campo Paziente è obbligatorio');    return }
      if (!form.tipo)     { setErrore('Il campo Tipo lavoro è obbligatorio'); return }
    } else {
      if (!form.paziente)                        { setErrore('Il titolo evento è obbligatorio'); return }
      if (!form.data)                            { setErrore('La data evento è obbligatoria');   return }
      if (!form.multigiorno && !form.ora_inizio) { setErrore("L'ora di inizio è obbligatoria");  return }
    }
    const haData = !!form.data
    const haOra  = !!form.ora_inizio
    if (!form.multigiorno && haData && !haOra) { setErrore("Hai inserito la data ma non l'ora di inizio."); return }
    if (!form.multigiorno && !haData) { setConfSenza(true); return }
    eseguiSalvataggio(true)
  }

  async function stampaPDF() {
    if (!lavoroCorrente) return
    setStampando(true)
    try {
      const { url } = await generaPDF(lavoroCorrente, impostazioni)
      if (isMobile) {
        const a = document.createElement('a')
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      } else {
        setPannelloPDF({ url, versione: 'corrente', nome: `PDF_${lavoroCorrente.codice || lavoroCorrente.id}.pdf` })
      }
    } catch(e) {
      console.error('Errore generaPDF:', e)
    }
    setStampando(false)
  }

  async function inviaPDF(lav) {
  const lavDaInviare = lav || lavoroCorrente
  if (!lavDaInviare) return
  const destinatari = impostazioni.email_destinatari?.split(',').filter(Boolean)
  if (!destinatari?.length) {
    console.warn('Nessun destinatario configurato')
    return
  }
  setInviando(true)
  try {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
    const templateRes   = await apiFetch('/template.pdf')
    const templateBytes = await templateRes.arrayBuffer()
    const pdfDoc = await PDFDocument.load(templateBytes)
    const page   = pdfDoc.getPages()[0]
    const { height } = page.getSize()
    const font  = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const MESI   = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
    const GIORNI = ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato']
    function sanitize(str) {
      if (!str) return ''
      return str
        .replace(/\r\n/g,' ').replace(/\r/g,' ').replace(/\n/g,' ')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'')
        .replace(/à/g,'a').replace(/À/g,'A').replace(/è/g,'e').replace(/È/g,'E')
        .replace(/é/g,'e').replace(/É/g,'E').replace(/ì/g,'i').replace(/Ì/g,'I')
        .replace(/ò/g,'o').replace(/Ò/g,'O').replace(/ù/g,'u').replace(/Ù/g,'U')
        .replace(/[^\x00-\xFF]/g,'?')
    }
    function formatData(str) {
      if (!str) return ''
      const d = new Date(str)
      return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()} alle ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    }
    const color = rgb(0.31, 0.38, 0.48)
    const fSize = 9
    function drawText(text, x, top) {
      const clean = sanitize(text)
      if (!clean) return
      page.drawText(clean, { x, y: height - top - fSize, size: fSize, font, color })
    }
    drawText(lavDaInviare.paziente || '',                              252.28,  83.87)
    drawText(lavDaInviare.cliente_display || lavDaInviare.clinica || '', 252.28, 102.86)
    drawText(formatData(lavDaInviare.data_inizio),                     252.28, 121.85)
    drawText(lavDaInviare.tipo || '',                                   252.28, 140.84)
    drawText(lavDaInviare.tinta || '',                                  252.28, 159.84)
    drawText(lavDaInviare.elementi || '',                               252.28, 178.83)
    if (lavDaInviare.note?.trim()) {
      const parole = sanitize(lavDaInviare.note).split(' ')
      let riga = '', rigaY = 202.50
      for (const parola of parole) {
        const test = riga ? `${riga} ${parola}` : parola
        if (font.widthOfTextAtSize(test, fSize) > 320 && riga) {
          drawText(riga, 184.25, rigaY); riga = parola; rigaY += 13
        } else { riga = test }
      }
      if (riga) drawText(riga, 184.25, rigaY)
    }
    if (lavDaInviare.codice) {
      page.drawText(lavDaInviare.codice, { x:184.25, y:30, size:7, font, color: rgb(0.71,0.75,0.78) })
    }
    const pdfBytes = await pdfDoc.save()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))

    const mittente = impostazioni.email_mittente_nome || 'Il Dente'
    const oggetto  = `${mittente} — ${lavDaInviare.cliente_display || lavDaInviare.clinica || ''} | ${lavDaInviare.paziente} | ${lavDaInviare.tipo || ''}${lavDaInviare.codice ? ` (${lavDaInviare.codice})` : ''}`
    const nomeFile = `${lavDaInviare.codice || 'lavoro'}_${sanitize(lavDaInviare.paziente || '')}.pdf`

    await apiFetch('/api/email/invia-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinatari, oggetto, pdf_base64: base64, nome_file: nomeFile }),
    })
  } catch(e) {
    console.error('Errore invio mail:', e)
  }
  setInviando(false)
}

  async function elimina() {
    setDeleting(true)
    try {
      await apiFetch(`/api/lavori/${lavoroCorrente.id}`, { method: 'DELETE' })
      onSaved(); onClose()
    } catch {
      setErrore("Errore durante l'eliminazione.")
      setDeleting(false)
    }
  }

 const hasChanges = !lavoroCorrente || (
  form.paziente     !== (lavoroCorrente.paziente     ?? '') ||
  form.clinica      !== (lavoroCorrente.clinica      ?? '') ||
  form.tipo         !== (lavoroCorrente.tipo         ?? '') ||
  form.tinta        !== (lavoroCorrente.tinta        ?? '') ||
  form.elementi     !== (lavoroCorrente.elementi     ?? '') ||
  form.note         !== (lavoroCorrente.note         ?? '') ||
  form.note_interne !== (lavoroCorrente.note_interne ?? '') ||
  form.data         !== (lavoroCorrente.data_inizio ? lavoroCorrente.data_inizio.slice(0,10) : '') ||
  form.ora_inizio   !== (lavoroCorrente.data_inizio ? lavoroCorrente.data_inizio.slice(11,16) : '') ||
  String(form.cliente_id) !== String(lavoroCorrente.cliente_id ?? '') ||
  String(form.utente_id)  !== String(lavoroCorrente.utente_id  ?? '') ||
  form.multigiorno  !== (lavoroCorrente.multigiorno  ?? false) ||
  String(form.stato_id)   !== String(lavoroCorrente.stato_id   ?? '') ||
  form.terminato !== (lavoroCorrente.terminato ?? false)
)

const salvaRef = useRef(null)
  salvaRef.current = salva
  useEffect(() => {
    onSalvaReady?.({ salva: (...args) => salvaRef.current?.(...args), saving, hasChanges })
  }, [saving, hasChanges])

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:100,
      display:'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'var(--sur)',
        borderRadius: isMobile ? '16px 16px 0 0' : '14px',
        width: isMobile ? '100%' : pannelloPDF ? '960px' : '580px',
        maxWidth: isMobile ? '100%' : '97vw',
        maxHeight: isMobile ? '88vh' : '92vh',
        display:'flex', flexDirection:'row',
        boxShadow:'0 24px 64px rgba(15,23,42,.22)', overflow:'hidden',
        transition:'width .3s ease',
      }}>
        <div style={{ display:'flex', flexDirection:'column', flex: isMobile ? '1' : '0 0 580px', minWidth:0, maxHeight: isMobile ? '88vh' : '92vh', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '14px 16px 12px' : '18px 22px 14px', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'10px' }}>
          {lavoroCorrente ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'1px', flex:1, minWidth:0 }}>
              <span style={{ fontSize:'15px', fontWeight:700, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lavoroCorrente.paziente}</span>
              <span style={{ fontSize:'12px', color:'var(--tx3)', fontWeight:500 }}>{lavoroCorrente.cliente_display || lavoroCorrente.clinica}</span>
            </div>
          ) : (
            <span style={{ fontSize:'15px', fontWeight:700, flex:1 }}>
              {isEvento ? '📌 Nuovo evento' : '🦷 Nuovo lavoro'}
            </span>
          )}
          {!lavoroCorrente && (
            <div style={{ display:'flex', background:'var(--sur2)', borderRadius:'8px', padding:'3px', gap:'2px' }}>
              {[{id:'lavoro', label:'🦷 Lavoro'}, {id:'evento', label:'📌 Evento'}].map(t => (
                <button key={t.id} onClick={() => set('tipo_form', t.id)} style={{
                  padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:600,
                  border:'none', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif',
                  background: form.tipo_form === t.id ? 'var(--sur)' : 'none',
                  color: form.tipo_form === t.id ? 'var(--accent)' : 'var(--tx2)',
                  boxShadow: form.tipo_form === t.id ? 'var(--sh0)' : 'none',
                }}>{t.label}</button>
              ))}
            </div>
          )}
          {lavoroCorrente && (
            <button onClick={() => setConferma(true)} style={{ padding:'5px 12px', border:'1px solid var(--red)', background:'var(--redb)', color:'var(--red)', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
              Elimina
            </button>
          )}
          {lavoroCorrente && onEspandi && !isMobile && (
            <button onClick={() => { onClose(); onEspandi(lavoroCorrente) }} style={{
              padding:'5px 12px', border:'1px solid var(--bor)', background:'var(--sur2)',
              borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer',
              fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)',
            }}>
              ⤢ Espandi
            </button>
          )}
          {/* X sempre visibile */}
          <button onClick={onClose} style={{ width:'32px', height:'32px', border:'1px solid var(--bor)', background:'none', borderRadius:'8px', cursor:'pointer', fontSize:'20px', color:'var(--tx3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
        </div>

        {/* Corpo */}
        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '16px 16px 32px' : '20px 22px', display:'flex', flexDirection:'column', gap:'14px' }}>

          {conferma && (
            <div style={{ background:'var(--redb)', border:'1px solid #fecaca', borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--red)', marginBottom:'6px' }}>Conferma eliminazione</div>
              <div style={{ fontSize:'12px', color:'var(--tx2)', marginBottom:'10px' }}>Stai per eliminare <strong>{lavoroCorrente?.paziente}</strong>. Azione irreversibile.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setConferma(false)} style={{ flex:1, padding:'7px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'7px', fontSize:'12px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Annulla</button>
                <button onClick={elimina} disabled={deleting} style={{ flex:1, padding:'7px', border:'none', background:'var(--red)', color:'#fff', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
                  {deleting ? 'Eliminazione...' : 'Si, elimina'}
                </button>
              </div>
            </div>
          )}

          {confSenza && (
            <div style={{ background:'var(--ambb)', border:'1px solid var(--amb)', borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--amb)', marginBottom:'6px' }}>DATA DI CONSEGNA MANCANTE. CONTINUO?</div>
              <div style={{ fontSize:'12px', color:'var(--tx2)', marginBottom:'10px' }}>Il lavoro verra salvato senza data di consegna. Potrai aggiungerla in seguito.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setConfSenza(false)} style={{ flex:1, padding:'7px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'7px', fontSize:'12px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Annulla</button>
                <button onClick={() => { setConfSenza(false); eseguiSalvataggio(false) }} style={{ flex:1, padding:'7px', border:'none', background:'var(--amb)', color:'#fff', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
                  Si, salva senza data
                </button>
              </div>
            </div>
          )}

          {errore && (
            <div style={{ background:'var(--redb)', border:'1px solid var(--red)', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', color:'var(--red)' }}>{errore}</div>
          )}

          {!isEvento && (
            <>
              {!isEdit && (
                <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'12px' }}>
                  <div style={fd}>
                    <label style={lbl}>Cliente <span style={rq}>*</span></label>
                    <select style={sel} value={form.cliente_id} onChange={e => {
                      const id = e.target.value
                      const cliente = clientiDB.find(c => String(c.id) === id)
                      set('cliente_id', id)
                      set('clinica', cliente ? (cliente.nickname || cliente.nome) : '')
                    }}>
                      <option value="">Seleziona</option>
                      {clientiDB.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nickname ? `${c.nickname} — ${c.nome}` : c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={fd}>
                    <label style={lbl}>Paziente <span style={rq}>*</span></label>
                    <input style={inp} placeholder="Nome e cognome" value={form.paziente} onChange={e => set('paziente', e.target.value)} />
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'12px' }}>
                <div style={fd}>
                  <label style={lbl}>Tipo lavoro <span style={rq}>*</span></label>
                  <input style={inp} placeholder="es. Corona zirconio, Bite notte..." value={form.tipo} onChange={e => set('tipo', e.target.value)} />
                </div>
                <div style={fd}>
                  <label style={lbl}>Tinta</label>
                  <input style={inp} placeholder="es. A2" value={form.tinta} onChange={e => set('tinta', e.target.value)} />
                </div>
              </div>
              <div style={fd}>
                <label style={lbl}>Elementi</label>
                <input style={inp} placeholder='es. 14, "da 23 a 27", superiore + inferiore...' value={form.elementi} onChange={e => set('elementi', e.target.value)} />
              </div>

              {/* Stato lavoro — solo in modifica */}
              {isEdit && statiDB.length > 0 && (
                <div style={fd}>
                  <label style={lbl}>Stato</label>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {statiDB.map(s => {
                      const isSelected = String(form.stato_id) === String(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => set('stato_id', String(s.id))}
                          style={{
                            padding:'5px 14px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                            cursor:'pointer', border:`2px solid ${isSelected ? s.colore : 'var(--bor)'}`,
                            background: isSelected ? s.colore + '22' : 'var(--sur2)',
                            color: isSelected ? s.colore : 'var(--tx3)',
                            transition:'all .15s',
                          }}
                        >
                          {s.nome}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}


            </>
          )}

          {/* Toggle terminato — solo in modifica */}
          {isEdit && !isEvento && (
            <div
              onClick={() => set('terminato', !form.terminato)}
              style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none', padding:'8px 0' }}
            >
              <div style={{
                width:'36px', height:'20px', borderRadius:'10px',
                background: form.terminato ? 'var(--grn)' : 'var(--bor)',
                position:'relative', transition:'background .2s', flexShrink:0,
              }}>
                <div style={{
                  position:'absolute', top:'2px',
                  left: form.terminato ? '18px' : '2px',
                  width:'16px', height:'16px', borderRadius:'50%',
                  background:'#fff', transition:'left .2s',
                  boxShadow:'0 1px 3px rgba(0,0,0,.2)',
                }} />
              </div>
              <span style={{ fontSize:'12px', fontWeight:600, color: form.terminato ? 'var(--grn)' : 'var(--tx2)' }}>
                {form.terminato ? '✓ Lavoro terminato' : 'Segna come terminato'}
              </span>
            </div>
          )}

          {isEvento && (
            <>
              <div style={fd}>
                <label style={lbl}>Titolo evento <span style={rq}>*</span></label>
                <input style={inp} placeholder="es. Riunione staff, Fornitore, Corso..." value={form.paziente} onChange={e => set('paziente', e.target.value)} />
              </div>
              {staffDB.length > 0 && (
                <div style={fd}>
                  <label style={lbl}>Assegna a</label>
                  <select style={sel} value={form.utente_id} onChange={e => set('utente_id', e.target.value)}>
                    <option value="">— Nessuno —</option>
                    {staffDB.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={fd}>
                <label style={lbl}>Note</label>
                <textarea style={{ ...inp, height:'68px', resize:'vertical', padding:'8px 11px' }} placeholder="Dettagli evento..." value={form.note} onChange={e => set('note', e.target.value)} />
              </div>
            </>
          )}

          <div style={divider} />

          {/* Toggle multi-giorno — solo per eventi */}
          {isEvento && (
            <div
              onClick={() => set('multigiorno', !form.multigiorno)}
              style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' }}
            >
              <div style={{
                width:'36px', height:'20px', borderRadius:'10px',
                background: form.multigiorno ? 'var(--accent)' : 'var(--bor)',
                position:'relative', transition:'background .2s', flexShrink:0,
              }}>
                <div style={{
                  position:'absolute', top:'2px',
                  left: form.multigiorno ? '18px' : '2px',
                  width:'16px', height:'16px', borderRadius:'50%',
                  background:'#fff', transition:'left .2s',
                  boxShadow:'0 1px 3px rgba(0,0,0,.2)',
                }} />
              </div>
              <span style={{ fontSize:'12px', fontWeight:600, color:'var(--tx2)' }}>Evento multi-giorno</span>
            </div>
          )}

          {isEvento && form.multigiorno ? (
            <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'12px' }}>
              <DatePicker label="Dal" value={form.data} onChange={v => set('data', v)} isMob={isMobile} />
              <DatePicker label="Al" value={form.data_fine_mg} onChange={v => set('data_fine_mg', v)} isMob={isMobile} />
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'12px', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
              <DatePicker label={isEvento ? 'Data evento' : 'Data consegna'} value={form.data} onChange={v => set('data', v)} isMob={isMobile} />
              <div style={fd}>
                <label style={lbl}>{isEvento ? 'Dalle' : 'Ora'}</label>
                <OraInput value={form.ora_inizio} onChange={v => set('ora_inizio', v)} />
              </div>
              {isEvento && (
                <div style={fd}>
                  <label style={lbl}>Alle <span style={{ fontSize:'9px', fontWeight:400, color:'var(--tx3)' }}>default +30 min</span></label>
                  <OraInput value={form.ora_fine} onChange={v => set('ora_fine', v)} />
                </div>
              )}
            </div>
          )}

          {(form.data || form.ora_inizio) && (
            <div onClick={() => { set('data', ''); set('ora_inizio', ''); set('ora_fine', '') }}
              style={{ fontSize:'11px', fontWeight:600, color:'var(--red)', cursor:'pointer', textDecoration:'underline', marginTop:'-6px' }}>
              Rimuovi data di consegna
            </div>
          )}

          {!isEvento && (
            <>
              <div style={divider} />
              <div style={fd}>
                <label style={lbl}>Note <span style={{ fontSize:'9px', fontWeight:400, color:'var(--tx3)' }}>(visibili sul PDF)</span></label>
                <textarea style={{ ...inp, height:'68px', resize:'vertical', padding:'8px 11px' }} placeholder="Note operative..." value={form.note} onChange={e => set('note', e.target.value)} />
              </div>
              <div style={fd}>
                <label style={lbl}>Note interne <span style={{ fontSize:'9px', fontWeight:400, color:'var(--tx3)' }}>(solo uso interno)</span></label>
                <textarea style={{ ...inp, height:'68px', resize:'vertical', padding:'8px 11px', background:'var(--ambb)', borderColor:'var(--amb)' }} placeholder="Note riservate..." value={form.note_interne} onChange={e => set('note_interne', e.target.value)} />
              </div>
              <div style={divider} />
              {!isMobile && <DatePicker label="Data ricezione" value={form.data_ricezione} onChange={v => set('data_ricezione', v)} />}
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '12px 16px' : '14px 22px', borderTop:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          {mostraPDF && !isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <button onClick={stampaPDF} disabled={stampando} style={{
                padding:'7px 14px', border:'1px solid var(--bor)', background:'var(--sur2)',
                borderRadius:'8px', fontSize:'11px', fontWeight:600, cursor:'pointer',
                fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)',
                opacity: stampando ? .6 : 1,
              }}>
                {stampando ? '...' : 'Apri PDF'}
              </button>
              {lavoroCorrente?.aggiornato_il && (
                <DropdownStorico
                  lavoroId={lavoroCorrente.id}
                  label={`Salvato ${formatAggiornato(lavoroCorrente.aggiornato_il)}`}
                  onApri={apriStoricoNelPannello}
                />
              )}
            </div>
          )}

          {/* Su mobile: tasto PDF fisso sopra il FAB, visibile subito dopo il salvataggio */}
          {mostraPDF && isMobile && (
            <button onClick={stampaPDF} disabled={stampando} style={{
              position:'fixed',
              bottom:'calc(56px + 16px + 52px + 12px + env(safe-area-inset-bottom))',
              right:'20px', zIndex:298,
              padding:'12px 20px',
              border:'none', background:'var(--sur)', color:'var(--accent)',
              borderRadius:'12px', fontSize:'13px', fontWeight:700,
              cursor:'pointer', fontFamily:'Instrument Sans, sans-serif',
              boxShadow:'0 2px 12px rgba(2,132,199,.25)',
              border:'2px solid var(--accent)',
              opacity: stampando ? .6 : 1,
              display:'flex', alignItems:'center', gap:'8px',
            }}>
              {stampando ? '...' : '📄 Apri PDF'}
            </button>
          )}

          {/* Toast notifica salvataggio */}
          <div style={{
            position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)',
            zIndex:999, pointerEvents:'none',
            opacity: salvato ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:'8px',
              background:'#15803d', color:'#fff',
              borderRadius:'10px', padding:'10px 22px',
              fontSize:'13px', fontWeight:700,
              boxShadow:'0 4px 20px rgba(15,23,42,.18)',
            }}>
              ✅ Salvato
            </div>
          </div>

          {/* Su mobile il salva è nel FAB esterno — qui solo desktop */}
          {!isMobile && (
            <button onClick={salva} disabled={saving || !hasChanges} style={{
              marginLeft:'auto',
              padding:'8px 20px',
              border:'none',
              background:'var(--accent)', color:'#fff', borderRadius:'8px',
              fontSize:'12px', fontWeight:600,
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontFamily:'Instrument Sans, sans-serif',
              boxShadow:'0 2px 8px rgba(2,132,199,.3)',
              opacity: saving || !hasChanges ? .4 : 1,
            }}>
              {saving ? 'Salvataggio...' : lavoroCorrente ? 'Salva modifiche' : 'Salva'}
            </button>
          )}
        </div>

        </div>{/* fine colonna form */}

        {/* Pannello PDF storico — laterale (solo desktop) */}
        {pannelloPDF && !isMobile && (
          <div style={{ width:'360px', flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'1px solid var(--bor)', background:'var(--sur2)' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'10px', background:'var(--sur)' }}>
              <span style={{ fontSize:'12px', fontWeight:700, color:'var(--tx)', flex:1 }}>
                PDF — Versione {pannelloPDF.versione}
              </span>
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = pannelloPDF.url
                  a.download = pannelloPDF.nome
                  a.click()
                }}
                style={{ padding:'5px 10px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'6px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}
              >⬇ Scarica</button>
              <button
                onClick={() => {
                  const iframe = document.createElement('iframe')
                  iframe.style.display = 'none'
                  iframe.src = pannelloPDF.url
                  document.body.appendChild(iframe)
                  iframe.onload = () => { iframe.contentWindow.print() }
                }}
                style={{ padding:'5px 10px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'6px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}
              >🖨 Stampa</button>
              <button
                onClick={() => setPannelloPDF(null)}
                style={{ width:'26px', height:'26px', border:'1px solid var(--bor)', background:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px', color:'var(--tx3)', display:'flex', alignItems:'center', justifyContent:'center' }}
              >×</button>
            </div>
            <iframe
              src={pannelloPDF.url}
              style={{ flex:1, border:'none', width:'100%' }}
              title="PDF storico"
            />
          </div>
        )}

      </div>
    </div>
  )
}