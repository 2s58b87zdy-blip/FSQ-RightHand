import JSZip from 'jszip';
import ExcelJS from 'exceljs';

export const TEMPLATE_FIELD_PATTERN = /\{\{\s*([A-Z0-9_.-]{2,80})\s*\}\}/gi;

function xmlEscape(value='') {
  return String(value).replace(/[<>&"']/g, character => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'
  })[character]);
}

function fieldToken(field) {
  const escaped = String(field).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi');
}

function splitRunFieldToken(field) {
  const between = '(?:<[^>]+>)*';
  const characters = [...String(field)].map(character =>
    character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join(between);
  return new RegExp(`\\{${between}\\{${between}(?:\\s|<[^>]+>)*${characters}(?:\\s|<[^>]+>)*\\}${between}\\}`, 'gi');
}

export function templateFields(text) {
  return [...new Set([...String(text || '').matchAll(TEMPLATE_FIELD_PATTERN)].map(match => match[1].toUpperCase()))].slice(0, 120);
}

export async function replaceDocxTemplate(buffer, values) {
  const zip = await JSZip.loadAsync(buffer);
  const xmlNames = Object.keys(zip.files).filter(name =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(name)
  );
  for (const name of xmlNames) {
    let xml = await zip.file(name).async('string');
    for (const [field, value] of Object.entries(values)) {
      const replacement = xmlEscape(value).replace(/\r?\n/g, '<w:br/>');
      xml = xml.replace(fieldToken(field), replacement);
      xml = xml.replace(splitRunFieldToken(field), replacement);
    }
    zip.file(name, xml);
  }
  return zip.generateAsync({ type:'nodebuffer', compression:'DEFLATE' });
}

export async function replaceXlsxTemplate(buffer, values) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  workbook.eachSheet(worksheet => {
    worksheet.eachRow({ includeEmpty:true }, row => {
      row.eachCell({ includeEmpty:true }, cell => {
        if (typeof cell.value !== 'string') return;
        let value = cell.value;
        for (const [field, replacement] of Object.entries(values)) {
          value = value.replace(fieldToken(field), replacement);
        }
        cell.value = value;
      });
    });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
