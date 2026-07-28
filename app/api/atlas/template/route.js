import path from 'path';
import { canAccessCompanyLibrary, readSession } from '../../../../lib/auth';
import { getBlobContainerClient } from '../../../../lib/blob';
import { atlasClient, saveAtlasConversation } from '../../../../lib/atlas';
import { extractDocumentText } from '../../../../lib/documentText';
import { detectImageMime, isAllowedDocument, safeSegment } from '../../../../lib/files';
import { replaceDocxTemplate, replaceXlsxTemplate, templateFields } from '../../../../lib/templateFill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SOURCE_FILES = 10;
const MAX_SOURCE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;
function clean(value, max=16000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

async function getTemplate(blobName) {
  if (!String(blobName || '').startsWith('knowledge/')) throw new Error('Ugyldig skabelon.');
  const client = getBlobContainerClient().getBlobClient(blobName);
  const properties = await client.getProperties();
  if (properties.metadata?.companylibrary !== 'true') throw new Error('Skabelonen er ikke godkendt til Company Library.');
  if (Number(properties.contentLength) > 15 * 1024 * 1024) throw new Error('Skabelonen må højst fylde 15 MB.');
  const originalName = properties.metadata?.originalname || blobName.split('/').pop().replace(/^\d+-/, '');
  const extension = path.extname(originalName).toLowerCase();
  if (!['.docx','.xlsx'].includes(extension)) throw new Error('Skabelonen skal være en Word DOCX- eller Excel XLSX-fil.');
  const download = await client.downloadToBuffer();
  return { buffer:download, originalName, extension, contentType:properties.contentType };
}

function parseValues(raw, allowedFields) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('ATLAS returned invalid template data.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const incoming = parsed.values && typeof parsed.values === 'object' ? parsed.values : {};
  const values = {};
  for (const field of allowedFields) values[field] = clean(incoming[field] ?? '[MANGLER – kontrollér før download]', 12000);
  return { values, verificationNotes:clean(parsed.verificationNotes, 4000) };
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error:'Not authenticated' }, { status:401 });
  if (!canAccessCompanyLibrary(session)) return Response.json({ error:'Forbidden' }, { status:403 });

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.action !== 'render') return Response.json({ error:'Ugyldig handling.' }, { status:400 });
      const template = await getTemplate(clean(body.templateBlob, 1000));
      const templateText = await extractDocumentText(template.buffer, template.originalName, template.contentType || '');
      const allowedFields = templateFields(templateText);
      const rawValues = body.values && typeof body.values === 'object' ? body.values : {};
      const values = Object.fromEntries(allowedFields.map(field => [field, clean(rawValues[field], 12000)]));
      if (!allowedFields.length || allowedFields.some(field => !values[field] || values[field].includes('[MANGLER'))) {
        return Response.json({ error:'Alle templatefelter skal kontrolleres og udfyldes før download.' }, { status:400 });
      }
      const output = template.extension === '.docx'
        ? await replaceDocxTemplate(template.buffer, values)
        : await replaceXlsxTemplate(template.buffer, values);
      const baseName = path.basename(template.originalName, template.extension);
      const fileName = safeSegment(`${baseName}-FSQ-filled${template.extension}`, `FSQ-document${template.extension}`);
      return new Response(output, {
        headers:{
          'Content-Type':template.extension === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':`attachment; filename="${fileName}"`,
          'Cache-Control':'private, no-store'
        }
      });
    }

    const form = await request.formData();
    const template = await getTemplate(clean(form.get('templateBlob'), 1000));
    const templateText = await extractDocumentText(template.buffer, template.originalName, template.contentType || '');
    const fields = templateFields(templateText);
    if (!fields.length) {
      return Response.json({ error:'Skabelonen indeholder ingen felter. Brug f.eks. {{CUSTOMER}} eller {{PO_NUMBER}}.' }, { status:400 });
    }
    const context = clean(form.get('context'), 24000);
    const notes = clean(form.get('notes'), 12000);
    const files = form.getAll('files').filter(file => file && typeof file !== 'string').slice(0, MAX_SOURCE_FILES);
    const textSources = [];
    const imageInputs = [];
    const sourceNames = [];
    let totalSize = 0;
    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_SOURCE_SIZE) {
        return Response.json({ error:`${file.name} er tom eller større end 10 MB.` }, { status:413 });
      }
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) return Response.json({ error:'Kildematerialet må samlet højst fylde 30 MB.' }, { status:413 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const imageMime = detectImageMime(buffer);
      sourceNames.push(clean(file.name, 240));
      if (imageMime && ['image/jpeg','image/png','image/webp'].includes(imageMime)) {
        imageInputs.push({ type:'input_image', image_url:`data:${imageMime};base64,${buffer.toString('base64')}`, detail:'high' });
      } else if (isAllowedDocument(file.name)) {
        const extracted = await extractDocumentText(buffer, file.name, file.type || '');
        textSources.push(`--- ${file.name} ---\n${clean(extracted, 18000) || '[Ingen læsbar tekst]'}`);
      } else {
        return Response.json({ error:`${file.name}: filtypen kan ikke bruges.` }, { status:415 });
      }
    }

    const instructions = `You are ATLAS, FSQ's controlled template-filling assistant.
Fill only the requested placeholders from the supplied project/job context, PO documents, notes and images.
Never invent names, dates, measurements, quantities, standards, prices, signatures, approvals or work performed.
If a value is missing or ambiguous, use exactly "[MANGLER – kontrollér før download]".
Keep multiline content concise and professional. Use Danish unless the template/source is mainly English.
Return valid JSON only in this exact shape:
{"values":{"FIELD_NAME":"value"},"verificationNotes":"What the human reviewer must verify"}
Return every requested field exactly once and do not add fields.`;
    const userText = `Template: ${template.originalName}
Requested fields: ${fields.join(', ')}

Commander project and job context:
${context || '[no project selected]'}

User notes:
${notes || '[no notes]'}

Extracted PO and source documents:
${textSources.join('\n\n') || '[no readable document text]'}`;
    const response = await atlasClient().responses.create({
      model:process.env.OPENAI_MODEL || 'gpt-5',
      instructions,
      input:[{ role:'user', content:[{ type:'input_text', text:userText }, ...imageInputs] }],
      store:false
    });
    const result = parseValues(response.output_text, fields);
    await saveAtlasConversation({
      userName:session.name,
      mode:'template',
      question:`Fill FSQ template: ${template.originalName}`,
      answer:`Prepared ${fields.length} controlled template fields for review.`,
      usedWeb:false,
      sources:sourceNames.map(title => ({ title, type:'Template source' }))
    });
    return Response.json({
      ...result, fields, templateName:template.originalName,
      sourceNames, model:process.env.OPENAI_MODEL || 'gpt-5'
    });
  } catch (error) {
    console.error('ATLAS template generation failed', error);
    return Response.json({ error:error?.message || 'ATLAS kunne ikke udfylde skabelonen.' }, { status:500 });
  }
}
