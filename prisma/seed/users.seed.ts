import {
  DriverStatus,
  Gender,
  UserRole,
} from '@prisma/client';
import { prisma } from './client';
import { CREDENTIALS, IDS } from './ids';
import { hashPassword } from './helpers';

export async function upsertUser(
  id: string,
  email: string,
  phone: string,
  password: string,
  role: UserRole,
  firstName: string,
  lastName: string,
) {
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      id,
      email,
      phone,
      passwordHash,
      role,
      firstName,
      lastName,
      isVerified: true,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
    },
    update: {
      phone,
      passwordHash,
      role,
      firstName,
      lastName,
      isVerified: true,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  return user;
}

export async function seedUsers(healthCenterHospitalId: string) {
  const admin = await upsertUser(
    IDS.user.admin,
    CREDENTIALS.admin.email,
    '+8801700000001',
    CREDENTIALS.admin.password,
    UserRole.ADMIN,
    'System',
    'Admin',
  );

  const dispatcher = await upsertUser(
    IDS.user.dispatcher,
    CREDENTIALS.dispatcher.email,
    '+8801700000002',
    CREDENTIALS.dispatcher.password,
    UserRole.DISPATCHER,
    'Dispatch',
    'Operator',
  );

  const patient1 = await upsertUser(
    IDS.user.patient1,
    CREDENTIALS.patient1.email,
    '+8801700000005',
    CREDENTIALS.patient1.password,
    UserRole.PATIENT,
    'Karim',
    'Hossain',
  );

  const patient2 = await upsertUser(
    IDS.user.patient2,
    CREDENTIALS.patient2.email,
    '+8801700000006',
    CREDENTIALS.patient2.password,
    UserRole.PATIENT,
    'Nadia',
    'Islam',
  );

  const driver1 = await upsertUser(
    IDS.user.driver1,
    CREDENTIALS.driver1.email,
    '+8801700000007',
    CREDENTIALS.driver1.password,
    UserRole.DRIVER,
    'Jamal',
    'Uddin',
  );

  const driver2 = await upsertUser(
    IDS.user.driver2,
    CREDENTIALS.driver2.email,
    '+8801700000008',
    CREDENTIALS.driver2.password,
    UserRole.DRIVER,
    'Hasan',
    'Ali',
  );

  const now = new Date();

  await prisma.patientProfile.upsert({
    where: { userId: patient1.id },
    create: {
      userId: patient1.id,
      bloodGroup: 'B+',
      height: 172,
      weight: 68,
      dateOfBirth: new Date('1990-05-15'),
      gender: Gender.MALE,
      emergencyContact: 'Fatima Hossain',
      emergencyPhone: '+8801700000091',
      medicalHistory: 'Hypertension (controlled)',
      allergies: 'Penicillin',
      address: 'House 12, Road 5, Banani',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1213',
    },
    update: {
      bloodGroup: 'B+',
      height: 172,
      weight: 68,
      dateOfBirth: new Date('1990-05-15'),
      gender: Gender.MALE,
      emergencyContact: 'Fatima Hossain',
      emergencyPhone: '+8801700000091',
      medicalHistory: 'Hypertension (controlled)',
      allergies: 'Penicillin',
      address: 'House 12, Road 5, Banani',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1213',
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: patient2.id },
    create: {
      userId: patient2.id,
      bloodGroup: 'O+',
      height: 165,
      weight: 58,
      dateOfBirth: new Date('1995-11-22'),
      gender: Gender.FEMALE,
      emergencyContact: 'Rafiq Islam',
      emergencyPhone: '+8801700000092',
      medicalHistory: 'None significant',
      allergies: 'None',
      address: 'Flat 4B, Green Road',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1205',
    },
    update: {
      bloodGroup: 'O+',
      height: 165,
      weight: 58,
      dateOfBirth: new Date('1995-11-22'),
      gender: Gender.FEMALE,
      emergencyContact: 'Rafiq Islam',
      emergencyPhone: '+8801700000092',
      medicalHistory: 'None significant',
      allergies: 'None',
      address: 'Flat 4B, Green Road',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1205',
    },
  });

  const licenseExpiry = new Date();
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 2);

  await prisma.driverProfile.upsert({
    where: { userId: driver1.id },
    create: {
      userId: driver1.id,
      healthCenterId: healthCenterHospitalId,
      licenseNumber: 'DL-BD-90001',
      licenseExpiryDate: licenseExpiry,
      isVerified: true,
      verifiedAt: now,
      status: DriverStatus.ACTIVE,
    },
    update: {
      healthCenterId: healthCenterHospitalId,
      licenseNumber: 'DL-BD-90001',
      licenseExpiryDate: licenseExpiry,
      isVerified: true,
      verifiedAt: now,
      status: DriverStatus.ACTIVE,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driver2.id },
    create: {
      userId: driver2.id,
      healthCenterId: healthCenterHospitalId,
      licenseNumber: 'DL-BD-90002',
      licenseExpiryDate: licenseExpiry,
      isVerified: true,
      verifiedAt: now,
      status: DriverStatus.ACTIVE,
    },
    update: {
      healthCenterId: healthCenterHospitalId,
      licenseNumber: 'DL-BD-90002',
      licenseExpiryDate: licenseExpiry,
      isVerified: true,
      verifiedAt: now,
      status: DriverStatus.ACTIVE,
    },
  });

  return {
    admin,
    dispatcher,
    patient1,
    patient2,
    driver1,
    driver2,
  };
}
