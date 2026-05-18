// prisma/seed/medicines.ts
// ─────────────────────────────────────────────────────────────────────────────
// Medicine seed data factory
// Matches: Medicine model fields exactly
//   - price: string (will be cast to Prisma.Decimal in seed.ts)
//   - status: MedicineStatus enum
//   - requiresPrescription: boolean
//   - stockQuantity: number (used to derive status)
// ─────────────────────────────────────────────────────────────────────────────

export type MedicineSeed = {
  name: string;
  genericName: string | null;
  manufacturer: string;
  price: string; // Decimal(12,2) — always string to avoid float issues
  stockQuantity: number;
  composition: string | null;
  sideEffects: string | null;
  requiresPrescription: boolean;
  batchNumber: string;
  expiryDate: Date;
  categoryKey: string; // matches category name — resolved to categoryId in seed.ts
};

// Helper: generate expiry dates
const future = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
};

// ─── Pain & Fever Relief ─────────────────────────────────────────────────────
export const painFeverMedicines: MedicineSeed[] = [
  {
    name: 'Napa 500mg Tablet',
    genericName: 'Paracetamol',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '15.00',
    stockQuantity: 500,
    composition: 'Paracetamol 500mg',
    sideEffects: 'Rare: skin rash, liver damage with overdose',
    requiresPrescription: false,
    batchNumber: 'BX-2024-NP500',
    expiryDate: future(24),
    categoryKey: 'Pain & Fever Relief',
  },
  {
    name: 'Napa Extra 500mg+65mg Tablet',
    genericName: 'Paracetamol + Caffeine',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '20.00',
    stockQuantity: 350,
    composition: 'Paracetamol 500mg, Caffeine 65mg',
    sideEffects: 'Insomnia, nervousness, rare liver damage with overdose',
    requiresPrescription: false,
    batchNumber: 'BX-2024-NPX',
    expiryDate: future(22),
    categoryKey: 'Pain & Fever Relief',
  },
  {
    name: 'Ace 500mg Tablet',
    genericName: 'Paracetamol',
    manufacturer: 'Square Pharmaceuticals',
    price: '14.00',
    stockQuantity: 600,
    composition: 'Paracetamol 500mg',
    sideEffects: 'Rare: allergic reactions, hepatotoxicity with overdose',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-AC500',
    expiryDate: future(20),
    categoryKey: 'Pain & Fever Relief',
  },
  {
    name: 'Voltaren 50mg Tablet',
    genericName: 'Diclofenac Sodium',
    manufacturer: 'Novartis Bangladesh',
    price: '65.00',
    stockQuantity: 180,
    composition: 'Diclofenac Sodium 50mg',
    sideEffects:
      'GI upset, peptic ulcer, elevated BP, kidney issues with prolonged use',
    requiresPrescription: true,
    batchNumber: 'NV-2024-VT50',
    expiryDate: future(18),
    categoryKey: 'Pain & Fever Relief',
  },
  {
    name: 'Ibuprofen 400mg Tablet',
    genericName: 'Ibuprofen',
    manufacturer: 'General Pharmaceuticals',
    price: '25.00',
    stockQuantity: 8, // LOW STOCK
    composition: 'Ibuprofen 400mg',
    sideEffects: 'GI irritation, nausea, headache, dizziness',
    requiresPrescription: false,
    batchNumber: 'GP-2024-IBU400',
    expiryDate: future(16),
    categoryKey: 'Pain & Fever Relief',
  },
];

