import 'dotenv/config'; // Must be first — loads .env before db import reads DATABASE_URL

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../src/lib/db';

function parseRows(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.split('\n').filter((l) => l.trim());
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((l) => l.split(','));
  return { headers, rows };
}

async function main() {
  // Build Map<Id → InstName> from UrbanColleges.csv
  const urbanCsv = readFileSync(
    join(__dirname, '../data/UrbanColleges.csv'),
    'utf8'
  );
  const { headers: urbanHeaders, rows: urbanRows } = parseRows(urbanCsv);
  const idIdx = urbanHeaders.indexOf('Id');
  const nameIdx = urbanHeaders.indexOf('InstName');

  if (idIdx === -1 || nameIdx === -1) {
    throw new Error('UrbanColleges.csv missing Id or InstName column');
  }

  const instNameMap = new Map<string, string>();
  for (const row of urbanRows) {
    const id = row[idIdx]?.trim();
    const name = row[nameIdx]?.trim();
    if (id && name) instNameMap.set(id, name);
  }

  // Parse NcaaSchools.csv and look up each school's real name
  const ncaaCsv = readFileSync(
    join(__dirname, '../data/NcaaSchools.csv'),
    'utf8'
  );
  const { headers: ncaaHeaders, rows: ncaaRows } = parseRows(ncaaCsv);
  const urbanCollegeIdIdx = ncaaHeaders.indexOf('UrbanCollegeId');

  if (urbanCollegeIdIdx === -1) {
    throw new Error('NcaaSchools.csv missing UrbanCollegeId column');
  }

  const names: string[] = [];
  let unmatched = 0;

  for (const row of ncaaRows) {
    const urbanCollegeId = row[urbanCollegeIdIdx]?.trim();
    if (!urbanCollegeId) continue;
    const instName = instNameMap.get(urbanCollegeId);
    if (instName) {
      names.push(instName);
    } else {
      unmatched++;
    }
  }

  if (unmatched > 0) {
    console.warn(`Warning: ${unmatched} rows had no matching school name`);
  }

  // Clean up any legacy numeric-only records (from old UnitId-based seed runs)
  const cleaned = await db.$executeRaw`DELETE FROM "School" WHERE name ~ '^[0-9]+$'`;
  if (cleaned > 0) console.log(`Removed ${cleaned} legacy numeric school records`);

  console.log(`Seeding ${names.length} NCAA schools…`);

  let upserted = 0;
  for (const name of names) {
    await db.school.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    upserted++;
  }

  console.log(`Done: ${upserted} schools upserted`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
