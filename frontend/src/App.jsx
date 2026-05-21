import { apiFetch } from './utils/apiFetch'
import './App.css'
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Calendario from './pages/Calendario'
import CalendarioMese from './pages/CalendarioMese'
import Giorno from './pages/Giorno'
import Lista from './pages/Lista'
import FormLavoro from './components/FormLavoro'
import Clienti from './pages/Clienti'
import Impostazioni from './pages/Impostazioni'
import PaginaLavoro from './pages/PaginaLavoro'
import Login from './pages/Login'
import Registrazione from './pages/Registrazione'
import VerificaEmail from './pages/VerificaEmail'
import ModificaAccount from './pages/ModificaAccount'

// ── Hook: rileva se siamo su mobile (< 768px) ─────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── App principale (solo se autenticato) ─────────────────────────────────────
function AppInterna() {
  const { token, logout } = useAuth()
  const isMobile = useIsMobile()

  const [active, setActive] = useState('cal')
  const [offsetSettimana, setOffsetSettimana] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [lavoroSelezionato, setLavoroSelezionato] = useState(null)
  const [lavoroPrecompilato, setLavoroPrecompilato] = useState(null)
  const [lavoroEspanso, setLavoroEspanso] = useState(null)
  const [paginaPrecedente, setPaginaPrecedente] = useState('cal')
  const [giornoRitorno, setGiornoRitorno] = useState(null) // idx giorno da ripristinare su Giorno
  const [refreshKey, setRefreshKey] = useState(0)
  const [contatori, setContatori] = useState({ attivi:0, inRitardo:0, urgenti:0, clienti:0 })
  const [formSalva, setFormSalva] = useState(null) // { salva, saving, hasChanges } esposto da FormLavoro

  // Su mobile, se l'utente era sulla vista settimanale, portalo sulla mensile
  useEffect(() => {
    if (isMobile && active === 'cal') setActive('mese')
  }, [isMobile])

  function caricaContatori() {
    apiFetch('/api/contatori', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setContatori(data))
      .catch(() => {})
  }

  useEffect(() => { caricaContatori() }, [refreshKey])

  // Auto-refresh ogni 30 secondi — aggiorna tutti i dispositivi
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  function apriNuovo() {
    setLavoroSelezionato(null)
    setLavoroPrecompilato(null)
    setShowForm(true)
  }

  function apriNuovoPrecompilato(dati) {
    setLavoroSelezionato(null)
    setLavoroPrecompilato(dati)
    setShowForm(true)
  }

  function apriModifica(lavoro) {
    if (isMobile) {
      // Su mobile: apre direttamente la pagina lavoro completa
      apriPagina(lavoro)
    } else {
      setLavoroSelezionato(lavoro)
      setLavoroPrecompilato(null)
      setShowForm(true)
    }
  }

  function apriPagina(lavoro) {
    setPaginaPrecedente(active)
    if (lavoro?.data_inizio) {
      const d = new Date(lavoro.data_inizio.replace(' ', 'T'))
      const dow = d.getDay()
      const idx = dow === 0 ? 5 : dow - 1
      setGiornoRitorno(idx)
    } else {
      setGiornoRitorno(null)
    }
    setLavoroEspanso(lavoro)
    setActive('pagina-lavoro')
    setShowForm(false)
  }

  function tornaDaPagina() {
    setLavoroEspanso(null)
    setActive(paginaPrecedente)
  }

  function chiudiForm() {
    setShowForm(false)
    setLavoroSelezionato(null)
    setLavoroPrecompilato(null)
  }

  function onSaved() {
    setRefreshKey(k => k + 1)
  }

  function renderPage() {
    switch(active) {
      case 'account': return <ModificaAccount />
      case 'pagina-lavoro': return (
        <PaginaLavoro
          lavoro={lavoroEspanso}
          onTorna={tornaDaPagina}
          onSaved={onSaved}
          isMobile={isMobile}
        />
      )
      case 'mese': return (
        <CalendarioMese
          refreshKey={refreshKey}
          onEventoClick={apriModifica}
          isMobile={isMobile}
          onNavGiorno={() => setActive('giorno')}
        />
      )
      case 'cal': return (
        <Calendario
          offsetSettimana={offsetSettimana}
          refreshKey={refreshKey}
          onEventoClick={apriModifica}
          onNuovoClick={apriNuovoPrecompilato}
        />
      )
      case 'giorno': return (
        <Giorno
          offsetSettimana={offsetSettimana}
          initialDIdx={giornoRitorno}
          refreshKey={refreshKey}
          onEventoClick={apriModifica}
          onOffsetChange={setOffsetSettimana}
          onNuovoPrecompilato={apriNuovoPrecompilato}
        />
      )
      case 'list': return (
        <Lista
          onEventoClick={apriModifica}
          refreshKey={refreshKey}
        />
      )
      case 'clienti': return <Clienti onSaved={onSaved} />
      case 'settings': return <Impostazioni />
      default: return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', color:'var(--tx3)' }}>
          <span style={{ fontSize:'48px' }}>🦷</span>
          <span style={{ fontSize:'16px', fontWeight:600, color:'var(--tx2)' }}>Sezione in costruzione</span>
          <span style={{ fontSize:'13px' }}>Questa vista verrà costruita nei prossimi step</span>
        </div>
      )
    }
  }

  // Vista corrente mobile: le 3 voci della bottom bar
  const isMobileCalView = active === 'mese' || active === 'giorno' || active === 'list'

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* Sidebar solo su desktop */}
      {!isMobile && (
        <Sidebar active={active} onNav={setActive} contatori={contatori} onLogout={logout} />
      )}

      <main style={{
        flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
        // Su mobile lascia spazio alla bottom bar
        paddingBottom: isMobile ? '56px' : '0',
      }}>
        <Topbar
          active={active}
          onNav={setActive}
          offsetSettimana={offsetSettimana}
          onPrev={() => setOffsetSettimana(o => o - 1)}
          onNext={() => setOffsetSettimana(o => o + 1)}
          onOggi={() => setOffsetSettimana(0)}
          onAggiungi={apriNuovo}
          onApriLavoro={apriModifica}
          refreshKey={refreshKey}
          isMobile={isMobile}
        />
        {renderPage()}
      </main>

      {/* Bottom navigation — solo mobile */}
      {isMobile && (
        <nav style={{
          position:'fixed', bottom:0, left:0, right:0, height:'56px',
          background:'var(--sur)', borderTop:'1px solid var(--bor)',
          display:'flex', alignItems:'stretch',
          zIndex:300,
          // Safe area per iPhone (notch in basso)
          paddingBottom:'env(safe-area-inset-bottom)',
        }}>
          {[
            { id:'mese',   icon:'📅', label:'Mese'  },
            { id:'giorno', icon:'📋', label:'Giorno' },
            { id:'list',   icon:'☰',  label:'Lista'  },
          ].map(tab => {
            const isOn = active === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                style={{
                  flex:1, border:'none', background:'none', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2px',
                  color: isOn ? 'var(--accent)' : 'var(--tx3)',
                  fontFamily:'Instrument Sans, sans-serif',
                  transition:'color .12s',
                }}
              >
                <span style={{ fontSize:'20px', lineHeight:1 }}>{tab.icon}</span>
                <span style={{ fontSize:'10px', fontWeight: isOn ? 700 : 500, letterSpacing:'.2px' }}>{tab.label}</span>
                {isOn && (
                  <div style={{ position:'absolute', top:0, width:'32px', height:'2px', background:'var(--accent)', borderRadius:'0 0 2px 2px' }} />
                )}
              </button>
            )
          })}
        </nav>
      )}

      {/* FAB mobile — "+" oppure "Salva" quando il form è aperto */}
      {isMobile && (isMobileCalView || showForm) && (
        <button
          onClick={() => {
            if (showForm && formSalva) {
              formSalva.salva()
            } else {
              apriNuovo()
            }
          }}
          style={{
            position:'fixed', bottom:'calc(56px + 16px + env(safe-area-inset-bottom))', right:'20px',
            width:'52px', height:'52px', borderRadius:'50%',
            background: showForm && formSalva && !formSalva.hasChanges ? 'var(--tx3)' : 'var(--accent)',
            color:'#fff', border:'none',
            fontSize: showForm ? '20px' : '26px', lineHeight:1, cursor:'pointer',
            boxShadow:'0 4px 20px rgba(2,132,199,.45)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:299, transition:'all .15s',
            opacity: showForm && formSalva?.saving ? 0.6 : 1,
          }}
        >
          {showForm ? (formSalva?.saving ? '...' : '✓') : '+'}
        </button>
      )}

      {showForm && (
        <FormLavoro
          onClose={chiudiForm}
          onSaved={onSaved}
          lavoro={lavoroSelezionato}
          precompilato={lavoroPrecompilato}
          onEspandi={apriPagina}
          isMobile={isMobile}
          onSalvaReady={setFormSalva}
        />
      )}
    </div>
  )
}

// ── Route protetta ────────────────────────────────────────────────────────────
function RoutaProtetta({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrazione" element={<Registrazione />} />
          <Route path="/verifica-email" element={<VerificaEmail />} />
          <Route path="/*" element={
            <RoutaProtetta>
              <AppInterna />
            </RoutaProtetta>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}