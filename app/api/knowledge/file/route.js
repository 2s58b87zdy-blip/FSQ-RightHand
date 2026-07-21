import { getBlobContainerClient } from '../../../../lib/blob';
import { readSession } from '../../../../lib/auth';
import { canReadFolder, getStateValue } from '../../../../lib/access';
import { downloadHeaders } from '../../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function container() { return getBlobContainerClient(); }

export async function GET(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const blob = new URL(request.url).searchParams.get('blob');
    if (!blob?.startsWith('knowledge/')) return Response.json({ error: 'Invalid blob name' }, { status: 400 });
    const client = container().getBlobClient(blob);
    const properties = await client.getProperties();
    const folders = await getStateValue('fsq-v72-knowledge-folders');
    const currentFolder = (Array.isArray(folders) ? folders : []).find(item => String(item?.id) === String(properties.metadata?.folderid || ''));
    let storedAccessFolder = 'Workshop';
    try { storedAccessFolder = decodeURIComponent(properties.metadata?.accessfolder || 'Workshop'); } catch {}
    const accessFolder = currentFolder?.accessFolder || storedAccessFolder;
    if (!canReadFolder(session, accessFolder)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const download = await client.download();
    return new Response(download.readableStreamBody, {
      status: 200,
      headers: downloadHeaders({
        contentType: download.contentType,
        contentLength: download.contentLength,
        filename: properties.metadata?.originalname || blob.split('/').pop().replace(/^\d+-/, ''),
        inline: true
      })
    });
  } catch (error) {
    console.error('Knowledge download failed', error);
    return Response.json({ error: 'File not found' }, { status: 404 });
  }
}
