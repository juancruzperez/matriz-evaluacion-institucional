import { auth } from "@/auth"
import { getOpenIncidencesReport } from "@/lib/reports/incidences"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"
import fs from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

const MARGIN_X = 42
const HEADER_HEIGHT = 142

const BODY_TOP =
  PAGE_HEIGHT - HEADER_HEIGHT - 28

const COLORS = {
  graphite: rgb(0.11, 0.16, 0.21),
  navy: rgb(0.106, 0.263, 0.325),
  ink: rgb(0.137, 0.047, 0.059),
  bone: rgb(0.949, 0.937, 0.918),
  white: rgb(1, 1, 1),
  muted: rgb(0.40, 0.43, 0.45),
  line: rgb(0.78, 0.75, 0.78),
  red: rgb(0.69, 0.07, 0.12),
  yellow: rgb(0.91, 0.68, 0.12),
  green: rgb(0.22, 0.60, 0.47),
}

type Urgency =
  | "alto"
  | "medio"
  | "bajo"

type ReportRow = {
  incidenceId: string
  institutionId: string
  institutionName: string
  cue: string
  departamento: string | null
  localidad: string | null
  dimensionName: string
  indicatorName: string
  context: string
  originalUrgency: Urgency | null
  currentUrgency: Urgency
  createdAt: string
  updatedAt: string
  generatedBy: string
}

type ReportInstitution = {
  institutionId: string
  institutionName: string
  cue: string
  departamento: string | null
  localidad: string | null
  highestUrgency: Urgency
  incidences: ReportRow[]
}

type ReportData = {
  generatedAt: string
  filters: {
    departamento?: string
    localidad?: string
    urgency?: Urgency
    from?: string
    to?: string
  }
  totals: {
    institutions: number
    incidences: number
    high: number
    medium: number
    low: number
  }
  institutions: ReportInstitution[]
  rows: ReportRow[]
}

function urgencyLabel(
  urgency: Urgency | null,
): string {
  if (!urgency) {
    return "Sin registrar"
  }

  switch (urgency) {
    case "alto":
      return "Alta"
    case "medio":
      return "Media"
    case "bajo":
      return "Baja"
  }
}

function urgencyColor(
  urgency: Urgency | null,
) {
  if (urgency === "alto") {
    return COLORS.red
  }

  if (urgency === "medio") {
    return COLORS.yellow
  }

  return COLORS.green
}

function formatDate(
  value: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date)
}

function formatDateOnly(
  value?: string,
): string {
  if (!value) {
    return "Sin especificar"
  }

  const date = new Date(
    `${value}T00:00:00`,
  )

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date)
}

function escapeText(
  value: string | null | undefined,
): string {
  return (
    value
      ?.replace(/\s+/g, " ")
      .trim() || ""
  )
}

