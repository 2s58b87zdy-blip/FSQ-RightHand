# FSQ Command v9.2.0 - Project Binder Enterprise

Folder-specific Azure upload, drag and drop, SQL-backed document listing, file preview and automatic ATLAS indexing.

# FSQ Command v8.1.1 – Shared Operations Data

## New in v8.1

- Azure SQL authentication through the App Service system-assigned Managed Identity
- SQL username/password remains an optional local-development fallback
- Shared SQL storage for the existing Projects, Planner, Machines and ATLAS Knowledge state
- Dedicated future-ready SQL tables for Projects, Planner Events, Machines and Knowledge Documents
- User passwords stored only as bcrypt hashes
- Secure HTTP-only login session
- Last-login tracking for users
- Expanded System Health database information
- Owner-only audit-log API
- Automatic schema upgrades during startup

## Required Azure App Service settings

Set these under **App Service → Settings → Environment variables**:

- `SQL_SERVER=atlas-command-sql.database.windows.net`
- `SQL_DATABASE=fsq-command`
- `AUTH_SECRET` – at least 32 random characters
- `INITIAL_OWNER_PASSWORD` – used only if the Users table is empty
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER=fsq-documents`

Do not add `SQL_USER` or `SQL_PASSWORD` in Azure when Managed Identity is used.

## Azure SQL permission

The database must contain the external user for the App Service identity:

```sql
CREATE USER [fsq-right-hand] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [fsq-right-hand];
ALTER ROLE db_datawriter ADD MEMBER [fsq-right-hand];
ALTER ROLE db_ddladmin ADD MEMBER [fsq-right-hand];
```

## First deployment

1. Add the environment variables.
2. Deploy this project through the existing GitHub Actions/App Service workflow.
3. Restart the App Service.
4. Open FSQ Command and log in with the `INITIAL_OWNER_PASSWORD`.
5. In **Settings → Users & Permissions**, assign a unique password to every user.
6. Open **System Health** and confirm that Azure SQL reports Connected and Managed Identity.

## Data model

`Users`, `AppState`, `AuditLog`, `Projects`, `PlannerEvents`, `Machines` and `KnowledgeDocuments` are created automatically. Existing screens continue to use the shared AppState synchronization layer, preserving the current UI while the dedicated module APIs are introduced in subsequent releases.


## v8.1.1 hotfix
- Accepts either `SQL_SERVER` + `SQL_DATABASE` or a valid `DATABASE_URL`.
- Keeps Managed Identity as the default when no SQL username/password is supplied.
- Adds server-side logging for `/api/auth/users` so Azure Log Stream shows the exact database error.
- Adds defensive checks around schema initialization and user seeding.

## v8.1.2 login diagnostics hotfix
- Uses the known Azure SQL server/database as safe defaults when only Managed Identity is configured.
- Adds `/api/diagnostics/database` with non-secret connection diagnostics.
- Shows the actual Azure SQL error on the login screen instead of silently displaying an empty user list.
- Uses Node.js 20 in GitHub Actions.
- Deploys the tested Next.js standalone output rather than the entire repository.
- Removes the invalid duplicate `next.config.mjs` file.

## ATLAS BRAIN v9.0

Azure App Service environment variables:

- `OPENAI_API_KEY` - required for ATLAS answers and online research.
- `OPENAI_MODEL` - optional, defaults to `gpt-5`.
- `OPENAI_VECTOR_STORE_ID` - optional. When configured, ATLAS uses OpenAI File Search across indexed FSQ documents.

ATLAS modes:

- Assistant: internal FSQ context first, optional web research.
- Research: web research is always enabled and sources are shown.
- Developer: visible and available only when the signed-in user is Flemming with Owner role. v9.0 is analysis-only and cannot change or deploy code.

The application automatically creates `AtlasConversations` and `AtlasKnowledge` tables in Azure SQL on first use.

## v9.1.0 - ATLAS Project Binder Knowledge Engine

Project Binder is now ATLAS' primary live project source.

- Project Binder files are stored in Azure Blob Storage (up to 100 MB per file).
- PDF, DOCX, XLS/XLSX, TXT, CSV, Markdown, JSON, XML and LOG text is extracted during upload.
- Extracted text is split into searchable chunks in Azure SQL.
- ATLAS automatically retrieves relevant Binder chunks before answering.
- ATLAS answers include Project Binder source names and versions.
- Files can be opened directly from Blob Storage and deletion also removes the ATLAS index.
- Scanned PDFs, photos, videos and CAD drawings are stored but require a later OCR/Vision pipeline before their visual contents can be searched.
- Existing local/demo Binder files must be uploaded again to become ATLAS-ready.

## Azure Blob Storage (v9.2.1)
Choose one authentication method:

1. Connection string
   - `AZURE_STORAGE_CONNECTION_STRING`: complete connection string copied from Storage account > Access keys.
   - `AZURE_STORAGE_CONTAINER`: normally `fsq-documents`.

2. Managed Identity (recommended)
   - `AZURE_STORAGE_ACCOUNT_URL`: for example `https://YOURACCOUNT.blob.core.windows.net`.
   - `AZURE_STORAGE_CONTAINER`: normally `fsq-documents`.
   - Grant the App Service system-assigned identity the role `Storage Blob Data Contributor` on the Storage account.

After deployment, sign in and open `/api/diagnostics/blob`. A working setup returns `"ok": true`.

## Login recovery (v10.2.1)
If an existing password hash no longer matches after an upgrade, configure `INITIAL_OWNER_PASSWORD` and optionally `INITIAL_COOWNER_PASSWORD` in Azure App Service > Environment variables. A successful login with the configured recovery password automatically writes a fresh bcrypt hash to Azure SQL.
