export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      error: 'Falta configurar OPENAI_API_KEY en Vercel.',
    })
  }

  const proceso = req.body?.proceso

  if (!proceso || !Array.isArray(proceso.pasos) || proceso.pasos.length === 0) {
    return res.status(400).json({
      error: 'El proceso no contiene pasos.',
    })
  }

  const instructions = `
Sos un analista de procesos de negocio.
Convertí el diagrama recibido en una descripción textual clara y fiel.

Reglas:
- No inventes actividades, responsables, sistemas, motivos ni resultados.
- Respetá el sentido de las flechas.
- Explicá bifurcaciones, decisiones y caminos paralelos.
- Mencioná áreas/cajas cuando ayuden a entender el flujo.
- Incorporá etiquetas de conexiones si existen.
- No describas IDs, coordenadas, colores ni detalles visuales.
- No sugieras mejoras.
- Escribí en español de Argentina, profesional y simple.
- Formato: introducción breve + "Flujo del proceso" + pasos numerados.
`.trim()

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PROCESS_MODEL || 'gpt-5.6-luna',
        instructions,
        input: `Este es el proceso dibujado en ProjectFlow:\n\n${JSON.stringify(proceso, null, 2)}`,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'OpenAI no pudo generar la descripción.',
      })
    }

    const texto = (data?.output || [])
      .flatMap((item) => item?.content || [])
      .filter((item) => item?.type === 'output_text' && item?.text)
      .map((item) => item.text)
      .join('\n')
      .trim()

    if (!texto) {
      return res.status(502).json({
        error: 'OpenAI respondió sin texto.',
      })
    }

    return res.status(200).json({ texto })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Error al comunicarse con OpenAI.',
    })
  }
}
