import { apiFetch } from '../utils/apiFetch'
import { useState } from 'react'

const TIPI = [
  { id:'studio',  label:'Studio dentistico',        icon:'🦷', desc:'', color:'#0284C7' },
  { id:'lab',     label:'Laboratorio odontotecnico', icon:'🔬', desc:'', color:'#16a34a' },
  { id:'azienda', label:'Azienda',                   icon:'🏢', desc:'', color:'#a17c0a' },
]

const FIELD_H = '36px'
const base = {
  border:'1px solid var(--bor)', borderRadius:'8px', padding:'0 11px',
  fontSize:'12px', fontFamily:'Instrument Sans, sans-serif',
  background:'var(--sur2)', outline:'none', color:'var(--tx)',
  width:'100%', height:FIELD_H, boxSizing:'border-box',
}
const inp = { ...base }
const fd  = { display:'flex', flexDirection:'column', gap:'4px', flex:1 }
const lbl = { fontSize:'11px', fontWeight:600, color:'var(--tx2)' }
const rq  = { color:'var(--red)', marginLeft:'2px' }
const divider = { height:'1px', background:'var(--borl)', margin:'4px 0' }
const sec = { fontSize:'11px', fontWeight:700, letterSpacing:'.6px', textTransform:'uppercase', marginTop:'4px' }

function Campo({ label, value, editing, onChange, placeholder, required, note }) {
  return (
    <div style={fd}>
      <label style={lbl}>
        {label}
        {required && editing && <span style={rq}>*</span>}
        {note && <span style={{ fontSize:'9px', fontWeight:400, color:'var(--tx3)', marginLeft:'4px' }}>{note}</span>}
      </label>
      {editing ? (
        <input style={inp} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <div style={{ fontSize:'12px', color: value ? 'var(--tx)' : 'var(--tx3)', padding:'4px 0', minHeight:'20px' }}>
          {value || '—'}
        </div>
      )}
    </div>
  )
}

