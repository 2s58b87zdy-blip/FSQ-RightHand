import fs from 'node:fs/promises';
import path from 'node:path';
import { canAccessCompanyLibrary, readSession } from '../../../../lib/auth';
import { atlasClient, saveAtlasConversation } from '../../../../lib/atlas';
import { getBlobContainerClient } from '../../../../lib/blob';
import { extractDocumentText } from '../../../../lib/documentText';
import { safeSegment } from '../../../../lib/files';
import { replaceDocxTemplate, templateFields } from '../../../../lib/templateFill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MASTER_PATH = path.join(process.cwd(), 'public', 'templates', 'FSQ-WPS-Master.docx');
const MISSING = '[MANGLER - skal udfyldes og verificeres]';
const MAX_SOURCE_FILES = 100;
const MAX_SELECTED_SOURCES = 8;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_TOTAL_SIZE = 24 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 120000;
const OPENAI_TIMEOUT_MS = 105000;
const CONTROL_FIELDS = new Set([
  'STATUS', 'PREPARED_BY', 'APPROVED_BY', 'APPROVAL_DATE',
  'TECHNICAL_REVIEWER', 'REVIEW_DATE', 'DATE',
  'SOURCE_DOCUMENTS', 'VERIFICATION_NOTES'
]);
const REQUIRED_FIELDS = [
  'WPS_NO', 'REVISION', 'STANDARD', 'SUPPORTING_WPQR', 'APPLICATION_SCOPE',
  'WELDING_PROCESS', 'JOINT_TYPE', 'WELDING_POSITION',
  'PARENT_MATERIAL_1', 'PARENT_MATERIAL_2', 'MATERIAL_GROUP_1', 'MATERIAL_GROUP_2',
  'THICKNESS_RANGE', 'DIAMETER_RANGE', 'JOINT_PREPARATION', 'JOINT_DIMENSIONS',
  'FILLER_CLASSIFICATION', 'FILLER_DIAMETER', 'SHIELDING_GAS',
  'RUN_1_PROCESS', 'RUN_1_CURRENT', 'RUN_1_VOLTAGE', 'RUN_1_SPEED', 'RUN_1_NOTES',
  'CURRENT_POLARITY', 'HEAT_INPUT', 'PREHEAT', 'INTERPASS',
  'INSPECTION_NDT', 'ACCEPTANCE_CRITERIA', 'WELDER_QUALIFICATION',
  'TECHNICAL_REVIEWER'
];

function clean(value, max = 12000) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function parseJsonObject(raw = '') {
  const text = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('ATLAS returned invalid WPS data.');
  return JSON.parse(text.slice(start, end + 1));
}

function isMissing(value) {
  const text = clean(value);
  return !text || text.includes('[MANGLER');
}

function normalizeValues(input, fields) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(fields.map(field => [field, clean(source[field] || MISSING, 12000)]));
}

function requestLine(requestText, label) {
  const line = String(requestText || '').split(/\r?\n/).find(item => item.toLowerCase().startsWith(label.toLowerCase()));
  return line ? clean(line.slice(label.length).replace(/\.$/, ''), 1000) : '';
}

function safeFallbackValues(requestText) {
  const values = {
    WPS_NO: 'DRAFT-WPS',
    REVISION: '0',
    APPLICATION_SCOPE: 'Draft created from the operator selections; technical values must be verified against the supporting WPQR.',
    PARENT_MATERIAL_1: requestLine(requestText, 'Parent material:'),
    JOINT_TYPE: requestLine(requestText, 'Joint type:'),
    WELDING_PROCESS: requestLine(requestText, 'Welding process:'),
    WELDING_POSITION: requestLine(requestText, 'Welding position:'),
    SHIELDING_GAS: requestLine(requestText, 'Shielding gas:')
  };
  if (/required filler diameter:\s*1\.2 mm/i.test(requestText)) {
    values.FILLER_DIAMETER = '1.2 mm (SMO)';
    values.FILLER_CLASSIFICATION = '[MANGLER - copy exact classification and trade name from supporting WPQR]';
  }
  return values;
}

