import { IDS } from '../ids';

export type MedicineCategorySeed = {
  key: string;
  id: string;
  name: string;
  description: string;
};

export const MEDICINE_CATEGORIES: MedicineCategorySeed[] = [
  {
    key: 'antibiotics',
    id: IDS.medicineCategory.antibiotics,
    name: 'Antibiotics',
    description: 'Antibacterial medications',
  },
  {
    key: 'painRelief',
    id: IDS.medicineCategory.painRelief,
    name: 'Pain Relief',
    description: 'Analgesics and anti-inflammatory drugs',
  },
  {
    key: 'vitamins',
    id: IDS.medicineCategory.vitamins,
    name: 'Vitamins & Supplements',
    description: 'Vitamins, minerals, and dietary supplements',
  },
  {
    key: 'cardiac',
    id: IDS.medicineCategory.cardiac,
    name: 'Cardiac Care',
    description: 'Heart and blood pressure medications',
  },
  {
    key: 'gastro',
    id: IDS.medicineCategory.gastro,
    name: 'Gastrointestinal',
    description: 'Digestive and acid-related medications',
  },
  {
    key: 'respiratory',
    id: IDS.medicineCategory.respiratory,
    name: 'Respiratory Care',
    description: 'Asthma, cough, and allergy medicines',
  },
  {
    key: 'diabetes',
    id: IDS.medicineCategory.diabetes,
    name: 'Diabetes Care',
    description: 'Blood sugar management medicines',
  },
];

const MANUFACTURERS = [
  'Square Pharmaceuticals',
  'Beximco Pharma',
  'Renata Limited',
  'ACI Limited',
  'Incepta Pharma',
  'Healthcare Pharma',
  'Opsonin Pharma',
  'Eskayef Pharmaceuticals',
  'Drug International',
  'Novo Healthcare',
];

type MedicineTemplate = {
  name: string;
  categoryKey: string;
  genericName: string;
  basePrice: number;
  requiresPrescription: boolean;
  composition: string;
  sideEffects: string;
};

