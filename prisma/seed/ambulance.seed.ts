import { AmbulanceStatus, AmbulanceVehicleType } from '@prisma/client';
import { prisma } from './client';
import { IDS } from './ids';

export async function seedAmbulances(healthCenterHospitalId: string) {
  const ambulances = [
    {
      id: IDS.ambulance.basic1,
      healthCenterId: healthCenterHospitalId,
      vehicleNumber: 'DHK-AMB-1001',
      vehicleType: AmbulanceVehicleType.BASIC,
      insuranceNumber: 'INS-AMB-001',
      status: AmbulanceStatus.AVAILABLE,
      latitude: 23.7461,
      longitude: 90.3742,
    },
    {
      id: IDS.ambulance.advanced1,
      healthCenterId: healthCenterHospitalId,
      vehicleNumber: 'DHK-AMB-1002',
      vehicleType: AmbulanceVehicleType.ADVANCED,
      insuranceNumber: 'INS-AMB-002',
      status: AmbulanceStatus.AVAILABLE,
      latitude: 23.748,
      longitude: 90.376,
    },
    {
      id: IDS.ambulance.icu1,
      healthCenterId: healthCenterHospitalId,
      vehicleNumber: 'DHK-AMB-1003',
      vehicleType: AmbulanceVehicleType.ICU,
      insuranceNumber: 'INS-AMB-003',
      status: AmbulanceStatus.AVAILABLE,
      latitude: 23.744,
      longitude: 90.372,
    },
  ];

  const seeded: Awaited<ReturnType<typeof prisma.ambulance.upsert>>[] = [];
  for (const ambulance of ambulances) {
    const row = await prisma.ambulance.upsert({
      where: { vehicleNumber: ambulance.vehicleNumber },
      create: ambulance,
      update: {
        healthCenterId: ambulance.healthCenterId,
        vehicleType: ambulance.vehicleType,
        insuranceNumber: ambulance.insuranceNumber,
        status: ambulance.status,
        latitude: ambulance.latitude,
        longitude: ambulance.longitude,
      },
    });
    seeded.push(row);
  }

  return seeded;
}
