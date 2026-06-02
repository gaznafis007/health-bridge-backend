import { disconnect } from './seed/client';
import { seedFacilities } from './seed/facilities.seed';
import { seedUsers } from './seed/users.seed';
import { seedLab } from './seed/lab.seed';
import { seedEcommerce } from './seed/ecommerce.seed';
import { seedAmbulances } from './seed/ambulance.seed';
import { CREDENTIALS, IDS } from './seed/ids';

async function main() {
  console.log('Seeding Health Bridge database...\n');

  const { hospital, clinic, centralLab, northLab } = await seedFacilities();
  console.log('  Facilities seeded');

  await seedUsers(hospital.id);
  console.log('  Users and profiles seeded');

  await seedLab(centralLab.id, northLab.id);
  console.log('  Lab tests and packages seeded');

  await seedEcommerce();
  console.log('  Medicine catalog seeded');

  await seedAmbulances(hospital.id);
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

  console.log('\nKey facility IDs:');
  console.log(`  Hospital:          ${hospital.name} (${hospital.id})`);
  console.log(`  Clinic:            ${clinic.name} (${clinic.id})`);
  console.log(`  Central Lab:       ${centralLab.name} (${centralLab.id})`);
  console.log(`  North Lab:         ${northLab.name} (${northLab.id})`);
  console.log(`  Hospital (fixed):  ${IDS.healthCenter.hospital}`);

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
