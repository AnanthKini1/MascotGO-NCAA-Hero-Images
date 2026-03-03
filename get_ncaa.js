const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'data', 'UrbanCollegeCharacteristics.csv');
const outputFile = path.join(__dirname, 'data', 'NcaaSchools.csv');

const lines = fs.readFileSync(inputFile, 'utf8').split('\n');
const header = lines[0];
const headers = header.split(',');
const ncaaIndex = headers.indexOf('MemberNcaa');

if (ncaaIndex === -1) {
  console.error('MemberNcaa column not found');
  process.exit(1);
}

const ncaaRows = lines.slice(1).filter(line => {
  if (!line.trim()) return false;
  const cols = line.split(',');
  return cols[ncaaIndex] === 'Yes';
});

fs.writeFileSync(outputFile, [header, ...ncaaRows].join('\n'));
console.log(`Found ${ncaaRows.length} NCAA schools. Saved to data/NcaaSchools.csv`);
