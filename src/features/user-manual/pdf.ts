import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { USER_MANUAL, type ManualSection, type UserManual } from "./content"

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 54
const MARGIN_TOP = 58
const MARGIN_BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const FILE_NAME = "manual-usuario-lote-vehiculos.pdf"

type Fonts = {
  regular: PDFFont
  bold: PDFFont
}

type Cursor = {
  page: PDFPage
  y: number
}

export type UserManualPdfPayload = {
  fileName: string
  contentType: "application/pdf"
  body: Uint8Array
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = rgb(0.12, 0.16, 0.22),
) {
  const lines = wrapText(text, font, size, maxWidth)
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color })
  })
  return lines.length * lineHeight
}

function ensureSpace(doc: PDFDocument, cursor: Cursor, requiredHeight: number) {
  if (cursor.y - requiredHeight >= MARGIN_BOTTOM) return cursor
  return { page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN_TOP }
}

function drawParagraph(doc: PDFDocument, cursor: Cursor, text: string, font: PDFFont, size = 10.5) {
  const lineHeight = size + 4
  const lines = wrapText(text, font, size, CONTENT_WIDTH)
  cursor = ensureSpace(doc, cursor, lines.length * lineHeight + 8)
  const used = drawWrappedText(cursor.page, text, MARGIN_X, cursor.y, CONTENT_WIDTH, font, size, lineHeight)
  return { page: cursor.page, y: cursor.y - used - 8 }
}

function drawBullet(doc: PDFDocument, cursor: Cursor, text: string, font: PDFFont) {
  const size = 10
  const lineHeight = 14
  const bulletWidth = 14
  const lines = wrapText(text, font, size, CONTENT_WIDTH - bulletWidth)
  cursor = ensureSpace(doc, cursor, lines.length * lineHeight + 6)
  cursor.page.drawText("-", {
    x: MARGIN_X,
    y: cursor.y,
    size,
    font,
    color: rgb(0.22, 0.32, 0.42),
  })
  const used = drawWrappedText(
    cursor.page,
    text,
    MARGIN_X + bulletWidth,
    cursor.y,
    CONTENT_WIDTH - bulletWidth,
    font,
    size,
    lineHeight,
  )
  return { page: cursor.page, y: cursor.y - used - 6 }
}

function drawSection(doc: PDFDocument, cursor: Cursor, section: ManualSection, fonts: Fonts) {
  cursor = ensureSpace(doc, cursor, 108)
  const pageNumber = doc.getPageCount()
  cursor.page.drawText(section.title, {
    x: MARGIN_X,
    y: cursor.y,
    size: 18,
    font: fonts.bold,
    color: rgb(0.05, 0.10, 0.16),
  })
  cursor.y -= 28
  cursor = drawParagraph(doc, cursor, section.purpose, fonts.regular, 10.5)

  cursor = ensureSpace(doc, cursor, 28)
  cursor.page.drawText("Acciones comunes", {
    x: MARGIN_X,
    y: cursor.y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.10, 0.20, 0.30),
  })
  cursor.y -= 18
  for (const action of section.actions) cursor = drawBullet(doc, cursor, action, fonts.regular)

  cursor = ensureSpace(doc, cursor, 28)
  cursor.page.drawText("Resultado esperado", {
    x: MARGIN_X,
    y: cursor.y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.10, 0.20, 0.30),
  })
  cursor.y -= 18
  for (const result of section.results) cursor = drawBullet(doc, cursor, result, fonts.regular)

  return { cursor: { page: cursor.page, y: cursor.y - 10 }, pageNumber }
}

function drawPageChrome(doc: PDFDocument, fonts: Fonts, manual: UserManual) {
  const pages = doc.getPages()
  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 34 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 34 },
      thickness: 0.5,
      color: rgb(0.78, 0.82, 0.87),
    })
    page.drawText(manual.appName, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 24,
      size: 8,
      font: fonts.bold,
      color: rgb(0.34, 0.39, 0.46),
    })
    page.drawText(`Revision ${manual.revision}`, {
      x: PAGE_WIDTH - MARGIN_X - 70,
      y: PAGE_HEIGHT - 24,
      size: 8,
      font: fonts.regular,
      color: rgb(0.34, 0.39, 0.46),
    })
    page.drawText(`Pagina ${index + 1} de ${pages.length}`, {
      x: MARGIN_X,
      y: 30,
      size: 8,
      font: fonts.regular,
      color: rgb(0.34, 0.39, 0.46),
    })
  })
}

