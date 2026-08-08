/** Stable UUIDs so child upserts can reference parents across re-runs. */
export const IDS = {
  healthCenter: {
    hospital: '00000000-0000-4000-8000-000000000001',
    clinic: '00000000-0000-4000-8000-000000000002',
    uttaraHospital: '00000000-0000-4000-8000-000000000003',
    mirpurClinic: '00000000-0000-4000-8000-000000000004',
    bananiDiagnostic: '00000000-0000-4000-8000-000000000005',
  },
  diagnosticCenter: {
    central: '00000000-0000-4000-8000-000000000011',
    north: '00000000-0000-4000-8000-000000000012',
  },
  user: {
    admin: '00000000-0000-4000-8000-000000000101',
    dispatcher: '00000000-0000-4000-8000-000000000102',
    doctor1: '00000000-0000-4000-8000-000000000103',
    doctor2: '00000000-0000-4000-8000-000000000104',
    patient1: '00000000-0000-4000-8000-000000000105',
    patient2: '00000000-0000-4000-8000-000000000106',
    driver1: '00000000-0000-4000-8000-000000000107',
    driver2: '00000000-0000-4000-8000-000000000108',
  },
  doctorProfile: {
    doctor1: '00000000-0000-4000-8000-000000000201',
    doctor2: '00000000-0000-4000-8000-000000000202',
  },
  medicineCategory: {
    antibiotics: '00000000-0000-4000-8000-000000000301',
    painRelief: '00000000-0000-4000-8000-000000000302',
    vitamins: '00000000-0000-4000-8000-000000000303',
    cardiac: '00000000-0000-4000-8000-000000000304',
  },
  labTest: {
    cbc: '00000000-0000-4000-8000-000000000401',
    lipid: '00000000-0000-4000-8000-000000000402',
    glucose: '00000000-0000-4000-8000-000000000403',
    thyroid: '00000000-0000-4000-8000-000000000404',
    vitaminD: '00000000-0000-4000-8000-000000000405',
    liver: '00000000-0000-4000-8000-000000000406',
  },
  testPackage: {
    wellness: '00000000-0000-4000-8000-000000000411',
    cardiac: '00000000-0000-4000-8000-000000000412',
  },
  ambulance: {
    basic1: '00000000-0000-4000-8000-000000000501',
    advanced1: '00000000-0000-4000-8000-000000000502',
    icu1: '00000000-0000-4000-8000-000000000503',
    basicUttara: '00000000-0000-4000-8000-000000000504',
    advancedMirpur: '00000000-0000-4000-8000-000000000505',
  },
} as const;

export const CREDENTIALS = {
  admin: { email: 'admin@healthbridge.dev', password: 'Admin@1234' },
  dispatcher: { email: 'dispatcher@healthbridge.dev', password: 'Dispatch@1234' },
  doctor1: { email: 'doctor1@healthbridge.dev', password: 'Doctor@1234' },
  doctor2: { email: 'doctor2@healthbridge.dev', password: 'Doctor@1234' },
  patient1: { email: 'patient1@healthbridge.dev', password: 'Patient@1234' },
  patient2: { email: 'patient2@healthbridge.dev', password: 'Patient@1234' },
  driver1: { email: 'driver1@healthbridge.dev', password: 'Driver@1234' },
  driver2: { email: 'driver2@healthbridge.dev', password: 'Driver@1234' },
} as const;