function wpsSourceCandidate(blob) {
  const metadata = blob.metadata || {};
  if (String(metadata.companylibrary).toLowerCase() !== 'true') return false;
  const identity = [
    blob.name, metadata.folder, metadata.originalname, metadata.accessfolder
  ].map(value => decodeURIComponent(String(value || ''))).join(' ').toLowerCase();
  return /(wpqr|wps|welding|weld|svejs|quality)/i.test(identity);
}

function relevantSources(candidates, requestText) {
  const ignored = new Set(['create','simple','english','welding','procedure','specification','using','only','qualified','values','controlled','sources','parent','material','joint','type','process','requested','position','selected','supporting','exact','from','with']);
  const tokens = [...new Set(String(requestText || '').toLowerCase().match(/[a-z0-9._-]{3,}/g) || [])]
    .filter(token => !ignored.has(token))
    .slice(0, 30);
  return candidates.map(blob => {
    const metadata = blob.metadata || {};
    const identity = [blob.name, metadata.folder, metadata.originalname, metadata.accessfolder]
      .map(value => decodeURIComponent(String(value || ''))).join(' ').toLowerCase();
    let score = /\bwpqr\b/.test(identity) ? 4 : 1;
    for (const token of tokens) {
      if (identity.includes(token)) score += /^\d{3}$/.test(token) ? 12 : 7;
    }
    return { blob, score };
  }).sort((left, right) => right.score - left.score).slice(0, MAX_SELECTED_SOURCES).map(item => item.blob);
}

function withTimeLimit(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(message), { status: 504 })), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

async function collectControlledSources(requestText) {
  const container = getBlobContainerClient();
  const candidates = [];
  for await (const blob of container.listBlobsFlat({ prefix: 'knowledge/', includeMetadata: true })) {
    if (wpsSourceCandidate(blob)) candidates.push(blob);
    if (candidates.length > MAX_SOURCE_FILES) {
      throw Object.assign(new Error(`Der ligger mere end ${MAX_SOURCE_FILES} aktive WPS/WPQR-filer. Flyt gamle dokumenter til arkiv.`), { status: 413 });
    }
  }
  if (!candidates.length) {
    throw Object.assign(new Error('Ingen kontrollerede WPS/WPQR-filer blev fundet i Company Library.'), { status: 404 });
  }

  let totalBytes = 0;
  let totalText = 0;
  const sources = [];
  const contentParts = [];
  const unreadable = [];

  for (const blob of relevantSources(candidates, requestText)) {
    const metadata = blob.metadata || {};
    const originalName = decodeURIComponent(String(metadata.originalname || path.basename(blob.name)));
    const client = container.getBlobClient(blob.name);
    const properties = await withTimeLimit(client.getProperties(), 12000, `${originalName} tog for lang tid at hente fra filserveren.`);
    const size = Number(properties.contentLength || 0);
    if (size <= 0 || size > MAX_FILE_SIZE) {
      unreadable.push(`${originalName} (tom eller stoerre end 15 MB)`);
      continue;
    }
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_SIZE) {
      throw Object.assign(new Error('De mest relevante WPS/WPQR-kilder fylder samlet mere end 24 MB. Flyt store eller gamle dokumenter til arkiv.'), { status: 413 });
    }
    const buffer = await withTimeLimit(client.downloadToBuffer(), 25000, `${originalName} tog for lang tid at downloade.`);
    const mimeType = properties.contentType || '';
    const text = clean(await extractDocumentText(buffer, originalName, mimeType), 50000);
    if (text) {
      if (totalText + text.length > MAX_EXTRACTED_TEXT) {
        totalBytes -= size;
        unreadable.push(`${originalName} (udeladt: for meget samlet tekst)`);
        continue;
      }
      totalText += text.length;
      contentParts.push({ type: 'input_text', text: `--- CONTROLLED SOURCE: ${originalName} ---\n${text}` });
    }
    if (!text && (/\.pdf$/i.test(originalName) || mimeType === 'application/pdf')) {
      contentParts.push({
        type: 'input_file',
        filename: originalName,
        file_data: `data:application/pdf;base64,${buffer.toString('base64')}`
      });
    } else if (!text) {
      unreadable.push(`${originalName} (ingen laesbar tekst)`);
    }
    sources.push({ name: originalName, blobName: blob.name, size });
  }

  if (!contentParts.length) {
    throw Object.assign(new Error('WPS/WPQR-filerne kunne ikke laeses. Brug tekstbaseret PDF eller DOCX.'), { status: 422 });
  }
  return { sources, contentParts, unreadable };
}

