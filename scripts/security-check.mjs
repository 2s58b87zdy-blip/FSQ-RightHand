import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const legacyPasswordPattern = new RegExp(['fsq', '2027'].join(''), 'i');
const clientLegacyPasswordPattern = new RegExp(`password:\\s*['"]${['fsq', '2027'].join('')}`, 'i');

const forbidden = [
  ['lib/auth.js', /CHANGE-ME-IN-AZURE|process\.env\.AUTH_SECRET\s*\|\|\s*['"][^'"]{8}/i, 'AUTH_SECRET må ikke have fallback'],
  ['lib/users.js', legacyPasswordPattern, 'standardadgangskoden må ikke findes'],
  ['app/page.js', clientLegacyPasswordPattern, 'standardadgangskoden må ikke ligge i klienten'],
  ['package.json', /"xlsx"\s*:/, 'den sårbare xlsx-pakke må ikke anvendes']
];
for (const [file, pattern, message] of forbidden) {
  if (pattern.test(read(file))) failures.push(`${file}: ${message}`);
}

const protectedRoutes = [
  'app/api/knowledge/route.js', 'app/api/knowledge/file/route.js',
  'app/api/job-photos/route.js', 'app/api/job-photos/file/route.js',
  'app/api/project-documents/route.js', 'app/api/project-documents/file/route.js',
  'app/api/atlas/report/route.js',
  'app/api/diagnostics/database/route.js', 'app/api/diagnostics/blob/route.js'
];
for (const file of protectedRoutes) {
  if (!/readSession/.test(read(file))) failures.push(`${file}: mangler readSession-kontrol`);
}

const privateCompanyRoutes = [
  'app/api/atlas/report/route.js',
  'app/api/knowledge/route.js',
  'app/api/knowledge/file/route.js',
  'app/api/state/route.js'
];
for (const file of privateCompanyRoutes) {
  if (!/canAccessCompanyLibrary/.test(read(file))) failures.push(`${file}: mangler Company Library-adgangskontrol`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Security checks passed (${protectedRoutes.length} protected routes checked).`);
