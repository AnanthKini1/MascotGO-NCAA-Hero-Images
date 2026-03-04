/**
 * Seed script: populates the School table from data/NcaaSchools.csv
 *
 * NOTE: NcaaSchools.csv contains IPEDS UnitId codes but no institution names.
 * Schools are seeded using UnitId as a placeholder name for now.
 * To get real names, download the IPEDS HD (Header/Directory) file from:
 *   https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx
 * Match on UnitId → INSTNM and update the School.name values accordingly.
 *
 * Usage: npm run seed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../src/lib/db';

async function main() {
  const csvPath = join(__dirname, '../data/NcaaSchools.csv');
  const csv = readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    throw new Error('CSV appears empty or has no data rows');
  }

  const headers = lines[0].split(',');
  const unitIdIndex = headers.indexOf('UnitId');

  if (unitIdIndex === -1) {
    throw new Error('UnitId column not found in CSV');
  }

  const unitIds = lines
    .slice(1)
    .map((line) => line.split(',')[unitIdIndex]?.trim())
    .filter(Boolean) as string[];

  console.log(`Found ${unitIds.length} NCAA schools in CSV`);

  let created = 0;
  let skipped = 0;

  for (const unitId of unitIds) {
    const existing = await db.school.findUnique({ where: { name: unitId } });
    if (existing) {
      skipped++;
    } else {
      await db.school.create({ data: { name: unitId } });
      created++;
    }
  }

  console.log(`Seed complete: ${created} created, ${skipped} already existed`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
