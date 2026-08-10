import type { MedicalSpecialization } from './specializations.data';

export type DoctorCatalogEntry = {
  specIndex: number;
  doctorIndex: number;
  specialization: MedicalSpecialization;
  firstName: string;
  lastName: string;
  qualification: string;
  hospital: string;
  biography: string;
  consultationFee: number;
  isProvideTeleHealth: boolean;
  rating: number;
  totalRatings: number;
};

const FIRST_NAMES = [
  'Rahim',
  'Sadia',
  'Karim',
  'Nadia',
  'Arif',
  'Laila',
  'Imran',
  'Farhana',
  'Tanvir',
  'Mousumi',
  'Shafiq',
  'Tasnim',
  'Omar',
  'Sabrina',
  'Mahmud',
  'Priya',
  'Hasan',
  'Anika',
  'Faisal',
  'Rumana',
];

const LAST_NAMES = [
  'Ahmed',
  'Khan',
  'Hossain',
  'Islam',
  'Chowdhury',
  'Rahman',
  'Akter',
  'Begum',
  'Uddin',
  'Sarker',
  'Ali',
  'Khatun',
  'Miah',
  'Das',
  'Barua',
];

const QUALIFICATIONS: Record<MedicalSpecialization, string[]> = {
  Cardiology: ['MBBS, FCPS (Cardiology)', 'MBBS, MD (Cardiology)', 'MBBS, D.Card'],
  'General Medicine': [
    'MBBS, MD (Internal Medicine)',
    'MBBS, FCPS (Medicine)',
    'MBBS, MRCP',
  ],
  Dermatology: ['MBBS, DDV', 'MBBS, FCPS (Dermatology)', 'MBBS, MD (Dermatology)'],
  Pediatrics: ['MBBS, FCPS (Pediatrics)', 'MBBS, DCH', 'MBBS, MD (Pediatrics)'],
  Orthopedics: ['MBBS, MS (Orthopedics)', 'MBBS, FCPS (Orthopedics)', 'MBBS, D.Ortho'],
  Gynecology: ['MBBS, FCPS (Gynae)', 'MBBS, MS (Gynae & Obs)', 'MBBS, DGO'],
  Neurology: ['MBBS, FCPS (Neurology)', 'MBBS, MD (Neurology)', 'MBBS, DM (Neurology)'],
  ENT: ['MBBS, FCPS (ENT)', 'MBBS, MS (ENT)', 'MBBS, DLO'],
  Psychiatry: ['MBBS, FCPS (Psychiatry)', 'MBBS, MD (Psychiatry)', 'MBBS, MRCPsych'],
  Ophthalmology: ['MBBS, FCPS (Ophthalmology)', 'MBBS, DO', 'MBBS, MS (Ophthalmology)'],
};

function slugify(spec: string): string {
  return spec.toLowerCase().replace(/\s+/g, '-');
}

export function buildDoctorCatalog(
  specializations: readonly MedicalSpecialization[],
  doctorsPerSpec: number,
): DoctorCatalogEntry[] {
  const catalog: DoctorCatalogEntry[] = [];
  let nameCursor = 0;

  for (let specIndex = 0; specIndex < specializations.length; specIndex++) {
    const specialization = specializations[specIndex]!;
    const qualifications = QUALIFICATIONS[specialization];

    for (let doctorIndex = 0; doctorIndex < doctorsPerSpec; doctorIndex++) {
      const firstName = FIRST_NAMES[nameCursor % FIRST_NAMES.length]!;
      const lastName = LAST_NAMES[(nameCursor + specIndex) % LAST_NAMES.length]!;
      nameCursor++;

      catalog.push({
        specIndex,
        doctorIndex,
        specialization,
        firstName,
        lastName,
        qualification: qualifications[doctorIndex % qualifications.length]!,
        hospital: `Health Bridge ${specialization} Centre`,
        biography: `${specialization} specialist with ${8 + doctorIndex + specIndex} years of clinical experience.`,
        consultationFee: 700 + specIndex * 100 + doctorIndex * 50,
        isProvideTeleHealth: doctorIndex % 2 === 0,
        rating: 4.2 + (doctorIndex % 3) * 0.2,
        totalRatings: 15 + specIndex * 3 + doctorIndex * 7,
      });
    }
  }

  return catalog;
}

export function doctorSeedSlug(entry: DoctorCatalogEntry): string {
  return slugify(entry.specialization);
}