const MEDICINE_TEMPLATES: MedicineTemplate[] = [
  { name: 'Amoxicillin 500mg', categoryKey: 'antibiotics', genericName: 'Amoxicillin', basePrice: 12.5, requiresPrescription: true, composition: 'Amoxicillin trihydrate 500mg', sideEffects: 'Nausea, diarrhea, rash' },
  { name: 'Azithromycin 250mg', categoryKey: 'antibiotics', genericName: 'Azithromycin', basePrice: 18, requiresPrescription: true, composition: 'Azithromycin dihydrate 250mg', sideEffects: 'Stomach upset, dizziness' },
  { name: 'Ciprofloxacin 500mg', categoryKey: 'antibiotics', genericName: 'Ciprofloxacin', basePrice: 14, requiresPrescription: true, composition: 'Ciprofloxacin HCl 500mg', sideEffects: 'Nausea, tendon pain' },
  { name: 'Cefixime 200mg', categoryKey: 'antibiotics', genericName: 'Cefixime', basePrice: 22, requiresPrescription: true, composition: 'Cefixime trihydrate 200mg', sideEffects: 'Diarrhea, abdominal pain' },
  { name: 'Doxycycline 100mg', categoryKey: 'antibiotics', genericName: 'Doxycycline', basePrice: 10, requiresPrescription: true, composition: 'Doxycycline hyclate 100mg', sideEffects: 'Photosensitivity, nausea' },
  { name: 'Metronidazole 400mg', categoryKey: 'antibiotics', genericName: 'Metronidazole', basePrice: 6.5, requiresPrescription: true, composition: 'Metronidazole 400mg', sideEffects: 'Metallic taste, nausea' },
  { name: 'Paracetamol 500mg', categoryKey: 'painRelief', genericName: 'Acetaminophen', basePrice: 2.5, requiresPrescription: false, composition: 'Paracetamol 500mg', sideEffects: 'Rare liver issues at high doses' },
  { name: 'Ibuprofen 400mg', categoryKey: 'painRelief', genericName: 'Ibuprofen', basePrice: 4, requiresPrescription: false, composition: 'Ibuprofen 400mg', sideEffects: 'Stomach irritation, heartburn' },
  { name: 'Naproxen 250mg', categoryKey: 'painRelief', genericName: 'Naproxen', basePrice: 5.5, requiresPrescription: false, composition: 'Naproxen sodium 250mg', sideEffects: 'Dizziness, indigestion' },
  { name: 'Diclofenac 50mg', categoryKey: 'painRelief', genericName: 'Diclofenac', basePrice: 3.5, requiresPrescription: false, composition: 'Diclofenac sodium 50mg', sideEffects: 'GI upset, headache' },
  { name: 'Tramadol 50mg', categoryKey: 'painRelief', genericName: 'Tramadol', basePrice: 9, requiresPrescription: true, composition: 'Tramadol HCl 50mg', sideEffects: 'Drowsiness, constipation' },
  { name: 'Vitamin D3 2000 IU', categoryKey: 'vitamins', genericName: 'Cholecalciferol', basePrice: 15, requiresPrescription: false, composition: 'Vitamin D3 2000 IU', sideEffects: 'Rare hypercalcemia at high doses' },
  { name: 'Multivitamin Daily', categoryKey: 'vitamins', genericName: 'Multivitamin', basePrice: 25, requiresPrescription: false, composition: 'Vitamins A, B-complex, C, D, E, minerals', sideEffects: 'Generally well tolerated' },
  { name: 'Vitamin C 500mg', categoryKey: 'vitamins', genericName: 'Ascorbic Acid', basePrice: 8, requiresPrescription: false, composition: 'Ascorbic acid 500mg', sideEffects: 'Mild stomach upset' },
  { name: 'Calcium + Vitamin D', categoryKey: 'vitamins', genericName: 'Calcium Carbonate', basePrice: 18, requiresPrescription: false, composition: 'Calcium carbonate 500mg + Vitamin D3', sideEffects: 'Constipation, bloating' },
  { name: 'Iron + Folic Acid', categoryKey: 'vitamins', genericName: 'Ferrous Sulfate', basePrice: 12, requiresPrescription: false, composition: 'Ferrous sulfate + folic acid', sideEffects: 'Dark stools, constipation' },
  { name: 'Amlodipine 5mg', categoryKey: 'cardiac', genericName: 'Amlodipine', basePrice: 8, requiresPrescription: true, composition: 'Amlodipine besylate 5mg', sideEffects: 'Swelling, dizziness, flushing' },
  { name: 'Atorvastatin 10mg', categoryKey: 'cardiac', genericName: 'Atorvastatin', basePrice: 22, requiresPrescription: true, composition: 'Atorvastatin calcium 10mg', sideEffects: 'Muscle pain, liver enzyme changes' },
  { name: 'Losartan 50mg', categoryKey: 'cardiac', genericName: 'Losartan', basePrice: 16, requiresPrescription: true, composition: 'Losartan potassium 50mg', sideEffects: 'Dizziness, hyperkalemia' },
  { name: 'Bisoprolol 2.5mg', categoryKey: 'cardiac', genericName: 'Bisoprolol', basePrice: 11, requiresPrescription: true, composition: 'Bisoprolol fumarate 2.5mg', sideEffects: 'Fatigue, cold extremities' },
  { name: 'Clopidogrel 75mg', categoryKey: 'cardiac', genericName: 'Clopidogrel', basePrice: 20, requiresPrescription: true, composition: 'Clopidogrel bisulfate 75mg', sideEffects: 'Bleeding risk, bruising' },
  { name: 'Omeprazole 20mg', categoryKey: 'gastro', genericName: 'Omeprazole', basePrice: 7, requiresPrescription: false, composition: 'Omeprazole 20mg', sideEffects: 'Headache, abdominal pain' },
  { name: 'Esomeprazole 40mg', categoryKey: 'gastro', genericName: 'Esomeprazole', basePrice: 12, requiresPrescription: false, composition: 'Esomeprazole 40mg', sideEffects: 'Nausea, flatulence' },
  { name: 'Domperidone 10mg', categoryKey: 'gastro', genericName: 'Domperidone', basePrice: 4.5, requiresPrescription: false, composition: 'Domperidone 10mg', sideEffects: 'Dry mouth, headache' },
  { name: 'ORS Saline Powder', categoryKey: 'gastro', genericName: 'Oral Rehydration Salts', basePrice: 15, requiresPrescription: false, composition: 'Glucose, sodium chloride, potassium', sideEffects: 'Generally well tolerated' },
  { name: 'Loperamide 2mg', categoryKey: 'gastro', genericName: 'Loperamide', basePrice: 5, requiresPrescription: false, composition: 'Loperamide HCl 2mg', sideEffects: 'Constipation, dizziness' },
  { name: 'Salbutamol Inhaler', categoryKey: 'respiratory', genericName: 'Salbutamol', basePrice: 180, requiresPrescription: true, composition: 'Salbutamol sulfate inhaler', sideEffects: 'Tremor, palpitations' },
  { name: 'Montelukast 10mg', categoryKey: 'respiratory', genericName: 'Montelukast', basePrice: 14, requiresPrescription: true, composition: 'Montelukast sodium 10mg', sideEffects: 'Headache, mood changes' },
  { name: 'Cetirizine 10mg', categoryKey: 'respiratory', genericName: 'Cetirizine', basePrice: 3, requiresPrescription: false, composition: 'Cetirizine dihydrochloride 10mg', sideEffects: 'Drowsiness, dry mouth' },
  { name: 'Dextromethorphan Syrup', categoryKey: 'respiratory', genericName: 'Dextromethorphan', basePrice: 65, requiresPrescription: false, composition: 'Dextromethorphan cough syrup', sideEffects: 'Drowsiness, nausea' },
  { name: 'Budesonide Nasal Spray', categoryKey: 'respiratory', genericName: 'Budesonide', basePrice: 220, requiresPrescription: true, composition: 'Budesonide nasal spray', sideEffects: 'Nasal irritation, nosebleeds' },
  { name: 'Metformin 500mg', categoryKey: 'diabetes', genericName: 'Metformin', basePrice: 6, requiresPrescription: true, composition: 'Metformin HCl 500mg', sideEffects: 'GI upset, metallic taste' },
  { name: 'Glimepiride 2mg', categoryKey: 'diabetes', genericName: 'Glimepiride', basePrice: 9, requiresPrescription: true, composition: 'Glimepiride 2mg', sideEffects: 'Hypoglycemia, weight gain' },
  { name: 'Sitagliptin 50mg', categoryKey: 'diabetes', genericName: 'Sitagliptin', basePrice: 28, requiresPrescription: true, composition: 'Sitagliptin phosphate 50mg', sideEffects: 'Headache, upper respiratory symptoms' },
  { name: 'Insulin Glargine Pen', categoryKey: 'diabetes', genericName: 'Insulin Glargine', basePrice: 950, requiresPrescription: true, composition: 'Insulin glargine injection pen', sideEffects: 'Hypoglycemia, injection site reaction' },
  { name: 'Gliclazide 80mg', categoryKey: 'diabetes', genericName: 'Gliclazide', basePrice: 8.5, requiresPrescription: true, composition: 'Gliclazide 80mg', sideEffects: 'Hypoglycemia, GI discomfort' },
];

