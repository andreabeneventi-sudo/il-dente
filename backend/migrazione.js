#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  SCRIPT MIGRAZIONE: WordPress → Il Dente            ║
 * ║  Importa casi.json in PostgreSQL                    ║
 * ║  NON tocca Google Drive, NON tocca Google Calendar  ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * USO:
 *   1. Metti questo file nella cartella backend/ di Il Dente
 *   2. Esegui: node migrazione.js --file casi-esportati-XXXXXXXX.json
 *   3. Per vedere cosa farebbe senza scrivere: node migrazione.js --file ... --dry-run
 */

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');
require('dotenv').config();

// ── Argomenti CLI ─────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const fileArg = args.indexOf('--file');
const dryRun  = args.includes('--dry-run');

if (fileArg === -1 || !args[fileArg + 1]) {
  console.error('❌  Uso: node migrazione.js --file <percorso.json> [--dry-run]');
  process.exit(1);
}

const filePath = path.resolve(args[fileArg + 1]);
if (!fs.existsSync(filePath)) {
  console.error(`❌  File non trovato: ${filePath}`);
  process.exit(1);
}

// ── Database ──────────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'ildente',
  user:     process.env.DB_USER     || 'ildente_user',
  password: process.env.DB_PASSWORD || 'ildente_pass',
});

// ── Genera codice MMYY-NNN  (replica esatta di generaCodice in index.js) ─────
async function generaCodice(dataRiferimento) {
  const data    = dataRiferimento ? new Date(dataRiferimento) : new Date();
  const mm      = String(data.getMonth() + 1).padStart(2, '0');
  const yy      = String(data.getFullYear()).slice(-2);
  const prefisso = `${mm}${yy}`;

  const res = await pool.query(`
    SELECT COUNT(*) FROM lavori
    WHERE tipo_record != 'evento'
      AND TO_CHAR(creato_il, 'MMYY') = $1
  `, [prefisso]);

  const progressivo = String(Number(res.rows[0].count) + 1).padStart(3, '0');
  return `${prefisso}-${progressivo}`;
}

