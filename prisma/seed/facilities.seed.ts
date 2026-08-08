import { HealthCenterType } from '@prisma/client';
import { prisma } from './client';
import { IDS } from './ids';

type HealthCenterSeed = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  type: HealthCenterType;
};

const HEALTH_CENTERS: HealthCenterSeed[] = [
  {
    id: IDS.healthCenter.hospital,
    name: 'Health Bridge General Hospital',
    address: '123 Medical Avenue, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1205',
    phone: '+8809612345678',
    email: 'hospital@healthbridge.dev',
    latitude: 23.7461,
    longitude: 90.3742,
    type: HealthCenterType.HOSPITAL,
  },
  {
    id: IDS.healthCenter.clinic,
    name: 'Health Bridge City Clinic',
    address: '45 Gulshan Avenue',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    phone: '+8809612345679',
    email: 'clinic@healthbridge.dev',
    latitude: 23.7925,
    longitude: 90.4078,
    type: HealthCenterType.CLINIC,
  },
  {
    id: IDS.healthCenter.uttaraHospital,
    name: 'Health Bridge Uttara Hospital',
    address: 'Plot 12, Sector 7, Uttara',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1230',
    phone: '+8809612345682',
    email: 'uttara@healthbridge.dev',
    latitude: 23.8759,
    longitude: 90.3795,
    type: HealthCenterType.HOSPITAL,
  },
  {
    id: IDS.healthCenter.mirpurClinic,
    name: 'Health Bridge Mirpur Emergency Clinic',
    address: 'Mirpur-10 Circle, Dhaka',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1216',
    phone: '+8809612345683',
    email: 'mirpur@healthbridge.dev',
    latitude: 23.8223,
    longitude: 90.3654,
    type: HealthCenterType.CLINIC,
  },
  {
    id: IDS.healthCenter.bananiDiagnostic,
    name: 'Health Bridge Banani Diagnostic Center',
    address: 'Road 11, Banani',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1213',
    phone: '+8809612345684',
    email: 'banani-lab@healthbridge.dev',
    latitude: 23.7937,
    longitude: 90.4066,
    type: HealthCenterType.DIAGNOSTIC_CENTER,
  },
];

async function upsertHealthCenter(center: HealthCenterSeed) {
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

export async function seedFacilities() {
  const [hospital, clinic, uttaraHospital, mirpurClinic, bananiDiagnostic] =
    await Promise.all(HEALTH_CENTERS.map(upsertHealthCenter));

  const centralLab = await prisma.diagnosticCenter.upsert({
    where: { name: 'Health Bridge Central Diagnostics' },
    create: {
      id: IDS.diagnosticCenter.central,
      name: 'Health Bridge Central Diagnostics',
      address: '78 Laboratory Road, Mirpur',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1216',
      phone: '+8809612345680',
      email: 'lab-central@healthbridge.dev',
      latitude: 23.8223,
      longitude: 90.3654,
      operatingHours: 'Sat-Thu 8:00-20:00, Fri 14:00-20:00',
    },
    update: {
      address: '78 Laboratory Road, Mirpur',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1216',
      phone: '+8809612345680',
      email: 'lab-central@healthbridge.dev',
      latitude: 23.8223,
      longitude: 90.3654,
      operatingHours: 'Sat-Thu 8:00-20:00, Fri 14:00-20:00',
    },
  });

  const northLab = await prisma.diagnosticCenter.upsert({
    where: { name: 'Health Bridge North Diagnostics' },
    create: {
      id: IDS.diagnosticCenter.north,
      name: 'Health Bridge North Diagnostics',
      address: '12 Uttara Sector 7',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1230',
      phone: '+8809612345681',
      email: 'lab-north@healthbridge.dev',
      latitude: 23.8759,
      longitude: 90.3795,
      operatingHours: 'Daily 7:00-22:00',
    },
    update: {
      address: '12 Uttara Sector 7',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1230',
      phone: '+8809612345681',
      email: 'lab-north@healthbridge.dev',
      latitude: 23.8759,
      longitude: 90.3795,
      operatingHours: 'Daily 7:00-22:00',
    },
  });

  return {
    hospital,
    clinic,
    uttaraHospital,
    mirpurClinic,
    bananiDiagnostic,
    healthCenters: [hospital, clinic, uttaraHospital, mirpurClinic, bananiDiagnostic],
    centralLab,
    northLab,
  };
}
