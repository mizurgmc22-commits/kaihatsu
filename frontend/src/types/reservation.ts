import type { Equipment } from "./equipment";

export enum ReservationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export interface User {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export interface Reservation {
  id: string;
  equipmentId?: string;
  equipment?: Equipment | null;
  customEquipmentName?: string;
  user?: User;
  department: string;
  applicantName: string;
  contactInfo: string;
  startTime: string;
  endTime: string;
  quantity: number;
  purpose?: string;
  location?: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationInput {
  equipmentId?: string;
  customEquipmentName?: string;
  department: string;
  applicantName: string;
  contactInfo: string;
  startTime: string;
  endTime: string;
  quantity?: number;
  purpose?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface AvailableEquipment extends Equipment {
  remainingQuantity: number;
  isAvailable: boolean;
  isUnlimited: boolean;
}

export interface DailyReservation {
  id: string;
  quantity: number;
  purpose?: string;
  userName: string;
  status: string;
}

export interface DailyAvailability {
  remaining: number;
  reservations: DailyReservation[];
}

export interface CalendarData {
  equipment: {
    id: string;
    name: string;
    totalQuantity: number;
  };
  dailyAvailability: Record<string, DailyAvailability>;
}
