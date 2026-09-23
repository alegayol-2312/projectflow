export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      endpoint: 'text-to-process',
      model:
        process.env.OPENAI_PROCESS_MODEL ||
        'gpt-5.6-luna',
      hasApiKey:
        Boolean(
          process.env.OPENAI_API_KEY
        ),
    })
  }

  if (req.method !== 'POST') {
    res.setHeader(
      'Allow',
      'GET, POST'
    )

    return res
      .status(405)
      .json({
        error:
          'Método no permitido.',
      })
  }

  const apiKey =
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    return res
      .status(500)
      .json({
        error:
          'Falta configurar OPENAI_API_KEY en Vercel.',
      })
  }

  const nombre =
    String(
      req.body?.nombre || ''
    ).trim()

  const descripcion =
    String(
      req.body?.descripcion || ''
    ).trim()

  const texto =
    String(
      req.body?.texto || ''
    ).trim()

  if (!nombre || !texto) {
    return res
      .status(400)
      .json({
        error:
          'Faltan el nombre o el texto del proceso.',
      })
  }

  if (texto.length > 16000) {
    return res
      .status(400)
      .json({
        error:
          'El texto es demasiado largo para esta primera versión.',
      })
  }

  const schema = {
    type: 'object',

    properties: {
      nodos: {
        type: 'array',

        items: {
          type: 'object',

          properties: {
            id: {
              type: 'string',
            },

            tipo: {
              type: 'string',
              enum: [
                'InicioFin',
                'Actividad',
                'Documento',
                'Decision',
                'BaseDeDatos',
                'ProcesoPredefinido',
                'Referencia',
                'Preparacion',
                'NotaProceso',
                'Datos',
                'EntradaManual',
                'OperacionManual',
                'ConectorVertical',
              ],
            },

            texto: {
              type: 'string',
            },

            columna: {
              type: 'integer',
            },

            fila: {
              type: 'integer',
            },
          },

          required: [
            'id',
            'tipo',
            'texto',
            'columna',
            'fila',
          ],

          additionalProperties:
            false,
        },
      },

      conexiones: {
        type: 'array',

        items: {
          type: 'object',

          properties: {
            origen: {
              type: 'string',
            },

            destino: {
              type: 'string',
            },

            etiqueta: {
              type: 'string',
            },
          },

          required: [
            'origen',
            'destino',
            'etiqueta',
          ],

          additionalProperties:
            false,
        },
      },
    },

    required: [
      'nodos',
      'conexiones',
    ],

    additionalProperties:
      false,
  }

  const instructions = `
Sos un analista de procesos y modelador de diagramas.

Convertí el texto del usuario en un diagrama de proceso que ProjectFlow pueda dibujar.

Objetivo principal:
Representar fielmente lo escrito, sin inventar actividades, decisiones, responsables, sistemas ni resultados que el usuario no haya indicado.

Reglas para los componentes:
- Usá "InicioFin" para el inicio y el fin cuando estén implícitos o explícitos.
- Usá "Actividad" para acciones o tareas.
- Usá "Decision" cuando exista una condición real: si/no, aprobado/rechazado, válido/no válido u otra bifurcación.
- Usá "Documento" solamente cuando el texto describa un documento.
- Usá "BaseDeDatos" cuando se mencione explícitamente almacenamiento o consulta de una base de datos.
- Usá "ProcesoPredefinido" cuando el texto haga referencia a otro proceso o subproceso.
- Usá "Datos", "EntradaManual", "OperacionManual", "Preparacion", "Referencia", "NotaProceso" o "ConectorVertical" solo si aportan una representación clara y están justificadas por el texto.
- Preferí pocos componentes claros antes que muchos componentes artificiales.

Reglas para las conexiones:
- Cada flecha debe respetar el orden y sentido real del proceso.
- En decisiones, generá una conexión por cada salida.
- La etiqueta de la conexión debe contener únicamente el nombre de la condición o camino, por ejemplo "Sí", "No", "Aprobado", "Rechazado".
- Si una flecha no necesita etiqueta, devolvé "".

Layout:
- "columna" representa avance horizontal de izquierda a derecha, comenzando en 0.
- "fila" representa bifurcaciones verticales, comenzando en 0.
- El flujo principal debe intentar mantenerse en fila 0.
- Para alternativas o ramas, usá filas 1, 2, etc.
- Cuando una rama vuelve al flujo principal, conectala al nodo correspondiente.
- No uses coordenadas; sólo columna y fila.

IDs:
- Usá IDs cortos y únicos como n1, n2, n3.
- Todas las conexiones deben referenciar IDs existentes.

No agregues comentarios fuera del JSON.
`.trim()

  try {
    const openaiResponse =
      await fetch(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              model:
                process.env.OPENAI_PROCESS_MODEL ||
                'gpt-5.6-luna',

              instructions,

              input: `
Nombre del proceso:
${nombre}

Descripción:
${descripcion || '(sin descripción)'}

Texto del usuario:
${texto}
`.trim(),

              text: {
                format: {
                  type:
                    'json_schema',

                  name:
                    'projectflow_process',

                  strict: true,

                  schema,
                },
              },
            }),
        }
      )

    const rawOpenAI =
      await openaiResponse.text()

    let data = null

    if (rawOpenAI.trim()) {
      try {
        data =
          JSON.parse(rawOpenAI)
      } catch {
        console.error(
          'Respuesta no JSON de OpenAI:',
          rawOpenAI
        )
      }
    }

    if (!openaiResponse.ok) {
      console.error(
        'OpenAI HTTP error:',
        openaiResponse.status,
        rawOpenAI
      )

      return res
        .status(
          openaiResponse.status
        )
        .json({
          error:
            data?.error?.message ||
            `OpenAI respondió ${openaiResponse.status} ${openaiResponse.statusText}.`,
        })
    }

    const outputText =
      (data?.output || [])
        .flatMap(
          (item) =>
            item?.content || []
        )
        .find(
          (item) =>
            item?.type ===
              'output_text' &&
            item?.text
        )?.text

    if (!outputText) {
      const refusal =
        (data?.output || [])
          .flatMap(
            (item) =>
              item?.content || []
          )
          .find(
            (item) =>
              item?.type ===
              'refusal'
          )

      return res
        .status(502)
        .json({
          error:
            refusal?.refusal ||
            'OpenAI respondió sin un proceso estructurado.',
        })
    }

    let proceso = null

    try {
      proceso =
        JSON.parse(outputText)
    } catch {
      return res
        .status(502)
        .json({
          error:
            'OpenAI devolvió una estructura que no pudo interpretarse.',
        })
    }

    return res
      .status(200)
      .json({
        proceso,
      })
  } catch (error) {
    console.error(error)

    return res
      .status(500)
      .json({
        error:
          'Error al comunicarse con OpenAI.',
      })
  }
}
