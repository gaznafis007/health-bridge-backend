import { disconnect } from './seed/client';
import { seedFacilities } from './seed/facilities.seed';
import { seedUsers } from './seed/users.seed';
import { seedLab } from './seed/lab.seed';
import { seedEcommerce } from './seed/ecommerce.seed';
import { seedAmbulances } from './seed/ambulance.seed';
import { CREDENTIALS } from './seed/ids';

async function main() {
  console.log('Seeding Health Bridge database...\n');

  const {
    hospital,
    uttaraHospital,
    mirpurClinic,
    healthCenters,
    diagnosticCenters,
  } = await seedFacilities();
  console.log('  Facilities seeded');

  await seedUsers(hospital.id);
  console.log('  Users and profiles seeded');

  const lab = await seedLab(diagnosticCenters.map((center) => center.id));
  console.log(
    `  Lab tests and packages seeded (${lab.centerCount} centers × ${lab.testsPerCenter} tests each)`,
  );

  const { medicines, categories } = await seedEcommerce();
  console.log(`  Medicine catalog seeded (${medicines.length} medicines, ${categories.length} categories)`);

  await seedAmbulances({
    hospitalId: hospital.id,
    uttaraHospitalId: uttaraHospital.id,
    mirpurClinicId: mirpurClinic.id,
  });
  console.log('  Ambulances seeded');

  console.log('\n========================================');
  console.log('  Health Bridge — Seeded Login Accounts');
  console.log('========================================\n');

  const accounts = [
    { role: 'ADMIN', ...CREDENTIALS.admin },
    { role: 'DISPATCHER', ...CREDENTIALS.dispatcher },
    { role: 'DOCTOR', ...CREDENTIALS.doctor1 },
    { role: 'DOCTOR', ...CREDENTIALS.doctor2 },
    { role: 'PATIENT', ...CREDENTIALS.patient1 },
    { role: 'PATIENT', ...CREDENTIALS.patient2 },
    { role: 'DRIVER', ...CREDENTIALS.driver1 },
    { role: 'DRIVER', ...CREDENTIALS.driver2 },
  ];

  console.log('Role        Email                          Password');
  console.log('----------  -----------------------------  ------------');
  for (const account of accounts) {
    console.log(
      `${account.role.padEnd(11)} ${account.email.padEnd(30)} ${account.password}`,
    );
  }

  console.log('\nHealth centers (for ambulance origin/destination):');
  console.log(`  Total: ${healthCenters.length}`);
  for (const center of healthCenters) {
    console.log(`  - ${center.name} (${center.id}) [${center.type}]`);
  }

  console.log('\nDiagnostic centers:');
  console.log(`  Total: ${diagnosticCenters.length}`);
  for (const center of diagnosticCenters) {
    console.log(`  - ${center.name} (${center.id})`);
  }

  console.log('\nSeed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
