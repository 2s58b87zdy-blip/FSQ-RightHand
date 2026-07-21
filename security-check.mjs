import { getBlobContainerClient } from '../../../lib/blob';
import { readSession, canManage } from '../../../lib/auth';
import { canAccessTask } from '../../../lib/access';
import { detectImageMime, safeSegment } from '../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function client() { return getBlobContainerClient(); }

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'No file received' }, { status: 400 });
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) return Response.json({ error: 'Maximum photo size is 20 MB' }, { status: 413 });
    const rawProject = String(form.get('project') || 'General').trim();
    const rawTaskId = String(form.get('taskId') || '').trim();
    if (!await canAccessTask(session, rawTaskId, rawProject)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = detectImageMime(buffer);
    if (!contentType) return Response.json({ error: 'Kun JPEG, PNG, GIF, WebP og HEIC-billeder er tilladt.' }, { status: 415 });
    const project = safeSegment(rawProject);
    const taskId = safeSegment(rawTaskId);
    const technician = safeSegment(session.name);
    const name = safeSegment(file.name, 'photo');
    const blobName = `jobs/${project}/${taskId}/${Date.now()}-${name}`;
    const container = client();
    await container.createIfNotExists();
    const block = container.getBlockBlobClient(blobName);
    await block.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: { project, taskid: taskId, technician, originalname: name }
    });
    return Response.json({ photo: {
      id: `${Date.now()}-${name}`, name: file.name, blobName,
      url: `/api/job-photos/file?blob=${encodeURIComponent(blobName)}`,
      size: file.size, date: new Date().toISOString(), uploadedBy: session.name,
      storage: 'Azure Blob Storage'
    }});
  } catch (error) {
    console.error('Job photo upload failed', error);
    return Response.json({ error: 'Upload failed. See server log.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const blob = new URL(request.url).searchParams.get('blob');
    if (!blob?.startsWith('jobs/')) return Response.json({ error: 'Invalid blob name' }, { status: 400 });
    const blobClient = client().getBlobClient(blob);
    const properties = await blobClient.getProperties();
    const owner = String(properties.metadata?.technician || '').toLowerCase();
    if (!canManage(session) && owner !== safeSegment(session.name).toLowerCase()) return Response.json({ error: 'Forbidden' }, { status: 403 });
    await blobClient.delete({ deleteSnapshots: 'include' });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Job photo delete failed', error);
    return Response.json({ error: 'Delete failed. See server log.' }, { status: 500 });
  }
}

