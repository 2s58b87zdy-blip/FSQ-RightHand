import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

let poolPromise;
let tokenCache = { token: null, expiresOnTimestamp: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresOnTimestamp - now > 5 * 60 * 1000) return tokenCache.token;
  const credential = new DefaultAzureCredential();
  const result = await credential.getToken('https://database.windows.net/.default');
  if (!result?.token) throw new Error('Managed Identity could not obtain an Azure SQL access token.');
  tokenCache = result;
  return result.token;
}

function parseDatabaseUrl(value) {
  if (!value) return {};
  const raw = String(value).trim();

  // Accept common Azure/ADO.NET style connection strings.
  if (raw.includes('=')) {
    const parts = Object.fromEntries(raw.split(';').map(part => {
      const i = part.indexOf('=');
      return i > 0 ? [part.slice(0, i).trim().toLowerCase(), part.slice(i + 1).trim()] : ['', ''];
    }).filter(([key]) => key));
    const dataSource = parts.server || parts['data source'] || parts['address'] || parts['addr'] || parts['network address'];
    const server = dataSource ? dataSource.replace(/^tcp:/i, '').split(',')[0].trim() : undefined;
    const database = parts.database || parts['initial catalog'];
    const user = parts['user id'] || parts.uid || parts.user;
    const password = parts.password || parts.pwd;
    return { server, database, user, password };
  }

  // Accept URL style values such as sqlserver://server:1433?database=name.
  try {
    const url = new URL(raw);
    return {
      server: url.hostname,
      database: url.searchParams.get('database') || url.pathname.replace(/^\//, '') || undefined,
      user: decodeURIComponent(url.username || '') || undefined,
      password: decodeURIComponent(url.password || '') || undefined
    };
  } catch {
    return {};
  }
}

async function config() {
  const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  const server = process.env.SQL_SERVER || fromUrl.server || 'atlas-command-sql.database.windows.net';
  const database = process.env.SQL_DATABASE || fromUrl.database || 'fsq-command';

  const common = {
    server,
    database,
    port: Number(process.env.SQL_PORT || 1433),
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };

  const sqlUser = process.env.SQL_USER || fromUrl.user;
  const sqlPassword = process.env.SQL_PASSWORD || fromUrl.password;
  if (sqlUser && sqlPassword) {
    return { ...common, user: sqlUser, password: sqlPassword };
  }

  return {
    ...common,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token: await getAccessToken() }
    }
  };
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => new sql.ConnectionPool(await config()).connect())().catch(error => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

export function resetPool() {
  poolPromise = undefined;
}

export async function ensureSchema() {
  const pool = await getPool();
  await pool.request().query(`
    IF OBJECT_ID('dbo.Users','U') IS NULL
    CREATE TABLE dbo.Users (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      Name NVARCHAR(100) NOT NULL UNIQUE,
      PasswordHash NVARCHAR(255) NOT NULL,
      Role NVARCHAR(50) NOT NULL,
      Active BIT NOT NULL DEFAULT 1,
      PermissionsJson NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      FolderAccessJson NVARCHAR(MAX) NOT NULL DEFAULT '{}',
      LastLoginAt DATETIME2 NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF COL_LENGTH('dbo.Users','LastLoginAt') IS NULL ALTER TABLE dbo.Users ADD LastLoginAt DATETIME2 NULL;

    IF OBJECT_ID('dbo.AppState','U') IS NULL
    CREATE TABLE dbo.AppState (
      StateKey NVARCHAR(150) PRIMARY KEY,
      StateJson NVARCHAR(MAX) NOT NULL,
      UpdatedBy NVARCHAR(100) NULL,
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.AuditLog','U') IS NULL
    CREATE TABLE dbo.AuditLog (
      Id BIGINT IDENTITY(1,1) PRIMARY KEY,
      UserName NVARCHAR(100) NULL,
      Action NVARCHAR(100) NOT NULL,
      EntityType NVARCHAR(100) NULL,
      EntityId NVARCHAR(150) NULL,
      DetailsJson NVARCHAR(MAX) NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.Projects','U') IS NULL
    CREATE TABLE dbo.Projects (
      Id NVARCHAR(100) PRIMARY KEY,
      ProjectNo NVARCHAR(100) NULL,
      Name NVARCHAR(200) NOT NULL,
      Customer NVARCHAR(200) NULL,
      Type NVARCHAR(50) NULL,
      Status NVARCHAR(50) NULL,
      DataJson NVARCHAR(MAX) NOT NULL,
      UpdatedBy NVARCHAR(100) NULL,
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.PlannerEvents','U') IS NULL
    CREATE TABLE dbo.PlannerEvents (
      Id NVARCHAR(100) PRIMARY KEY,
      PersonName NVARCHAR(100) NULL,
      EventType NVARCHAR(50) NULL,
      StartDate DATE NULL,
      EndDate DATE NULL,
      DataJson NVARCHAR(MAX) NOT NULL,
      UpdatedBy NVARCHAR(100) NULL,
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.Machines','U') IS NULL
    CREATE TABLE dbo.Machines (
      Id NVARCHAR(100) PRIMARY KEY,
      Name NVARCHAR(200) NOT NULL,
      Manufacturer NVARCHAR(200) NULL,
      Model NVARCHAR(200) NULL,
      SerialNumber NVARCHAR(200) NULL,
      Location NVARCHAR(200) NULL,
      DataJson NVARCHAR(MAX) NOT NULL,
      UpdatedBy NVARCHAR(100) NULL,
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.KnowledgeDocuments','U') IS NULL
    CREATE TABLE dbo.KnowledgeDocuments (
      Id NVARCHAR(100) PRIMARY KEY,
      Name NVARCHAR(260) NOT NULL,
      FolderName NVARCHAR(200) NULL,
      MachineId NVARCHAR(100) NULL,
      BlobName NVARCHAR(1000) NULL,
      DataJson NVARCHAR(MAX) NOT NULL,
      UpdatedBy NVARCHAR(100) NULL,
      UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );


    IF OBJECT_ID('dbo.ProjectDocuments','U') IS NULL
    CREATE TABLE dbo.ProjectDocuments (
      Id NVARCHAR(100) PRIMARY KEY,
      ProjectName NVARCHAR(200) NOT NULL,
      Category NVARCHAR(200) NOT NULL,
      Name NVARCHAR(260) NOT NULL,
      Version INT NOT NULL DEFAULT 1,
      BlobName NVARCHAR(1000) NOT NULL,
      MimeType NVARCHAR(200) NULL,
      SizeBytes BIGINT NULL,
      UploadedBy NVARCHAR(100) NULL,
      IndexStatus NVARCHAR(50) NOT NULL DEFAULT 'Stored',
      IndexError NVARCHAR(MAX) NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.ProjectDocumentChunks','U') IS NULL
    CREATE TABLE dbo.ProjectDocumentChunks (
      Id BIGINT IDENTITY(1,1) PRIMARY KEY,
      DocumentId NVARCHAR(100) NOT NULL,
      ChunkNo INT NOT NULL,
      Content NVARCHAR(MAX) NOT NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_ProjectDocumentChunks_Document FOREIGN KEY (DocumentId) REFERENCES dbo.ProjectDocuments(Id) ON DELETE CASCADE
    );
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProjectDocumentChunks_DocumentId' AND object_id=OBJECT_ID('dbo.ProjectDocumentChunks'))
      CREATE INDEX IX_ProjectDocumentChunks_DocumentId ON dbo.ProjectDocumentChunks(DocumentId);
  `);
  return pool;
}

export async function databaseInfo() {
  const pool = await ensureSchema();
  const result = await pool.request().query(`
    SELECT DB_NAME() AS DatabaseName,
      (SELECT COUNT(*) FROM dbo.Users WHERE Active=1) AS ActiveUsers,
      (SELECT COUNT(*) FROM dbo.AuditLog) AS AuditEntries,
      (SELECT COUNT(*) FROM dbo.AppState) AS SharedStateKeys
  `);
  return result.recordset[0];
}

export { sql };
