import { LabTestStatus, PackageStatus } from '@prisma/client';
import { prisma } from './client';
import {
  CARDIAC_PACKAGE,
  DIABETES_PACKAGE,
  LAB_TEST_CATALOG,
  WELLNESS_PACKAGE,
} from './data/lab-tests.data';
import { decimal } from './helpers';

type PackageSeed = {
  name: string;
  description: string;
  originalPrice: string;
  discountedPrice: string;
  validityDays: number;
  testCodes: readonly string[];
};

async function upsertPackageItems(
  packageId: string,
  testIds: string[],
): Promise<void> {
  for (const testId of testIds) {
    await prisma.testPackageItem.upsert({
      where: {
        packageId_testId: {
          packageId,
          testId,
        },
      },
      create: {
        packageId,
        testId,
      },
      update: {},
    });
  }
}

async function seedTestsForCenter(diagnosticCenterId: string) {
  const testIdsByCode: Record<string, string> = {};
  const seededTests: Awaited<ReturnType<typeof prisma.labTest.upsert>>[] = [];

  for (const test of LAB_TEST_CATALOG) {
    const row = await prisma.labTest.upsert({
      where: {
        diagnosticCenterId_code: {
          diagnosticCenterId,
          code: test.code,
        },
      },
      create: {
        diagnosticCenterId,
        name: test.name,
        code: test.code,
        description: test.description,
        price: decimal(test.price),
        turnaroundDays: test.turnaroundDays,
        sampleType: test.sampleType,
        instructions: test.instructions,
        requiresFasting: test.requiresFasting,
        status: LabTestStatus.ACTIVE,
      },
      update: {
        name: test.name,
        description: test.description,
        price: decimal(test.price),
        turnaroundDays: test.turnaroundDays,
        sampleType: test.sampleType,
        instructions: test.instructions,
        requiresFasting: test.requiresFasting,
        status: LabTestStatus.ACTIVE,
      },
    });
    testIdsByCode[test.code] = row.id;
    seededTests.push(row);
  }

  return { testIdsByCode, seededTests };
}

async function seedPackageForCenter(
  diagnosticCenterId: string,
  pkg: PackageSeed,
  testIdsByCode: Record<string, string>,
) {
  const packageRow = await prisma.testPackage.upsert({
    where: {
      diagnosticCenterId_name: {
        diagnosticCenterId,
        name: pkg.name,
      },
    },
    create: {
      diagnosticCenterId,
      name: pkg.name,
      description: pkg.description,
      originalPrice: decimal(pkg.originalPrice),
      discountedPrice: decimal(pkg.discountedPrice),
      validityDays: pkg.validityDays,
      status: PackageStatus.ACTIVE,
    },
    update: {
      description: pkg.description,
      originalPrice: decimal(pkg.originalPrice),
      discountedPrice: decimal(pkg.discountedPrice),
      validityDays: pkg.validityDays,
      status: PackageStatus.ACTIVE,
    },
  });

  await upsertPackageItems(
    packageRow.id,
    pkg.testCodes.map((code) => testIdsByCode[code]),
  );

  return packageRow;
}

export async function seedLab(diagnosticCenterIds: string[]) {
  const allTests: Awaited<ReturnType<typeof prisma.labTest.upsert>>[] = [];
  const allPackages: Awaited<ReturnType<typeof prisma.testPackage.upsert>>[] = [];

  for (const diagnosticCenterId of diagnosticCenterIds) {
    const { testIdsByCode, seededTests } =
      await seedTestsForCenter(diagnosticCenterId);
    allTests.push(...seededTests);

    for (const pkg of [WELLNESS_PACKAGE, DIABETES_PACKAGE, CARDIAC_PACKAGE]) {
      const packageRow = await seedPackageForCenter(
        diagnosticCenterId,
        pkg,
        testIdsByCode,
      );
      allPackages.push(packageRow);
    }
  }

  return {
    tests: allTests,
    packages: allPackages,
    centerCount: diagnosticCenterIds.length,
    testsPerCenter: LAB_TEST_CATALOG.length,
  };
}
