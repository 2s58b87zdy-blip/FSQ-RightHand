import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

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
  if (ext === '.xlsx' || /spreadsheetml/.test(mimeType)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const text = workbook.worksheets.map(worksheet => {
      const rows = [];
      worksheet.eachRow({ includeEmpty: false }, row => {
        rows.push(row.values.slice(1).map(value => {
          if (value == null) return '';
          if (typeof value === 'object' && 'text' in value) return value.text;
          if (typeof value === 'object' && 'result' in value) return value.result;
          return String(value);
        }).join(','));
      });
      return `Sheet: ${worksheet.name}\n${rows.join('\n')}`;
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
