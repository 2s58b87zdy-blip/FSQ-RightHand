import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

function clean(text='') {
  return String(text)
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractDocumentText(buffer, fileName='', mimeType='') {
  const ext = path.extname(fileName).toLowerCase();
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const result = await pdf(buffer);
    return clean(result.text);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return clean(result.value);
  }
  if (['.xlsx', '.xls'].includes(ext) || /spreadsheet|excel/.test(mimeType)) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const text = workbook.SheetNames.map(name => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `Sheet: ${name}\n${csv}`;
    }).join('\n\n');
    return clean(text);
  }
  if (['.txt', '.csv', '.md', '.json', '.xml', '.log'].includes(ext) || /^text\//.test(mimeType)) {
    return clean(buffer.toString('utf8'));
  }
  return '';
}

export function chunkText(text, maxChars=4000, overlap=500) {
  const value = clean(text);
  if (!value) return [];
  const chunks = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + maxChars, value.length);
    if (end < value.length) {
      const boundary = Math.max(value.lastIndexOf('\n', end), value.lastIndexOf('. ', end));
      if (boundary > start + Math.floor(maxChars * 0.6)) end = boundary + 1;
    }
    const chunk = value.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= value.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
