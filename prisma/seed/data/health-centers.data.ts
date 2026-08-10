import { HealthCenterType } from '@prisma/client';
import { IDS } from '../ids';

export type HealthCenterSeed = {
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

export const HEALTH_CENTERS: HealthCenterSeed[] = [
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
  {
    id: IDS.healthCenter.mohakhaliHospital,
    name: 'Health Bridge Mohakhali Community Hospital',
    address: '61 Mohakhali Commercial Area',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    phone: '+8809612345685',
    email: 'mohakhali@healthbridge.dev',
    latitude: 23.7808,
    longitude: 90.4042,
    type: HealthCenterType.HOSPITAL,
  },
  {
    id: IDS.healthCenter.bashundharaClinic,
    name: 'Health Bridge Bashundhara Medical Center',
    address: 'Block C, Bashundhara R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1229',
    phone: '+8809612345686',
    email: 'bashundhara@healthbridge.dev',
    latitude: 23.8151,
    longitude: 90.4265,
    type: HealthCenterType.CLINIC,
  },
  {
    id: IDS.healthCenter.wariClinic,
    name: 'Health Bridge Wari Family Clinic',
    address: 'Rankin Street, Wari',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1203',
    phone: '+8809612345687',
    email: 'wari@healthbridge.dev',
    latitude: 23.7104,
    longitude: 90.4234,
    type: HealthCenterType.CLINIC,
  },
  {
    id: IDS.healthCenter.chittagongHospital,
    name: 'Health Bridge Chittagong Coastal Hospital',
    address: 'Agrabad Commercial Area',
    city: 'Chittagong',
    state: 'Chittagong Division',
    zipCode: '4100',
    phone: '+8809612345688',
    email: 'chittagong@healthbridge.dev',
    latitude: 22.3369,
    longitude: 91.8125,
    type: HealthCenterType.HOSPITAL,
  },
  {
    id: IDS.healthCenter.sylhetClinic,
    name: 'Health Bridge Sylhet Green Valley Clinic',
    address: 'Zindabazar Main Road',
    city: 'Sylhet',
    state: 'Sylhet Division',
    zipCode: '3100',
    phone: '+8809612345689',
    email: 'sylhet@healthbridge.dev',
    latitude: 24.8949,
    longitude: 91.8687,
    type: HealthCenterType.CLINIC,
  },
];