function splitText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const clean = escapeText(text)

  if (!clean) {
    return [""]
  }

  const words = clean.split(" ")
  const lines: string[] = []

  let current = ""

  for (const word of words) {
    const candidate = current
      ? `${current} ${word}`
      : word

    if (
      font.widthOfTextAtSize(
        candidate,
        size,
      ) <= maxWidth
    ) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

async function loadLogo(
  pdf: PDFDocument,
  fileName: string,
) {
  const filePath = path.join(
    process.cwd(),
    "public",
    fileName,
  )

  const jpgBuffer =
    await fs.readFile(filePath)

  return pdf.embedJpg(jpgBuffer)
}

function drawContainedImage(
  page: PDFPage,
  image: {
    width: number
    height: number
  },
  options: {
    x: number
    y: number
    maxWidth: number
    maxHeight: number
  },
) {
  const scale = Math.min(
    options.maxWidth / image.width,
    options.maxHeight / image.height,
  )

  const width =
    image.width * scale

  const height =
    image.height * scale

  const x =
    options.x +
    (options.maxWidth - width) / 2

  const y =
    options.y +
    (options.maxHeight - height) / 2

  page.drawImage(image as never, {
    x,
    y,
    width,
    height,
  })
}

function drawHeader(
  page: PDFPage,
  fonts: {
    regular: PDFFont
    bold: PDFFont
  },
  siateLogo: Awaited<
    ReturnType<typeof loadLogo>
  >,
  subsecretariaLogo: Awaited<
    ReturnType<typeof loadLogo>
  >,
) {
  page.drawRectangle({
    x: 0,
    y:
      PAGE_HEIGHT -
      HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: COLORS.graphite,
  })

  /*
   * Área superior de logos.
   *
   * Los dos logos tienen cajas independientes.
   * Esto evita que alguno invada el título
   * aunque las proporciones de los JPG cambien.
   */
  const logoAreaY =
    PAGE_HEIGHT - 16 - 58

  const leftLogoBox = {
    x: MARGIN_X,
    y: logoAreaY,
    maxWidth: 92,
    maxHeight: 58,
  }

  const rightLogoBox = {
    x:
      PAGE_WIDTH -
      MARGIN_X -
      170,
    y: logoAreaY,
    maxWidth: 170,
    maxHeight: 58,
  }

  drawContainedImage(
    page,
    siateLogo,
    leftLogoBox,
  )

  drawContainedImage(
    page,
    subsecretariaLogo,
    rightLogoBox,
  )

  /*
   * Título separado físicamente de los logos.
   */
  page.drawText(
    "INFORME DE INCIDENCIAS ABIERTAS",
    {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 101,
      size: 14,
      font: fonts.bold,
      color: COLORS.white,
    },
  )

  page.drawText(
    "Sistema Integral de Acompañamiento Territorial Educativo",
    {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 119,
      size: 7.5,
      font: fonts.regular,
      color: rgb(
        0.87,
        0.88,
        0.90,
      ),
    },
  )
}

function drawFooter(
  page: PDFPage,
  fonts: {
    regular: PDFFont
  },
  pageNumber: number,
) {
  page.drawLine({
    start: {
      x: MARGIN_X,
      y: 28,
    },
    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X,
      y: 28,
    },
    thickness: 0.5,
    color: COLORS.line,
  })

  page.drawText(
    "SIATE · Informe de incidencias",
    {
      x: MARGIN_X,
      y: 16,
      size: 7,
      font: fonts.regular,
      color: COLORS.muted,
    },
  )

  const pageText =
    `Página ${pageNumber}`

  page.drawText(pageText, {
    x:
      PAGE_WIDTH -
      MARGIN_X -
      fonts.regular.widthOfTextAtSize(
        pageText,
        7,
      ),
    y: 16,
    size: 7,
    font: fonts.regular,
    color: COLORS.muted,
  })
}

function drawSectionTitle(
  page: PDFPage,
  title: string,
  y: number,
  fonts: {
    bold: PDFFont
  },
) {
  page.drawText(title, {
    x: MARGIN_X,
    y,
    size: 9,
    font: fonts.bold,
    color: COLORS.navy,
  })

  page.drawLine({
    start: {
      x: MARGIN_X,
      y: y - 5,
    },
    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X,
      y: y - 5,
    },
    thickness: 0.6,
    color: COLORS.line,
  })
}

