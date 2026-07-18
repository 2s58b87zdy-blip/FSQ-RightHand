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