function drawCover(doc: PDFDocument, fonts: Fonts, manual: UserManual) {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawText(manual.appName, {
    x: MARGIN_X,
    y: 670,
    size: 17,
    font: fonts.bold,
    color: rgb(0.09, 0.19, 0.30),
  })
  page.drawText(manual.title, {
    x: MARGIN_X,
    y: 622,
    size: 34,
    font: fonts.bold,
    color: rgb(0.05, 0.10, 0.16),
  })
  drawWrappedText(page, manual.audience, MARGIN_X, 590, CONTENT_WIDTH, fonts.regular, 12, 17, rgb(0.22, 0.28, 0.35))
  page.drawText(`Publicado: ${manual.publicationDate}`, {
    x: MARGIN_X,
    y: 520,
    size: 11,
    font: fonts.regular,
    color: rgb(0.22, 0.28, 0.35),
  })
  page.drawText(`Revision: ${manual.revision}`, {
    x: MARGIN_X,
    y: 500,
    size: 11,
    font: fonts.regular,
    color: rgb(0.22, 0.28, 0.35),
  })
  page.drawText("Documento operativo para consulta interna.", {
    x: MARGIN_X,
    y: 452,
    size: 12,
    font: fonts.bold,
    color: rgb(0.10, 0.20, 0.30),
  })
}

function drawToc(page: PDFPage, fonts: Fonts, manual: UserManual, sectionPages: Map<string, number>) {
  page.drawText("Tabla de contenido", {
    x: MARGIN_X,
    y: 708,
    size: 24,
    font: fonts.bold,
    color: rgb(0.05, 0.10, 0.16),
  })
  let y = 664
  manual.sections.forEach((section, index) => {
    const label = `${index + 1}. ${section.title}`
    const pageNumber = String(sectionPages.get(section.id) ?? "")
    page.drawText(label, {
      x: MARGIN_X,
      y,
      size: 10.5,
      font: fonts.regular,
      color: rgb(0.12, 0.16, 0.22),
    })
    page.drawText(pageNumber, {
      x: PAGE_WIDTH - MARGIN_X - fonts.regular.widthOfTextAtSize(pageNumber, 10.5),
      y,
      size: 10.5,
      font: fonts.regular,
      color: rgb(0.12, 0.16, 0.22),
    })
    y -= 24
  })
}

export async function renderUserManualPdf(manual: UserManual = USER_MANUAL) {
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  doc.setTitle(`${manual.appName} - ${manual.title}`)
  doc.setSubject("Manual operativo de usuario")
  doc.setAuthor(manual.appName)
  doc.setKeywords(["manual", "usuario", "lote", "vehiculos", manual.revision])
  doc.setProducer("LOTE VEHICULOS")
  doc.setCreator("LOTE VEHICULOS")
  doc.setCreationDate(new Date(`${manual.publicationDate}T00:00:00.000Z`))
  doc.setModificationDate(new Date(`${manual.publicationDate}T00:00:00.000Z`))

  drawCover(doc, fonts, manual)
  const tocPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursor: Cursor = { page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN_TOP }
  const sectionPages = new Map<string, number>()

  manual.sections.forEach((section) => {
    const result = drawSection(doc, cursor, section, fonts)
    sectionPages.set(section.id, result.pageNumber)
    cursor = result.cursor
  })

  drawToc(tocPage, fonts, manual, sectionPages)
  drawPageChrome(doc, fonts, manual)

  return doc.save({ useObjectStreams: false })
}

export async function getUserManualPdf(): Promise<UserManualPdfPayload> {
  return {
    fileName: FILE_NAME,
    contentType: "application/pdf",
    body: await renderUserManualPdf(),
  }
}