function drawSummary(
  page: PDFPage,
  report: ReportData,
  fonts: {
    regular: PDFFont
    bold: PDFFont
  },
  startY: number,
): number {
  let y = startY

  drawSectionTitle(
    page,
    "RESUMEN",
    y,
    fonts,
  )

  /*
   * Cinco tarjetas compactas:
   * Instituciones / Incidencias / Alta / Media / Baja
   */
  y -= 21

  const gap = 6

  const cardWidth =
    (PAGE_WIDTH -
      MARGIN_X * 2 -
      gap * 4) /
    5

  const cardHeight = 45

  const cards = [
    {
      label: "INSTITUCIONES",
      value: String(
        report.totals.institutions,
      ),
      color: COLORS.navy,
    },
    {
      label: "INCIDENCIAS",
      value: String(
        report.totals.incidences,
      ),
      color: COLORS.ink,
    },
    {
      label: "ALTA",
      value: String(
        report.totals.high,
      ),
      color: COLORS.red,
    },
    {
      label: "MEDIA",
      value: String(
        report.totals.medium,
      ),
      color: COLORS.yellow,
    },
    {
      label: "BAJA",
      value: String(
        report.totals.low,
      ),
      color: COLORS.green,
    },
  ]

  for (
    let index = 0;
    index < cards.length;
    index += 1
  ) {
    const card = cards[index]

    const x =
      MARGIN_X +
      index *
        (cardWidth + gap)

    page.drawRectangle({
      x,
      y: y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: COLORS.bone,
      borderColor: COLORS.line,
      borderWidth: 0.45,
    })

    page.drawRectangle({
      x,
      y: y - cardHeight,
      width: 3,
      height: cardHeight,
      color: card.color,
    })

    page.drawText(
      card.label,
      {
        x: x + 9,
        y: y - 15,
        size: 5.5,
        font: fonts.bold,
        color: COLORS.muted,
      },
    )

    page.drawText(
      card.value,
      {
        x: x + 9,
        y: y - 35,
        size: 14,
        font: fonts.bold,
        color: COLORS.ink,
      },
    )
  }

  /*
   * Filtros compactos debajo de las tarjetas.
   */
  y -= cardHeight + 18

  const filters = [
    [
      "Departamento",
      report.filters.departamento ??
        "Todos",
    ],
    [
      "Localidad",
      report.filters.localidad ??
        "Todas",
    ],
    [
      "Criticidad",
      report.filters.urgency
        ? urgencyLabel(
            report.filters.urgency,
          )
        : "Todas",
    ],
    [
      "Período",
      report.filters.from ||
      report.filters.to
        ? `${formatDateOnly(
            report.filters.from,
          )} — ${formatDateOnly(
            report.filters.to,
          )}`
        : "Todos",
    ],
  ]

  for (const [
    label,
    value,
  ] of filters) {
    page.drawText(
      `${label}:`,
      {
        x: MARGIN_X,
        y,
        size: 6.5,
        font: fonts.bold,
        color: COLORS.muted,
      },
    )

    page.drawText(value, {
      x: MARGIN_X + 72,
      y,
      size: 7,
      font: fonts.regular,
      color: COLORS.ink,
    })

    y -= 11
  }

  /*
   * Espacio deliberado entre resumen y
   * primera institución.
   */
  return y - 16
}

function drawUrgencyBadge(
  page: PDFPage,
  urgency: Urgency | null,
  x: number,
  y: number,
  fonts: {
    bold: PDFFont
  },
) {
  const label =
    urgencyLabel(urgency)

  const width =
    fonts.bold.widthOfTextAtSize(
      label.toUpperCase(),
      6.5,
    ) + 16

  page.drawRectangle({
    x,
    y: y - 13,
    width,
    height: 13,
    color: urgencyColor(urgency),
  })

  page.drawText(
    label.toUpperCase(),
    {
      x: x + 8,
      y: y - 9,
      size: 6.5,
      font: fonts.bold,
      color: COLORS.white,
    },
  )
}

