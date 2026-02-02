import { createClient } from '@supabase/supabase-js'
import { ScannedMedication } from "../types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const analyzeRecipeImage = async (base64Image: string): Promise<ScannedMedication[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { base64Image }
    })

    if (error) {
      console.error("Supabase Function Error:", error)
      throw new Error("No se pudo analizar la imagen. Inténtalo de nuevo.")
    }

    if (!data?.response) return []

    try {
      const medications = JSON.parse(data.response) as ScannedMedication[]
      return medications
    } catch (parseError) {
      console.error("Error parsing JSON from Gemini:", parseError)
      return []
    }

  } catch (error: any) {
    console.error("Error:", error)
    throw new Error("No se pudo analizar la imagen. Inténtalo de nuevo.")
  }
}