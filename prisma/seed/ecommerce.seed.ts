import { MedicineStatus } from '@prisma/client';
import { prisma } from './client';
import { IDS } from './ids';
import { decimal } from './helpers';

export async function seedEcommerce() {
  const categories = [
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
  ];

  const categoryIds: Record<string, string> = {};
  const seededCategories: Awaited<
    ReturnType<typeof prisma.medicineCategory.upsert>
  >[] = [];
  for (const category of categories) {
    const row = await prisma.medicineCategory.upsert({
      where: { name: category.name },
      create: {
        id: category.id,
        name: category.name,
        description: category.description,
      },
      update: { description: category.description },
    });
    categoryIds[category.key] = row.id;
    seededCategories.push(row);
  }

  const medicines = [
    {
      name: 'Amoxicillin 500mg',
      categoryKey: 'antibiotics',
      genericName: 'Amoxicillin',
      manufacturer: 'Square Pharmaceuticals',
      price: decimal(12.5),
      stockQuantity: 500,
      composition: 'Amoxicillin trihydrate 500mg',
      sideEffects: 'Nausea, diarrhea, rash',
      requiresPrescription: true,
    },
    {
      name: 'Azithromycin 250mg',
      categoryKey: 'antibiotics',
      genericName: 'Azithromycin',
      manufacturer: 'Beximco Pharma',
      price: decimal(18),
      stockQuantity: 300,
      composition: 'Azithromycin dihydrate 250mg',
      sideEffects: 'Stomach upset, dizziness',
      requiresPrescription: true,
    },
    {
      name: 'Paracetamol 500mg',
      categoryKey: 'painRelief',
      genericName: 'Acetaminophen',
      manufacturer: 'Renata Limited',
      price: decimal(2.5),
      stockQuantity: 2000,
      composition: 'Paracetamol 500mg',
      sideEffects: 'Rare liver issues at high doses',
      requiresPrescription: false,
    },
    {
      name: 'Ibuprofen 400mg',
      categoryKey: 'painRelief',
      genericName: 'Ibuprofen',
      manufacturer: 'ACI Limited',
      price: decimal(4),
      stockQuantity: 800,
      composition: 'Ibuprofen 400mg',
      sideEffects: 'Stomach irritation, heartburn',
      requiresPrescription: false,
    },
    {
      name: 'Vitamin D3 2000 IU',
      categoryKey: 'vitamins',
      genericName: 'Cholecalciferol',
      manufacturer: 'Incepta Pharma',
      price: decimal(15),
      stockQuantity: 600,
      composition: 'Vitamin D3 2000 IU',
      sideEffects: 'Rare hypercalcemia at high doses',
      requiresPrescription: false,
    },
    {
      name: 'Multivitamin Daily',
      categoryKey: 'vitamins',
      genericName: 'Multivitamin',
      manufacturer: 'Healthcare Pharma',
      price: decimal(25),
      stockQuantity: 400,
      composition: 'Vitamins A, B-complex, C, D, E, minerals',
      sideEffects: 'Generally well tolerated',
      requiresPrescription: false,
    },
    {
      name: 'Amlodipine 5mg',
      categoryKey: 'cardiac',
      genericName: 'Amlodipine',
      manufacturer: 'Square Pharmaceuticals',
      price: decimal(8),
      stockQuantity: 350,
      composition: 'Amlodipine besylate 5mg',
      sideEffects: 'Swelling, dizziness, flushing',
      requiresPrescription: true,
    },
    {
      name: 'Atorvastatin 10mg',
      categoryKey: 'cardiac',
      genericName: 'Atorvastatin',
      manufacturer: 'Beximco Pharma',
      price: decimal(22),
      stockQuantity: 250,
      composition: 'Atorvastatin calcium 10mg',
      sideEffects: 'Muscle pain, liver enzyme changes',
      requiresPrescription: true,
    },
  ];

  const seededMedicines: Awaited<ReturnType<typeof prisma.medicine.upsert>>[] =
    [];
  for (const medicine of medicines) {
    const categoryId = categoryIds[medicine.categoryKey];
    const row = await prisma.medicine.upsert({
      where: { name: medicine.name },
      create: {
        name: medicine.name,
        categoryId,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer,
        price: medicine.price,
        stockQuantity: medicine.stockQuantity,
        composition: medicine.composition,
        sideEffects: medicine.sideEffects,
        requiresPrescription: medicine.requiresPrescription,
        status: MedicineStatus.ACTIVE,
        expiryDate: new Date('2027-12-31'),
      },
      update: {
        categoryId,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer,
        price: medicine.price,
        stockQuantity: medicine.stockQuantity,
        composition: medicine.composition,
        sideEffects: medicine.sideEffects,
        requiresPrescription: medicine.requiresPrescription,
        status: MedicineStatus.ACTIVE,
        expiryDate: new Date('2027-12-31'),
      },
    });
    seededMedicines.push(row);
  }

  return { categories: seededCategories, medicines: seededMedicines };
}
