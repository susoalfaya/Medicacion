export type TreatmentType = 'medication' | 'cure';

export interface Treatment {
  id: string;
  userId: string;
  name: string;
  type: TreatmentType;
  description?: string; // e.g., "500mg", "Lavar con suero"
  frequencyHours: number; // 0 if manual/once
  nextScheduledTime: number; // Timestamp
  startDate: number; // Timestamp
  imageUrl?: string; // Optional image of the box/wound
  active: boolean;
}

export interface HistoryLog {
  id: string;
  treatmentId: string;
  treatmentName: string;
  userId: string;
  timestamp: number; // When the action was recorded
  actualTime: number; // When the user actually took it
  status: 'taken' | 'skipped';
  type: TreatmentType;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string;
  pin?: string;
}

export interface ScannedMedication {
  name: string;
  description: string;
  frequencyHours: number;
}