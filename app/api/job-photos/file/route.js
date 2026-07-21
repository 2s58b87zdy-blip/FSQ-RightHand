import { getBlobContainerClient } from '../../../../lib/blob';
import { readSession, canManage } from '../../../../lib/auth';
import { downloadHeaders, safeSegment } from '../../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function container() { return getBlobContainerClient(); }

export async function GET(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const blob = new URL(request.url).searchParams.get('blob');
    if (!blob?.startsWith('jobs/')) return Response.json({ error: 'Invalid blob name' }, { status: 400 });
    const client = container().getBlobClient(blob);
    const properties = await client.getProperties();
    const owner = String(properties.metadata?.technician || '').toLowerCase();
    if (!canManage(session) && owner !== safeSegment(session.name).toLowerCase()) return Response.json({ error: 'Forbidden' }, { status: 403 });
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
    console.error('Job photo download failed', error);
    return Response.json({ error: 'File not found' }, { status: 404 });
  }
}

