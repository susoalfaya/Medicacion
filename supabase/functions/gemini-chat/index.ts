import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_INSTRUCTION = `
Eres un asistente médico experto. Tu tarea es analizar imágenes de recetas médicas o cajas de medicamentos.
La imagen puede contener UNO o MÚLTIPLES medicamentos distintos. Debes identificarlos todos.

Para CADA medicamento o cura identificada, extrae:
1. Nombre del medicamento o procedimiento.
2. Dosis o descripción breve (ej. "500mg", "Aplicar en herida").
3. Frecuencia en horas (ej. si es cada 8 horas, devuelve 8). Si no se especifica, estima lo habitual o devuelve 24.

Devuelve un array JSON con todos los items encontrados.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no configurada')
    }

    const { base64Image } = await req.json()

    // Limpiar base64
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "")

    // Llamar a Gemini API con imagen
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: cleanBase64
                }
              },
              {
                text: "Analiza esta imagen y extrae la lista completa de medicamentos y sus pautas."
              }
            ]
          }],
          systemInstruction: {
            parts: [{
              text: SYSTEM_INSTRUCTION
            }]
          },
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "Nombre del medicamento" },
                  description: { type: "STRING", description: "Dosis o instrucciones" },
                  frequencyHours: { type: "NUMBER", description: "Frecuencia en horas" }
                },
                required: ["name", "frequencyHours"]
              }
            }
          }
        })
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en Gemini API')
    }

    const text = data.candidates[0].content.parts[0].text

    return new Response(
      JSON.stringify({ response: text }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})