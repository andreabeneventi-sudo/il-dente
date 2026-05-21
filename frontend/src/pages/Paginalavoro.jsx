import { apiFetch } from '../utils/apiFetch'
import { useState, useEffect, useRef } from 'react'
import { generaPDF } from '../utils/generaPDF'

const inp = {
  border:'1px solid var(--bor)', borderRadius:'8px', padding:'7px 11px',
  fontSize:'12px', fontFamily:'Instrument Sans, sans-serif',
  background:'var(--sur2)', outline:'none', color:'var(--tx)',
  width:'100%', boxSizing:'border-box',
}
const lbl = { fontSize:'11px', fontWeight:600, color:'var(--tx2)', marginBottom:'4px', display:'block' }
const fd  = { display:'flex', flexDirection:'column', gap:'4px', flex:1 }
const sec = { fontSize:'10px', fontWeight:700, letterSpacing:'.6px', textTransform:'uppercase', marginBottom:'12px' }

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ file, onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasPrev, hasNext])

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }}>
        <img
          src={`/api/drive/file/${file.id}`}
          alt={file.name}
          style={{ maxWidth:'90vw', maxHeight:'85vh', borderRadius:'10px', objectFit:'contain', display:'block' }}
        />
        <div style={{ position:'absolute', top:'10px', right:'10px', display:'flex', gap:'8px' }}>
          <a
            href={`/api/drive/file/${file.id}`}
            download={file.name}
            onClick={e => e.stopPropagation()}
            style={{ padding:'6px 12px', background:'rgba(255,255,255,.15)', color:'#fff', borderRadius:'7px', fontSize:'11px', fontWeight:600, textDecoration:'none', backdropFilter:'blur(8px)' }}
          >⬇ Scarica</a>
          <button onClick={onClose} style={{ width:'32px', height:'32px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:'7px', color:'#fff', fontSize:'18px', cursor:'pointer', backdropFilter:'blur(8px)' }}>×</button>
        </div>
        <div style={{ position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,.7)', fontSize:'11px', fontWeight:600 }}>
          {file.name}
        </div>
        {hasPrev && (
          <button onClick={e => { e.stopPropagation(); onPrev() }} style={{
            position:'absolute', left:'-50px', top:'50%', transform:'translateY(-50%)',
            width:'40px', height:'40px', background:'rgba(255,255,255,.15)', border:'none',
            borderRadius:'50%', color:'#fff', fontSize:'20px', cursor:'pointer', backdropFilter:'blur(8px)',
          }}>‹</button>
        )}
        {hasNext && (
          <button onClick={e => { e.stopPropagation(); onNext() }} style={{
            position:'absolute', right:'-50px', top:'50%', transform:'translateY(-50%)',
            width:'40px', height:'40px', background:'rgba(255,255,255,.15)', border:'none',
            borderRadius:'50%', color:'#fff', fontSize:'20px', cursor:'pointer', backdropFilter:'blur(8px)',
          }}>›</button>
        )}
      </div>
    </div>
  )
}

// ── Sezione File ───────────────────────────────────────────────────────────────
function SezioneFile({ titolo, cartella, lavoroId, tipo, accetta, icona, eliminabile = true }) {
  const [files, setFiles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [confermaId, setConfermaId] = useState(null)
  const [lightbox, setLightbox]   = useState(null)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef()

  useEffect(() => { carica() }, [lavoroId])

  async function carica() {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/lavori/${lavoroId}/drive/files?cartella=${cartella}`)
      const data = await res.json()
      setFiles(Array.isArray(data) ? data : [])
    } catch { setFiles([]) }
    setLoading(false)
  }

  const [progress,    setProgress]    = useState(0)
  const [fileCorrente, setFileCorrente] = useState(0)
  const [fileTotali,   setFileTotali]   = useState(0)

  async function uploadFile(file, corrente, totali) {
    return new Promise((resolve) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('cartella', cartella)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/lavori/${lavoroId}/drive/upload`)
      const token = localStorage.getItem('ildente_token')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => { setProgress(0); resolve() }
      xhr.onerror = () => { setProgress(-1); setTimeout(() => setProgress(0), 2000); resolve() }
      xhr.send(formData)
    })
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setUploading(true)
    setFileTotali(files.length)
    for (let i = 0; i < files.length; i++) {
      setFileCorrente(i + 1)
      setProgress(0)
      await uploadFile(files[i], i + 1, files.length)
    }
    await carica()
    setUploading(false)
    setFileTotali(0)
    setFileCorrente(0)
    setProgress(0)
  }

  async function caricaFile(e) {
    await uploadFiles(e.target.files)
    e.target.value = ''
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true) }
  function onDragLeave() { setDragging(false) }
  async function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    await uploadFiles(e.dataTransfer.files)
  }

  async function confermaElimina(fileId) {
    try {
      await apiFetch(`/api/drive/file/${fileId}`, { method: 'DELETE' })
      setFiles(f => f.filter(x => x.id !== fileId))
    } catch {}
    setConfermaId(null)
  }

  const isImmagini = tipo === 'immagini'

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        background: dragging ? 'var(--accent-l)' : 'var(--sur)',
        border: dragging ? '2px dashed var(--accent)' : '1px solid var(--bor)',
        borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'14px',
        transition:'background .15s, border .15s',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ ...sec, color:'var(--accent)', marginBottom:0 }}>{icona} {titolo}</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ padding:'5px 12px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)', opacity: uploading ? .5 : 1 }}
        >
          {uploading ? 'Caricamento...' : '+ Aggiungi'}
        </button>
        <input ref={inputRef} type="file" accept={accetta} multiple style={{ display:'none' }} onChange={caricaFile} />
      </div>

      {dragging && (
        <div style={{ textAlign:'center', fontSize:'12px', fontWeight:600, color:'var(--accent)', padding:'8px 0' }}>
          Rilascia qui per caricare
        </div>
      )}

      {/* Barra di progresso */}
      {uploading && (
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:600, color:'var(--tx3)' }}>
            <span>
              {progress === -1
                ? 'Errore caricamento'
                : fileTotali > 1
                  ? `File ${fileCorrente} di ${fileTotali}...`
                  : 'Caricamento in corso...'}
            </span>
            <span>{progress === -1 ? '' : `${progress}%`}</span>
          </div>
          <div style={{ height:'6px', background:'var(--sur3)', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{
              height:'100%',
              width: `${progress === -1 ? 100 : progress}%`,
              background: progress === -1 ? 'var(--red)' : 'var(--accent)',
              borderRadius:'3px',
              transition:'width .2s ease',
            }} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize:'12px', color:'var(--tx4)', textAlign:'center', padding:'20px 0' }}>Caricamento...</div>
      ) : files.length === 0 ? (
        <div style={{ fontSize:'12px', color:'var(--tx4)', textAlign:'center', padding:'20px 0' }}>Nessun file</div>
      ) : isImmagini ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))', gap:'8px' }}>
          {files.map((f, i) => (
            <div key={f.id} style={{ position:'relative', aspectRatio:'1', borderRadius:'8px', overflow:'hidden', background:'var(--sur2)', cursor:'pointer' }}
              onClick={() => setLightbox(i)}
            >
              <img src={`/api/drive/file/${f.id}`} alt={f.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              {eliminabile && (
                confermaId === f.id ? (
                  <div onClick={e => e.stopPropagation()} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                    <div style={{ fontSize:'10px', color:'#fff', fontWeight:700, textAlign:'center' }}>Eliminare?</div>
                    <div style={{ display:'flex', gap:'4px' }}>
                      <button onClick={() => confermaElimina(f.id)} style={{ padding:'2px 8px', background:'#ef4444', border:'none', borderRadius:'4px', color:'#fff', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>Sì</button>
                      <button onClick={() => setConfermaId(null)} style={{ padding:'2px 8px', background:'rgba(255,255,255,.2)', border:'none', borderRadius:'4px', color:'#fff', fontSize:'10px', cursor:'pointer' }}>No</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConfermaId(f.id) }} style={{ position:'absolute', top:'3px', right:'3px', width:'20px', height:'20px', background:'rgba(0,0,0,.55)', border:'none', borderRadius:'4px', color:'#fff', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                )
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {files.map(f => (
            <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'var(--sur2)', borderRadius:'8px', border:'1px solid var(--bor)' }}>
              <span style={{ fontSize:'16px' }}>{tipo === 'stl' ? '📐' : '📄'}</span>
              <span style={{ flex:1, fontSize:'12px', fontWeight:600, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
              <a href={`/api/drive/file/${f.id}`} download={f.name} style={{ padding:'4px 8px', background:'var(--accent-l)', color:'var(--accent)', borderRadius:'5px', fontSize:'10px', fontWeight:700, textDecoration:'none' }}>⬇</a>
              {eliminabile && (
                confermaId === f.id ? (
                  <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                    <span style={{ fontSize:'10px', color:'var(--red)', fontWeight:700 }}>Eliminare?</span>
                    <button onClick={() => confermaElimina(f.id)} style={{ padding:'2px 8px', background:'var(--red)', border:'none', borderRadius:'4px', color:'#fff', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>Sì</button>
                    <button onClick={() => setConfermaId(null)} style={{ padding:'2px 8px', border:'1px solid var(--bor)', background:'none', borderRadius:'4px', fontSize:'10px', cursor:'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfermaId(f.id)} style={{ width:'24px', height:'24px', background:'none', border:'1px solid var(--bor)', borderRadius:'5px', color:'var(--red)', fontSize:'12px', cursor:'pointer' }}>×</button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox !== null && (
        <Lightbox
          file={files[lightbox]}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(i => Math.max(0, i - 1))}
          onNext={() => setLightbox(i => Math.min(files.length - 1, i + 1))}
          hasPrev={lightbox > 0}
          hasNext={lightbox < files.length - 1}
        />
      )}
    </div>
  )
}

// ── PaginaLavoro ───────────────────────────────────────────────────────────────
export default function PaginaLavoro({ lavoro: lavoroIniziale, onTorna, onSaved, isMobile = false }) {
  const [lavoro,    setLavoro]    = useState(lavoroIniziale)
  const [statiDB,   setStatiDB]   = useState([])
  const [clientiDB, setClientiDB] = useState([])
  const [impostazioni, setImpostazioni] = useState({})
  const [driveConnesso, setDriveConnesso] = useState(false)
  const [storico,   setStorico]   = useState([])
  const [pdfStorico, setPdfStorico] = useState([])
  const [snapshotAperto, setSnapshotAperto] = useState(null)
  const [form,      setForm]      = useState({
    paziente:    lavoroIniziale.paziente    ?? '',
    tipo:        lavoroIniziale.tipo        ?? '',
    tinta:       lavoroIniziale.tinta       ?? '',
    elementi:    lavoroIniziale.elementi    ?? '',
    note:        lavoroIniziale.note        ?? '',
    note_interne:lavoroIniziale.note_interne?? '',
    stato_id:    lavoroIniziale.stato_id != null ? String(lavoroIniziale.stato_id) : '',
    terminato:   lavoroIniziale.terminato ?? false,
  })
  const [saving,    setSaving]    = useState(false)
  const [salvato,   setSalvato]   = useState(false)

  async function ricaricaDati() {
    const [stor, pdf] = await Promise.all([
      apiFetch(`/api/lavori/${lavoroIniziale.id}/storico`).then(r => r.json()).catch(() => []),
      apiFetch(`/api/lavori/${lavoroIniziale.id}/pdf-storico`).then(r => r.json()).catch(() => []),
    ])
    setStorico(stor)
    setPdfStorico(pdf)
  }

  useEffect(() => {
    apiFetch('/api/stati-lavoro')
      .then(r => r.json()).then(setStatiDB).catch(() => {})
    apiFetch('/api/clienti')
      .then(r => r.json()).then(setClientiDB).catch(() => {})
    apiFetch('/api/impostazioni')
      .then(r => r.json()).then(data => {
        setImpostazioni(data)
        setDriveConnesso(!!data.google_tokens)
      }).catch(() => {})
    ricaricaDati()
  }, [])

  useEffect(() => {
    if (statiDB.length > 0 && !form.stato_id) {
      const inCorso = statiDB.find(s => s.nome.toLowerCase().includes('corso')) || statiDB[0]
      setForm(f => ({ ...f, stato_id: String(inCorso.id) }))
    }
  }, [statiDB])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function salva() {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/lavori/${lavoro.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paziente:     form.paziente,
          clinica:      lavoro.clinica,
          cliente_id:   lavoro.cliente_id,
          tipo:         form.tipo,
          tinta:        form.tinta,
          elementi:     form.elementi,
          note:         form.note,
          note_interne: form.note_interne,
          colore:       lavoro.colore,
          data_inizio:  lavoro.data_inizio,
          data_fine:    lavoro.data_fine,
          tipo_record:  lavoro.tipo_record,
          terminato:    lavoro.terminato,
          utente_id:    lavoro.utente_id,
          multigiorno:  lavoro.multigiorno,
          stato_id:     form.stato_id ? parseInt(form.stato_id, 10) : null,
          terminato:    form.terminato ?? false,
        }),
      })
      const lavoroSalvato = await res.json()
      setLavoro(lavoroSalvato)

      // Genera PDF solo se cambiano campi che ci appaiono dentro
      const campiPDF = ['paziente', 'tipo', 'tinta', 'elementi', 'note']
      const pdfModificato = campiPDF.some(c => form[c] !== (lavoro[c] ?? ''))
      const dataModificata = lavoroSalvato.data_inizio !== lavoro.data_inizio

      if (lavoroSalvato.data_inizio && (pdfModificato || dataModificata)) {
        try {
          const lavoroPerPDF = { ...lavoroSalvato, cliente_display: lavoro.cliente_display || lavoro.clinica }
          const { base64 } = await generaPDF(lavoroPerPDF, impostazioni)
          await apiFetch(`/api/lavori/${lavoroSalvato.id}/pdf-storico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf_data: base64 }),
          })
        } catch(e) {
          console.error('Errore generazione PDF:', e)
        }
      }

      await ricaricaDati()
      setSalvato(true)
      setTimeout(() => setSalvato(false), 3000)
      onSaved?.()
    } catch {}
    setSaving(false)
  }

  const statoCorrente = statiDB.find(s => String(s.id) === form.stato_id)
  const clienteNome = lavoro.cliente_display || lavoro.clinica || ''

  const [stampando, setStampando] = useState(false)

  async function apriPDF() {
    setStampando(true)
    try {
      const { url } = await generaPDF({ ...lavoro, cliente_display: clienteNome }, impostazioni)
      const a = document.createElement('a')
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch(e) { console.error('Errore PDF:', e) }
    setStampando(false)
  }

  const hasChanges = (
    form.paziente     !== (lavoro.paziente     ?? '') ||
    form.tipo         !== (lavoro.tipo         ?? '') ||
    form.tinta        !== (lavoro.tinta        ?? '') ||
    form.elementi     !== (lavoro.elementi     ?? '') ||
    form.note         !== (lavoro.note         ?? '') ||
    form.note_interne !== (lavoro.note_interne ?? '') ||
    String(form.stato_id) !== String(lavoro.stato_id ?? '') ||
    form.terminato    !== (lavoro.terminato    ?? false)
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--bor)', background:'var(--sur)', display:'flex', alignItems:'center', gap:'12px', flexShrink:0, flexWrap:'wrap' }}>
        <button onClick={onTorna} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>
          ← Torna
        </button>

        <div style={{ display:'flex', flexDirection:'column', marginRight:'auto', minWidth:0, maxWidth:'300px' }}>
          <div style={{ fontSize:'15px', fontWeight:700, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {clienteNome} — {lavoro.paziente}
          </div>
          <div style={{ fontSize:'11px', color:'var(--tx3)', fontFamily:'JetBrains Mono, monospace' }}>
            {lavoro.codice}
          </div>
        </div>

        {/* Badge stato */}
        {statoCorrente && (
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', flexShrink:1 }}>
            {statiDB.map(s => {
              const isSelected = String(form.stato_id) === String(s.id)
              return (
                <div key={s.id} onClick={() => set('stato_id', String(s.id))} style={{
                  padding:'5px 14px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                  cursor:'pointer', border:`2px solid ${isSelected ? s.colore : 'var(--bor)'}`,
                  background: isSelected ? s.colore + '22' : 'var(--sur2)',
                  color: isSelected ? s.colore : 'var(--tx3)',
                  transition:'all .15s',
                }}>{s.nome}</div>
              )
            })}
          </div>
        )}

        {/* Toast */}
        <div style={{ opacity: salvato ? 1 : 0, transition:'opacity .7s', background:'#15803d', color:'#fff', borderRadius:'8px', padding:'6px 14px', fontSize:'12px', fontWeight:700, pointerEvents:'none' }}>
          ✅ Salvato
        </div>

        <button onClick={salva} disabled={saving || !hasChanges} style={{ padding:'8px 20px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor: hasChanges ? 'pointer' : 'not-allowed', fontFamily:'Instrument Sans, sans-serif', boxShadow:'0 2px 8px rgba(2,132,199,.3)', opacity: saving || !hasChanges ? .4 : 1 }}>
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>

        {lavoro.tipo_record !== 'evento' && (
          <button onClick={apriPDF} disabled={stampando} style={{ padding:'8px 14px', border:'1px solid var(--bor)', background:'var(--sur2)', color:'var(--tx2)', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', opacity: stampando ? .6 : 1 }}>
            {stampando ? '...' : '📄 PDF'}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '16px 16px 96px' : '24px', display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'20px', alignContent:'start' }}>

        {/* Colonna sinistra — Info lavoro */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'14px' }}>
            <span style={{ ...sec, color:'var(--accent)', marginBottom:0 }}>🦷 Dettagli lavoro</span>

            {/* Toggle terminato */}
            <div
              onClick={() => setForm(f => ({ ...f, terminato: !f.terminato }))}
              style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none', padding:'6px 0', borderBottom:'1px solid var(--borl)' }}
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

            <div style={fd}>
              <label style={lbl}>Paziente</label>
              <input style={inp} value={form.paziente} onChange={e => set('paziente', e.target.value)} />
            </div>

            <div style={{ display:'flex', gap:'12px' }}>
              <div style={fd}>
                <label style={lbl}>Tipo lavoro</label>
                <input style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)} />
              </div>
              <div style={{ ...fd, flex:'0 0 90px' }}>
                <label style={lbl}>Tinta</label>
                <input style={inp} value={form.tinta} onChange={e => set('tinta', e.target.value)} placeholder="es. A2" />
              </div>
            </div>

            <div style={fd}>
              <label style={lbl}>Elementi</label>
              <input style={inp} value={form.elementi} onChange={e => set('elementi', e.target.value)} placeholder='es. 14, "da 23 a 27"' />
            </div>

            <div style={fd}>
              <label style={lbl}>Note</label>
              <textarea style={{ ...inp, height:'80px', resize:'vertical', padding:'8px 11px' }} value={form.note} onChange={e => set('note', e.target.value)} />
            </div>

            <div style={fd}>
              <label style={lbl}>Note interne</label>
              <textarea style={{ ...inp, height:'60px', resize:'vertical', padding:'8px 11px' }} value={form.note_interne} onChange={e => set('note_interne', e.target.value)} />
            </div>
          </div>

          {/* Info non modificabili + PDF generati */}
          <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'10px' }}>
            <span style={{ ...sec, color:'var(--accent)', marginBottom:0 }}>📋 Informazioni</span>
            {[
              { label:'Codice', value: lavoro.codice, mono: true },
              { label:'Cliente', value: clienteNome },
              { label:'Data consegna', value: lavoro.data_inizio ? new Date(lavoro.data_inizio).toLocaleString('it-IT', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—' },
              { label:'Creato il', value: lavoro.creato_il ? new Date(lavoro.creato_il).toLocaleDateString('it-IT') : '—' },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
                <span style={{ fontSize:'11px', fontWeight:600, color:'var(--tx3)', width:'100px', flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:'12px', color:'var(--tx)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</span>
              </div>
            ))}

            {/* PDF generati dal software */}
            {pdfStorico.length > 0 && (
              <>
                <div style={{ height:'1px', background:'var(--borl)', margin:'4px 0' }} />
                <span style={{ fontSize:'10px', fontWeight:700, color:'var(--tx3)', letterSpacing:'.5px', textTransform:'uppercase' }}>PDF generati</span>
                <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  {pdfStorico.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px', background:'var(--sur2)', borderRadius:'7px', border:'1px solid var(--bor)' }}>
                      <span style={{ fontSize:'13px' }}>📄</span>
                      <span style={{ flex:1, fontSize:'11px', fontWeight:600, color:'var(--tx)' }}>
                        V{p.versione} — {new Date(p.creato_il).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/api/pdf-storico/${p.id}`)
                          const data = await res.json()
                          const bin = atob(data.pdf_data)
                          const arr = new Uint8Array(bin.length)
                          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
                          const blob = new Blob([arr], { type:'application/pdf' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                          setTimeout(() => URL.revokeObjectURL(url), 5000)
                        }}
                        style={{ padding:'3px 8px', background:'var(--accent-l)', color:'var(--accent)', border:'none', borderRadius:'5px', fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}
                      >Apri</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Box storico lavoro */}
          <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'10px' }}>
            <span style={{ ...sec, color:'var(--accent)', marginBottom:0 }}>🕓 Storico modifiche</span>
            {storico.length === 0 ? (
              <div style={{ fontSize:'12px', color:'var(--tx4)', textAlign:'center', padding:'12px 0' }}>Nessuna modifica registrata</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {storico.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSnapshotAperto(s)}
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'var(--sur2)', borderRadius:'8px', border:'1px solid var(--bor)', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-l)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--sur2)'}
                  >
                    <span style={{ fontSize:'11px', fontWeight:700, color:'var(--tx3)', fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>V{s.versione}</span>
                    {s.stato_nome && (
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', background: (s.stato_colore || '#0284C7') + '22', color: s.stato_colore || 'var(--accent)', flexShrink:0 }}>
                        {s.stato_nome}
                      </span>
                    )}
                    <span style={{ flex:1, fontSize:'11px', color:'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {s.tipo || '—'}{s.tinta ? ` · ${s.tinta}` : ''}
                    </span>
                    <span style={{ fontSize:'10px', color:'var(--tx4)', flexShrink:0 }}>
                      {new Date(s.creato_il).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonna destra — Allegati (solo se Drive connesso) */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {driveConnesso ? (
            <>
              <SezioneFile
                titolo="Foto e immagini"
                cartella="immagini"
                lavoroId={lavoro.id}
                tipo="immagini"
                accetta="image/*,.psd,.psb,.ai,.sketch,.xcf,.afphoto,.pixelmator"
                icona="📷"
              />
              <SezioneFile
                titolo="File tecnici e STL"
                cartella="root"
                lavoroId={lavoro.id}
                tipo="stl"
                accetta=".stl,.ply,.dxf,.step,.stp,.obj,.3mf,.zip,.rar,.7z,.tar"
                icona="📐"
              />
              <SezioneFile
                titolo="Documenti e PDF allegati"
                cartella="pdf"
                lavoroId={lavoro.id}
                tipo="pdf"
                accetta=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp"
                icona="📄"
              />
            </>
          ) : (
            <div style={{ background:'var(--sur)', border:'1px solid var(--bor)', borderRadius:'12px', padding:'24px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', textAlign:'center' }}>
              <span style={{ fontSize:'32px' }}>☁️</span>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--tx2)' }}>Google Drive non connesso</div>
              <div style={{ fontSize:'12px', color:'var(--tx3)', lineHeight:1.5 }}>Collega il tuo account Google Drive nelle impostazioni per poter caricare foto, documenti e allegati ai lavori.</div>
            </div>
          )}
        </div>

      </div>

      {/* Popup snapshot */}
      {snapshotAperto && (
        <div onClick={() => setSnapshotAperto(null)} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--sur)', borderRadius:'14px', width:'480px', maxWidth:'95vw', padding:'24px', display:'flex', flexDirection:'column', gap:'14px', boxShadow:'0 24px 64px rgba(15,23,42,.22)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'14px', fontWeight:700, color:'var(--tx)' }}>Versione {snapshotAperto.versione}</span>
              {snapshotAperto.stato_nome && (
                <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 10px', borderRadius:'10px', background: (snapshotAperto.stato_colore || '#0284C7') + '22', color: snapshotAperto.stato_colore || 'var(--accent)' }}>
                  {snapshotAperto.stato_nome}
                </span>
              )}
              <span style={{ marginLeft:'auto', fontSize:'11px', color:'var(--tx3)' }}>
                {new Date(snapshotAperto.creato_il).toLocaleString('it-IT', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
            {[
              { label:'Tipo lavoro', value: snapshotAperto.tipo },
              { label:'Tinta', value: snapshotAperto.tinta },
              { label:'Elementi', value: snapshotAperto.elementi },
              { label:'Data consegna', value: snapshotAperto.data_inizio ? new Date(snapshotAperto.data_inizio).toLocaleString('it-IT', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : null },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label}>
                <div style={lbl}>{label}</div>
                <div style={{ fontSize:'12px', color:'var(--tx)', padding:'7px 11px', background:'var(--sur2)', borderRadius:'7px', border:'1px solid var(--bor)' }}>{value}</div>
              </div>
            ))}
            {snapshotAperto.note && (
              <div>
                <div style={lbl}>Note</div>
                <div style={{ fontSize:'12px', color:'var(--tx)', padding:'7px 11px', background:'var(--sur2)', borderRadius:'7px', border:'1px solid var(--bor)', whiteSpace:'pre-wrap' }}>{snapshotAperto.note}</div>
              </div>
            )}
            {snapshotAperto.note_interne && (
              <div>
                <div style={lbl}>Note interne</div>
                <div style={{ fontSize:'12px', color:'var(--tx)', padding:'7px 11px', background:'#fefce8', borderRadius:'7px', border:'1px solid var(--amb)', whiteSpace:'pre-wrap' }}>{snapshotAperto.note_interne}</div>
              </div>
            )}
            <button onClick={() => setSnapshotAperto(null)} style={{ alignSelf:'flex-end', padding:'7px 18px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}