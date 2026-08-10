import { DayOfWeek, DoctorStatus, UserRole } from '@prisma/client';
import type { HealthCenter } from '@prisma/client';
import { prisma } from './client';
import {
  buildDoctorCatalog,
  type DoctorCatalogEntry,
} from './data/doctors.data';
import {
  DOCTORS_PER_SPECIALIZATION,
  MEDICAL_SPECIALIZATIONS,
} from './data/specializations.data';
import { CREDENTIALS, IDS } from './ids';
import { decimal } from './helpers';
import { upsertUser } from './users.seed';

const DOCTOR_PASSWORD = 'Doctor@1234';

/** Stable IDs for catalog doctors (50 = 10 specs × 5 doctors). */
function doctorUserId(specIndex: number, doctorIndex: number): string {
  if (specIndex === 0 && doctorIndex === 0) {
    return IDS.user.doctor1;
  }
  if (specIndex === 1 && doctorIndex === 0) {
    return IDS.user.doctor2;
  }
  const serial = 600 + specIndex * 5 + doctorIndex;
  return `00000000-0000-4000-8000-${String(serial).padStart(12, '0')}`;
}

function doctorProfileId(specIndex: number, doctorIndex: number): string {
  if (specIndex === 0 && doctorIndex === 0) {
    return IDS.doctorProfile.doctor1;
  }
  if (specIndex === 1 && doctorIndex === 0) {
    return IDS.doctorProfile.doctor2;
  }
  const serial = 800 + specIndex * 5 + doctorIndex;
  return `00000000-0000-4000-8000-${String(serial).padStart(12, '0')}`;
}

function doctorEmail(entry: DoctorCatalogEntry): string {
  if (entry.specIndex === 0 && entry.doctorIndex === 0) {
    return CREDENTIALS.doctor1.email;
  }
  if (entry.specIndex === 1 && entry.doctorIndex === 0) {
    return CREDENTIALS.doctor2.email;
  }
  const slug = entry.specialization.toLowerCase().replace(/\s+/g, '-');
  return `dr.${slug}.${entry.doctorIndex + 1}@healthbridge.dev`;
}

function doctorPhone(specIndex: number, doctorIndex: number): string {
  const suffix = String(specIndex * 10 + doctorIndex + 1).padStart(4, '0');
  return `+8801701${suffix}`;
}

function licenseNumber(specIndex: number, doctorIndex: number): string {
  return `DMC-${String(specIndex + 1).padStart(2, '0')}${String(doctorIndex + 1).padStart(2, '0')}`;
}

/** Spread availability across the week so any weekday search finds doctors. */
const WEEKLY_DAY_SETS: DayOfWeek[][] = [
  [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
  [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY],
  [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY],
  [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.SUNDAY],
  [DayOfWeek.THURSDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
];

const TIME_WINDOWS = [
  { startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
  { startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 },
  { startTime: '10:00', endTime: '14:00', slotDurationMinutes: 20 },
] as const;

async function upsertDoctorAvailability(
  doctorProfileId: string,
  healthCenterId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  slotDurationMinutes: number,
): Promise<void> {
  const existing = await prisma.doctorAvailability.findFirst({
    where: {
      doctorId: doctorProfileId,
      healthCenterId,
      dayOfWeek,
      startTime,
    },
  });

  if (existing) {
    await prisma.doctorAvailability.update({
      where: { id: existing.id },
      data: {
        endTime,
        slotDurationMinutes,
        isRecurring: true,
        specificDate: null,
      },
    });
    return;
  }

  await prisma.doctorAvailability.create({
    data: {
      doctorId: doctorProfileId,
      healthCenterId,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      isRecurring: true,
    },
  });
}

async function seedDoctorAvailability(
  profileId: string,
  doctorIndex: number,
  healthCenterId: string,
): Promise<number> {
  const days = WEEKLY_DAY_SETS[doctorIndex % WEEKLY_DAY_SETS.length]!;
  const window = TIME_WINDOWS[doctorIndex % TIME_WINDOWS.length]!;
  let slotCount = 0;

  for (const dayOfWeek of days) {
    await upsertDoctorAvailability(
      profileId,
      healthCenterId,
      dayOfWeek,
      window.startTime,
      window.endTime,
      window.slotDurationMinutes,
    );
    const startH = Number(window.startTime.slice(0, 2));
    const startM = Number(window.startTime.slice(3, 5));
    const endH = Number(window.endTime.slice(0, 2));
    const endM = Number(window.endTime.slice(3, 5));
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    slotCount += Math.floor(
      (endMinutes - startMinutes) / window.slotDurationMinutes,
    );
  }

  return slotCount;
}

export async function seedDoctors(healthCenters: HealthCenter[]) {
  if (healthCenters.length === 0) {
    throw new Error('At least one health center is required to seed doctors');
  }

  const catalog = buildDoctorCatalog(
    MEDICAL_SPECIALIZATIONS,
    DOCTORS_PER_SPECIALIZATION,
  );
  const now = new Date();
  let availabilityRules = 0;
  let approximateSlots = 0;

  for (const entry of catalog) {
    const userId = doctorUserId(entry.specIndex, entry.doctorIndex);
    const profileId = doctorProfileId(entry.specIndex, entry.doctorIndex);
    const email = doctorEmail(entry);
    const phone = doctorPhone(entry.specIndex, entry.doctorIndex);
    const password =
      entry.specIndex === 0 && entry.doctorIndex === 0
        ? CREDENTIALS.doctor1.password
        : entry.specIndex === 1 && entry.doctorIndex === 0
          ? CREDENTIALS.doctor2.password
          : DOCTOR_PASSWORD;

    const user = await upsertUser(
      userId,
      email,
      phone,
      password,
      UserRole.DOCTOR,
      entry.firstName,
      entry.lastName,
    );

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      create: {
        id: profileId,
        userId: user.id,
        licenseNumber: licenseNumber(entry.specIndex, entry.doctorIndex),
        specialization: entry.specialization,
        qualification: entry.qualification,
        hospital: entry.hospital,
        biography: entry.biography,
        consultationFee: decimal(entry.consultationFee),
        status: DoctorStatus.ACTIVE,
        isProvideTeleHealth: entry.isProvideTeleHealth,
        rating: entry.rating,
        totalRatings: entry.totalRatings,
        approvedAt: now,
      },
      update: {
        licenseNumber: licenseNumber(entry.specIndex, entry.doctorIndex),
        specialization: entry.specialization,
        qualification: entry.qualification,
        hospital: entry.hospital,
        biography: entry.biography,
        consultationFee: decimal(entry.consultationFee),
        status: DoctorStatus.ACTIVE,
        isProvideTeleHealth: entry.isProvideTeleHealth,
        rating: entry.rating,
        totalRatings: entry.totalRatings,
        approvedAt: now,
      },
    });

    const healthCenter =
      healthCenters[
        (entry.specIndex + entry.doctorIndex) % healthCenters.length
      ]!;
    const days =
      WEEKLY_DAY_SETS[entry.doctorIndex % WEEKLY_DAY_SETS.length]!.length;
    availabilityRules += days;
    approximateSlots += await seedDoctorAvailability(
      profile.id,
      entry.doctorIndex,
      healthCenter.id,
    );
  }

  return {
    doctorCount: catalog.length,
    specializationCount: MEDICAL_SPECIALIZATIONS.length,
    doctorsPerSpecialization: DOCTORS_PER_SPECIALIZATION,
    availabilityRules,
    approximateSlotsPerDoctorAvg: Math.round(
      approximateSlots / catalog.length,
    ),
    specializations: [...MEDICAL_SPECIALIZATIONS],
  };
}
