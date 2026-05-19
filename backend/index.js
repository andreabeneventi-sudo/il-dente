const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');
types.setTypeParser(1114, str => str);
require('dotenv').config();

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiami_in_produzione'

// ── MIDDLEWARE AUTENTICAZIONE ─────────────────────────────────────────────────
function autenticaJWT(req, res, next) {
  const auth = req.headers['authorization']
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ errore: 'Token mancante' })

  const token = auth.split(' ')[1]
  try {
    req.utente = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ errore: 'Token non valido o scaduto' })
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Errore connessione database:', err.message);
  } else {
    console.log('✅ Database connesso!');
    release();
  }
});

// ── ROUTE PUBBLICHE (no auth) ─────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ messaggio: 'Il Dente API funziona! 🦷' });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as ora');
    res.json({ database: 'connesso ✅', ora: result.rows[0].ora });
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

// ── ROUTE PROTETTE ────────────────────────────────────────────────────────────

app.get('/api/lavori', autenticaJWT, async (req, res) => {
  try {
    const { dal, al } = req.query;
    const result = await pool.query(
      `SELECT l.*, 
        COALESCE(c.nickname, c.nome) as cliente_display,
        c.nome as cliente_nome,
        c.nickname as cliente_nickname
       FROM lavori l
       LEFT JOIN clienti c ON l.cliente_id = c.id
       WHERE l.data_inizio >= $1 AND l.data_inizio <= $2
       ORDER BY l.data_inizio ASC`,
      [dal, al]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.get('/api/lavori/tutti', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, 
        COALESCE(c.nickname, c.nome) as cliente_display,
        c.nome as cliente_nome,
        c.nickname as cliente_nickname
       FROM lavori l
       LEFT JOIN clienti c ON l.cliente_id = c.id
       ORDER BY l.data_inizio ASC NULLS FIRST`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.get('/api/lavori/:id/pdf-storico', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT id, versione, creato_il FROM pdf_storico
       WHERE lavoro_id = $1
       ORDER BY versione DESC
       LIMIT 10`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/pdf-storico/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT pdf_data FROM pdf_storico WHERE id = $1',
      [id]
    )
    if (result.rows.length === 0) return res.status(404).json({ errore: 'Non trovato' })
    res.json({ pdf_data: result.rows[0].pdf_data })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/lavori/:id/pdf-storico', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const { pdf_data } = req.body

    const ver = await pool.query(
      'SELECT COALESCE(MAX(versione), 0) + 1 as prossima FROM pdf_storico WHERE lavoro_id = $1',
      [id]
    )
    const versione = ver.rows[0].prossima

    const result = await pool.query(
      `INSERT INTO pdf_storico (lavoro_id, versione, pdf_data)
       VALUES ($1, $2, $3) RETURNING id, versione, creato_il`,
      [id, versione, pdf_data]
    )

    ;(async () => {
      try {
        const lavoroRes = await pool.query(
          `SELECT l.*, COALESCE(c.nickname, c.nome) as cliente_display
           FROM lavori l LEFT JOIN clienti c ON l.cliente_id = c.id
           WHERE l.id = $1`, [id]
        )
        if (lavoroRes.rows.length === 0) return
        const lavoro = lavoroRes.rows[0]
        if (!lavoro.google_drive_folder_pdf_id) return

        const drive = await getAuthenticatedDrive()
        if (!drive) return

        const sanitizeNome = s => (s || '').replace(/[^a-zA-Z0-9À-ÿ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
        const nomeFile = `${sanitizeNome(lavoro.cliente_display)}_${sanitizeNome(lavoro.paziente)}_${sanitizeNome(lavoro.codice)}_V${versione}.pdf`

        const pdfBuffer = Buffer.from(pdf_data, 'base64')
        const stream = Readable.from(pdfBuffer)

        await drive.files.create({
          requestBody: { name: nomeFile, parents: [lavoro.google_drive_folder_pdf_id] },
          media: { mimeType: 'application/pdf', body: stream },
        })
        console.log(`✅ PDF caricato su Drive: ${nomeFile}`)
      } catch (e) {
        console.error('❌ Errore upload PDF Drive:', e.message)
      }
    })()

    res.json(result.rows[0])
  } catch (err) {
    console.error('❌ Errore salvataggio PDF storico:', err.message)
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/lavori', autenticaJWT, async (req, res) => {
  try {
    const { paziente, clinica, cliente_id, tipo, tinta, colore, data_inizio, data_fine, note, note_interne, elementi, tipo_record, data_ricezione, utente_id, multigiorno, stato_id } = req.body;
    let codice = null
    if (tipo_record !== 'evento') {
      codice = await generaCodice(data_ricezione || null)
    }
    const result = await pool.query(
      `INSERT INTO lavori (paziente, clinica, cliente_id, tipo, tinta, colore, data_inizio, data_fine, note, note_interne, elementi, tipo_record, codice, utente_id, multigiorno, stato_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [paziente, clinica, cliente_id || null, tipo, tinta || null, colore, data_inizio, data_fine || null, note || null, note_interne || null, elementi || null, tipo_record || 'lavoro', codice, utente_id || null, multigiorno ?? false, stato_id || null]
    );
    const lavoro = result.rows[0]
    console.log('🔔 Nuovo lavoro creato, avvio sync:', lavoro.id, lavoro.tipo_record)
    if (lavoro.tipo_record !== 'evento') {
      sincronizzaLavoro(lavoro)
      ensureDriveStructure(lavoro)
    } else {
      sincronizzaEvento(lavoro)
    }
    res.json(lavoro);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.put('/api/lavori/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { paziente, clinica, cliente_id, tipo, tinta, colore, data_inizio, data_fine, note, note_interne, elementi, tipo_record, terminato, utente_id, multigiorno, stato_id } = req.body;
    console.log('PUT lavori stato_id ricevuto:', stato_id, typeof stato_id)
    const statoIdInt = stato_id ? parseInt(stato_id, 10) : null
    const result = await pool.query(
      `UPDATE lavori SET paziente=$1, clinica=$2, cliente_id=$3, tipo=$4, tinta=$5, colore=$6,
      data_inizio=$7, data_fine=$8, note=$9, note_interne=$10, elementi=$11,
      tipo_record=$12, terminato=$13, aggiornato_il=NOW(), utente_id=$14, multigiorno=$15, stato_id=$16
      WHERE id=$17 RETURNING *`,
      [paziente, clinica, cliente_id || null, tipo, tinta || null, colore, data_inizio, data_fine || null, note || null, note_interne || null, elementi || null, tipo_record || 'lavoro', terminato ?? false, utente_id || null, multigiorno ?? false, statoIdInt, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ errore: 'Lavoro non trovato' });
    const lavoro = result.rows[0]
    salvaSnapshot(lavoro)
    if (lavoro.tipo_record !== 'evento') {
      sincronizzaLavoro(lavoro)
      ensureDriveStructure(lavoro)
    } else {
      sincronizzaEvento(lavoro)
    }
    res.json(lavoro);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.patch('/api/lavori/:id/terminato', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { terminato } = req.body;
    const result = await pool.query(
      'UPDATE lavori SET terminato=$1 WHERE id=$2 RETURNING *',
      [terminato, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.delete('/api/lavori/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const lavoro = await pool.query(
      'SELECT google_event_id, tipo_record, utente_id, google_drive_folder_id FROM lavori WHERE id=$1', [id]
    )
    await pool.query('DELETE FROM lavori WHERE id=$1', [id]);
    const row = lavoro.rows[0]
    if (row?.google_event_id) {
      if (row.tipo_record === 'evento') {
        eliminaEventoStaff(row.google_event_id, row.utente_id)
      } else {
        eliminaEventoCalendar(row.google_event_id)
      }
    }
    if (row?.google_drive_folder_id) {
      spostaCartellaNelCestino(row.google_drive_folder_id)
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.get('/api/clienti', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
        COUNT(l.id) FILTER (WHERE l.terminato = true) as num_terminati,
        COUNT(l.id) FILTER (WHERE l.terminato = false) as num_in_corso
       FROM clienti c
       LEFT JOIN lavori l ON l.cliente_id = c.id AND l.tipo_record != 'evento'
       GROUP BY c.id
       ORDER BY c.nome ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.post('/api/clienti', autenticaJWT, async (req, res) => {
  try {
    const { nome, nickname, tipo, indirizzo, cap, citta, provincia, telefono, email, piva, cf, pec, sdi, note, inattivo } = req.body;
    const result = await pool.query(
      `INSERT INTO clienti (nome, nickname, tipo, indirizzo, cap, citta, provincia, telefono, email, piva, cf, pec, sdi, note, inattivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [nome, nickname || null, tipo || 'studio', indirizzo || null, cap || null, citta || null, provincia || null, telefono || null, email || null, piva || null, cf || null, pec || null, sdi || null, note || null, inattivo ?? false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.put('/api/clienti/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, nickname, tipo, indirizzo, cap, citta, provincia, telefono, email, piva, cf, pec, sdi, note, inattivo } = req.body;
    const result = await pool.query(
      `UPDATE clienti SET nome=$1, nickname=$2, tipo=$3, indirizzo=$4, cap=$5, citta=$6, provincia=$7,
       telefono=$8, email=$9, piva=$10, cf=$11, pec=$12, sdi=$13, note=$14, inattivo=$15
       WHERE id=$16 RETURNING *`,
      [nome, nickname || null, tipo || 'studio', indirizzo || null, cap || null, citta || null, provincia || null, telefono || null, email || null, piva || null, cf || null, pec || null, sdi || null, note || null, inattivo ?? false, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.delete('/api/clienti/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM clienti WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.patch('/api/lavori/:id/stato', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { stato_id } = req.body;
    const result = await pool.query(
      'UPDATE lavori SET stato_id=$1, aggiornato_il=NOW() WHERE id=$2 RETURNING *',
      [stato_id || null, id]
    );
    const lavoro = result.rows[0]
    sincronizzaLavoro(lavoro)
    res.json(lavoro);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

app.get('/api/impostazioni', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT chiave, valore FROM impostazioni')
    const obj = {}
    result.rows.forEach(r => { obj[r.chiave] = r.valore })
    res.json(obj)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/impostazioni', autenticaJWT, async (req, res) => {
  try {
    const dati = req.body
    for (const [chiave, valore] of Object.entries(dati)) {
      await pool.query(
        `INSERT INTO impostazioni (chiave, valore) VALUES ($1, $2)
         ON CONFLICT (chiave) DO UPDATE SET valore = $2`,
        [chiave, valore ?? '']
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/impostazioni/logo', autenticaJWT, async (req, res) => {
  try {
    const { logo } = req.body
    await pool.query(
      `INSERT INTO impostazioni (chiave, valore) VALUES ('lab_logo', $1)
       ON CONFLICT (chiave) DO UPDATE SET valore = $1`,
      [logo]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/contatori', autenticaJWT, async (req, res) => {
  try {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    const [attivi, inRitardo, urgenti, clientiTotali, clientiPerTipo] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM lavori WHERE tipo_record = 'lavoro' AND terminato = false`),
      pool.query(`SELECT COUNT(*) FROM lavori WHERE tipo_record = 'lavoro' AND terminato = false AND data_inizio < $1`, [oggi.toISOString()]),
      pool.query(`SELECT COUNT(*) FROM lavori WHERE tipo_record = 'lavoro' AND terminato = false AND data_inizio >= $1 AND data_inizio < $2`, [oggi.toISOString(), new Date(oggi.getTime() + 5 * 86400000).toISOString()]),
      pool.query(`SELECT COUNT(*) FROM clienti WHERE inattivo = false OR inattivo IS NULL`),
      pool.query(`
        SELECT 
          tipo,
          COUNT(*) FILTER (WHERE inattivo = false OR inattivo IS NULL) as attivi,
          COUNT(*) FILTER (WHERE inattivo = true) as inattivi
        FROM clienti
        GROUP BY tipo
      `),
    ])

    const perTipo = {}
    clientiPerTipo.rows.forEach(r => {
      perTipo[r.tipo] = { attivi: Number(r.attivi), inattivi: Number(r.inattivi) }
    })

    res.json({
      attivi:    Number(attivi.rows[0].count),
      inRitardo: Number(inRitardo.rows[0].count),
      urgenti:   Number(urgenti.rows[0].count),
      clienti:   Number(clientiTotali.rows[0].count),
      clientiPerTipo: perTipo,
    })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/utenti-staff', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utenti_staff ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/utenti-staff', autenticaJWT, async (req, res) => {
  try {
    const { nome, colore } = req.body
    if (!nome) return res.status(400).json({ errore: 'Nome obbligatorio' })
    const result = await pool.query(
      'INSERT INTO utenti_staff (nome, colore) VALUES ($1, $2) RETURNING *',
      [nome, colore || '#0284C7']
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.put('/api/utenti-staff/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const { nome, colore, google_calendar_id } = req.body
    const result = await pool.query(
      'UPDATE utenti_staff SET nome=$1, colore=$2, google_calendar_id=$3 WHERE id=$4 RETURNING *',
      [nome, colore, google_calendar_id || null, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.delete('/api/utenti-staff/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM utenti_staff WHERE id=$1', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/stati-lavoro', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stati_lavoro ORDER BY ordine ASC, id ASC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/stati-lavoro', autenticaJWT, async (req, res) => {
  try {
    const { nome, colore, ordine, google_calendar_id } = req.body
    if (!nome) return res.status(400).json({ errore: 'Nome obbligatorio' })
    const result = await pool.query(
      `INSERT INTO stati_lavoro (nome, colore, ordine, google_calendar_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, colore || '#0284C7', ordine ?? 99, google_calendar_id || null]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.put('/api/stati-lavoro/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const { nome, colore, ordine, google_calendar_id } = req.body
    const result = await pool.query(
      `UPDATE stati_lavoro SET nome=$1, colore=$2, ordine=$3, google_calendar_id=$4
       WHERE id=$5 RETURNING *`,
      [nome, colore, ordine, google_calendar_id || null, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.delete('/api/stati-lavoro/:id', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM stati_lavoro WHERE id=$1', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/lavori/:id/storico', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT s.*, sl.nome as stato_nome, sl.colore as stato_colore
       FROM lavori_storico s
       LEFT JOIN stati_lavoro sl ON s.stato_id = sl.id
       WHERE s.lavoro_id = $1
       ORDER BY s.versione DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// ── Email ─────────────────────────────────────────────────
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

app.post('/api/email/invia-pdf', autenticaJWT, async (req, res) => {
  try {
    const { destinatari, oggetto, pdf_base64, nome_file } = req.body

    const { data, error } = await resend.emails.send({
      from: 'Il Dente <onboarding@resend.dev>',
      to: destinatari,
      subject: oggetto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>In allegato il documento relativo al lavoro richiesto.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            Questo messaggio è stato inviato automaticamente da Il Dente Gestionale.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: nome_file,
          content: pdf_base64,
        }
      ]
    })

    if (error) return res.status(400).json({ errore: error.message })
    res.json({ ok: true, id: data.id })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// ── GOOGLE CALENDAR AUTH ──────────────────────────────────────────────────────
const { google } = require('googleapis')

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

app.get('/api/google/auth-url', autenticaJWT, async (req, res) => {
  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive',
    ],
  })
  res.json({ url })
})

// Callback Google — pubblica perché è Google che ci reindirizza
app.get('/api/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Codice mancante')

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    await pool.query(
      `INSERT INTO impostazioni (chiave, valore) VALUES ($1, $2)
       ON CONFLICT (chiave) DO UPDATE SET valore = $2`,
      ['google_tokens', JSON.stringify(tokens)]
    )

    res.send(`
      <script>
        window.opener?.postMessage('google-auth-success', '*');
        window.close();
      </script>
      <p>Autenticazione completata. Puoi chiudere questa finestra.</p>
    `)
  } catch (err) {
    console.error('❌ Errore callback Google:', err.message)
    res.status(500).send('Errore durante l\'autenticazione: ' + err.message)
  }
})

app.get('/api/google/stato', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT valore FROM impostazioni WHERE chiave = 'google_tokens'`
    )
    if (result.rows.length === 0) return res.json({ connesso: false })

    const tokens = JSON.parse(result.rows[0].valore)
    const scaduto = tokens.expiry_date && tokens.expiry_date < Date.now()

    res.json({
      connesso: true,
      scaduto,
      ha_refresh_token: !!tokens.refresh_token
    })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.delete('/api/google/disconnetti', autenticaJWT, async (req, res) => {
  try {
    await pool.query(`DELETE FROM impostazioni WHERE chiave = 'google_tokens'`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// ── GOOGLE DRIVE ─────────────────────────────────────────────────────────────

const multer = require('multer')
const { Readable } = require('stream')
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

app.get('/api/lavori/:id/drive/files', autenticaJWT, async (req, res) => {
  try {
    const { id } = req.params
    const { cartella } = req.query

    const lavoroRes = await pool.query('SELECT * FROM lavori WHERE id = $1', [id])
    if (lavoroRes.rows.length === 0) return res.status(404).json({ errore: 'Lavoro non trovato' })
    const lavoro = lavoroRes.rows[0]

    const folderIdMap = {
      immagini: lavoro.google_drive_folder_immagini_id,
      pdf:      lavoro.google_drive_folder_pdf_id,
      root:     lavoro.google_drive_folder_id,
    }
    const folderId = folderIdMap[cartella]
    if (!folderId) return res.json([])

    const drive = await getAuthenticatedDrive()
    if (!drive) return res.status(503).json({ errore: 'Drive non autenticato' })

    const query = cartella === 'root'
      ? `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
      : `'${folderId}' in parents and trashed = false`

    const result = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime)',
      orderBy: 'createdTime desc',
    })

    res.json(result.data.files || [])
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/lavori/:id/drive/upload', autenticaJWT, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params
    const { cartella } = req.body

    if (!req.file) return res.status(400).json({ errore: 'Nessun file ricevuto' })

    const estensione = req.file.originalname.split('.').pop().toLowerCase()

    const blacklist = {
      immagini: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'exe', 'stl', 'ply'],
      pdf:      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'raw', 'exe', 'zip', 'rar'],
      root:     ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'pdf'],
    }
    if (blacklist[cartella]?.includes(estensione)) {
      return res.status(400).json({ errore: `Estensione .${estensione} non consentita per la cartella "${cartella}"` })
    }

    const lavoroRes = await pool.query('SELECT * FROM lavori WHERE id = $1', [id])
    if (lavoroRes.rows.length === 0) return res.status(404).json({ errore: 'Lavoro non trovato' })
    const lavoro = lavoroRes.rows[0]

    const folderIdMap = {
      immagini: lavoro.google_drive_folder_immagini_id,
      pdf:      lavoro.google_drive_folder_pdf_id,
      root:     lavoro.google_drive_folder_id,
    }
    const folderId = folderIdMap[cartella]
    if (!folderId) return res.status(400).json({ errore: 'Struttura Drive non ancora pronta per questo lavoro' })

    const drive = await getAuthenticatedDrive()
    if (!drive) return res.status(503).json({ errore: 'Drive non autenticato' })

    const stream = Readable.from(req.file.buffer)

    const uploaded = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [folderId],
      },
      media: { mimeType: req.file.mimetype, body: stream },
      fields: 'id, name, mimeType, size, createdTime',
    })

    res.json(uploaded.data)
  } catch (err) {
    console.error('❌ Errore upload Drive:', err.message)
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/drive/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params
    const drive = await getAuthenticatedDrive()
    if (!drive) return res.status(503).json({ errore: 'Drive non autenticato' })

    const meta = await drive.files.get({ fileId, fields: 'name, mimeType' })
    const download = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    res.setHeader('Content-Type', meta.data.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${meta.data.name}"`)
    download.data.pipe(res)
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.delete('/api/drive/file/:fileId', autenticaJWT, async (req, res) => {
  try {
    const { fileId } = req.params
    const drive = await getAuthenticatedDrive()
    if (!drive) return res.status(503).json({ errore: 'Drive non autenticato' })

    await drive.files.delete({ fileId })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// ── FUNZIONI INTERNE ──────────────────────────────────────────────────────────

async function generaCodice(dataRiferimento) {
  const data = dataRiferimento ? new Date(dataRiferimento) : new Date()
  const mm   = String(data.getMonth() + 1).padStart(2, '0')
  const yy   = String(data.getFullYear()).slice(-2)
  const prefisso = `${mm}${yy}`

  const res = await pool.query(`
    SELECT COUNT(*) FROM lavori
    WHERE tipo_record != 'evento'
      AND TO_CHAR(creato_il, 'MMYY') = $1
  `, [prefisso])

  const progressivo = String(Number(res.rows[0].count) + 1).padStart(3, '0')
  return `${prefisso}-${progressivo}`
}

async function salvaSnapshot(lavoro) {
  try {
    const verResult = await pool.query(
      'SELECT COALESCE(MAX(versione), 0) + 1 as prossima FROM lavori_storico WHERE lavoro_id = $1',
      [lavoro.id]
    )
    const versione = verResult.rows[0].prossima
    await pool.query(
      `INSERT INTO lavori_storico (lavoro_id, versione, stato_id, note, note_interne, tipo, tinta, elementi, data_inizio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [lavoro.id, versione, lavoro.stato_id || null, lavoro.note || null, lavoro.note_interne || null, lavoro.tipo || null, lavoro.tinta || null, lavoro.elementi || null, lavoro.data_inizio || null]
    )
  } catch (err) {
    console.error('❌ Errore salvataggio snapshot:', err.message)
  }
}

async function getAuthenticatedCalendar() {
  const result = await pool.query(
    `SELECT valore FROM impostazioni WHERE chiave = 'google_tokens'`
  )
  if (result.rows.length === 0) return null

  const tokens = JSON.parse(result.rows[0].valore)
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)

  oauth2Client.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens }
    await pool.query(
      `INSERT INTO impostazioni (chiave, valore) VALUES ('google_tokens', $1)
       ON CONFLICT (chiave) DO UPDATE SET valore = $1`,
      [JSON.stringify(merged)]
    )
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

async function getAuthenticatedDrive() {
  const result = await pool.query(
    `SELECT valore FROM impostazioni WHERE chiave = 'google_tokens'`
  )
  if (result.rows.length === 0) return null

  const tokens = JSON.parse(result.rows[0].valore)
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)

  oauth2Client.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens }
    await pool.query(
      `INSERT INTO impostazioni (chiave, valore) VALUES ('google_tokens', $1)
       ON CONFLICT (chiave) DO UPDATE SET valore = $1`,
      [JSON.stringify(merged)]
    )
  })

  return google.drive({ version: 'v3', auth: oauth2Client })
}

async function getCalendarIdPerStatoId(statoId) {
  if (!statoId) return null
  const result = await pool.query(
    `SELECT google_calendar_id FROM stati_lavoro WHERE id = $1`,
    [statoId]
  )
  return result.rows[0]?.google_calendar_id || null
}

async function sincronizzaLavoro(lavoro) {
  try {
    if (!lavoro.data_inizio) return
    const cal = await getAuthenticatedCalendar()
    if (!cal) return

    const calendarId = await getCalendarIdPerStatoId(lavoro.stato_id)
    if (!calendarId) return

    let clienteDisplay = lavoro.clinica || ''
    if (lavoro.cliente_id) {
      const cr = await pool.query(
        `SELECT COALESCE(nickname, nome) as display FROM clienti WHERE id = $1`,
        [lavoro.cliente_id]
      )
      if (cr.rows.length > 0) clienteDisplay = cr.rows[0].display
    }

    const titolo = [clienteDisplay, lavoro.paziente, lavoro.tipo]
      .filter(Boolean).join(' · ')

    const descrizione = [
      lavoro.codice       ? `Codice: ${lavoro.codice}`            : null,
      lavoro.tipo         ? `Tipo: ${lavoro.tipo}`                : null,
      lavoro.elementi     ? `Elementi: ${lavoro.elementi}`        : null,
      lavoro.tinta        ? `Tinta: ${lavoro.tinta}`              : null,
      lavoro.note         ? `Note: ${lavoro.note}`                : null,
      lavoro.note_interne ? `Note interne: ${lavoro.note_interne}`: null,
    ].filter(Boolean).join('\n')

    const dataInizio = new Date(lavoro.data_inizio)
    const dataFine   = lavoro.data_fine ? new Date(lavoro.data_fine) : new Date(dataInizio.getTime() + 3600000)

    const evento = {
      summary:     titolo,
      description: descrizione,
      start: { dateTime: dataInizio.toISOString(), timeZone: 'Europe/Rome' },
      end:   { dateTime: dataFine.toISOString(),   timeZone: 'Europe/Rome' },
    }

    let eventId = lavoro.google_event_id

    if (eventId) {
      try {
        const statiResult = await pool.query(`SELECT google_calendar_id FROM stati_lavoro WHERE google_calendar_id IS NOT NULL`)
        const tuttiCalendari = statiResult.rows.map(r => r.google_calendar_id).filter(Boolean)

        let trovato = false
        for (const calId of tuttiCalendari) {
          try {
            await cal.events.get({ calendarId: calId, eventId })
            if (calId === calendarId) {
              await cal.events.update({ calendarId, eventId, requestBody: evento })
            } else {
              await cal.events.delete({ calendarId: calId, eventId })
              const nuovo = await cal.events.insert({ calendarId, requestBody: evento })
              eventId = nuovo.data.id
              await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [eventId, lavoro.id])
            }
            trovato = true
            break
          } catch {}
        }

        if (!trovato) {
          const nuovo = await cal.events.insert({ calendarId, requestBody: evento })
          eventId = nuovo.data.id
          await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [eventId, lavoro.id])
        }
      } catch (err) {
        console.error('❌ Errore aggiornamento evento:', err.message)
      }
    } else {
      const nuovo = await cal.events.insert({ calendarId, requestBody: evento })
      eventId = nuovo.data.id
      await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [eventId, lavoro.id])
      console.log(`✅ Evento Google Calendar creato: ${titolo}`)
    }
  } catch (err) {
    console.error('❌ Errore sincronizzazione Calendar:', err.message)
  }
}

async function eliminaEventoCalendar(googleEventId) {
  if (!googleEventId) return
  try {
    const cal = await getAuthenticatedCalendar()
    if (!cal) return

    const statiChiavi = ['gcal_stato_in_corso', 'gcal_stato_da_consegnare', 'gcal_stato_consegnato']
    const statiResult = await pool.query(
      `SELECT valore FROM impostazioni WHERE chiave = ANY($1)`,
      [statiChiavi]
    )
    const tuttiCalendari = statiResult.rows.map(r => r.valore).filter(Boolean)

    for (const calId of tuttiCalendari) {
      try {
        await cal.events.delete({ calendarId: calId, eventId: googleEventId })
        break
      } catch {}
    }
  } catch (err) {
    console.error('❌ Errore eliminazione evento:', err.message)
  }
}

async function eliminaEventoStaff(googleEventId, utenteId) {
  if (!googleEventId || !utenteId) return
  try {
    const cal = await getAuthenticatedCalendar()
    if (!cal) return
    const utenteRes = await pool.query(
      'SELECT google_calendar_id FROM utenti_staff WHERE id = $1',
      [utenteId]
    )
    const calendarId = utenteRes.rows[0]?.google_calendar_id
    if (!calendarId) return
    await cal.events.delete({ calendarId, eventId: googleEventId })
  } catch (err) {
    console.error('❌ Errore eliminazione evento staff:', err.message)
  }
}

async function sincronizzaEvento(evento) {
  try {
    if (!evento.data_inizio) return
    if (!evento.utente_id) return

    const cal = await getAuthenticatedCalendar()
    if (!cal) return

    const utenteRes = await pool.query(
      'SELECT google_calendar_id FROM utenti_staff WHERE id = $1',
      [evento.utente_id]
    )
    const calendarId = utenteRes.rows[0]?.google_calendar_id
    if (!calendarId) return

    const titolo = evento.paziente || evento.tipo || 'Evento'
    const descrizione = [
      evento.note         ? `Note: ${evento.note}`                : null,
      evento.note_interne ? `Note interne: ${evento.note_interne}`: null,
    ].filter(Boolean).join('\n')

    const dataInizio = new Date(evento.data_inizio)
    const dataFine   = evento.data_fine ? new Date(evento.data_fine) : new Date(dataInizio.getTime() + 3600000)

    const payload = {
      summary:     titolo,
      description: descrizione,
      start: { dateTime: dataInizio.toISOString(), timeZone: 'Europe/Rome' },
      end:   { dateTime: dataFine.toISOString(),   timeZone: 'Europe/Rome' },
    }

    let eventId = evento.google_event_id

    if (eventId) {
      const staffRes = await pool.query(
        'SELECT google_calendar_id FROM utenti_staff WHERE google_calendar_id IS NOT NULL'
      )
      const tuttiCalendari = staffRes.rows.map(r => r.google_calendar_id)

      let trovato = false
      for (const calId of tuttiCalendari) {
        try {
          await cal.events.get({ calendarId: calId, eventId })
          if (calId === calendarId) {
            await cal.events.update({ calendarId, eventId, requestBody: payload })
          } else {
            await cal.events.delete({ calendarId: calId, eventId })
            const nuovo = await cal.events.insert({ calendarId, requestBody: payload })
            await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [nuovo.data.id, evento.id])
          }
          trovato = true
          break
        } catch {}
      }

      if (!trovato) {
        const nuovo = await cal.events.insert({ calendarId, requestBody: payload })
        await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [nuovo.data.id, evento.id])
      }
    } else {
      const nuovo = await cal.events.insert({ calendarId, requestBody: payload })
      await pool.query('UPDATE lavori SET google_event_id=$1 WHERE id=$2', [nuovo.data.id, evento.id])
      console.log(`✅ Evento staff Google Calendar creato: ${titolo}`)
    }
  } catch (err) {
    console.error('❌ Errore sincronizzazione evento staff:', err.message)
  }
}

async function ensureDriveStructure(lavoro) {
  try {
    const drive = await getAuthenticatedDrive()
    if (!drive) return

    let clienteDisplay = lavoro.clinica || 'NessunCliente'
    if (lavoro.cliente_id) {
      const cr = await pool.query(
        `SELECT COALESCE(nickname, nome) as display FROM clienti WHERE id = $1`,
        [lavoro.cliente_id]
      )
      if (cr.rows.length > 0) clienteDisplay = cr.rows[0].display
    }

    const nomePaziente = lavoro.paziente || 'NessunPaziente'
    const codice = lavoro.codice || `ID${lavoro.id}`
    const nomeCartella = `${clienteDisplay}_${nomePaziente}_${codice}`
      .replace(/[/\\?%*:|"<>]/g, '-')

    if (lavoro.google_drive_folder_id) {
      try {
        await drive.files.update({
          fileId: lavoro.google_drive_folder_id,
          requestBody: { name: nomeCartella },
        })
        console.log(`📁 Cartella Drive rinominata: ${nomeCartella}`)
      } catch (err) {
        console.error('❌ Errore rinomina cartella Drive:', err.message)
      }
      return
    }

    const radiceRes = await pool.query(
      `SELECT valore FROM impostazioni WHERE chiave = 'drive_cartella_radice_id'`
    )
    const radiceId = radiceRes.rows[0]?.valore || null

    const cartellaPrincipale = await drive.files.create({
      requestBody: {
        name: nomeCartella,
        mimeType: 'application/vnd.google-apps.folder',
        ...(radiceId ? { parents: [radiceId] } : {}),
      },
      fields: 'id',
    })
    const folderId = cartellaPrincipale.data.id

    const [pdf, immagini] = await Promise.all([
      drive.files.create({ requestBody: { name: 'PDF',      mimeType: 'application/vnd.google-apps.folder', parents: [folderId] }, fields: 'id' }),
      drive.files.create({ requestBody: { name: 'Immagini', mimeType: 'application/vnd.google-apps.folder', parents: [folderId] }, fields: 'id' }),
    ])

    await pool.query(
      `UPDATE lavori SET
        google_drive_folder_id = $1,
        google_drive_folder_pdf_id = $2,
        google_drive_folder_immagini_id = $3
       WHERE id = $4`,
      [folderId, pdf.data.id, immagini.data.id, lavoro.id]
    )

    console.log(`✅ Struttura Drive creata: ${nomeCartella}`)
  } catch (err) {
    console.error('❌ Errore creazione struttura Drive:', err.message)
  }
}

async function spostaCartellaNelCestino(folderId) {
  try {
    const drive = await getAuthenticatedDrive()
    if (!drive) return
    await drive.files.update({
      fileId: folderId,
      requestBody: { trashed: true },
    })
    console.log(`🗑 Cartella Drive spostata nel cestino: ${folderId}`)
  } catch (err) {
    console.error('❌ Errore spostamento cestino Drive:', err.message)
  }
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/registrazione', async (req, res) => {
  try {
    const { nome, email, password } = req.body
    if (!nome || !email || !password)
      return res.status(400).json({ errore: 'Nome, email e password obbligatori' })

    const esistente = await pool.query(
      'SELECT id FROM laboratori WHERE email = $1', [email]
    )
    if (esistente.rows.length > 0)
      return res.status(400).json({ errore: 'Email già registrata' })

    const password_hash = await bcrypt.hash(password, 12)
    const token_verifica = require('crypto').randomBytes(32).toString('hex')

    const result = await pool.query(
      `INSERT INTO laboratori (nome, email, password_hash, token_verifica)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email`,
      [nome, email, password_hash, token_verifica]
    )

    await resend.emails.send({
      from: 'Il Dente <onboarding@resend.dev>',
      to: email,
      subject: 'Conferma la tua email — Il Dente',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0284C7;">Benvenuto in Il Dente 🦷</h2>
          <p>Clicca il link qui sotto per verificare il tuo account:</p>
          <a href="http://localhost:5173/verifica-email?token=${token_verifica}"
             style="display:inline-block; background:#0284C7; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; margin: 16px 0;">
            Verifica email
          </a>
          <p style="color:#94a3b8; font-size:12px; margin-top:32px;">
            Se non hai creato un account su Il Dente, ignora questa email.
          </p>
        </div>
      `
    })
    console.log(`✉️  Email di verifica inviata a ${email}`)

    res.json({ ok: true, laboratorio: result.rows[0] })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ errore: 'Email e password obbligatori' })

    const result = await pool.query(
      'SELECT * FROM laboratori WHERE email = $1', [email]
    )
    if (result.rows.length === 0)
      return res.status(401).json({ errore: 'Credenziali non valide' })

    const lab = result.rows[0]

    if (!lab.verificato)
      return res.status(401).json({ errore: 'Email non ancora verificata' })

    const passwordOk = await bcrypt.compare(password, lab.password_hash)
    if (!passwordOk)
      return res.status(401).json({ errore: 'Credenziali non valide' })

    const token = jwt.sign(
      { id: lab.id, email: lab.email, nome: lab.nome, tipo: 'laboratorio' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ ok: true, token, nome: lab.nome })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.get('/api/auth/verifica-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ errore: 'Token mancante' })

    const result = await pool.query(
      'SELECT id, verificato FROM laboratori WHERE token_verifica = $1', [token]
    )
    if (result.rows.length === 0)
      return res.status(400).json({ errore: 'Token non valido' })

    if (result.rows[0].verificato)
      return res.json({ ok: true, messaggio: 'Email già verificata in precedenza' })

    await pool.query(
      'UPDATE laboratori SET verificato = true, token_verifica = NULL WHERE token_verifica = $1',
      [token]
    )

    res.json({ ok: true, messaggio: 'Email verificata con successo' })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.post('/api/superadmin/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ errore: 'Email e password obbligatori' })

    const result = await pool.query(
      'SELECT * FROM superadmin WHERE email = $1', [email]
    )
    if (result.rows.length === 0)
      return res.status(401).json({ errore: 'Credenziali non valide' })

    const admin = result.rows[0]
    const passwordOk = await bcrypt.compare(password, admin.password_hash)
    if (!passwordOk)
      return res.status(401).json({ errore: 'Credenziali non valide' })

    const token = jwt.sign(
      { id: admin.id, email: admin.email, tipo: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ ok: true, token })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})


// ── ACCOUNT LABORATORIO ───────────────────────────────────────────────────────

// GET dati account
app.get('/api/account', autenticaJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, email, ragione_sociale, piva, indirizzo, citta, cap, provincia, pec, sdi, piano_id, created_at
       FROM laboratori WHERE id = $1`,
      [req.utente.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ errore: 'Account non trovato' })

    // Carica anche il piano attivo
    const piano = await pool.query(
      `SELECT p.nome, p.descrizione, p.prezzo_mensile FROM piani p
       JOIN laboratori l ON l.piano_id = p.id WHERE l.id = $1`,
      [req.utente.id]
    )

    res.json({ ...result.rows[0], piano: piano.rows[0] || null })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// PUT aggiorna dati account (nome, dati fatturazione)
app.put('/api/account', autenticaJWT, async (req, res) => {
  try {
    const { nome, ragione_sociale, piva, indirizzo, citta, cap, provincia, pec, sdi } = req.body
    if (!nome) return res.status(400).json({ errore: 'Il nome è obbligatorio' })

    const result = await pool.query(
      `UPDATE laboratori SET
        nome = $1, ragione_sociale = $2, piva = $3, indirizzo = $4,
        citta = $5, cap = $6, provincia = $7, pec = $8, sdi = $9,
        aggiornato_il = NOW()
       WHERE id = $10
       RETURNING id, nome, email, ragione_sociale, piva, indirizzo, citta, cap, provincia, pec, sdi`,
      [nome, ragione_sociale || null, piva || null, indirizzo || null,
       citta || null, cap || null, provincia || null, pec || null, sdi || null,
       req.utente.id]
    )

    // Rigenera il token con il nome aggiornato
    const lab = result.rows[0]
    const nuovoToken = jwt.sign(
      { id: lab.id, email: lab.email, nome: lab.nome, tipo: 'laboratorio' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ ok: true, laboratorio: lab, token: nuovoToken })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// PUT cambia email
app.put('/api/account/email', autenticaJWT, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ errore: 'Email e password obbligatori' })

    // Verifica password attuale
    const labRes = await pool.query('SELECT * FROM laboratori WHERE id = $1', [req.utente.id])
    const lab = labRes.rows[0]
    const ok = await bcrypt.compare(password, lab.password_hash)
    if (!ok) return res.status(401).json({ errore: 'Password non corretta' })

    // Controlla se email già usata
    const esistente = await pool.query(
      'SELECT id FROM laboratori WHERE email = $1 AND id != $2', [email, req.utente.id]
    )
    if (esistente.rows.length > 0) return res.status(400).json({ errore: 'Email già in uso' })

    await pool.query(
      'UPDATE laboratori SET email = $1, aggiornato_il = NOW() WHERE id = $2',
      [email, req.utente.id]
    )

    // Rigenera token con nuova email
    const nuovoToken = jwt.sign(
      { id: lab.id, email, nome: lab.nome, tipo: 'laboratorio' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ ok: true, token: nuovoToken })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

// PUT cambia password
app.put('/api/account/password', autenticaJWT, async (req, res) => {
  try {
    const { password_attuale, password_nuova } = req.body
    if (!password_attuale || !password_nuova)
      return res.status(400).json({ errore: 'Password attuale e nuova obbligatorie' })
    if (password_nuova.length < 8)
      return res.status(400).json({ errore: 'La nuova password deve essere di almeno 8 caratteri' })

    const labRes = await pool.query('SELECT * FROM laboratori WHERE id = $1', [req.utente.id])
    const lab = labRes.rows[0]
    const ok = await bcrypt.compare(password_attuale, lab.password_hash)
    if (!ok) return res.status(401).json({ errore: 'Password attuale non corretta' })

    const nuovoHash = await bcrypt.hash(password_nuova, 12)
    await pool.query(
      'UPDATE laboratori SET password_hash = $1, aggiornato_il = NOW() WHERE id = $2',
      [nuovoHash, req.utente.id]
    )

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ errore: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});