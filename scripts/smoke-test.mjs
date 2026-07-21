import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { extractDocumentText } from '../lib/documentText.js';
import { detectImageMime, downloadHeaders, isAllowedDocument, safeSegment } from '../lib/files.js';

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

console.log('Smoke tests passed (Excel extraction, file validation and safe download headers).');