// ─── Tablets & Capsules (General) ────────────────────────────────────────────
export const tabletsMedicines: MedicineSeed[] = [
  {
    name: 'Fexo 120mg Tablet',
    genericName: 'Fexofenadine HCl',
    manufacturer: 'Square Pharmaceuticals',
    price: '85.00',
    stockQuantity: 220,
    composition: 'Fexofenadine Hydrochloride 120mg',
    sideEffects: 'Headache, drowsiness (rare), nausea',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-FX120',
    expiryDate: future(24),
    categoryKey: 'Tablets & Capsules',
  },
  {
    name: 'Seclo 20mg Capsule',
    genericName: 'Omeprazole',
    manufacturer: 'Square Pharmaceuticals',
    price: '55.00',
    stockQuantity: 310,
    composition: 'Omeprazole 20mg (enteric coated)',
    sideEffects: 'Headache, diarrhea, abdominal pain, nausea',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-SC20',
    expiryDate: future(20),
    categoryKey: 'Tablets & Capsules',
  },
  {
    name: 'Pantonix 40mg Tablet',
    genericName: 'Pantoprazole',
    manufacturer: 'Incepta Pharmaceuticals',
    price: '70.00',
    stockQuantity: 0, // OUT OF STOCK
    composition: 'Pantoprazole Sodium 40mg',
    sideEffects: 'Headache, dizziness, abdominal pain',
    requiresPrescription: false,
    batchNumber: 'IC-2024-PT40',
    expiryDate: future(18),
    categoryKey: 'Tablets & Capsules',
  },
  {
    name: 'Atorva 10mg Tablet',
    genericName: 'Atorvastatin',
    manufacturer: 'Renata Limited',
    price: '120.00',
    stockQuantity: 150,
    composition: 'Atorvastatin Calcium 10mg',
    sideEffects: 'Muscle pain, liver enzyme elevation, GI upset',
    requiresPrescription: true,
    batchNumber: 'RL-2024-ATV10',
    expiryDate: future(22),
    categoryKey: 'Tablets & Capsules',
  },
  {
    name: 'Metformin 500mg Tablet',
    genericName: 'Metformin HCl',
    manufacturer: 'ACI Pharmaceuticals',
    price: '40.00',
    stockQuantity: 400,
    composition: 'Metformin Hydrochloride 500mg',
    sideEffects: 'Nausea, diarrhea, lactic acidosis (rare)',
    requiresPrescription: true,
    batchNumber: 'ACI-2024-MF500',
    expiryDate: future(20),
    categoryKey: 'Tablets & Capsules',
  },
];

// ─── Antibiotics ──────────────────────────────────────────────────────────────
export const antibioticMedicines: MedicineSeed[] = [
  {
    name: 'Azithromycin 500mg Tablet',
    genericName: 'Azithromycin',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '150.00',
    stockQuantity: 200,
    composition: 'Azithromycin (as dihydrate) 500mg',
    sideEffects: 'Nausea, diarrhea, abdominal pain, QT prolongation (rare)',
    requiresPrescription: true,
    batchNumber: 'BX-2024-AZ500',
    expiryDate: future(24),
    categoryKey: 'Antibiotics',
  },
  {
    name: 'Amoxicillin 500mg Capsule',
    genericName: 'Amoxicillin',
    manufacturer: 'Square Pharmaceuticals',
    price: '80.00',
    stockQuantity: 280,
    composition: 'Amoxicillin (as trihydrate) 500mg',
    sideEffects: 'Rash, diarrhea, nausea, allergic reactions',
    requiresPrescription: true,
    batchNumber: 'SQ-2024-AMX500',
    expiryDate: future(18),
    categoryKey: 'Antibiotics',
  },
  {
    name: 'Ciprofloxacin 500mg Tablet',
    genericName: 'Ciprofloxacin',
    manufacturer: 'Incepta Pharmaceuticals',
    price: '110.00',
    stockQuantity: 5, // LOW STOCK
    composition: 'Ciprofloxacin (as HCl) 500mg',
    sideEffects: 'Nausea, diarrhea, tendon rupture (rare), photosensitivity',
    requiresPrescription: true,
    batchNumber: 'IC-2024-CP500',
    expiryDate: future(20),
    categoryKey: 'Antibiotics',
  },
  {
    name: 'Cefixime 200mg Capsule',
    genericName: 'Cefixime',
    manufacturer: 'Renata Limited',
    price: '135.00',
    stockQuantity: 175,
    composition: 'Cefixime (as trihydrate) 200mg',
    sideEffects: 'Diarrhea, nausea, abdominal pain, hypersensitivity',
    requiresPrescription: true,
    batchNumber: 'RL-2024-CFX200',
    expiryDate: future(22),
    categoryKey: 'Antibiotics',
  },
];

