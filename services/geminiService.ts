import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

interface MedicationResult {
  name: string;
  dosage: string;
  frequency?: string;
}

export async function analyzeMedicationImage(file: File): Promise<MedicationResult[]> {
  try {
    // Convertir imagen a base64
    const base64Image = await fileToBase64(file);
    
    // Llamar a Supabase Edge Function
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { 
        base64Image,
        prompt: 'Analiza esta imagen de medicamento y extrae: nombre del medicamento, dosis/concentración. Responde SOLO con JSON en este formato: [{"name": "nombre", "dosage": "dosis"}]'
      }
    });

    if (error) {
      console.error('Error calling Supabase function:', error);
      throw error;
    }

    if (!data || !data.medications) {
      return [];
    }

    return data.medications;
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
      // Remover el prefijo "data:image/...;base64,"
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}