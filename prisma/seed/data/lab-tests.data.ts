/** Shared lab test catalog — seeded for every diagnostic center. */
export type LabTestCatalogEntry = {
  code: string;
  name: string;
  description: string;
  price: string;
  turnaroundDays: number;
  sampleType: string;
  instructions: string;
  requiresFasting: boolean;
};

export const LAB_TEST_CATALOG: LabTestCatalogEntry[] = [
  {
    code: 'CBC-001',
    name: 'Complete Blood Count (CBC)',
    description: 'Measures red cells, white cells, hemoglobin, and platelets.',
    price: '450',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'No special preparation required.',
    requiresFasting: false,
  },
  {
    code: 'LIP-001',
    name: 'Lipid Profile',
    description: 'Total cholesterol, LDL, HDL, and triglycerides.',
    price: '850',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'Fast for 10-12 hours before sample collection.',
    requiresFasting: true,
  },
  {
    code: 'FBG-001',
    name: 'Fasting Blood Glucose',
    description: 'Measures blood sugar after fasting — key diabetes screening test.',
    price: '300',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'Fast for 8-10 hours before sample collection.',
    requiresFasting: true,
  },
  {
    code: 'CRE-001',
    name: 'Serum Creatinine',
    description: 'Kidney function marker; elevated levels may indicate renal impairment.',
    price: '350',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'Avoid heavy exercise 24 hours before the test.',
    requiresFasting: false,
  },
  {
    code: 'HBA-001',
    name: 'HbA1c (Glycated Hemoglobin)',
    description: 'Average blood sugar over 2-3 months — essential diabetes monitoring test.',
    price: '750',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'No fasting required.',
    requiresFasting: false,
  },
  {
    code: 'RBG-001',
    name: 'Random Blood Glucose',
    description: 'Blood sugar at any time of day — useful for diabetes screening.',
    price: '250',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'No fasting required.',
    requiresFasting: false,
  },
  {
    code: 'BUN-001',
    name: 'Blood Urea Nitrogen (BUN)',
    description: 'Kidney function and protein metabolism marker.',
    price: '320',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'Stay well hydrated before sample collection.',
    requiresFasting: false,
  },
  {
    code: 'TFT-001',
    name: 'Thyroid Function Test (TFT)',
    description: 'TSH, T3, and T4 levels.',
    price: '1200',
    turnaroundDays: 2,
    sampleType: 'Blood',
    instructions: 'Morning sample preferred.',
    requiresFasting: false,
  },
  {
    code: 'VTD-001',
    name: 'Vitamin D (25-OH)',
    description: 'Vitamin D deficiency screening.',
    price: '1800',
    turnaroundDays: 2,
    sampleType: 'Blood',
    instructions: 'No fasting required.',
    requiresFasting: false,
  },
  {
    code: 'LFT-001',
    name: 'Liver Function Test (LFT)',
    description: 'ALT, AST, bilirubin, and albumin panel.',
    price: '950',
    turnaroundDays: 1,
    sampleType: 'Blood',
    instructions: 'Avoid alcohol 24 hours before test.',
    requiresFasting: false,
  },
  {
    code: 'URN-001',
    name: 'Urinalysis (Routine)',
    description: 'Checks urine for glucose, protein, infection, and kidney markers.',
    price: '280',
    turnaroundDays: 1,
    sampleType: 'Urine',
    instructions: 'Collect mid-stream clean-catch urine sample.',
    requiresFasting: false,
  },
];

export const WELLNESS_PACKAGE = {
  name: 'Basic Wellness Panel',
  description: 'CBC, fasting glucose, lipid profile, and serum creatinine.',
  originalPrice: '1950',
  discountedPrice: '1599',
  validityDays: 30,
  testCodes: ['CBC-001', 'FBG-001', 'LIP-001', 'CRE-001'],
} as const;

export const DIABETES_PACKAGE = {
  name: 'Diabetes Monitoring Panel',
  description: 'Fasting glucose, HbA1c, serum creatinine, and random blood glucose.',
  originalPrice: '1650',
  discountedPrice: '1349',
  validityDays: 30,
  testCodes: ['FBG-001', 'HBA-001', 'CRE-001', 'RBG-001'],
} as const;

export const CARDIAC_PACKAGE = {
  name: 'Cardiac Health Package',
  description: 'Lipid profile and liver function test bundle.',
  originalPrice: '1800',
  discountedPrice: '1499',
  validityDays: 45,
  testCodes: ['LIP-001', 'LFT-001'],
} as const;
