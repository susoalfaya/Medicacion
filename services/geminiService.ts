import { GoogleGenAI, Type } from "@google/genai";
import { ScannedMedication } from "../types";

const SYSTEM_INSTRUCTION = `
Eres un asistente médico experto. Tu tarea es analizar imágenes de recetas médicas o cajas de medicamentos.
La imagen puede contener UNO o MÚLTIPLES medicamentos distintos. Debes identificarlos todos.

Para CADA medicamento o cura identificada, extrae:
1. Nombre del medicamento o procedimiento.
2. Dosis o descripción breve (ej. "500mg", "Aplicar en herida").
3. Frecuencia en horas (ej. si es cada 8 horas, devuelve 8). Si no se especifica, estima lo habitual o devuelve 24.

Devuelve un array JSON con todos los items encontrados.
`;

export const analyzeRecipeImage = async (base64Image: string): Promise<ScannedMedication[]> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    throw new Error("Clave API no configurada. Revisa los 'Secrets' en GitHub.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Clean base64 string if it contains headers
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: "Analiza esta imagen y extrae la lista completa de medicamentos y sus pautas.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nombre del medicamento" },
              description: { type: Type.STRING, description: "Dosis o instrucciones" },
              frequencyHours: { type: Type.NUMBER, description: "Frecuencia en horas (ej. 8)" },
            },
            required: ["name", "frequencyHours"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    try {
      const data = JSON.parse(text) as ScannedMedication[];
      return data;
    } catch (parseError) {
      console.error("Error parsing JSON from Gemini:", parseError);
      return [];
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Convert error to string for analysis and combine standard message + detailed JSON if available
    const errorMsg = (error.message || '') + JSON.stringify(error).toLowerCase();

    // Detectar clave revocada (leaked)
    if (errorMsg.includes("leaked") || errorMsg.includes("permission_denied")) {
        throw new Error("🚨 CLAVE BLOQUEADA: Tu API KEY ha sido detectada como pública. Genera una nueva en Google AI Studio y actualiza GitHub Secrets.");
    }

    // Detectar clave expirada o inválida (Code 400)
    if (errorMsg.includes("expired") || errorMsg.includes("api key not valid") || errorMsg.includes("api_key_invalid") || errorMsg.includes("400")) {
        throw new Error("⌛ CLAVE NO ACTUALIZADA: La web está usando una clave antigua. Si ya la cambiaste en GitHub, espera a que termine el 'Action' y recarga la página borrando caché.");
    }
    
    throw new Error("No se pudo analizar la imagen. Inténtalo de nuevo.");
  }
};