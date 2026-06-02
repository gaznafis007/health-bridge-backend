import { LabTestStatus, PackageStatus } from '@prisma/client';
import { prisma } from './client';
import { IDS } from './ids';
import { decimal } from './helpers';

export async function seedLab(
  centralLabId: string,
  northLabId: string,
) {
  const tests = [
    {
      id: IDS.labTest.cbc,
      diagnosticCenterId: centralLabId,
      name: 'Complete Blood Count (CBC)',
      code: 'CBC-001',
      description: 'Measures red cells, white cells, and platelets.',
      price: decimal(450),
      turnaroundDays: 1,
      sampleType: 'Blood',
      instructions: 'No special preparation required.',
      requiresFasting: false,
    },
    {
      id: IDS.labTest.lipid,
      diagnosticCenterId: centralLabId,
      name: 'Lipid Profile',
      code: 'LIP-001',
      description: 'Cholesterol and triglyceride panel.',
      price: decimal(850),
      turnaroundDays: 1,
      sampleType: 'Blood',
      instructions: 'Fast for 10-12 hours before sample collection.',
      requiresFasting: true,
    },
    {
      id: IDS.labTest.glucose,
      diagnosticCenterId: centralLabId,
      name: 'Fasting Blood Glucose',
      code: 'FBG-001',
      description: 'Measures blood sugar after fasting.',
      price: decimal(300),
      turnaroundDays: 1,
      sampleType: 'Blood',
      instructions: 'Fast for 8-10 hours before sample collection.',
      requiresFasting: true,
    },
    {
      id: IDS.labTest.thyroid,
      diagnosticCenterId: northLabId,
      name: 'Thyroid Function Test (TFT)',
      code: 'TFT-001',
      description: 'TSH, T3, and T4 levels.',
      price: decimal(1200),
      turnaroundDays: 2,
      sampleType: 'Blood',
      instructions: 'Morning sample preferred.',
      requiresFasting: false,
    },
    {
      id: IDS.labTest.vitaminD,
      diagnosticCenterId: northLabId,
      name: 'Vitamin D (25-OH)',
      code: 'VTD-001',
      description: 'Vitamin D deficiency screening.',
      price: decimal(1800),
      turnaroundDays: 2,
      sampleType: 'Blood',
      instructions: 'No fasting required.',
      requiresFasting: false,
    },
    {
      id: IDS.labTest.liver,
      diagnosticCenterId: northLabId,
      name: 'Liver Function Test (LFT)',
      code: 'LFT-001',
      description: 'ALT, AST, bilirubin, and albumin panel.',
      price: decimal(950),
      turnaroundDays: 1,
      sampleType: 'Blood',
      instructions: 'Avoid alcohol 24 hours before test.',
      requiresFasting: false,
    },
  ];

  const testIds: Record<string, string> = {};
  const seededTests: Awaited<ReturnType<typeof prisma.labTest.upsert>>[] = [];
  for (const test of tests) {
    const row = await prisma.labTest.upsert({
      where: {
        diagnosticCenterId_code: {
          diagnosticCenterId: test.diagnosticCenterId,
          code: test.code,
        },
      },
      create: {
        ...test,
        status: LabTestStatus.ACTIVE,
      },
      update: {
        name: test.name,
        description: test.description,
        price: test.price,
        turnaroundDays: test.turnaroundDays,
        sampleType: test.sampleType,
        instructions: test.instructions,
        requiresFasting: test.requiresFasting,
        status: LabTestStatus.ACTIVE,
      },
    });
    testIds[test.code] = row.id;
    seededTests.push(row);
  }

  const wellnessPackage = await prisma.testPackage.upsert({
    where: {
      diagnosticCenterId_name: {
        diagnosticCenterId: centralLabId,
        name: 'Basic Wellness Panel',
      },
    },
    create: {
      id: IDS.testPackage.wellness,
      diagnosticCenterId: centralLabId,
      name: 'Basic Wellness Panel',
      description: 'CBC, fasting glucose, and lipid profile bundle.',
      originalPrice: decimal(1600),
      discountedPrice: decimal(1299),
      validityDays: 30,
      status: PackageStatus.ACTIVE,
    },
    update: {
      description: 'CBC, fasting glucose, and lipid profile bundle.',
      originalPrice: decimal(1600),
      discountedPrice: decimal(1299),
      validityDays: 30,
      status: PackageStatus.ACTIVE,
    },
  });

  const cardiacPackage = await prisma.testPackage.upsert({
    where: {
      diagnosticCenterId_name: {
        diagnosticCenterId: northLabId,
        name: 'Cardiac Health Package',
      },
    },
    create: {
      id: IDS.testPackage.cardiac,
      diagnosticCenterId: northLabId,
      name: 'Cardiac Health Package',
      description: 'Lipid profile and liver function test bundle.',
      originalPrice: decimal(1800),
      discountedPrice: decimal(1499),
      validityDays: 45,
      status: PackageStatus.ACTIVE,
    },
    update: {
      description: 'Lipid profile and liver function test bundle.',
      originalPrice: decimal(1800),
      discountedPrice: decimal(1499),
      validityDays: 45,
      status: PackageStatus.ACTIVE,
    },
  });

  const wellnessItems = ['CBC-001', 'FBG-001', 'LIP-001'];

  for (const code of wellnessItems) {
    const testId = testIds[code];
    await prisma.testPackageItem.upsert({
      where: {
        packageId_testId: {
          packageId: wellnessPackage.id,
          testId,
        },
      },
      create: {
        packageId: wellnessPackage.id,
        testId,
      },
      update: {},
    });
  }

  const cardiacItems = ['LIP-001', 'LFT-001'];

  for (const code of cardiacItems) {
    const testId = testIds[code];
    await prisma.testPackageItem.upsert({
      where: {
        packageId_testId: {
          packageId: cardiacPackage.id,
          testId,
        },
      },
      create: {
        packageId: cardiacPackage.id,
        testId,
      },
      update: {},
    });
  }

  return { tests: seededTests, wellnessPackage, cardiacPackage };
}