// ─── Vitamins & Supplements ───────────────────────────────────────────────────
export const vitaminMedicines: MedicineSeed[] = [
  {
    name: 'Revit Tablet',
    genericName: 'Multivitamin + Mineral',
    manufacturer: 'Square Pharmaceuticals',
    price: '180.00',
    stockQuantity: 450,
    composition: 'Vitamin A, B-complex, C, D3, E, Zinc, Iron, Calcium',
    sideEffects: 'Rare: nausea if taken on empty stomach',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-RV',
    expiryDate: future(30),
    categoryKey: 'Vitamins & Supplements',
  },
  {
    name: 'Vitamin D3 1000 IU Capsule',
    genericName: 'Cholecalciferol',
    manufacturer: 'ACI Pharmaceuticals',
    price: '250.00',
    stockQuantity: 300,
    composition: 'Cholecalciferol (Vitamin D3) 1000 IU',
    sideEffects: 'Hypercalcemia with overdose',
    requiresPrescription: false,
    batchNumber: 'ACI-2024-VD3',
    expiryDate: future(36),
    categoryKey: 'Vitamins & Supplements',
  },
  {
    name: 'Omega-3 Fish Oil 1000mg Capsule',
    genericName: 'Omega-3 Fatty Acids',
    manufacturer: 'Healthcare Pharmaceuticals',
    price: '320.00',
    stockQuantity: 200,
    composition: 'EPA 180mg, DHA 120mg per capsule',
    sideEffects: 'Fishy breath, GI discomfort at high doses',
    requiresPrescription: false,
    batchNumber: 'HC-2024-OM3',
    expiryDate: future(24),
    categoryKey: 'Vitamins & Supplements',
  },
  {
    name: 'Calcium + Vitamin D Tablet',
    genericName: 'Calcium Carbonate + Cholecalciferol',
    manufacturer: 'Opsonin Pharma',
    price: '160.00',
    stockQuantity: 380,
    composition:
      'Calcium Carbonate 500mg (equiv. elemental Ca 200mg), Vitamin D3 200 IU',
    sideEffects: 'Constipation, gas, hypercalcemia with overdose',
    requiresPrescription: false,
    batchNumber: 'OP-2024-CAVD',
    expiryDate: future(28),
    categoryKey: 'Vitamins & Supplements',
  },
  {
    name: 'Zinc 20mg Tablet',
    genericName: 'Zinc Sulfate',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '90.00',
    stockQuantity: 0, // OUT OF STOCK
    composition: 'Zinc Sulfate Monohydrate equiv. Zinc 20mg',
    sideEffects: 'Nausea, vomiting if taken on empty stomach',
    requiresPrescription: false,
    batchNumber: 'BX-2024-ZN20',
    expiryDate: future(24),
    categoryKey: 'Vitamins & Supplements',
  },
];

// ─── Syrups & Suspensions ─────────────────────────────────────────────────────
export const syrupMedicines: MedicineSeed[] = [
  {
    name: 'Napa Syrup 120ml',
    genericName: 'Paracetamol',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '35.00',
    stockQuantity: 250,
    composition: 'Paracetamol 120mg/5ml',
    sideEffects: 'Rare: allergic reactions, hepatotoxicity with overdose',
    requiresPrescription: false,
    batchNumber: 'BX-2024-NPSYR',
    expiryDate: future(18),
    categoryKey: 'Syrups & Suspensions',
  },
  {
    name: 'Tufnil Suspension 100ml',
    genericName: 'Ibuprofen',
    manufacturer: 'Square Pharmaceuticals',
    price: '75.00',
    stockQuantity: 160,
    composition: 'Ibuprofen 100mg/5ml',
    sideEffects: 'GI irritation, abdominal pain',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-TF100',
    expiryDate: future(15),
    categoryKey: 'Syrups & Suspensions',
  },
  {
    name: 'Ambrolite Syrup 100ml',
    genericName: 'Ambroxol HCl',
    manufacturer: 'Aristopharma',
    price: '55.00',
    stockQuantity: 7, // LOW STOCK
    composition: 'Ambroxol Hydrochloride 15mg/5ml',
    sideEffects: 'Nausea, vomiting, diarrhea (rare)',
    requiresPrescription: false,
    batchNumber: 'AR-2024-AML100',
    expiryDate: future(16),
    categoryKey: 'Syrups & Suspensions',
  },
];

