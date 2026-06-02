import { HealthCenterType } from '@prisma/client';
import { prisma } from './client';
import { IDS } from './ids';

export async function seedFacilities() {
  const hospital = await prisma.healthCenter.upsert({
    where: { name: 'Health Bridge General Hospital' },
    create: {
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
    update: {
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
  });

  const clinic = await prisma.healthCenter.upsert({
    where: { name: 'Health Bridge City Clinic' },
    create: {
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
    update: {
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
  });

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

  return { hospital, clinic, centralLab, northLab };
}
