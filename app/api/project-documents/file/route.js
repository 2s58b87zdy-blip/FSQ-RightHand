import { getBlobContainerClient } from '../../../../lib/blob';
import { readSession } from '../../../../lib/auth';
import { binderAccessFolder, canAccessProject, canReadFolder } from '../../../../lib/access';
import { ensureSchema, sql } from '../../../../lib/db';
import { downloadHeaders } from '../../../../lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function container() { return getBlobContainerClient(); }

export async function GET(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const blob = new URL(request.url).searchParams.get('blob');
    if (!blob?.startsWith('project-binder/')) return Response.json({ error: 'Invalid blob name' }, { status: 400 });
    const pool = await ensureSchema();
    const result = await pool.request().input('blob', sql.NVarChar(1000), blob)
      .query('SELECT TOP 1 ProjectName,Category,Name FROM dbo.ProjectDocuments WHERE BlobName=@blob');
    const document = result.recordset[0];
    if (!document) return Response.json({ error: 'Document not found' }, { status: 404 });
    if (!await canAccessProject(session, document.ProjectName) || !canReadFolder(session, binderAccessFolder(document.Category))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const download = await container().getBlobClient(blob).download();
    return new Response(download.readableStreamBody, {
      headers: downloadHeaders({
        contentType: download.contentType,
        contentLength: download.contentLength,
        filename: document.Name,
        inline: true
      })
    });
  } catch (error) {
    console.error('Project document download failed', error);
    return Response.json({ error: 'File could not be opened.' }, { status: 500 });
  }
}