// ─── Respiratory & Allergy ────────────────────────────────────────────────────
export const respiratoryMedicines: MedicineSeed[] = [
  {
    name: 'Montelukast 10mg Tablet',
    genericName: 'Montelukast Sodium',
    manufacturer: 'Incepta Pharmaceuticals',
    price: '95.00',
    stockQuantity: 190,
    composition: 'Montelukast Sodium equiv. Montelukast 10mg',
    sideEffects: 'Headache, dizziness, neuropsychiatric events (rare)',
    requiresPrescription: true,
    batchNumber: 'IC-2024-MK10',
    expiryDate: future(22),
    categoryKey: 'Respiratory & Allergy',
  },
  {
    name: 'Salbutamol 2mg Tablet',
    genericName: 'Salbutamol Sulfate',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '30.00',
    stockQuantity: 330,
    composition: 'Salbutamol Sulfate equiv. Salbutamol 2mg',
    sideEffects: 'Tremor, palpitations, headache, hypokalemia',
    requiresPrescription: true,
    batchNumber: 'BX-2024-SB2',
    expiryDate: future(20),
    categoryKey: 'Respiratory & Allergy',
  },
  {
    name: 'Cetirizine 10mg Tablet',
    genericName: 'Cetirizine HCl',
    manufacturer: 'Square Pharmaceuticals',
    price: '40.00',
    stockQuantity: 420,
    composition: 'Cetirizine Hydrochloride 10mg',
    sideEffects: 'Drowsiness, dry mouth, fatigue',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-CT10',
    expiryDate: future(24),
    categoryKey: 'Respiratory & Allergy',
  },
];

// ─── Antacids & Digestive ─────────────────────────────────────────────────────
export const digestiveMedicines: MedicineSeed[] = [
  {
    name: 'Antacid Plus Suspension 170ml',
    genericName: 'Aluminium Hydroxide + Magnesium Hydroxide',
    manufacturer: 'Square Pharmaceuticals',
    price: '60.00',
    stockQuantity: 210,
    composition: 'Dried Al(OH)3 Gel 250mg + Mg(OH)2 250mg per 5ml',
    sideEffects: 'Constipation (aluminium), diarrhea (magnesium)',
    requiresPrescription: false,
    batchNumber: 'SQ-2024-ANT170',
    expiryDate: future(18),
    categoryKey: 'Antacids & Digestive',
  },
  {
    name: 'Domperidone 10mg Tablet',
    genericName: 'Domperidone',
    manufacturer: 'Renata Limited',
    price: '45.00',
    stockQuantity: 280,
    composition: 'Domperidone 10mg',
    sideEffects: 'Dry mouth, drowsiness, cardiac arrhythmia (rare)',
    requiresPrescription: false,
    batchNumber: 'RL-2024-DMP10',
    expiryDate: future(20),
    categoryKey: 'Antacids & Digestive',
  },
  {
    name: 'Loperamide 2mg Capsule',
    genericName: 'Loperamide HCl',
    manufacturer: 'ACI Pharmaceuticals',
    price: '35.00',
    stockQuantity: 3, // LOW STOCK
    composition: 'Loperamide Hydrochloride 2mg',
    sideEffects: 'Constipation, abdominal cramps, nausea',
    requiresPrescription: false,
    batchNumber: 'ACI-2024-LP2',
    expiryDate: future(16),
    categoryKey: 'Antacids & Digestive',
  },
];

// ─── Diabetes Care ────────────────────────────────────────────────────────────
export const diabetesMedicines: MedicineSeed[] = [
  {
    name: 'Glibenclamide 5mg Tablet',
    genericName: 'Glibenclamide',
    manufacturer: 'General Pharmaceuticals',
    price: '25.00',
    stockQuantity: 320,
    composition: 'Glibenclamide 5mg',
    sideEffects: 'Hypoglycemia, weight gain, GI upset',
    requiresPrescription: true,
    batchNumber: 'GP-2024-GL5',
    expiryDate: future(22),
    categoryKey: 'Diabetes Care',
  },
  {
    name: 'Sitagliptin 100mg Tablet',
    genericName: 'Sitagliptin Phosphate',
    manufacturer: 'Incepta Pharmaceuticals',
    price: '550.00',
    stockQuantity: 90,
    composition: 'Sitagliptin Phosphate equiv. Sitagliptin 100mg',
    sideEffects: 'Nasopharyngitis, upper respiratory infection, headache',
    requiresPrescription: true,
    batchNumber: 'IC-2024-ST100',
    expiryDate: future(20),
    categoryKey: 'Diabetes Care',
  },
];