async function masterData() {
  const buffer = await fs.readFile(MASTER_PATH);
  const text = await extractDocumentText(
    buffer,
    'FSQ-WPS-Master.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  const fields = templateFields(text);
  if (!fields.length) throw new Error('FSQ WPS-masteren indeholder ingen templatefelter.');
  return { buffer, fields };
}

async function generateWps(request, session) {
  const body = await request.json();
  const requestText = clean(body.request, 5000);
  if (!requestText) {
    return Response.json({ error: 'Skriv kort hvilken svejseopgave WPS-kladden skal daekke.' }, { status: 400 });
  }

  const [{ fields }, controlled] = await Promise.all([masterData(), collectControlledSources(requestText)]);
  const modelFields = fields.filter(field => !CONTROL_FIELDS.has(field));
  const sourceNames = controlled.sources.map(source => source.name);
  const today = new Date().toISOString().slice(0, 10);
  const instructions = `You are ATLAS, FSQ's controlled welding-document drafting assistant.
Prepare a DRAFT Welding Procedure Specification from the supplied controlled WPS/WPQR sources.
The requested WPS may use ISO 15609-1, ISO 15614-1, ASME IX or another standard only when explicitly supported by the sources.

HARD SAFETY RULES:
- Write all descriptive field values in clear professional English. Keep document numbers, standard designations, material grades and classifications unchanged.
- Copy technical values only when they are explicitly supported by a named source document.
- Never calculate, infer or expand qualification ranges.
- Never combine incompatible WPQR ranges, materials, processes, consumables or positions.
- If sources conflict, are ambiguous or do not support a field, use exactly "${MISSING}".
- A prior WPS may help with presentation, but qualification must be traceable to supporting WPQR records.
- Do not create signatures, approvals, test results, acceptance criteria or standard clauses that are absent from the sources.
- WPS_NO may be proposed as "DRAFT-WPS" when no numbering rule is documented.
- Return every requested field exactly once.

Return JSON only in this shape:
{"values":{"FIELD":"value"},"verificationNotes":"conflicts, missing evidence and checks required","evidence":{"FIELD":["exact source filename"]}}

Requested fields:
${modelFields.join(', ')}`;
  const userText = `FSQ request:
${requestText}

Prepared by: ${session.name}
Draft date: ${today}

Controlled server sources supplied (${sourceNames.length}):
${sourceNames.map(name => `- ${name}`).join('\n')}

Unreadable or excluded sources:
${controlled.unreadable.length ? controlled.unreadable.map(name => `- ${name}`).join('\n') : '- none'}`;

  const model = process.env.OPENAI_MODEL || 'gpt-5';
  const responseRequest = {
    model,
    instructions,
    input: [{ role: 'user', content: [{ type: 'input_text', text: userText }, ...controlled.contentParts] }],
    max_output_tokens: 9000,
    store: false
  };
  if (/^(gpt-5|gpt-5\.|gpt-5-)/i.test(model)) responseRequest.reasoning = { effort: 'low' };

  let parsed;
  let fallbackReason = '';
  try {
    const response = await atlasClient({ timeoutMs: OPENAI_TIMEOUT_MS, maxRetries: 0 }).responses.create(responseRequest);
    parsed = parseJsonObject(response.output_text);
  } catch (error) {
    fallbackReason = clean(error?.message || 'ATLAS model request failed', 1000);
    console.warn('ATLAS WPS safe fallback used', { message: fallbackReason });
    parsed = {
      values: safeFallbackValues(requestText),
      verificationNotes: `ATLAS could not complete the automatic source analysis: ${fallbackReason}. A safe draft was created from the operator selections. Every missing technical value must be copied from and verified against the supporting WPQR before approval.`,
      evidence: {}
    };
  }
  const values = normalizeValues(parsed.values, fields);
  values.STATUS = 'DRAFT - NOT APPROVED';
  values.PREPARED_BY = session.name;
  values.DATE = today;
  values.APPROVED_BY = MISSING;
  values.APPROVAL_DATE = MISSING;
  values.TECHNICAL_REVIEWER = MISSING;
  values.REVIEW_DATE = MISSING;
  values.SOURCE_DOCUMENTS = sourceNames.join('\n');
  const unreadableNote = controlled.unreadable.length
    ? `Sources requiring manual review: ${controlled.unreadable.join('; ')}`
    : '';
  values.VERIFICATION_NOTES = [clean(parsed.verificationNotes, 8000), unreadableNote].filter(Boolean).join('\n');
  const missingFields = fields.filter(field => isMissing(values[field]));
  const evidence = parsed.evidence && typeof parsed.evidence === 'object' ? parsed.evidence : {};

  await withTimeLimit(saveAtlasConversation({
    userName: session.name,
    mode: 'wps',
    question: requestText,
    answer: `Prepared controlled WPS draft from ${sourceNames.length} server sources. Human technical approval required.`,
    usedWeb: false,
    sources: sourceNames.map(title => ({ title, type: 'Controlled WPS/WPQR source' }))
  }), 5000, 'WPS audit log timed out').catch(error => {
    console.warn('WPS audit log was skipped', { message: error?.message });
  });

  return Response.json({
    wps: {
      values,
      verificationNotes: values.VERIFICATION_NOTES,
      evidence,
      missingFields,
      sourceNames,
      unreadableSources: controlled.unreadable,
      fallback: Boolean(fallbackReason)
    },
    fields,
    model
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function renderApprovedWps(request, session) {
  const body = await request.json();
  if (body.confirmTechnicalReview !== true) {
    return Response.json({ error: 'Teknisk kontrol skal bekraeftes foer Word-download.' }, { status: 400 });
  }
  const { buffer, fields } = await masterData();
  const values = normalizeValues(body.values, fields);
  values.STATUS = 'APPROVED';
  values.APPROVED_BY = session.name;
  values.APPROVAL_DATE = new Date().toISOString().slice(0, 10);
  if (isMissing(values.TECHNICAL_REVIEWER)) values.TECHNICAL_REVIEWER = session.name;
  if (isMissing(values.REVIEW_DATE)) values.REVIEW_DATE = values.APPROVAL_DATE;

  const missingRequired = REQUIRED_FIELDS.filter(field => isMissing(values[field]));
  if (missingRequired.length) {
    return Response.json({
      error: `WPS kan ikke godkendes. Kontrollér disse felter: ${missingRequired.join(', ')}`
    }, { status: 400 });
  }
  const optionalMissing = fields.filter(field => !REQUIRED_FIELDS.includes(field) && isMissing(values[field]));
  for (const field of optionalMissing) {
    values[field] = 'N/A - not specified in the controlled sources';
  }
  if (optionalMissing.length) {
    values.VERIFICATION_NOTES = [
      values.VERIFICATION_NOTES,
      `Optional fields without controlled source data are marked N/A: ${optionalMissing.join(', ')}.`
    ].filter(Boolean).join('\n');
  }

  const output = await replaceDocxTemplate(buffer, values);
  const fileName = safeSegment(`FSQ-WPS-${values.WPS_NO}-Rev-${values.REVISION}.docx`, 'FSQ-WPS.docx');
  return new Response(output, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canAccessCompanyLibrary(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.clone().json();
    if (body.action === 'render') return renderApprovedWps(request, session);
    if (body.action === 'generate') return generateWps(request, session);
    return Response.json({ error: 'Ugyldig WPS-handling.' }, { status: 400 });
  } catch (error) {
    console.error('ATLAS WPS generation failed', { message: error?.message, status: error?.status });
    const timedOut = error?.status === 504 || /timeout|timed out|aborted/i.test(String(error?.message || ''));
    return Response.json({
      error: timedOut
        ? 'ATLAS brugte for lang tid på WPS-kilderne. Prøv igen; systemet vælger nu kun de mest relevante WPQR/WPS-filer.'
        : error?.message || 'ATLAS kunne ikke generere WPS-kladden.'
    }, { status: timedOut ? 504 : error?.status || 500 });
  }
}
