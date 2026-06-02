import {
  DayOfWeek,
  DoctorStatus,
  DriverStatus,
  Gender,
  UserRole,
} from '@prisma/client';
import { prisma } from './client';
import { CREDENTIALS, IDS } from './ids';
import { decimal, hashPassword } from './helpers';

async function upsertUser(
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

  const doctor1User = await upsertUser(
    IDS.user.doctor1,
    CREDENTIALS.doctor1.email,
    '+8801700000003',
    CREDENTIALS.doctor1.password,
    UserRole.DOCTOR,
    'Rahim',
    'Ahmed',
  );

  const doctor2User = await upsertUser(
    IDS.user.doctor2,
    CREDENTIALS.doctor2.email,
    '+8801700000004',
    CREDENTIALS.doctor2.password,
    UserRole.DOCTOR,
    'Sadia',
    'Khan',
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

  const doctor1Profile = await prisma.doctorProfile.upsert({
    where: { userId: doctor1User.id },
    create: {
      id: IDS.doctorProfile.doctor1,
      userId: doctor1User.id,
      licenseNumber: 'DMC-10001',
      specialization: 'Cardiology',
      qualification: 'MBBS, FCPS (Cardiology)',
      hospital: 'Health Bridge General Hospital',
      biography: 'Senior cardiologist with 12 years of experience.',
      consultationFee: decimal(1500),
      status: DoctorStatus.ACTIVE,
      isProvideTeleHealth: true,
      rating: 4.8,
      totalRatings: 42,
      approvedAt: now,
    },
    update: {
      licenseNumber: 'DMC-10001',
      specialization: 'Cardiology',
      qualification: 'MBBS, FCPS (Cardiology)',
      hospital: 'Health Bridge General Hospital',
      biography: 'Senior cardiologist with 12 years of experience.',
      consultationFee: decimal(1500),
      status: DoctorStatus.ACTIVE,
      isProvideTeleHealth: true,
      approvedAt: now,
    },
  });

  const doctor2Profile = await prisma.doctorProfile.upsert({
    where: { userId: doctor2User.id },
    create: {
      id: IDS.doctorProfile.doctor2,
      userId: doctor2User.id,
      licenseNumber: 'DMC-10002',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (Internal Medicine)',
      hospital: 'Health Bridge City Clinic',
      biography: 'General physician focused on preventive care.',
      consultationFee: decimal(800),
      status: DoctorStatus.ACTIVE,
      isProvideTeleHealth: false,
      rating: 4.5,
      totalRatings: 28,
      approvedAt: now,
    },
    update: {
      licenseNumber: 'DMC-10002',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (Internal Medicine)',
      hospital: 'Health Bridge City Clinic',
      biography: 'General physician focused on preventive care.',
      consultationFee: decimal(800),
      status: DoctorStatus.ACTIVE,
      isProvideTeleHealth: false,
      approvedAt: now,
    },
  });

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

  const availabilitySlots = [
    {
      doctorId: doctor1Profile.id,
      healthCenterId: healthCenterHospitalId,
      dayOfWeek: DayOfWeek.SUNDAY,
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 30,
    },
    {
      doctorId: doctor1Profile.id,
      healthCenterId: healthCenterHospitalId,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '14:00',
      endTime: '18:00',
      slotDurationMinutes: 30,
    },
    {
      doctorId: doctor2Profile.id,
      healthCenterId: healthCenterHospitalId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '10:00',
      endTime: '14:00',
      slotDurationMinutes: 20,
    },
    {
      doctorId: doctor2Profile.id,
      healthCenterId: healthCenterHospitalId,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '10:00',
      endTime: '14:00',
      slotDurationMinutes: 20,
    },
  ];

  for (const slot of availabilitySlots) {
    const existing = await prisma.doctorAvailability.findFirst({
      where: {
        doctorId: slot.doctorId,
        healthCenterId: slot.healthCenterId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
      },
    });

    if (existing) {
      await prisma.doctorAvailability.update({
        where: { id: existing.id },
        data: {
          endTime: slot.endTime,
          slotDurationMinutes: slot.slotDurationMinutes,
          isRecurring: true,
        },
      });
    } else {
      await prisma.doctorAvailability.create({ data: slot });
    }
  }

  return {
    admin,
    dispatcher,
    doctor1User,
    doctor2User,
    patient1,
    patient2,
    driver1,
    driver2,
    doctor1Profile,
    doctor2Profile,
  };
}