// ─── Cardiac & Blood Pressure ─────────────────────────────────────────────────
export const cardiacMedicines: MedicineSeed[] = [
  {
    name: 'Amlodipine 5mg Tablet',
    genericName: 'Amlodipine Besylate',
    manufacturer: 'Square Pharmaceuticals',
    price: '50.00',
    stockQuantity: 360,
    composition: 'Amlodipine Besylate equiv. Amlodipine 5mg',
    sideEffects: 'Ankle oedema, flushing, headache, palpitations',
    requiresPrescription: true,
    batchNumber: 'SQ-2024-AML5',
    expiryDate: future(24),
    categoryKey: 'Cardiac & Blood Pressure',
  },
  {
    name: 'Losartan 50mg Tablet',
    genericName: 'Losartan Potassium',
    manufacturer: 'Beximco Pharmaceuticals',
    price: '80.00',
    stockQuantity: 240,
    composition: 'Losartan Potassium 50mg',
    sideEffects: 'Dizziness, hyperkalemia, renal impairment',
    requiresPrescription: true,
    batchNumber: 'BX-2024-LS50',
    expiryDate: future(22),
    categoryKey: 'Cardiac & Blood Pressure',
  },
];

// ─── Topical & Skin Care ──────────────────────────────────────────────────────
export const topicalMedicines: MedicineSeed[] = [
  {
    name: 'Betamethasone 0.1% Cream 15g',
    genericName: 'Betamethasone Valerate',
    manufacturer: 'Opsonin Pharma',
    price: '75.00',
    stockQuantity: 140,
    composition: 'Betamethasone Valerate 0.1% w/w',
    sideEffects: 'Skin atrophy, striae, telangiectasia with prolonged use',
    requiresPrescription: true,
    batchNumber: 'OP-2024-BM01',
    expiryDate: future(20),
    categoryKey: 'Topical & Skin Care',
  },
  {
    name: 'Clotrimazole 1% Cream 20g',
    genericName: 'Clotrimazole',
    manufacturer: 'Renata Limited',
    price: '60.00',
    stockQuantity: 190,
    composition: 'Clotrimazole 1% w/w',
    sideEffects: 'Local burning, itching, erythema',
    requiresPrescription: false,
    batchNumber: 'RL-2024-CLT1',
    expiryDate: future(24),
    categoryKey: 'Topical & Skin Care',
  },
];

// ─── Eye & Ear Drops ──────────────────────────────────────────────────────────
export const eyeEarMedicines: MedicineSeed[] = [
  {
    name: 'Ciprofloxacin Eye Drops 0.3% 5ml',
    genericName: 'Ciprofloxacin HCl',
    manufacturer: 'Opsonin Pharma',
    price: '90.00',
    stockQuantity: 120,
    composition: 'Ciprofloxacin Hydrochloride 0.3% w/v',
    sideEffects: 'Local burning, stinging, white crystalline precipitate',
    requiresPrescription: true,
    batchNumber: 'OP-2024-CPEY',
    expiryDate: future(18),
    categoryKey: 'Eye & Ear Drops',
  },
  {
    name: 'Artificial Tears Eye Drops 10ml',
    genericName: 'Hydroxypropyl Methylcellulose',
    manufacturer: 'Healthcare Pharmaceuticals',
    price: '120.00',
    stockQuantity: 200,
    composition: 'Hydroxypropyl Methylcellulose 0.3%',
    sideEffects: 'Mild transient blurred vision',
    requiresPrescription: false,
    batchNumber: 'HC-2024-AT10',
    expiryDate: future(24),
    categoryKey: 'Eye & Ear Drops',
  },
];

// ─── All medicines combined ───────────────────────────────────────────────────
export const allMedicines: MedicineSeed[] = [
  ...painFeverMedicines,
  ...tabletsMedicines,
  ...antibioticMedicines,
  ...vitaminMedicines,
  ...syrupMedicines,
  ...respiratoryMedicines,
  ...digestiveMedicines,
  ...diabetesMedicines,
  ...cardiacMedicines,
  ...topicalMedicines,
  ...eyeEarMedicines,
];
