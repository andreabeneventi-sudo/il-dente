import { apiFetch } from './apiFetch'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const MESI   = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
const GIORNI = ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato']

function formatDataConsegna(str) {
  if (!str) return ''
  const d = new Date(str)
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()} alle ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function sanitize(str) {
  if (!str) return ''
  return str
    .replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ')  // newline → spazio
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')               // altri caratteri di controllo
    .replace(/à/g,'a').replace(/À/g,'A')
    .replace(/è/g,'e').replace(/È/g,'E')
    .replace(/é/g,'e').replace(/É/g,'E')
    .replace(/ì/g,'i').replace(/Ì/g,'I')
    .replace(/ò/g,'o').replace(/Ò/g,'O')
    .replace(/ù/g,'u').replace(/Ù/g,'U')
    .replace(/[^\x00-\xFF]/g,'?')
}

export async function generaPDF(lavoro, impostazioni = {}, soloStorico = false) {
  const templateRes   = await apiFetch('/template.pdf')
  const templateBytes = await templateRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(templateBytes)
  const page   = pdfDoc.getPages()[0]
  const { height } = page.getSize()

  const font  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const xVal  = 252.28
  const xNote = 184.25
  const fSize = 9
  const color = rgb(0.31, 0.38, 0.48)

  function drawText(text, x, top) {
    const clean = sanitize(text)
    if (!clean) return
    page.drawText(clean, { x, y: height - top - fSize, size: fSize, font, color })
  }

  drawText(lavoro.paziente || '',                          xVal,  83.87)
  drawText(lavoro.cliente_display || lavoro.clinica || '', xVal, 102.86)
  drawText(formatDataConsegna(lavoro.data_inizio),         xVal, 121.85)
  drawText(lavoro.tipo || '',                              xVal, 140.84)
  drawText(lavoro.tinta || '',                             xVal, 159.84)
  drawText(lavoro.elementi || '',                          xVal, 178.83)

  if (lavoro.note && lavoro.note.trim()) {
    // A4: 595pt. xNote=184.25, margine destro ~28pt → disponibile ~382pt
    const maxW   = 368
    let rigaY = 202.50

    // Splitta prima per newline espliciti, poi fai word-wrap su ogni paragrafo
    const paragrafi = lavoro.note.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

    for (const paragrafo of paragrafi) {
      const parole = sanitize(paragrafo).split(' ').filter(p => p !== '')

      if (parole.length === 0) {
        // Riga vuota: lascia spazio
        rigaY += 13
        continue
      }

      let riga = ''
      for (const parola of parole) {
        const testRiga = riga ? `${riga} ${parola}` : parola
        if (font.widthOfTextAtSize(testRiga, fSize) > maxW && riga) {
          // flush riga corrente
          // gestisci parola singola troppo lunga
          let r = riga
          while (font.widthOfTextAtSize(r, fSize) > maxW) {
            let taglio = r.length - 1
            while (taglio > 0 && font.widthOfTextAtSize(r.slice(0, taglio), fSize) > maxW) taglio--
            drawText(r.slice(0, taglio), xNote, rigaY)
            r = r.slice(taglio)
            rigaY += 13
          }
          drawText(r, xNote, rigaY)
          rigaY += 13
          riga = parola
        } else {
          riga = testRiga
        }
      }
      // flush ultima riga del paragrafo
      if (riga) {
        let r = riga
        while (font.widthOfTextAtSize(r, fSize) > maxW) {
          let taglio = r.length - 1
          while (taglio > 0 && font.widthOfTextAtSize(r.slice(0, taglio), fSize) > maxW) taglio--
          drawText(r.slice(0, taglio), xNote, rigaY)
          r = r.slice(taglio)
          rigaY += 13
        }
        drawText(r, xNote, rigaY)
        rigaY += 13
      }
    }
  }

  if (lavoro.codice) {
    page.drawText(lavoro.codice, {
      x: 184.25, y: 30, size: 7, font,
      color: rgb(0.71, 0.75, 0.78),
    })
  }

  if (impostazioni.lab_logo) {
    try {
      const base64Data = impostazioni.lab_logo.split(',')[1]
      const isJpeg     = impostazioni.lab_logo.includes('image/jpeg')
      const imgBytes   = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const img        = isJpeg
        ? await pdfDoc.embedJpg(imgBytes)
        : await pdfDoc.embedPng(imgBytes)

      const areaW = 160
      const areaH = 52
      const areaX = (595.28 - areaW) / 2
      const areaY = height - 68.18 + 4

      const { width: iw, height: ih } = img.scale(1)
      const ratio = Math.min(areaW / iw, areaH / ih)
      const logoW = iw * ratio
      const logoH = ih * ratio
      const logoX = areaX + (areaW - logoW) / 2
      const logoY = areaY

      page.drawImage(img, { x: logoX, y: logoY, width: logoW, height: logoH })
    } catch(e) {
      console.warn('Errore logo:', e)
    }
  }

  const pdfBytes = await pdfDoc.save()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  return { url, base64 }
}

export async function apriPDFStorico(id) {
  const res  = await apiFetch(`/api/pdf-storico/${id}`)
  const data = await res.json()
  const bin  = atob(data.pdf_data)
  const arr  = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const blob = new Blob([arr], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.target   = '_blank'
  a.rel      = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}