// ── Trova cliente_id per nome (match flessibile) ──────────────────────────────
async function trovaClienteId(nomeWP) {
  if (!nomeWP) return null;
  const nome = nomeWP.trim();

  // 1. Match esatto su nome
  let res = await pool.query(
    `SELECT id, nome, nickname FROM clienti WHERE LOWER(nome) = LOWER($1) LIMIT 1`,
    [nome]
  );
  if (res.rows.length > 0) return res.rows[0];

  // 2. Match esatto su nickname
  res = await pool.query(
    `SELECT id, nome, nickname FROM clienti WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
    [nome]
  );
  if (res.rows.length > 0) return res.rows[0];

  // 3. Match parziale
  res = await pool.query(
    `SELECT id, nome, nickname FROM clienti
     WHERE LOWER(nome) LIKE LOWER($1) OR LOWER(COALESCE(nickname,'')) LIKE LOWER($1)
     LIMIT 1`,
    [`%${nome}%`]
  );
  if (res.rows.length > 0) return res.rows[0];

  return null;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🦷  MIGRAZIONE WORDPRESS → IL DENTE');
  console.log('════════════════════════════════════════');
  if (dryRun) console.log('⚠️   MODALITÀ DRY-RUN — nessuna scrittura nel database\n');

  const raw  = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const casi = data.casi || [];

  console.log(`📂  File: ${path.basename(filePath)}`);
  console.log(`📅  Generato il: ${data.generato_il}`);
  console.log(`📋  Casi trovati: ${casi.length}\n`);

  try {
    await pool.query('SELECT 1');
    console.log('✅  Database connesso\n');
  } catch (err) {
    console.error('❌  Impossibile connettersi al database:', err.message);
    process.exit(1);
  }

  const stats = { importati: 0, saltati: 0, clienti_non_trovati: [], senza_drive: 0 };

  for (let i = 0; i < casi.length; i++) {
    const caso = casi[i];
    const num  = `[${String(i + 1).padStart(3, '0')}/${casi.length}]`;

    // ── Risolvi cliente ───────────────────────────────────────────────
    let clienteId   = null;
    let clienteInfo = '(nessun cliente)';

    if (caso.cliente_nome) {
      const cliente = await trovaClienteId(caso.cliente_nome);
      if (cliente) {
        clienteId   = cliente.id;
        clienteInfo = `→ id=${cliente.id} "${cliente.nome}"`;
      } else {
        clienteInfo = `⚠️  NON TROVATO: "${caso.cliente_nome}"`;
        stats.clienti_non_trovati.push(caso.cliente_nome);
      }
    }

    // ── Data consegna ─────────────────────────────────────────────────
    const dataInizio = caso.data_consegna || null;
    let   dataFine   = null;
    if (dataInizio) {
      const df = new Date(dataInizio);
      df.setMinutes(df.getMinutes() + 30);
      dataFine = df.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    }

    // ── Genera codice ─────────────────────────────────────────────────
    let codice = null;
    if (!dryRun) {
      codice = await generaCodice(caso.data_ricezione || caso.data_consegna || null);
    } else {
      const refDate = caso.data_ricezione || caso.data_consegna || new Date().toISOString();
      const d  = new Date(refDate);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      codice   = `${mm}${yy}-XXX`;
    }

    // ── Drive ─────────────────────────────────────────────────────────
    const driveInfo = caso.drive_folder_id
      ? `✅ collegata (${caso.drive_folder_id})`
      : '⚠️  nessuna cartella';
    if (!caso.drive_folder_id) stats.senza_drive++;

    // ── Stato_id ──────────────────────────────────────────────────────
    const statoMap = { 'in_corso': 1, 'da_consegnare': 2, 'consegnato': 3 };
    const statoId  = statoMap[caso.stato] || 1;

    // ── Log ───────────────────────────────────────────────────────────
    console.log(`${num} ${caso.codice_wp || '(no codice)'} → ${codice}`);
    console.log(`       Paziente : ${caso.paziente || '—'}`);
    console.log(`       Cliente  : ${caso.cliente_nome || '—'} ${clienteInfo}`);
    console.log(`       Tipo     : ${caso.tipo || '—'}`);
    console.log(`       Consegna : ${dataInizio || 'SENZA DATA'}`);
    console.log(`       Stato    : ${caso.stato} | Terminato: ${caso.terminato}`);
    console.log(`       Drive    : ${driveInfo}`);

    if (dryRun) {
      console.log(`       [DRY-RUN] Non scritto.\n`);
      stats.importati++;
      continue;
    }

    // ── INSERT in PostgreSQL ──────────────────────────────────────────
    try {
      await pool.query(
        `INSERT INTO lavori
           (paziente, clinica, cliente_id, tipo, tinta, elementi, note,
            colore, data_inizio, data_fine, tipo_record, codice, stato,
            terminato, creato_il, aggiornato_il,
            google_drive_folder_id, google_drive_folder_pdf_id, google_drive_folder_immagini_id,
            stato_id)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, 'lavoro', $11, $12,
            $13, $14, $14,
            $15, $16, $17,
            $18)`,
        [
          caso.paziente          || null,
          caso.cliente_nome      || null,
          clienteId,
          caso.tipo              || null,
          caso.tinta             || null,
          caso.elementi          || null,
          caso.note              || null,
          'sky',
          dataInizio,
          dataFine,
          codice,
          caso.stato             || 'in_corso',
          caso.terminato         ? true : false,
          caso.data_ricezione
            ? new Date(caso.data_ricezione).toISOString()
            : new Date().toISOString(),
          caso.drive_folder_id    || null,
          caso.drive_pdf_id       || null,
          caso.drive_immagini_id  || null,
          statoId,
        ]
      );
      console.log(`       ✅ Inserito\n`);
      stats.importati++;
    } catch (err) {
      console.error(`       ❌ ERRORE INSERT: ${err.message}\n`);
      stats.saltati++;
    }
  }

  // ── Riepilogo finale ──────────────────────────────────────────────────────
  console.log('════════════════════════════════════════');
  console.log(`✅  Importati   : ${stats.importati}`);
  console.log(`❌  Saltati     : ${stats.saltati}`);
  console.log(`📁  Senza Drive : ${stats.senza_drive}`);

  if (stats.clienti_non_trovati.length > 0) {
    const unici = [...new Set(stats.clienti_non_trovati)];
    console.log(`\n⚠️   Clienti WordPress NON abbinati a Il Dente (${unici.length}):`);
    unici.forEach(n => console.log(`     - "${n}"`));
    console.log('\n   → Questi lavori sono stati importati con cliente_id = NULL.');
    console.log('     Dopo l\'importazione puoi abbinarli manualmente dall\'app.\n');
  }

  await pool.end();
  console.log('\n🏁  Migrazione completata.');
}

main().catch(err => {
  console.error('❌  Errore imprevisto:', err);
  process.exit(1);
});
