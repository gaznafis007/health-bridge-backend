import { MedicineStatus } from '@prisma/client';
import { prisma } from './client';
import {
  buildMedicineCatalog,
  MEDICINE_CATEGORIES,
} from './data/medicines.data';
import { decimal } from './helpers';

export async function seedEcommerce() {
  const categoryIds: Record<string, string> = {};
  const seededCategories: Awaited<
    ReturnType<typeof prisma.medicineCategory.upsert>
  >[] = [];

  for (const category of MEDICINE_CATEGORIES) {
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

  const medicines = buildMedicineCatalog(100);
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
        price: decimal(medicine.basePrice),
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
        price: decimal(medicine.basePrice),
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
