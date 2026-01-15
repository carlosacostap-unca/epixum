'use server'

import OpenAI from 'openai'

export async function extractResourcesFromText(text: string) {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: 'OpenAI API Key no configurada' }
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

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

export async function extractAssignmentFromText(text: string) {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: 'OpenAI API Key no configurada' }
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente útil que extrae información de trabajos prácticos de textos no estructurados.
                    Debes devolver un JSON válido con la siguiente estructura:
                    {
                        "title": "Título del TP",
                        "description": "Descripción breve o contenido principal",
                        "due_date": "YYYY-MM-DDTHH:mm:ss" (ISO 8601, inferir año actual si falta),
                        "resources": [
                            { "title": "...", "url": "...", "type": "link|video|file" }
                        ]
                    }

                    Reglas:
                    - Extrae la fecha límite y conviértela a formato ISO.
                    - Extrae todos los enlaces como recursos (enunciado, formularios, planillas).
                    - Si hay múltiples formularios, inclúyelos como recursos separados.`
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
        return { success: true, data: result }

    } catch (error: any) {
        console.error('Error extracting assignment:', error)
        return { success: false, error: error.message || 'Error al procesar el TP con IA' }
    }
}

export async function extractStudentsFromText(text: string) {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: 'OpenAI API Key no configurada' }
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente útil que extrae información de estudiantes de textos no estructurados (copiados de excel/tablas).
                    Debes devolver un JSON válido con la siguiente estructura:
                    {
                        "students": [
                            {
                                "last_name": "Apellido/s",
                                "first_name": "Nombre/s",
                                "dni": "DNI/Pasaporte (solo números si es posible)",
                                "birth_date": "YYYY-MM-DD" (convertir a formato ISO si es posible, sino dejar null),
                                "phone": "Teléfono",
                                "email": "Correo Electrónico"
                            }
                        ]
                    }

                    Reglas:
                    - Normaliza los nombres (Capitalize).
                    - Intenta parsear fechas de nacimiento al formato ISO YYYY-MM-DD. Si no puedes, devuelve null.
                    - Limpia el DNI de puntos.
                    - Ignora las filas de encabezado.
                    - Es MUY IMPORTANTE que si falta algún dato (como DNI, email o teléfono) o la celda está vacía, devuelvas null o un string vacío para ese campo. No inventes datos.`
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
        return { success: true, data: result.students }

    } catch (error: any) {
        console.error('Error extracting students:', error)
        return { success: false, error: error.message || 'Error al procesar estudiantes con IA' }
    }
}

export async function matchStudentsWithAI(simpleList: any[], detailedList: any[]) {
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: 'OpenAI API Key no configurada' }
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente experto en conciliación de datos de estudiantes.
                    Recibirás dos listas:
                    1. "simpleList": Lista de nombres extraída de un texto simple (puede tener errores, faltar segundo nombre, etc).
                    2. "detailedList": Lista maestra con datos completos (email, DNI, nombres completos).

                    Tu tarea es encontrar para cada estudiante de "simpleList", su correspondencia exacta o más probable en "detailedList".
                    
                    Debes devolver un JSON válido con dos arrays:
                    - "found": Array de objetos de los estudiantes encontrados. Debe contener TODOS los campos del objeto de "detailedList", más un campo "original_match" que sea el objeto correspondiente de "simpleList".
                    - "notFound": Array con los objetos de "simpleList" que NO se encontraron en "detailedList".

                    Criterios de coincidencia:
                    - Prioriza coincidencia aproximada de apellidos y nombres.
                    - Ignora mayúsculas, minúsculas y tildes.
                    - Ten en cuenta que "simpleList" puede tener el orden "Nombre Apellido" o "Apellido Nombre", intenta inferir.
                    - Si la confianza es baja, ponlo en "notFound".`
                },
                {
                    role: "user",
                    content: JSON.stringify({ simpleList, detailedList })
                }
            ],
            response_format: { type: "json_object" }
        })

        const content = completion.choices[0].message.content
        if (!content) {
            throw new Error("No se recibió respuesta del modelo")
        }

        const result = JSON.parse(content)
        return { success: true, data: result }

    } catch (error: any) {
        console.error('Error matching students:', error)
        return { success: false, error: error.message || 'Error al procesar la conciliación con IA' }
    }
}
