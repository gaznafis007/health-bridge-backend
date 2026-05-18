import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { MedicineStatus, Prisma, PrismaClient } from '@prisma/client';
import { categories } from './seed/categories';
import { allMedicines } from './seed/medicines';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the Prisma seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
  log: ['warn', 'error'],
});

function deriveStatus(stockQuantity: number): MedicineStatus {
  if (stockQuantity <= 0) {
    return MedicineStatus.OUT_OF_STOCK;
  }

  return MedicineStatus.ACTIVE;
}

const log = {
  info: (message: string) => console.log(`[info] ${message}`),
  success: (message: string) => console.log(`[ok] ${message}`),
  skip: (message: string) => console.log(`[skip] ${message}`),
  section: (message: string) => console.log(`\n== ${message} ==`),
  done: (message: string) => console.log(`\n[done] ${message}\n`),
  error: (message: string) => console.error(`\n[error] ${message}\n`),
};

async function seedCategories(): Promise<Map<string, string>> {
  log.section('Seeding medicine categories');

  const categoryIdMap = new Map<string, string>();

  for (const category of categories) {
    const result = await prisma.medicineCategory.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: {
        name: category.name,
        description: category.description,
      },
    });

    categoryIdMap.set(result.name, result.id);
    log.success(`Category upserted: "${result.name}"`);
  }

  log.info(`Total categories processed: ${categoryIdMap.size}`);
  return categoryIdMap;
}

async function seedMedicines(categoryIdMap: Map<string, string>): Promise<void> {
  log.section('Seeding medicines');

  let skipped = 0;

  for (const medicine of allMedicines) {
    const categoryId = categoryIdMap.get(medicine.categoryKey);

    if (!categoryId) {
      log.skip(
        `"${medicine.name}" skipped because category "${medicine.categoryKey}" was not found.`,
      );
      skipped += 1;
      continue;
    }

    const data = {
      name: medicine.name,
      genericName: medicine.genericName,
      manufacturer: medicine.manufacturer,
      price: new Prisma.Decimal(medicine.price),
      stockQuantity: medicine.stockQuantity,
      composition: medicine.composition,
      sideEffects: medicine.sideEffects,
      requiresPrescription: medicine.requiresPrescription,
      batchNumber: medicine.batchNumber,
      expiryDate: medicine.expiryDate,
      status: deriveStatus(medicine.stockQuantity),
      categoryId,
    };

    await prisma.medicine.upsert({
      where: { name: medicine.name },
      update: data,
      create: data,
    });

    log.success(
      `Medicine upserted: "${medicine.name}" [${data.status}] (stock: ${medicine.stockQuantity})`,
    );
  }

  log.info(`Medicines processed: ${allMedicines.length - skipped} | skipped: ${skipped}`);
}

async function seedDevGuestSession(): Promise<void> {
  log.section('Seeding dev guest session');

  const devSessionId = 'dev-guest-session-healthbridge-2025';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.guestSession.upsert({
    where: { sessionId: devSessionId },
    update: {
      lastActivityAt: now,
      expiresAt,
    },
    create: {
      sessionId: devSessionId,
      ipAddress: '127.0.0.1',
      userAgent: 'HealthBridge-Dev-Seed/1.0',
      lastActivityAt: now,
      expiresAt,
    },
  });

  log.success(`Dev guest session ready (sessionId: ${devSessionId})`);
  log.info('Use this sessionId in Postman as {{sessionId}} for cart and checkout testing');
}

async function printSummary(): Promise<void> {
  const [categoryCount, medicineCount, activeCount, outOfStockCount, rxCount, sessionCount] =
    await Promise.all([
      prisma.medicineCategory.count(),
      prisma.medicine.count(),
      prisma.medicine.count({ where: { status: MedicineStatus.ACTIVE } }),
      prisma.medicine.count({ where: { status: MedicineStatus.OUT_OF_STOCK } }),
      prisma.medicine.count({ where: { requiresPrescription: true } }),
      prisma.guestSession.count(),
    ]);

  console.log('\n----------------------------------------');
  console.log('DATABASE SEED SUMMARY');
  console.log('----------------------------------------');
  console.log(`Categories:     ${categoryCount}`);
  console.log(`Medicines:      ${medicineCount} total`);
  console.log(`Active:         ${activeCount}`);
  console.log(`Out of stock:   ${outOfStockCount}`);
  console.log(`Rx-only:        ${rxCount}`);
  console.log(`Guest sessions: ${sessionCount}`);
  console.log('----------------------------------------\n');
}

async function main(): Promise<void> {
  console.log('\nHealthBridge Prisma seed starting...\n');

  try {
    const categoryIdMap = await seedCategories();
    await seedMedicines(categoryIdMap);
    await seedDevGuestSession();
    await printSummary();
    log.done('Seed completed successfully.');
  } catch (error) {
    log.error('Seed failed. See error below.');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
