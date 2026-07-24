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
  return {
    title: clean(parsed.title, 300),
    summary: clean(parsed.summary, 6000),
    sections: (Array.isArray(parsed.sections) ? parsed.sections : []).slice(0, 12).map(section => ({
      heading: clean(section?.heading, 180),
      body: clean(section?.body, 8000)
    })).filter(section => section.heading || section.body),
    actionItems: (Array.isArray(parsed.actionItems) ? parsed.actionItems : []).slice(0, 30).map(item => clean(item, 800)).filter(Boolean),
    conclusion: clean(parsed.conclusion, 5000),
    verificationNotes: clean(parsed.verificationNotes, 2500)
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
{"title":"...","summary":"...","sections":[{"heading":"...","body":"..."}],"actionItems":["..."],"conclusion":"...","verificationNotes":"Facts or fields that the reviewer must verify"}
Make the sections fit the selected template. For packing lists and PO marking, use clear line-oriented text that can be checked and printed.`;

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
