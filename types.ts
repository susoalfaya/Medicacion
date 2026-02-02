export type TreatmentType = 'medication' | 'cure';

export interface Treatment {
  id: string; // UUID from Supabase
  userId: string; // UUID
  name: string;
  type: TreatmentType;
  description?: string;
  frequencyHours: number;
  nextScheduledTime: number; // Timestamp
  startDate: number; // Timestamp
  active: boolean;
}

export interface HistoryLog {
  id: string; // UUID
  treatmentId: string;
  treatmentName: string;
  userId: string;
  timestamp: number;
  actualTime: number;
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