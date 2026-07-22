import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { extractDocumentText } from '../lib/documentText.js';
import { detectImageMime, downloadHeaders, isAllowedDocument, safeSegment } from '../lib/files.js';
import { assignmentLabel, isTaskAssignedTo, taskAssignees } from '../lib/taskAssignments.js';
import fs from 'node:fs';

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Secure test');
sheet.addRow(['Project', 'Status']);
sheet.addRow(['Wind Orca', 'Ready']);
const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
const extracted = await extractDocumentText(
  xlsxBuffer,
  'test.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
);
assert.match(extracted, /Wind Orca/);
assert.match(extracted, /Ready/);

assert.equal(isAllowedDocument('manual.pdf'), true);
assert.equal(isAllowedDocument('payload.html'), false);
assert.equal(safeSegment('../../secret'), '..-..-secret');
assert.equal(detectImageMime(Buffer.from([0xff,0xd8,0xff,0x00,0,0,0,0,0,0,0,0])), 'image/jpeg');
assert.equal(detectImageMime(Buffer.from('<svg></svg>')), null);

const riskyHeaders = downloadHeaders({ contentType: 'text/html', filename: 'test.html', inline: true });
assert.match(riskyHeaders.get('Content-Disposition'), /^attachment/);
assert.equal(riskyHeaders.get('X-Content-Type-Options'), 'nosniff');

const sharedTask = { person: 'Tommy', assignees: ['Tommy', 'Jakob', 'Tommy'] };
assert.deepEqual(taskAssignees(sharedTask), ['Tommy', 'Jakob']);
assert.equal(isTaskAssignedTo(sharedTask, 'jakob'), true);
assert.equal(isTaskAssignedTo(sharedTask, 'Flemming'), false);
assert.equal(assignmentLabel(sharedTask), 'Tommy, Jakob');
assert.equal(isTaskAssignedTo({ person: 'Tommy' }, 'Tommy'), true);

const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
const serviceWorker = fs.readFileSync('public/sw.js', 'utf8');
assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/);

console.log('Smoke tests passed (documents, downloads, crew assignment and mobile app).');
