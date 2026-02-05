export type TreatmentType = 'medication' | 'cure';

export interface Treatment {
  id: string;              // UUID from Supabase
  userId: string;          // UUID
  name: string;
  type: TreatmentType;
  description?: string;
  frequencyHours: number;
  nextScheduledTime: number; // Timestamp (ms)
  startDate: number;         // Timestamp (ms)
  active: boolean;           // Estado de baja manual
  // Nuevos campos para control de duración
  durationDays: number | null; // null significa tratamiento crónico
  endDate: number | null;      // Timestamp (ms) del fin del tratamiento
}

export interface HistoryLog {
  id: string;              // UUID
  treatmentId: string;
  treatmentName: string;
  userId: string;
  timestamp: number;       // Hora programada
  actualTime: number;      // Hora real de la acción
  status: 'taken' | 'skipped';
  type: TreatmentType;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface ScannedMedication {
  name: string;
  description: string;
  frequencyHours: number;
}

// ========== INTERFACES PARA NOTIFICACIONES ==========

export interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number; // Minutos de antelación antes de tomar el medicamento
  sound: boolean;
  vibration: boolean;
}