import { canAccessCompanyLibrary, readSession } from '../../../../lib/auth';
import { atlasClient, saveAtlasConversation } from '../../../../lib/atlas';
import { extractDocumentText } from '../../../../lib/documentText';
import { detectImageMime, isAllowedDocument } from '../../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORT_TYPES = new Set(['service','workdone','inspection','risk','packing','po']);
const MAX_FILES = 12;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 35 * 1024 * 1024;

function clean(value, max=12000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function parseReport(raw='') {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('ATLAS returned an invalid report format.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const packingDetails = parsed.packingDetails && typeof parsed.packingDetails === 'object' ? {
    poNumber: clean(parsed.packingDetails.poNumber, 180),
    customer: clean(parsed.packingDetails.customer, 300),
    projectReference: clean(parsed.packingDetails.projectReference, 300),
    deliveryAddress: clean(parsed.packingDetails.deliveryAddress, 800),
    deliveryDate: clean(parsed.packingDetails.deliveryDate, 120),
    shippingMethod: clean(parsed.packingDetails.shippingMethod, 180),
    totalPackages: clean(parsed.packingDetails.totalPackages, 80),
    totalNetWeightKg: clean(parsed.packingDetails.totalNetWeightKg, 80),
    totalGrossWeightKg: clean(parsed.packingDetails.totalGrossWeightKg, 80)
  } : {};
  const packingItems = (Array.isArray(parsed.packingItems) ? parsed.packingItems : []).slice(0, 150).map((item, index) => ({
    line: clean(item?.line || String(index + 1), 60),
    description: clean(item?.description, 1200),
    quantity: clean(item?.quantity, 80),
    unit: clean(item?.unit, 80),
    packageNo: clean(item?.packageNo, 80),
    dimensions: clean(item?.dimensions, 160),
    netWeightKg: clean(item?.netWeightKg, 80),
    grossWeightKg: clean(item?.grossWeightKg, 80),
    marking: clean(item?.marking, 400)
  })).filter(item => item.description || item.quantity || item.packageNo);
  return {
    title: clean(parsed.title, 300),
    summary: clean(parsed.summary, 6000),
    sections: (Array.isArray(parsed.sections) ? parsed.sections : []).slice(0, 12).map(section => ({
      heading: clean(section?.heading, 180),
      body: clean(section?.body, 8000)
    })).filter(section => section.heading || section.body),
    actionItems: (Array.isArray(parsed.actionItems) ? parsed.actionItems : []).slice(0, 30).map(item => clean(item, 800)).filter(Boolean),
    conclusion: clean(parsed.conclusion, 5000),
    verificationNotes: clean(parsed.verificationNotes, 2500),
    packingDetails,
    packingItems
  };
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canAccessCompanyLibrary(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const form = await request.formData();
    const reportType = REPORT_TYPES.has(String(form.get('reportType'))) ? String(form.get('reportType')) : 'service';
    const notes = clean(form.get('notes'));
    const project = clean(form.get('project'), 300);
    const customer = clean(form.get('customer'), 300);
    const reference = clean(form.get('reference'), 150);
    const files = form.getAll('files').filter(file => file && typeof file !== 'string').slice(0, MAX_FILES);
    if (!notes && !files.length) return Response.json({ error: 'Tilføj noter, tekst, billeder eller dokumenter.' }, { status: 400 });

    let totalSize = 0;
    const textSources = [];
    const imageInputs = [];
    const sourceNames = [];
    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return Response.json({ error: `${file.name} er tom eller større end 10 MB.` }, { status: 413 });
      }
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) return Response.json({ error: 'Bilagene må samlet højst fylde 35 MB.' }, { status: 413 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const imageMime = detectImageMime(buffer);
      sourceNames.push(clean(file.name, 240));
      if (imageMime && ['image/jpeg','image/png','image/webp'].includes(imageMime)) {
        imageInputs.push({ type:'input_image', image_url:`data:${imageMime};base64,${buffer.toString('base64')}`, detail:'high' });
      } else if (isAllowedDocument(file.name)) {
        const extracted = await extractDocumentText(buffer, file.name, file.type || '');
        textSources.push(`--- ${file.name} ---\n${clean(extracted, 16000) || '[Ingen læsbar tekst fundet]'}`);
      } else {
        return Response.json({ error: `${file.name}: filtypen kan ikke bruges i rapportgeneratoren.` }, { status: 415 });
      }
    }

    const templateName = {
      service:'Service Report', workdone:'Work Done Report', inspection:'Inspection Report',
      risk:'Risk Assessment', packing:'Packing List', po:'PO Marking'
    }[reportType];
    const instructions = `You are ATLAS, FSQ's controlled document drafting assistant.
Create a professional ${templateName} in Danish unless the supplied notes are mainly English.
Use only facts visible in the user's notes, attached document text, and attached images.
Never invent measurements, quantities, standards, PO numbers, signatures, work performed, findings or approvals.
Mark missing required facts clearly as "[MANGLER – udfyld før godkendelse]".
For safety, welding, lifting, pressure, electrical or classification matters, explicitly require competent review where appropriate.
Return valid JSON only, with this exact shape:
{"title":"...","summary":"...","sections":[{"heading":"...","body":"..."}],"actionItems":["..."],"conclusion":"...","verificationNotes":"Facts or fields that the reviewer must verify","packingDetails":{"poNumber":"","customer":"","projectReference":"","deliveryAddress":"","deliveryDate":"","shippingMethod":"","totalPackages":"","totalNetWeightKg":"","totalGrossWeightKg":""},"packingItems":[{"line":"","description":"","quantity":"","unit":"","packageNo":"","dimensions":"","netWeightKg":"","grossWeightKg":"","marking":""}]}
Make the sections fit the selected template.
${reportType === 'packing' ? `This is an FSQ packing list generated from a purchase order.
Extract every PO line into packingItems without silently merging or omitting lines.
Copy PO descriptions, quantities and units exactly when readable.
Extract PO number, customer, project reference, delivery address and requested delivery date into packingDetails.
Do not guess package numbers, dimensions or weights. Use "[MANGLER]" in those fields when the PO does not provide them.
Use verificationNotes to list unreadable, ambiguous or missing packing facts that require human review.` : 'For non-packing templates, return empty packingDetails and packingItems.'}`;

    const userText = `Template: ${templateName}
Project: ${project || '[not supplied]'}
Customer: ${customer || '[not supplied]'}
Reference / PO: ${reference || '[not supplied]'}
Prepared by: ${session.name}
Date: ${new Date().toISOString().slice(0, 10)}

User notes:
${notes || '[no typed notes]'}

Extracted attachments:
${textSources.join('\n\n') || '[images only]'}`;
    const response = await atlasClient().responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      instructions,
      input: [{ role:'user', content:[{ type:'input_text', text:userText }, ...imageInputs] }],
      store: false
    });
    const report = parseReport(response.output_text);
    await saveAtlasConversation({
      userName: session.name,
      mode: 'report',
      question: `Generate ${templateName}: ${reference || project || report.title}`,
      answer: report.summary,
      usedWeb: false,
      sources: sourceNames.map(title => ({ title, type:'Report attachment' }))
    });
    return Response.json({ report, sourceNames, model:process.env.OPENAI_MODEL || 'gpt-5' });
  } catch (error) {
    console.error('ATLAS report generation failed', error);
    return Response.json({ error:'ATLAS kunne ikke generere rapporten. Kontrollér bilagene og prøv igen.' }, { status:500 });
  }
}