function drawInstitutionHeader(
  page: PDFPage,
  institution: ReportInstitution,
  fonts: {
    regular: PDFFont
    bold: PDFFont
  },
  y: number,
): number {
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 66,
    width:
      PAGE_WIDTH -
      MARGIN_X * 2,
    height: 66,
    color: COLORS.graphite,
  })

  page.drawText(
    institution.institutionName,
    {
      x: MARGIN_X + 14,
      y: y - 19,
      size: 11,
      font: fonts.bold,
      color: COLORS.white,
    },
  )

  const metadata =
    [
      `CUE: ${institution.cue}`,
      institution.departamento
        ? `Departamento: ${institution.departamento}`
        : null,
      institution.localidad
        ? `Localidad: ${institution.localidad}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")

  page.drawText(metadata, {
    x: MARGIN_X + 14,
    y: y - 36,
    size: 7,
    font: fonts.regular,
    color: rgb(
      0.88,
      0.89,
      0.91,
    ),
  })

  page.drawText(
    `Criticidad máxima: ${urgencyLabel(
      institution.highestUrgency,
    )}`,
    {
      x: MARGIN_X + 14,
      y: y - 52,
      size: 7,
      font: fonts.bold,
      color:
        urgencyColor(
          institution.highestUrgency,
        ),
    },
  )

  return y - 82
}

function drawIncidence(
  page: PDFPage,
  incidence: ReportRow,
  fonts: {
    regular: PDFFont
    bold: PDFFont
  },
  y: number,
): number {
  const contentWidth =
    PAGE_WIDTH -
    MARGIN_X * 2

  const boxHeight = 230
  const boxTop = y

  page.drawRectangle({
    x: MARGIN_X,
    y: y - boxHeight,
    width: contentWidth,
    height: boxHeight,
    color: COLORS.white,
    borderColor: COLORS.line,
    borderWidth: 0.6,
  })

  page.drawRectangle({
    x: MARGIN_X,
    y: y - 5,
    width: contentWidth,
    height: 5,
    color:
      urgencyColor(
        incidence.currentUrgency,
      ),
  })

  y -= 24

  drawUrgencyBadge(
    page,
    incidence.currentUrgency,
    MARGIN_X + 14,
    y,
    fonts,
  )

  page.drawText(
    `ID: ${incidence.incidenceId}`,
    {
      x:
        MARGIN_X +
        contentWidth -
        170,
      y: y - 9,
      size: 6,
      font: fonts.regular,
      color: COLORS.muted,
    },
  )

  y -= 29

  page.drawText(
    incidence.dimensionName,
    {
      x: MARGIN_X + 14,
      y,
      size: 7.5,
      font: fonts.bold,
      color: COLORS.navy,
    },
  )

  y -= 14

  page.drawText(
    incidence.indicatorName,
    {
      x: MARGIN_X + 14,
      y,
      size: 9.5,
      font: fonts.bold,
      color: COLORS.ink,
    },
  )

  y -= 23

  page.drawText(
    "CONTEXTO",
    {
      x: MARGIN_X + 14,
      y,
      size: 6,
      font: fonts.bold,
      color: COLORS.muted,
    },
  )

  y -= 12

  const contextLines =
    splitText(
      incidence.context,
      fonts.regular,
      7.5,
      contentWidth - 28,
    ).slice(0, 4)

  for (const line of contextLines) {
    page.drawText(line, {
      x: MARGIN_X + 14,
      y,
      size: 7.5,
      font: fonts.regular,
      color: COLORS.ink,
    })

    y -= 10
  }

  y -= 5

  page.drawLine({
    start: {
      x: MARGIN_X + 14,
      y,
    },
    end: {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        14,
      y,
    },
    thickness: 0.5,
    color: COLORS.line,
  })

  y -= 16

  page.drawText(
    "CRITICIDAD",
    {
      x: MARGIN_X + 14,
      y,
      size: 6,
      font: fonts.bold,
      color: COLORS.muted,
    },
  )

  y -= 12

  page.drawText(
    `Original: ${urgencyLabel(
      incidence.originalUrgency,
    )}`,
    {
      x: MARGIN_X + 14,
      y,
      size: 7,
      font: fonts.regular,
      color: COLORS.ink,
    },
  )

  page.drawText(
    `Actual: ${urgencyLabel(
      incidence.currentUrgency,
    )}`,
    {
      x: MARGIN_X + 150,
      y,
      size: 7,
      font: fonts.bold,
      color:
        urgencyColor(
          incidence.currentUrgency,
        ),
    },
  )

  y -= 15

  if (
    incidence.originalUrgency &&
    incidence.originalUrgency !==
      incidence.currentUrgency
  ) {
    page.drawText(
      `Evolución: ${urgencyLabel(
        incidence.originalUrgency,
      )} → ${urgencyLabel(
        incidence.currentUrgency,
      )}`,
      {
        x: MARGIN_X + 14,
        y,
        size: 7,
        font: fonts.bold,
        color: COLORS.navy,
      },
    )
  } else {
    page.drawText(
      "Evolución: sin cambio de criticidad",
      {
        x: MARGIN_X + 14,
        y,
        size: 7,
        font: fonts.regular,
        color: COLORS.muted,
      },
    )
  }

  y -= 18

  page.drawText(
    `Generada: ${formatDate(
      incidence.createdAt,
    )}`,
    {
      x: MARGIN_X + 14,
      y,
      size: 6.3,
      font: fonts.regular,
      color: COLORS.muted,
    },
  )

  page.drawText(
    `Última modificación: ${formatDate(
      incidence.updatedAt,
    )}`,
    {
      x: MARGIN_X + 190,
      y,
      size: 6.3,
      font: fonts.regular,
      color: COLORS.muted,
    },
  )

  y -= 13

  page.drawText(
    `Generado por: ${incidence.generatedBy}`,
    {
      x: MARGIN_X + 14,
      y,
      size: 6.3,
      font: fonts.regular,
      color: COLORS.muted,
    },
  )

  return boxTop - boxHeight - 12
}

export async function GET(
  request: Request,
) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    )
  }

  const url =
    new URL(request.url)

  const departamento =
    url.searchParams.get(
      "departamento",
    ) || undefined

  const localidad =
    url.searchParams.get(
      "localidad",
    ) || undefined

  const urgencyParam =
    url.searchParams.get(
      "urgency",
    ) || undefined

  const from =
    url.searchParams.get(
      "from",
    ) || undefined

  const to =
    url.searchParams.get(
      "to",
    ) || undefined

  let urgency:
    | Urgency
    | undefined

  if (
    urgencyParam === "alto" ||
    urgencyParam === "medio" ||
    urgencyParam === "bajo"
  ) {
    urgency = urgencyParam
  }

  try {
    const report =
      (await getOpenIncidencesReport(
        {
          roleId:
            session.user.roleId,
          departamento:
            session.user.departamento,
        },
        {
          departamento,
          localidad,
          urgency,
          from,
          to,
        },
      )) as ReportData

    const pdf =
      await PDFDocument.create()

    pdf.setTitle(
      "Informe de Incidencias Abiertas",
    )

    pdf.setAuthor("SIATE")

    pdf.setSubject(
      "Informe institucional de incidencias abiertas",
    )

    pdf.setCreator(
      "Sistema Integral de Acompañamiento Territorial Educativo",
    )

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      )

    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      )

    const siateLogo =
      await loadLogo(
        pdf,
        "SIATE.jpg",
      )

    const subsecretariaLogo =
      await loadLogo(
        pdf,
        "logo-subsecretaria.jpg",
      )

    const fonts = {
      regular,
      bold,
    }

    let pageNumber = 0
    let y = 0

    const newPage = (): PDFPage => {
      pageNumber += 1

      const newPdfPage =
        pdf.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ])

      drawHeader(
        newPdfPage,
        fonts,
        siateLogo,
        subsecretariaLogo,
      )

      drawFooter(
        newPdfPage,
        fonts,
        pageNumber,
      )

      y = BODY_TOP

      return newPdfPage
    }

    let page = newPage()

    y = drawSummary(
      page,
      report,
      fonts,
      y,
    )

    for (
      let index = 0;
      index <
      report.institutions.length;
      index += 1
    ) {
      const institution =
        report.institutions[index]

      if (y < 245) {
        page = newPage()
        y = BODY_TOP
      }

      y =
        drawInstitutionHeader(
          page,
          institution,
          fonts,
          y,
        )

      for (
        let incidenceIndex = 0;
        incidenceIndex <
        institution.incidences.length;
        incidenceIndex += 1
      ) {
        const incidence =
          institution.incidences[
            incidenceIndex
          ]

        if (y < 290) {
          page = newPage()

          y = BODY_TOP

          y =
            drawInstitutionHeader(
              page,
              institution,
              fonts,
              y,
            )
        }

        y = drawIncidence(
          page,
          incidence,
          fonts,
          y,
        )
      }

      y -= 4
    }

    if (
      report.institutions.length === 0
    ) {
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 65,
        width:
          PAGE_WIDTH -
          MARGIN_X * 2,
        height: 65,
        color: COLORS.bone,
        borderColor: COLORS.line,
        borderWidth: 0.5,
      })

      page.drawText(
        "No se encontraron incidencias abiertas",
        {
          x: MARGIN_X + 16,
          y: y - 25,
          size: 10,
          font: fonts.bold,
          color: COLORS.ink,
        },
      )

      page.drawText(
        "No existen registros que coincidan con los filtros seleccionados.",
        {
          x: MARGIN_X + 16,
          y: y - 44,
          size: 7,
          font: fonts.regular,
          color: COLORS.muted,
        },
      )
    }

    const pdfBytes =
      await pdf.save()

    const fileName =
      `informe-incidencias-abiertas-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`

    return new Response(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="${fileName}"`,
          "Cache-Control":
            "no-store",
        },
      },
    )
  } catch (error) {
    console.error(
      "Error generating incidences PDF:",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudo generar el informe PDF de incidencias.",
      },
      {
        status: 500,
      },
    )
  }
}