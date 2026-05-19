export default function OraInput({ value, onChange }) {
  const ORE = Array.from({ length: 14 }, (_, i) => String(i + 7).padStart(2, '0'))
  const MINUTI = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  const ora = value ? value.split(':')[0] : ''
  const min = value ? value.split(':')[1] : '00'

  const base = {
    border: '1px solid var(--bor)', borderRadius: '8px',
    fontSize: '12px', fontFamily: 'Instrument Sans, sans-serif',
    background: 'var(--sur2)', outline: 'none', color: 'var(--tx)',
    height: '36px', boxSizing: 'border-box', cursor: 'pointer',
    appearance: 'auto',
  }

  function setOra(nuovaOra) {
    onChange(`${nuovaOra}:${min || '00'}`)
  }

  function setMin(nuoviMin) {
    onChange(`${ora || '07'}:${nuoviMin}`)
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <select
        value={ora}
        onChange={e => setOra(e.target.value)}
        style={{ ...base, width: '72px', padding: '0 6px' }}
      >
        <option value="">--</option>
        {ORE.map(h => <option key={h} value={h}>{h}</option>)}
      </select>

      <span style={{ fontSize: '13px', color: 'var(--tx3)', fontWeight: 700 }}>:</span>

      <select
        value={min}
        onChange={e => setMin(e.target.value)}
        style={{ ...base, width: '72px', padding: '0 6px' }}
      >
        {MINUTI.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}