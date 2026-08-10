import { prisma } from './client';
import { DIAGNOSTIC_CENTERS } from './data/diagnostic-centers.data';
import { HEALTH_CENTERS } from './data/health-centers.data';
import { IDS } from './ids';

async function upsertHealthCenter(center: (typeof HEALTH_CENTERS)[number]) {
  return prisma.healthCenter.upsert({
    where: { name: center.name },
    create: center,
    update: {
      address: center.address,
      city: center.city,
      state: center.state,
      zipCode: center.zipCode,
      phone: center.phone,
      email: center.email,
      latitude: center.latitude,
      longitude: center.longitude,
      type: center.type,
    },
  });
}

async function upsertDiagnosticCenter(center: (typeof DIAGNOSTIC_CENTERS)[number]) {
  return prisma.diagnosticCenter.upsert({
    where: { id: center.id },
    create: center,
    update: {
      name: center.name,
      address: center.address,
      city: center.city,
      state: center.state,
      zipCode: center.zipCode,
      phone: center.phone,
      email: center.email,
      latitude: center.latitude,
      longitude: center.longitude,
      operatingHours: center.operatingHours,
    },
  });
}

export async function seedFacilities() {
  const healthCenters = await Promise.all(HEALTH_CENTERS.map(upsertHealthCenter));

  const hospital = healthCenters.find((c) => c.id === IDS.healthCenter.hospital)!;
  const clinic = healthCenters.find((c) => c.id === IDS.healthCenter.clinic)!;
  const uttaraHospital = healthCenters.find(
    (c) => c.id === IDS.healthCenter.uttaraHospital,
  )!;
  const mirpurClinic = healthCenters.find(
    (c) => c.id === IDS.healthCenter.mirpurClinic,
  )!;
  const bananiDiagnostic = healthCenters.find(
    (c) => c.id === IDS.healthCenter.bananiDiagnostic,
  )!;

  const diagnosticCenters = await Promise.all(
    DIAGNOSTIC_CENTERS.map(upsertDiagnosticCenter),
  );

  return {
    hospital,
    clinic,
    uttaraHospital,
    mirpurClinic,
    bananiDiagnostic,
    healthCenters,
    diagnosticCenters,
  };
}
