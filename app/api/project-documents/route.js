import { readSession } from '../../../lib/auth';
import { ensureSchema, sql } from '../../../lib/db';
import { chunkText, extractDocumentText } from '../../../lib/documentText';
import { getDocumentContainerClient } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safe(value, fallback='General') {
  return String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || fallback;
}
function container() {
  return getDocumentContainerClient();
}

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const pool = await ensureSchema();
    const result = await pool.request().query(`
      SELECT Id, ProjectName, Category, Name, Version, BlobName, MimeType, SizeBytes,
             UploadedBy, IndexStatus, IndexError, CreatedAt
      FROM dbo.ProjectDocuments
      ORDER BY CreatedAt DESC
    `);
    const documents = result.recordset.map(row => ({
      id: row.Id,
      project: row.ProjectName,
      category: row.Category,
      name: row.Name,
      version: row.Version,
      blobName: row.BlobName,
      mimeType: row.MimeType,
      sizeBytes: Number(row.SizeBytes || 0),
      size: Number(row.SizeBytes || 0) < 1024 * 1024
        ? `${Math.max(1, Math.ceil(Number(row.SizeBytes || 0) / 1024))} KB`
        : `${(Number(row.SizeBytes || 0) / 1024 / 1024).toFixed(1)} MB`,
      uploadedBy: row.UploadedBy,
      status: row.IndexStatus,
      indexError: row.IndexError,
      date: row.CreatedAt ? new Date(row.CreatedAt).toISOString().slice(0, 10) : '',
      url: `/api/project-documents/file?blob=${encodeURIComponent(row.BlobName)}`,
      storage: 'Azure Blob Storage'
    }));
    return Response.json({ documents });
  } catch (error) {
    console.error('Project Binder list failed', error);
    return Response.json({ error: error?.message || 'Could not load documents' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'No file received' }, { status: 400 });
    if (file.size > 100 * 1024 * 1024) return Response.json({ error: 'Maximum file size is 100 MB' }, { status: 413 });

    const project = String(form.get('project') || 'General').trim() || 'General';
    const category = String(form.get('category') || 'Other').trim() || 'Other';
    const version = Math.max(1, Number(form.get('version') || 1));
    const id = crypto.randomUUID();
    const originalName = file.name;
    const blobName = `project-binder/${safe(project)}/${safe(category)}/${Date.now()}-${safe(originalName, 'document')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const c = container();
    await c.createIfNotExists({ access: 'private' });
    const block = c.getBlockBlobClient(blobName);
    await block.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: file.type || 'application/octet-stream' },
      metadata: { project: safe(project), category: safe(category), uploadedby: safe(session.name), originalname: safe(originalName), version: String(version) }
    });

    let extractedText = '';
    let chunks = [];
    let indexStatus = 'Stored';
    let indexError = null;
    try {
      extractedText = await extractDocumentText(buffer, originalName, file.type || '');
      chunks = chunkText(extractedText);
      indexStatus = chunks.length ? 'ATLAS ready' : 'Stored - no readable text';
    } catch (error) {
      indexStatus = 'Stored - indexing failed';
      indexError = error?.message || String(error);
    }

    const pool = await ensureSchema();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('id', sql.NVarChar(100), id)
        .input('project', sql.NVarChar(200), project)
        .input('category', sql.NVarChar(200), category)
        .input('name', sql.NVarChar(260), originalName)
        .input('version', sql.Int, version)
        .input('blobName', sql.NVarChar(1000), blobName)
        .input('mimeType', sql.NVarChar(200), file.type || 'application/octet-stream')
        .input('sizeBytes', sql.BigInt, file.size)
        .input('uploadedBy', sql.NVarChar(100), session.name)
        .input('status', sql.NVarChar(50), indexStatus)
        .input('indexError', sql.NVarChar(sql.MAX), indexError)
        .query(`INSERT INTO dbo.ProjectDocuments(Id,ProjectName,Category,Name,Version,BlobName,MimeType,SizeBytes,UploadedBy,IndexStatus,IndexError)
                VALUES(@id,@project,@category,@name,@version,@blobName,@mimeType,@sizeBytes,@uploadedBy,@status,@indexError)`);

      for (let i = 0; i < chunks.length; i += 1) {
        await new sql.Request(tx)
          .input('documentId', sql.NVarChar(100), id)
          .input('chunkNo', sql.Int, i + 1)
          .input('content', sql.NVarChar(sql.MAX), chunks[i])
          .query(`INSERT INTO dbo.ProjectDocumentChunks(DocumentId,ChunkNo,Content) VALUES(@documentId,@chunkNo,@content)`);
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    return Response.json({ document: {
      id, name: originalName, project, category, version,
      size: file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      sizeBytes: file.size, uploadedBy: session.name, date: new Date().toISOString().slice(0, 10),
      mimeType: file.type, blobName, url: `/api/project-documents/file?blob=${encodeURIComponent(blobName)}`,
      status: indexStatus, atlasChunks: chunks.length, storage: 'Azure Blob Storage'
    }});
  } catch (error) {
    console.error('Project Binder upload failed', error);
    return Response.json({ error: error?.message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const blob = url.searchParams.get('blob');
    if (!id || !blob) return Response.json({ error: 'Document id and blob name are required' }, { status: 400 });
    const pool = await ensureSchema();
    await pool.request().input('id', sql.NVarChar(100), id).query('DELETE FROM dbo.ProjectDocuments WHERE Id=@id');
    await container().deleteBlob(blob, { deleteSnapshots: 'include' });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || 'Delete failed' }, { status: 500 });
  }
}
