import { readSession } from '../../../../lib/auth';
import { atlasClient, extractSources, isFlemming, loadInternalKnowledge, loadProjectBinderKnowledge, saveAtlasConversation } from '../../../../lib/atlas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function trimContext(value, max=18000) {
  const text = JSON.stringify(value || {});
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const question = String(body.question || '').trim();
  const mode = ['assistant','research','developer'].includes(body.mode) ? body.mode : 'assistant';
  const useWeb = Boolean(body.useWeb || mode === 'research');
  if (!question) return Response.json({ error: 'Question is required' }, { status: 400 });
  if (question.length > 12000) return Response.json({ error: 'Question is too long' }, { status: 413 });
  if (mode === 'developer' && !isFlemming(session)) return Response.json({ error: 'ATLAS Developer is restricted to Flemming.' }, { status: 403 });

  try {
    const approvedKnowledge = await loadInternalKnowledge(40);
    const allowedProjects = Array.isArray(body?.context?.projects) ? body.context.projects.map(project => project?.name).filter(Boolean) : [];
    const binderKnowledge = await loadProjectBinderKnowledge(question, allowedProjects, 12);
    const clientContext = trimContext(body.context);
    const internalContext = trimContext(approvedKnowledge);
    const binderContext = trimContext(binderKnowledge.map(item => ({ project:item.ProjectName, category:item.Category, document:item.Name, version:item.Version, chunk:item.ChunkNo, content:item.Content })), 30000);
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

    const tools = [];
    if (useWeb) tools.push({ type: 'web_search' });
    if (vectorStoreId) tools.push({ type: 'file_search', vector_store_ids: [vectorStoreId], max_num_results: 8 });

    const instructions = `You are ATLAS BRAIN, FSQ's secure engineering and operations assistant.
User: ${session.name}. Role: ${session.role}. Mode: ${mode}.
Answer in English by default. If the user explicitly asks for another language, use that language. Be precise, practical and safety-conscious.
Prioritize information in this order: (1) approved FSQ knowledge and live FSQ context, (2) manufacturer/classification/official sources, (3) other reputable web sources.
Clearly separate internal FSQ knowledge from online findings. Never invent a source, standard, certificate, measurement or previous FSQ job.
For welding, pressure systems, lifting, electrical work, class rules or personnel safety, state when engineering verification, WPS/WPQR, class approval or competent-person review is required.
ATLAS Developer is a planning and code-review mode only in this release: do not claim code was changed or deployed. It is available only to Flemming.

Approved FSQ knowledge:
${internalContext}

Relevant Project Binder documents (primary live project source):
${binderContext}

Current FSQ application context supplied by the client:
${clientContext}`;

    const response = await atlasClient().responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      instructions,
      input: question,
      tools,
      store: false
    });

    const answer = response.output_text || 'ATLAS could not generate an answer.';
    const sources = extractSources(response);
    if (binderKnowledge.length) {
      const uniqueDocs = [...new Map(binderKnowledge.map(item => [item.Id, item])).values()];
      sources.unshift(...uniqueDocs.map(item => ({ title: `${item.ProjectName} / ${item.Name} (V${item.Version})`, type: 'Project Binder', documentId: item.Id })));
    }
    if (approvedKnowledge.length) sources.unshift({ title: `${approvedKnowledge.length} approved FSQ knowledge entries checked`, type: 'FSQ Knowledge' });
    await saveAtlasConversation({ userName: session.name, mode, question, answer, usedWeb: useWeb, sources });
    return Response.json({ answer, sources, mode, usedWeb: useWeb, model: process.env.OPENAI_MODEL || 'gpt-5' });
  } catch (error) {
    console.error('ATLAS chat error', error);
    try { await saveAtlasConversation({ userName: session.name, mode, question, answer: null, usedWeb: useWeb, sources: [], status:'failed' }); } catch {}
    return Response.json({ error: 'ATLAS could not complete the request.', detail: error?.message || String(error) }, { status: 500 });
  }
}
