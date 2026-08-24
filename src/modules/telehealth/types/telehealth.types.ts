import { TelehealthPresence, TelehealthStatus } from '@prisma/client';

export type EffectiveAvailability = 'ONLINE' | 'BUSY' | 'IN_CALL' | 'OFFLINE';

export interface TelehealthRequestView {
  id: string;
  patientId: string;
  doctorId: string | null;
  status: TelehealthStatus;
  queuePriority: number;
  offerExpiresAt: string | null;
  searchExpiresAt: string | null;
  offerAttempts: number;
  emergencyType: string | null;
  reasonForVisit: string | null;
  notes: string | null;
  consultationFee: string;
  requestedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  waitingForDoctor: boolean;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization?: string;
  } | null;
}

export interface DoctorPresenceView {
  presence: TelehealthPresence;
  effectiveAvailability: EffectiveAvailability;
  onlineUntil: string | null;
  isProvideTeleHealth: boolean;
  pendingOffers: number;
}