const STRENGTH_VARIANTS = ['', ' Forte', ' XR', ' Plus'];

export type GeneratedMedicineSeed = MedicineTemplate & {
  stockQuantity: number;
  manufacturer: string;
};

/** Builds exactly 100 unique medicine rows from templates + strength variants. */
export function buildMedicineCatalog(count = 100): GeneratedMedicineSeed[] {
  const medicines: GeneratedMedicineSeed[] = [];
  let index = 0;

  while (medicines.length < count) {
    const template = MEDICINE_TEMPLATES[index % MEDICINE_TEMPLATES.length];
    const variant = STRENGTH_VARIANTS[Math.floor(index / MEDICINE_TEMPLATES.length) % STRENGTH_VARIANTS.length];
    const batch = Math.floor(index / (MEDICINE_TEMPLATES.length * STRENGTH_VARIANTS.length));
    const suffix = batch > 0 ? ` Batch ${batch + 1}` : '';
    const name = `${template.name}${variant}${suffix}`.trim();

    medicines.push({
      ...template,
      name,
      basePrice: Number((template.basePrice + (index % 7) * 0.5).toFixed(2)),
      stockQuantity: 120 + ((index * 37) % 880),
      manufacturer: MANUFACTURERS[index % MANUFACTURERS.length],
    });
    index += 1;
  }

  return medicines;
}
