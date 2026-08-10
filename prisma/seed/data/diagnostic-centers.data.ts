import { IDS } from '../ids';

export type DiagnosticCenterSeed = {
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
  operatingHours: string;
};

/** Real-world-style Bangladesh diagnostic chains for lab booking demos. */
export const DIAGNOSTIC_CENTERS: DiagnosticCenterSeed[] = [
  {
    id: IDS.diagnosticCenter.chevron,
    name: 'Chevron Clinical Laboratory',
    address: 'House 34, Road 46, Gulshan-2',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    phone: '+8809611111001',
    email: 'info@chevronlab.dev',
    latitude: 23.7925,
    longitude: 90.4078,
    operatingHours: 'Sat-Thu 7:00-21:00, Fri 14:00-21:00',
  },
  {
    id: IDS.diagnosticCenter.epic,
    name: 'Epic Health Care Diagnostic',
    address: 'Plot 12, Block C, Banani',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1213',
    phone: '+8809611111002',
    email: 'lab@epichealth.dev',
    latitude: 23.7936,
    longitude: 90.4066,
    operatingHours: 'Daily 8:00-20:00',
  },
  {
    id: IDS.diagnosticCenter.popular,
    name: 'Popular Diagnostic Centre',
    address: 'House 16, Road 2, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1205',
    phone: '+8809611111003',
    email: 'contact@populardiagnostic.dev',
    latitude: 23.7461,
    longitude: 90.3742,
    operatingHours: 'Sat-Thu 7:30-21:00, Fri 15:00-21:00',
  },
  {
    id: IDS.diagnosticCenter.labAid,
    name: 'Lab Aid Limited',
    address: '57/B, Satmasjid Road, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    phone: '+8809611111004',
    email: 'support@labaid.dev',
    latitude: 23.7513,
    longitude: 90.3772,
    operatingHours: 'Daily 7:00-22:00',
  },
  {
    id: IDS.diagnosticCenter.basicLab,
    name: 'Basic Lab',
    address: '78 Laboratory Road, Mirpur-10',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1216',
    phone: '+8809611111005',
    email: 'hello@basiclab.dev',
    latitude: 23.8223,
    longitude: 90.3654,
    operatingHours: 'Sat-Thu 8:00-20:00, Fri 14:00-20:00',
  },
  {
    id: IDS.diagnosticCenter.praava,
    name: 'Praava Health Diagnostics',
    address: 'Plot 81, Siddeshwari Circular Road',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1217',
    phone: '+8809611111006',
    email: 'diagnostics@praava.dev',
    latitude: 23.7469,
    longitude: 90.3965,
    operatingHours: 'Daily 8:00-20:00',
  },
  {
    id: IDS.diagnosticCenter.medinova,
    name: 'Medinova Medical Services',
    address: 'House 42, Road 7, Block C, Banani',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1213',
    phone: '+8809611111007',
    email: 'lab@medinova.dev',
    latitude: 23.7948,
    longitude: 90.4041,
    operatingHours: 'Sat-Thu 7:00-21:00, Fri 15:00-21:00',
  },
  {
    id: IDS.diagnosticCenter.ibnSina,
    name: 'Ibn Sina Diagnostic & Imaging Center',
    address: 'House 48, Road 9/A, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    phone: '+8809611111008',
    email: 'diagnostics@ibnsina.dev',
    latitude: 23.7528,
    longitude: 90.3748,
    operatingHours: 'Daily 7:00-22:00',
  },
  {
    id: IDS.diagnosticCenter.anwerKhan,
    name: 'Anwer Khan Modern Hospital Laboratory',
    address: 'Road 8, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1205',
    phone: '+8809611111009',
    email: 'lab@anwerkhan.dev',
    latitude: 23.7412,
    longitude: 90.3821,
    operatingHours: 'Daily 24 hours (sample collection 7:00-22:00)',
  },
  {
    id: IDS.diagnosticCenter.united,
    name: 'United Hospital Diagnostic Centre',
    address: 'Plot 15, Road 71, Gulshan-2',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    phone: '+8809611111010',
    email: 'lab@unitedhospital.dev',
    latitude: 23.8045,
    longitude: 90.4156,
    operatingHours: 'Daily 7:00-23:00',
  },
];
