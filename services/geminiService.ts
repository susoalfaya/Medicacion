import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// 1. Ajustamos la interfaz para que coincida con lo que la IA envía: "description" y "frequencyHours"
interface MedicationResult {
  name: string;
  description: string; 
  frequencyHours?: number;
}

export async function analyzeMedicationImage(file: File): Promise<MedicationResult[]> {
  try {
    const base64Image = await fileToBase64(file);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { base64Image } 
    });

    if (error) throw error;

    // 2. PASO CLAVE: La IA devuelve { "response": "[...]" }. 
    // Hay que convertir ese texto ("response") en una lista de verdad.
    if (data && data.response) {
      try {
        const listaParseada = JSON.parse(data.response);
        return listaParseada; // Ahora sí devuelve el array de medicamentos
      } catch (parseError) {
        console.error("La IA no respondió con un JSON válido:", parseError);
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error('Error analyzing medication image:', error);
    return [];
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}