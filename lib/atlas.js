import OpenAI from 'openai';
import { ensureSchema, sql } from './db';

export function atlasClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured in Azure App Service.');
  return new OpenAI({ apiKey });
}

export function isFlemming(session) {
  return String(session?.name || '').trim().toLowerCase() === 'flemming' && session?.role === 'Owner';
}

export async function ensureAtlasSchema() {
  const pool = await ensureSchema();
  await pool.request().query(`
    IF OBJECT_ID('dbo.AtlasConversations','U') IS NULL
    CREATE TABLE dbo.AtlasConversations (
      Id BIGINT IDENTITY(1,1) PRIMARY KEY,
      UserName NVARCHAR(100) NOT NULL,
      Mode NVARCHAR(30) NOT NULL,
      Question NVARCHAR(MAX) NOT NULL,
      Answer NVARCHAR(MAX) NULL,
      UsedWeb BIT NOT NULL DEFAULT 0,
      SourcesJson NVARCHAR(MAX) NULL,
      Status NVARCHAR(30) NOT NULL DEFAULT 'completed',
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.AtlasKnowledge','U') IS NULL
    CREATE TABLE dbo.AtlasKnowledge (
      Id BIGINT IDENTITY(1,1) PRIMARY KEY,
      Title NVARCHAR(300) NOT NULL,
      KnowledgeType NVARCHAR(50) NOT NULL DEFAULT 'Experience',
      Content NVARCHAR(MAX) NOT NULL,
      SourceRef NVARCHAR(1000) NULL,
      Status NVARCHAR(30) NOT NULL DEFAULT 'Draft',
      ApprovedBy NVARCHAR(100) NULL,
      ApprovedAt DATETIME2 NULL,
      CreatedBy NVARCHAR(100) NOT NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
  return pool;
}

export async function loadInternalKnowledge(limit = 40) {
  const pool = await ensureAtlasSchema();
  const request = pool.request();
  request.input('limit', sql.Int, Math.min(Math.max(limit, 1), 100));
  const result = await request.query(`
    SELECT TOP (@limit) Title, KnowledgeType, Content, SourceRef
    FROM dbo.AtlasKnowledge
    WHERE Status='Approved'
    ORDER BY ApprovedAt DESC, UpdatedAt DESC;
  `);
  return result.recordset;
}

export async function saveAtlasConversation({ userName, mode, question, answer, usedWeb, sources, status='completed' }) {
  const pool = await ensureAtlasSchema();
  await pool.request()
    .input('userName', sql.NVarChar(100), userName)
    .input('mode', sql.NVarChar(30), mode)
    .input('question', sql.NVarChar(sql.MAX), question)
    .input('answer', sql.NVarChar(sql.MAX), answer || null)
    .input('usedWeb', sql.Bit, Boolean(usedWeb))
    .input('sources', sql.NVarChar(sql.MAX), JSON.stringify(sources || []))
    .input('status', sql.NVarChar(30), status)
    .query(`INSERT INTO dbo.AtlasConversations(UserName,Mode,Question,Answer,UsedWeb,SourcesJson,Status)
            VALUES(@userName,@mode,@question,@answer,@usedWeb,@sources,@status)`);
}

export function extractSources(response) {
  const found = [];
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type === 'url_citation' && annotation.url) {
          found.push({ title: annotation.title || annotation.url, url: annotation.url, type: 'Online' });
        }
        if (annotation.type === 'file_citation') {
          found.push({ title: annotation.filename || 'FSQ document', fileId: annotation.file_id, type: 'FSQ Knowledge' });
        }
      }
    }
  }
  return [...new Map(found.map(source => [source.url || source.fileId || source.title, source])).values()];
}
