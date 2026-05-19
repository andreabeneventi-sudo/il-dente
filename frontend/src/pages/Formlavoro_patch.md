# Patch FormLavoro.jsx — supporto mobile

## Modifica 1: aggiungi prop isMobile

Riga 1 della funzione (cerca):
  export default function FormLavoro({ onClose, onSaved, lavoro, precompilato, onEspandi })

Sostituisci con:
  export default function FormLavoro({ onClose, onSaved, lavoro, precompilato, onEspandi, isMobile = false })


## Modifica 2: wrapper modale fluid su mobile

Cerca queste due righe (intorno alla riga 531-537):
  <div onClick={e => e.stopPropagation()} style={{
    background:'var(--sur)', borderRadius:'14px',
    width: pannelloPDF ? '960px' : '580px',
    maxWidth:'97vw', maxHeight:'92vh',
    display:'flex', flexDirection:'row',
    boxShadow:'0 24px 64px rgba(15,23,42,.22)', overflow:'hidden',
    transition:'width .3s ease',
  }}>

Sostituisci con:
  <div onClick={e => e.stopPropagation()} style={{
    background:'var(--sur)',
    borderRadius: isMobile ? '16px 16px 0 0' : '14px',
    width: isMobile ? '100%' : pannelloPDF ? '960px' : '580px',
    maxWidth: isMobile ? '100%' : '97vw',
    maxHeight: isMobile ? '92vh' : '92vh',
    display:'flex', flexDirection:'row',
    boxShadow:'0 24px 64px rgba(15,23,42,.22)', overflow:'hidden',
    transition:'width .3s ease',
    ...(isMobile ? { position:'absolute', bottom:0, left:0, right:0 } : {}),
  }}>


## Modifica 3: overlay allineato in basso su mobile

Cerca la riga (intorno a 530):
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>

Sostituisci con:
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:100, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}>