function SelettoreTipo({ onScegliTipo, onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--sur)', borderRadius:'14px', width:'460px', maxWidth:'95vw', boxShadow:'0 24px 64px rgba(15,23,42,.22)', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center' }}>
          <span style={{ fontSize:'15px', fontWeight:700, flex:1 }}>Che tipo di cliente vuoi aggiungere?</span>
          <button onClick={onClose} style={{ width:'28px', height:'28px', border:'1px solid var(--bor)', background:'none', borderRadius:'7px', cursor:'pointer', fontSize:'18px', color:'var(--tx3)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:'10px' }}>
          <p style={{ fontSize:'12px', color:'var(--tx3)', marginBottom:'4px' }}>Seleziona il tipo per configurare correttamente i campi del profilo.</p>
          {TIPI.map(t => (
            <div key={t.id} onClick={() => onScegliTipo(t.id)} style={{
              display:'flex', alignItems:'center', gap:'14px', padding:'12px 16px',
              borderRadius:'10px', cursor:'pointer', border:'1px solid var(--bor)',
              background:'var(--sur2)', transition:'all .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = `${t.color}10` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bor)'; e.currentTarget.style.background = 'var(--sur2)' }}
            >
              <span style={{ fontSize:'24px', width:'32px', textAlign:'center', flexShrink:0 }}>{t.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:700 }}>{t.label}</div>
                <div style={{ fontSize:'11px', color:'var(--tx3)', marginTop:'2px' }}>{t.desc}</div>
              </div>
              <span style={{ fontSize:'18px', color:'var(--tx3)' }}>›</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 22px', borderTop:'1px solid var(--bor)' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>Annulla</button>
        </div>
      </div>
    </div>
  )
}

export default function FormCliente({ onClose, onSaved, cliente = null }) {
  const isEdit  = !!cliente
  const [step,    setStep]    = useState(isEdit ? 'form' : 'tipo')
  const [editing, setEditing] = useState(!isEdit)

  const [form, setForm] = useState({
    nome:      cliente?.nome      ?? '',
    nickname:  cliente?.nickname  ?? '',
    tipo:      cliente?.tipo      ?? 'studio',
    indirizzo: cliente?.indirizzo ?? '',
    cap:       cliente?.cap       ?? '',
    citta:     cliente?.citta     ?? '',
    provincia: cliente?.provincia ?? '',
    telefono:  cliente?.telefono  ?? '',
    email:     cliente?.email     ?? '',
    piva:      cliente?.piva      ?? '',
    cf:        cliente?.cf        ?? '',
    pec:       cliente?.pec       ?? '',
    sdi:       cliente?.sdi       ?? '',
    note:      cliente?.note      ?? '',
    inattivo:  cliente?.inattivo  ?? false,
  })

  const [saving,   setSaving]   = useState(false)
  const [errore,   setErrore]   = useState('')
  const [conferma, setConferma] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function scegliTipo(t) {
    setForm(f => ({ ...f, tipo: t }))
    setStep('form')
  }

  async function salva() {
    if (!form.nome)      { setErrore('Il nome / ragione sociale è obbligatorio'); return }
    if (!form.indirizzo) { setErrore("L'indirizzo è obbligatorio"); return }
    if (!form.citta)     { setErrore('La città è obbligatoria'); return }
    if (!form.provincia) { setErrore('La provincia è obbligatoria'); return }
    if (!form.cap)       { setErrore('Il CAP è obbligatorio'); return }
    if (!form.piva)      { setErrore('La Partita IVA è obbligatoria'); return }
    if (!form.cf)        { setErrore('Il Codice Fiscale è obbligatorio'); return }
    if (!form.pec && !form.sdi) { setErrore('Inserisci almeno PEC o Codice SDI (usa 0000000 se non disponibile)'); return }
    setSaving(true); setErrore('')
    try {
      const url    = isEdit ? `/api/clienti/${cliente.id}` : '/api/clienti'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await apiFetch(`${url}`, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      onSaved(); onClose()
    } catch {
      setErrore('Errore durante il salvataggio. Riprova.')
      setSaving(false)
    }
  }

  async function elimina() {
    setDeleting(true)
    try {
      await apiFetch(`/api/clienti/${cliente.id}`, { method: 'DELETE' })
      onSaved(); onClose()
    } catch {
      setErrore("Errore durante l'eliminazione.")
      setDeleting(false)
    }
  }

  const tipoInfo = TIPI.find(t => t.id === form.tipo) || TIPI[0]
  const iniziali = form.nome.trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('')

  if (step === 'tipo') return <SelettoreTipo onScegliTipo={scegliTipo} onClose={onClose} />

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--sur)', borderRadius:'14px', width:'580px', maxWidth:'95vw', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(15,23,42,.22)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--bor)', display:'flex', alignItems:'center', gap:'12px' }}>
          {!isEdit && (
            <button onClick={() => setStep('tipo')} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', border:'1px solid var(--bor)', background:'var(--sur2)', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)', flexShrink:0 }}>
              Tipo
            </button>
          )}
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: tipoInfo.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:700, flexShrink:0 }}>
            {iniziali || tipoInfo.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'15px', fontWeight:700 }}>{isEdit ? (editing ? 'Modifica cliente' : cliente.nome) : '+ Nuovo cliente'}</div>
            <div style={{ fontSize:'11px', color: tipoInfo.color, fontWeight:600 }}>{tipoInfo.label}</div>
          </div>

          {/* Toggle inattivo */}
          {(editing || isEdit) && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
              <span style={{ fontSize:'11px', fontWeight:600, color: form.inattivo ? 'var(--red)' : 'var(--tx3)' }}>
                {form.inattivo ? 'Inattivo' : 'Attivo'}
              </span>
              {editing ? (
                <div
                  onClick={() => set('inattivo', !form.inattivo)}
                  style={{
                    width:'36px', height:'20px', borderRadius:'10px', cursor:'pointer',
                    background: form.inattivo ? 'var(--red)' : 'var(--bor)',
                    position:'relative', transition:'background .2s', flexShrink:0,
                  }}
                >
                  <div style={{
                    position:'absolute', top:'2px',
                    left: form.inattivo ? '18px' : '2px',
                    width:'16px', height:'16px', borderRadius:'50%',
                    background:'#fff', transition:'left .2s',
                    boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                  }} />
                </div>
              ) : (
                <div style={{
                  width:'36px', height:'20px', borderRadius:'10px',
                  background: form.inattivo ? 'var(--red)' : 'var(--bor)',
                  position:'relative', flexShrink:0, opacity:.6,
                }}>
                  <div style={{
                    position:'absolute', top:'2px',
                    left: form.inattivo ? '18px' : '2px',
                    width:'16px', height:'16px', borderRadius:'50%',
                    background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                  }} />
                </div>
              )}
            </div>
          )}

          {isEdit && !editing && (
            <button onClick={() => setEditing(true)} style={{ padding:'5px 12px', border:'1px solid var(--accent)', background:'var(--accent-l)', color:'var(--accent)', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
              Modifica
            </button>
          )}
          {isEdit && editing && (
            <button onClick={() => setConferma(true)} style={{ padding:'5px 12px', border:'1px solid var(--red)', background:'var(--redb)', color:'var(--red)', borderRadius:'7px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
              Elimina
            </button>
          )}
          <button onClick={onClose} style={{ width:'28px', height:'28px', border:'1px solid var(--bor)', background:'none', borderRadius:'7px', cursor:'pointer', fontSize:'18px', color:'var(--tx3)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Corpo */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:'14px' }}>

          {conferma && (
            <div style={{ background:'var(--redb)', border:'1px solid #fecaca', borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--red)', marginBottom:'6px' }}>Conferma eliminazione</div>
              <div style={{ fontSize:'12px', color:'var(--tx2)', marginBottom:'10px' }}>Stai per eliminare <strong>{cliente.nome}</strong>. Azione irreversibile.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setConferma(false)} style={{ flex:1, padding:'7px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'7px', fontSize:'12px', cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>Annulla</button>
                <button onClick={elimina} disabled={deleting} style={{ flex:1, padding:'7px', border:'none', background:'var(--red)', color:'#fff', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif' }}>
                  {deleting ? 'Eliminazione...' : 'Si, elimina'}
                </button>
              </div>
            </div>
          )}

          {errore && (
            <div style={{ background:'var(--redb)', border:'1px solid var(--red)', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', color:'var(--red)' }}>{errore}</div>
          )}

          {isEdit && !editing && (
            <div style={{ background:'var(--accent-l)', borderRadius:'10px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'20px' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:'var(--accent)' }}>{Number(cliente.num_in_corso) || 0}</div>
                <div style={{ fontSize:'10px', color:'var(--accent)', fontWeight:600 }}>in corso</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:'var(--tx2)' }}>{Number(cliente.num_terminati) || 0}</div>
                <div style={{ fontSize:'10px', color:'var(--tx3)', fontWeight:600 }}>terminati</div>
              </div>
              {form.inattivo && (
                <div style={{ marginLeft:'auto', background:'var(--redb)', border:'1px solid var(--red)', borderRadius:'8px', padding:'4px 12px', fontSize:'11px', fontWeight:700, color:'var(--red)' }}>
                  Cliente inattivo
                </div>
              )}
            </div>
          )}

          <Campo label="Nome / Ragione Sociale" required value={form.nome} editing={editing} onChange={v => set('nome', v)} placeholder="Es. Studio Rossi Mario" />
          <Campo label="Nickname" value={form.nickname} editing={editing} onChange={v => set('nickname', v)} placeholder="Es. Rossi" />

          <div style={divider} />
          <div style={{ ...sec, color: tipoInfo.color }}>Indirizzo</div>

          <Campo label="Via / Piazza" required value={form.indirizzo} editing={editing} onChange={v => set('indirizzo', v)} placeholder="Es. Via Roma 14" />

          <div style={{ display:'flex', gap:'12px' }}>
            <div style={{ ...fd, flex:2 }}>
              <Campo label="Città" required value={form.citta} editing={editing} onChange={v => set('citta', v)} placeholder="Es. Torino" />
            </div>
            <div style={{ ...fd, flex:'0 0 70px' }}>
              <Campo label="Prov." required value={form.provincia} editing={editing} onChange={v => set('provincia', v.toUpperCase().slice(0,2))} placeholder="Es. TO" />
            </div>
            <div style={{ ...fd, flex:'0 0 90px' }}>
              <Campo label="CAP" required value={form.cap} editing={editing} onChange={v => set('cap', v)} placeholder="Es. 10123" />
            </div>
          </div>

          <div style={divider} />
          <div style={{ ...sec, color: tipoInfo.color }}>Contatti</div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="Telefono" value={form.telefono} editing={editing} onChange={v => set('telefono', v)} placeholder="Es. 011 123 4567" />
            <Campo label="Email" value={form.email} editing={editing} onChange={v => set('email', v)} placeholder="Es. rossi@studio.it" />
          </div>

          <div style={divider} />
          <div style={{ ...sec, color: tipoInfo.color }}>Dati fiscali</div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="Partita IVA" required value={form.piva} editing={editing} onChange={v => set('piva', v)} placeholder="Es. IT12345678901" />
            <Campo label="Codice Fiscale" required value={form.cf} editing={editing} onChange={v => set('cf', v)} placeholder="Codice fiscale" />
          </div>

          <div style={{ display:'flex', gap:'12px' }}>
            <Campo label="PEC" note="(almeno uno tra PEC e SDI)" value={form.pec} editing={editing} onChange={v => set('pec', v)} placeholder="Es. rossi@pec.it" />
            <Campo label="Codice SDI" note="(usa 0000000 se non disponibile)" value={form.sdi} editing={editing} onChange={v => set('sdi', v)} placeholder="Es. ABC1234" />
          </div>

          <div style={divider} />

          <div style={fd}>
            <label style={lbl}>Note</label>
            {editing ? (
              <textarea
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Note sul cliente..."
                rows={4}
                style={{ ...inp, height:'auto', padding:'8px 11px', resize:'vertical', lineHeight:1.5 }}
              />
            ) : (
              <div style={{ fontSize:'12px', color: form.note ? 'var(--tx)' : 'var(--tx3)', padding:'4px 0', minHeight:'20px', whiteSpace:'pre-wrap' }}>
                {form.note || '—'}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        {editing && (
          <div style={{ padding:'14px 22px', borderTop:'1px solid var(--bor)', display:'flex', gap:'8px' }}>
            <button onClick={() => isEdit ? setEditing(false) : onClose()} style={{ flex:1, padding:'9px', border:'1px solid var(--bor)', background:'var(--sur)', borderRadius:'8px', fontSize:'12px', fontWeight:500, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', color:'var(--tx2)' }}>
              {isEdit ? 'Annulla modifiche' : 'Annulla'}
            </button>
            <button onClick={salva} disabled={saving} style={{ flex:2, padding:'9px', border:'none', background:'var(--accent)', color:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'Instrument Sans, sans-serif', boxShadow:'0 2px 8px rgba(2,132,199,.3)', opacity: saving ? .7 : 1 }}>
              {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Salva cliente'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}