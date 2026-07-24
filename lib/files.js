import path from 'path';

const DOCUMENT_EXTENSIONS = new Set([
  '.pdf','.docx','.xlsx','.txt','.csv','.md','.json','.xml','.log',
  '.jpg','.jpeg','.png','.webp','.heic',
  '.dwg','.dxf','.ipt','.iam','.idw','.step','.stp'
]);

export function safeSegment(value, fallback='General') {
  return String(value || fallback).trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180) || fallback;
}

export function safeFilename(value, fallback='file') {
  return String(value || fallback)
    .replace(/[\r\n"\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 240) || fallback;
}

export function fileExtension(name) {
  return path.extname(String(name || '')).toLowerCase();
}

export function isAllowedDocument(name) {
  return DOCUMENT_EXTENSIONS.has(fileExtension(name));
}

export function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  const brand = buffer.subarray(4, 12).toString('ascii');
  if (/^ftyp(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand)) return 'image/heic';
  return null;
}

export function downloadHeaders({ contentType, contentLength, filename, inline=false }) {
  const type = String(contentType || 'application/octet-stream');
  const safeInline = inline && /^(application\/pdf|image\/(jpeg|png|gif|webp|heic))$/i.test(type);
  const headers = new Headers({
    'Content-Type': type,
    'Content-Disposition': `${safeInline ? 'inline' : 'attachment'}; filename="${safeFilename(filename)}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'; object-src 'none'; frame-ancestors 'self'"
  });
  if (contentLength) headers.set('Content-Length', String(contentLength));
  return headers;
}
