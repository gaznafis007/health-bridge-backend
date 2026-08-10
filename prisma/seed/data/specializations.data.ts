/** Specializations used for appointment doctor search (case-insensitive substring match). */
export const MEDICAL_SPECIALIZATIONS = [
  'Cardiology',
  'General Medicine',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Gynecology',
  'Neurology',
  'ENT',
  'Psychiatry',
  'Ophthalmology',
] as const;

export type MedicalSpecialization = (typeof MEDICAL_SPECIALIZATIONS)[number];

export const DOCTORS_PER_SPECIALIZATION = 5;
