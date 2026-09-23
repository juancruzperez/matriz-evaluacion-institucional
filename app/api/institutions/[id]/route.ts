import { auth } from "@/auth"
import { Pool } from "@neondatabase/serverless"

type UpdateInstitutionBody = {
  directivoNombre?: string | null
  sinDirectivoAsignado?: boolean
  telefono?: string[]
  email?: string[]
}

type InstitutionRow = {
  id: string
  departamento: string | null
  telefono: string[] | null
  email: string[] | null
}

type CurrentDirectiveRow = {
  relation_id: string
  directivo_id: string
  nombre: string
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured")
}

const pool = new Pool({
  connectionString: databaseUrl,
})

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const session = await auth()

  if (!session?.user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  if (
    !session.user.permissions.includes(
      "institution:update",
    )
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    )
  }

  const { id } = await context.params

  let body: UpdateInstitutionBody

  try {
    body =
      (await request.json()) as UpdateInstitutionBody
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  /*
   * Validación de teléfonos.
   */
  if (
    body.telefono !== undefined &&
    !Array.isArray(body.telefono)
  ) {
    return Response.json(
      {
        error:
          "telefono debe ser un arreglo de textos.",
      },
      { status: 400 },
    )
  }

  /*
   * Validación de emails.
   */
  if (
    body.email !== undefined &&
    !Array.isArray(body.email)
  ) {
    return Response.json(
      {
        error:
          "email debe ser un arreglo de textos.",
      },
      { status: 400 },
    )
  }

  /*
   * Validación del nombre del directivo.
   */
  if (
    body.directivoNombre !== undefined &&
    body.directivoNombre !== null &&
    typeof body.directivoNombre !== "string"
  ) {
    return Response.json(
      {
        error:
          "directivoNombre debe ser un texto o null.",
      },
      { status: 400 },
    )
  }

  /*
   * Validación de sinDirectivoAsignado.
   */
  if (
    body.sinDirectivoAsignado !== undefined &&
    typeof body.sinDirectivoAsignado !== "boolean"
  ) {
    return Response.json(
      {
        error:
          "sinDirectivoAsignado debe ser boolean.",
      },
      { status: 400 },
    )
  }

  /*
   * La información del directivo solamente se valida
   * cuando el request intenta modificarla.
   *
   * Si ninguno de los dos campos viene en el PATCH,
   * significa que no se está modificando el directivo.
   */
  const modifyingDirectivo =
    body.directivoNombre !== undefined ||
    body.sinDirectivoAsignado !== undefined

  let directivoNombre: string | null = null
  let sinDirectivoAsignado = false

  if (modifyingDirectivo) {
    directivoNombre =
      body.directivoNombre?.trim() || null

    sinDirectivoAsignado =
      body.sinDirectivoAsignado === true

    /*
     * No puede haber simultáneamente un nombre
     * y la indicación de que no existe directivo.
     */
    if (
      directivoNombre &&
      sinDirectivoAsignado
    ) {
      return Response.json(
        {
          error:
            "No puede indicar un directivo y marcar simultáneamente que el establecimiento no tiene directivo asignado.",
        },
        { status: 400 },
      )
    }

    /*
     * Debe ocurrir obligatoriamente una de las dos cosas:
     * 1. nombre de directivo
     * 2. sin directivo asignado
     */
    if (
      !directivoNombre &&
      !sinDirectivoAsignado
    ) {
      return Response.json(
        {
          error:
            "Debe indicar el nombre del directivo o confirmar que actualmente el establecimiento no tiene directivo asignado.",
        },
        { status: 400 },
      )
    }
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    /*
     * Buscamos la institución y obtenemos
     * los datos actuales para preservar
     * los campos que no fueron enviados.
     */
    const institutionResult =
      await client.query<InstitutionRow>(
        `
          SELECT
            id,
            departamento,
            telefono,
            email
          FROM institutions
          WHERE id = $1
          LIMIT 1
        `,
        [id],
      )

    const institution =
      institutionResult.rows[0]

    if (!institution) {
      await client.query("ROLLBACK")

      return Response.json(
        { error: "Institution not found" },
        { status: 404 },
      )
    }

    /*
     * Alcance territorial:
     * un responsable territorial solamente puede
     * modificar instituciones de su departamento.
     */
    if (
      session.user.roleId ===
        "responsable_territorial" &&
      session.user.departamento !==
        institution.departamento
    ) {
      await client.query("ROLLBACK")

      return Response.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    /*
     * PATCH parcial:
     *
     * Si el campo vino en el request,
     * usamos el nuevo valor.
     *
     * Si no vino,
     * conservamos el valor persistido.
     */
    const telefono =
      body.telefono !== undefined
        ? body.telefono
            .map((value) => value.trim())
            .filter(Boolean)
        : institution.telefono ?? []

    const email =
      body.email !== undefined
        ? body.email
            .map((value) => value.trim())
            .filter(Boolean)
        : institution.email ?? []

    await client.query(
      `
        UPDATE institutions
        SET
          telefono = $1,
          email = $2
        WHERE id = $3
      `,
      [telefono, email, id],
    )

    /*
     * Actualización del directivo.
     */
    if (modifyingDirectivo) {
      const nombreParaPersistir =
        sinDirectivoAsignado
          ? "Sin directivo asignado"
          : directivoNombre

      const directiveResult =
        await client.query<CurrentDirectiveRow>(
          `
            SELECT
              idr.id AS relation_id,
              idr.directivo_id,
              d.nombre
            FROM institution_directives idr
            INNER JOIN directivos d
              ON d.id = idr.directivo_id
            WHERE idr.institution_id = $1
            ORDER BY
              CASE
                WHEN idr.hasta IS NULL THEN 0
                ELSE 1
              END,
              idr.desde DESC NULLS LAST,
              idr.created_at DESC
            LIMIT 1
          `,
          [id],
        )

      const currentDirective =
        directiveResult.rows[0]

      if (currentDirective) {
        /*
         * Existe un directivo relacionado:
         * actualizamos solamente su nombre.
         */
        await client.query(
          `
            UPDATE directivos
            SET nombre = $1
            WHERE id = $2
          `,
          [
            nombreParaPersistir,
            currentDirective.directivo_id,
          ],
        )
      } else {
        /*
         * No existe una relación previa:
         * creamos el directivo y su relación
         * con la institución.
         */
        const directivoResult =
          await client.query<{ id: string }>(
            `
              INSERT INTO directivos (
                nombre
              )
              VALUES ($1)
              RETURNING id
            `,
            [nombreParaPersistir],
          )

        const directivo =
          directivoResult.rows[0]

        await client.query(
          `
            INSERT INTO institution_directives (
              institution_id,
              directivo_id,
              desde
            )
            VALUES (
              $1,
              $2,
              CURRENT_DATE
            )
          `,
          [id, directivo.id],
        )
      }
    }

    /*
     * Recuperamos la institución ya actualizada
     * para devolver al frontend exactamente
     * el estado persistido.
     */
    const updatedResult =
      await client.query(
        `
          SELECT
            i.id,
            i.cue,
            i.name,
            i.address,
            i.sector,
            i.latitude,
            i.longitude,
            i.localidad,
            i.departamento,
            i.ambito,
            i.telefono,
            i.email,
            d.id AS directivo_id,
            d.nombre AS directivo_nombre,
            idr.desde AS directivo_desde,
            idr.hasta AS directivo_hasta
          FROM institutions i
          LEFT JOIN LATERAL (
            SELECT *
            FROM institution_directives
            WHERE institution_id = i.id
            ORDER BY
              CASE
                WHEN hasta IS NULL THEN 0
                ELSE 1
              END,
              desde DESC NULLS LAST,
              created_at DESC
            LIMIT 1
          ) idr ON TRUE
          LEFT JOIN directivos d
            ON d.id = idr.directivo_id
          WHERE i.id = $1
          LIMIT 1
        `,
        [id],
      )

    await client.query("COMMIT")

    return Response.json(
      updatedResult.rows[0],
    )
  } catch (error) {
    await client.query("ROLLBACK")

    console.error(
      "Error updating institution:",
      error,
    )

    return Response.json(
      {
        error:
          "No se pudieron actualizar los datos de la institución.",
      },
      { status: 500 },
    )
  } finally {
    client.release()
  }
}