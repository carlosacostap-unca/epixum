'use server'

import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function extractResourcesFromText(text: string) {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: 'OpenAI API Key no configurada' }
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente útil que extrae recursos educativos de textos no estructurados.
                    Debes devolver un JSON válido que contenga un array de objetos bajo la clave "resources".
                    Cada objeto debe tener:
                    - "title": El título o descripción del recurso.
                    - "url": La URL del recurso.
                    - "type": Uno de los siguientes valores: "link", "video", "file".
                    
                    Reglas para "type":
                    - "video": Para enlaces de YouTube, Vimeo, Google Meet, Zoom, o grabaciones de video.
                    - "file": Para enlaces de Google Drive, Dropbox, o archivos directos (pdf, doc, zip, mp4).
                    - "link": Para cualquier otro enlace web.
                    
                    Si hay múltiples recursos, extráelos todos.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: { type: "json_object" }
        })

        const content = completion.choices[0].message.content
        if (!content) {
            throw new Error("No se recibió respuesta del modelo")
        }

        const result = JSON.parse(content)
        return { success: true, data: result.resources }

    } catch (error: any) {
        console.error('Error extracting resources:', error)
        return { success: false, error: error.message || 'Error al procesar el texto con IA' }
    }
}
