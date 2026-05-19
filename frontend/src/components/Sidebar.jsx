import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

function NavItem({ icon, label, badge, badgeType = 'b', active, onClick, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false)

  const badgeColors = {
    b: { background:'var(--accent)', color:'#fff' },
    r: { background:'var(--red)', color:'#fff' },
    o: { background:'var(--ora)', color:'#fff' },
    m: { background:'var(--sur3)', color:'var(--tx3)' },
  }

  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:'9px', padding:'7px 16px',
      cursor:'pointer', fontSize:'12.5px', position:'relative',
      color: active ? 'var(--accent)' : 'var(--tx2)',
      fontWeight: active ? 600 : 400,
      background: active ? 'var(--accent-l)' : 'transparent',
    }}>
      {active && <div style={{ position:'absolute', left:0, top:'4px', bottom:'4px', width:'3px', background:'var(--accent)', borderRadius:'0 3px 3px 0' }} />}
      <span style={{ fontSize:'14px', width:'16px', textAlign:'center', flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {badge > 0 && (
        <span
          onMouseEnter={e => { e.stopPropagation(); if (tooltip) setShowTooltip(true) }}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ minWidth:'18px', height:'18px', borderRadius:'9px', padding:'0 5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, ...badgeColors[badgeType] }}
        >
          {badge}
        </span>
      )}

      {showTooltip && tooltip && (
        <div style={{
          position:'fixed', left:'236px', zIndex:500,
          background:'var(--sur)', border:'1px solid var(--bor)',
          borderRadius:'10px', padding:'12px 14px', minWidth:'190px',
          boxShadow:'0 8px 24px rgba(15,23,42,.15)', pointerEvents:'none',
        }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'var(--tx3)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:'8px' }}>
            Clienti per tipo
          </div>
          {tooltip.map(r => (
            <div key={r.tipo} style={{ marginBottom:'8px' }}>
              <div style={{ fontSize:'11px', fontWeight:600, color:'var(--tx2)', marginBottom:'3px' }}>{r.label}</div>
              <div style={{ display:'flex', gap:'6px' }}>
                <span style={{ fontSize:'11px', fontWeight:600, color:'var(--grn)', background:'var(--grnb)', padding:'1px 8px', borderRadius:'4px' }}>
                  Attivi {r.attivi}
                </span>
                <span style={{ fontSize:'11px', fontWeight:600, color:'var(--red)', background:'var(--redb)', padding:'1px 8px', borderRadius:'4px' }}>
                  Inattivi {r.inattivi}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ active, onNav, contatori = {} }) {
  const { utente, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const tooltipClienti = [
    { tipo:'studio',  label:'Studi dentistici', ...(contatori.clientiPerTipo?.studio  || { attivi:0, inattivi:0 }) },
    { tipo:'lab',     label:'Laboratori',        ...(contatori.clientiPerTipo?.lab     || { attivi:0, inattivi:0 }) },
    { tipo:'azienda', label:'Aziende',           ...(contatori.clientiPerTipo?.azienda || { attivi:0, inattivi:0 }) },
  ]

  const nomeLabel = utente?.nome || utente?.email || 'Utente'
  const iniziali = nomeLabel.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // Chiudi menu se si clicca fuori
  useEffect(() => {
    if (!showMenu) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <aside style={{ width:'224px', background:'var(--sur)', borderRight:'1px solid var(--bor)', display:'flex', flexDirection:'column', flexShrink:0, height:'100vh' }}>

      {/* Logo */}
      <div style={{ padding:'0 16px', height:'54px', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid var(--bor)' }}>
        <div style={{ width:'30px', height:'30px', background:'var(--accent)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', boxShadow:'0 2px 8px rgba(2,132,199,.3)', flexShrink:0 }}>🦷</div>
        <span style={{ fontSize:'15px', fontWeight:700, letterSpacing:'-.4px' }}>Il Dente</span>
        <span style={{ marginLeft:'auto', fontFamily:'JetBrains Mono, monospace', fontSize:'9px', background:'var(--accent-l)', color:'var(--accent)', padding:'2px 6px', borderRadius:'4px' }}>v0.1</span>
      </div>

      {/* Lavori */}
      <div style={{ padding:'8px 0', borderBottom:'1px solid var(--borl)' }}>
        <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.9px', textTransform:'uppercase', color:'var(--tx4)', padding:'5px 16px 3px' }}>Lavori</div>
        <NavItem icon="📅" label="Calendario"  active={active==='cal'}    onClick={()=>onNav('cal')} />
        <NavItem icon="📋" label="Giorno"       active={active==='giorno'} onClick={()=>onNav('giorno')} />
        <NavItem icon="☰"  label="Lista lavori" active={active==='list'}   onClick={()=>onNav('list')} badge={contatori.attivi} badgeType="b" />
      </div>

      {/* Gestione */}
      <div style={{ padding:'8px 0', borderBottom:'1px solid var(--borl)' }}>
        <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.9px', textTransform:'uppercase', color:'var(--tx4)', padding:'5px 16px 3px' }}>Gestione</div>
        <NavItem icon="👥" label="Clienti"      active={active==='clienti'} onClick={()=>onNav('clienti')} badge={contatori.clienti} badgeType="m" tooltip={tooltipClienti} />
        <NavItem icon="💶" label="Listini"       active={active==='listini'} onClick={()=>onNav('listini')} />
        <NavItem icon="🧾" label="Conti mensili" active={active==='conti'}   onClick={()=>onNav('conti')} />
        <NavItem icon="📋" label="Fatture"       active={active==='fatture'} onClick={()=>onNav('fatture')} />
      </div>

      {/* Archivio */}
      <div style={{ padding:'8px 0', borderBottom:'1px solid var(--borl)' }}>
        <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.9px', textTransform:'uppercase', color:'var(--tx4)', padding:'5px 16px 3px' }}>Archivio</div>
        <NavItem icon="✅"  label="Terminati"   active={active==='terminati'} onClick={()=>onNav('terminati')} />
        <NavItem icon="🗂️" label="Google Drive" active={active==='drive'}     onClick={()=>onNav('drive')} />
      </div>

      {/* Bottom */}
      <div style={{ marginTop:'auto', borderTop:'1px solid var(--bor)', padding:'8px 0' }}>
        <NavItem icon="⚙️" label="Impostazioni" active={active==='settings'} onClick={()=>onNav('settings')} />

        {/* Utente + menu */}
        <div ref={menuRef} style={{ position:'relative' }}>

          {/* Menu popup */}
          {showMenu && (
            <div style={{
              position:'absolute', bottom:'calc(100% + 4px)', left:'12px', right:'12px',
              background:'var(--sur)', border:'1px solid var(--bor)',
              borderRadius:'10px', boxShadow:'0 8px 24px rgba(15,23,42,.15)',
              overflow:'hidden', zIndex:200,
            }}>
              <div
                onClick={() => { setShowMenu(false); onNav('account') }}
                style={{
                  padding:'10px 14px', cursor:'pointer', fontSize:'13px',
                  color:'var(--tx1)', fontWeight:500,
                  display:'flex', alignItems:'center', gap:'8px',
                  borderBottom:'1px solid var(--borl)',
                }}
              >
                <span>👤</span> Modifica account
              </div>
              <div
                onClick={() => { setShowMenu(false); logout() }}
                style={{
                  padding:'10px 14px', cursor:'pointer', fontSize:'13px',
                  color:'var(--red)', fontWeight:600,
                  display:'flex', alignItems:'center', gap:'8px',
                }}
              >
                <span>🚪</span> Esci
              </div>
            </div>
          )}

          {/* Avatar */}
          <div
            onClick={() => setShowMenu(m => !m)}
            style={{ display:'flex', alignItems:'center', gap:'9px', padding:'8px 16px', cursor:'pointer' }}
          >
            <div style={{ width:'28px', height:'28px', background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px', fontWeight:700, flexShrink:0 }}>
              {iniziali}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {nomeLabel}
              </div>
              <div style={{ fontSize:'10px', color:'var(--tx3)' }}>
                {utente?.tipo === 'superadmin' ? 'Super Admin' : 'Admin'}
              </div>
            </div>
            <span style={{ fontSize:'10px', color:'var(--tx3)' }}>{showMenu ? '▼' : '▲'}</span>
          </div>

        </div>
      </div>
    </aside>
  )
}