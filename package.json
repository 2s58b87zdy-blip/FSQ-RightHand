import { getBlobContainerClient } from '../../../lib/blob';
import { readSession, canManage } from '../../../lib/auth';
import { canEditFolder, getStateValue } from '../../../lib/access';
import { isAllowedDocument, safeSegment } from '../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function container() { return getBlobContainerClient(); }

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'No file received' }, { status: 400 });
    if (!isAllowedDocument(file.name)) return Response.json({ error: 'Filtypen er ikke tilladt.' }, { status: 415 });
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) return Response.json({ error: 'Filen skal være mellem 1 byte og 50 MB.' }, { status: 413 });

    const requestedFolderId = String(form.get('folderId') || '');
    const folders = await getStateValue('fsq-v72-knowledge-folders');
    const targetFolder = (Array.isArray(folders) ? folders : []).find(item => String(item?.id) === requestedFolderId);
    if (!targetFolder) return Response.json({ error: 'Knowledge-mappen findes ikke.' }, { status: 400 });
    const accessFolder = String(targetFolder.accessFolder || 'Workshop');
    if (!canEditFolder(session, accessFolder)) return Response.json({ error: 'Du har ikke skriverettighed til denne mappe.' }, { status: 403 });
    const folder = safeSegment(targetFolder.name || form.get('folder'));
    const folderId = safeSegment(requestedFolderId, 'unknown');
    const machine = safeSegment(form.get('machine'));
    const name = safeSegment(file.name, 'document');
    const blobName = `knowledge/${folder}/${machine}/${Date.now()}-${name}`;
    const client = container();
    await client.createIfNotExists();
    const block = client.getBlockBlobClient(blobName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await block.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: file.type || 'application/octet-stream' },
      metadata: {
        folder, folderid: folderId, accessfolder: encodeURIComponent(accessFolder), machine,
        uploadedby: safeSegment(session.name), originalname: name
      }
    });
    return Response.json({ document: {
      name: file.name, blobName,
      url: `/api/knowledge/file?blob=${encodeURIComponent(blobName)}`,
      size: file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      mimeType: file.type, date: new Date().toISOString(), uploadedBy: session.name,
      storage: 'Azure Blob Storage'
    }});
  } catch (error) {
    console.error('Knowledge upload failed', error);
    return Response.json({ error: 'Upload failed. See server log.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await readSession();
  if (!canManage(session)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const blob = new URL(request.url).searchParams.get('blob');
    if (!blob?.startsWith('knowledge/')) return Response.json({ error: 'Invalid blob name' }, { status: 400 });
    await container().deleteBlob(blob, { deleteSnapshots: 'include' });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Knowledge delete failed', error);
    return Response.json({ error: 'Delete failed. See server log.' }, { status: 500 });
  }
}
