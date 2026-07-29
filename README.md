# FSQ Command 1.0 RC2 Secure

Production-hardened Next.js application for FSQ operations, Azure SQL, Azure Blob Storage and ATLAS.

## Hurtig Crew- og jobtildeling

- Åbn et projekt og vælg fanen **Crew**. Ét klik på en medarbejder tilføjer eller fjerner personen fra projektet.
- Åbn fanen **Tasks**. Skriv jobbet, vælg én eller flere medarbejdere som knapper, og tryk **Opret job**.
- På eksisterende jobs kan medarbejdere tilføjes eller fjernes direkte på joblinjen.
- En Technician ser jobbet under **My Jobs**, når personens navn er blandt de valgte medarbejdere.

Projektets Crew og jobtildelinger gemmes i den fælles Azure SQL-tilstand.

## Required Azure App Service settings

Create these environment variables before the first start:

- `AUTH_SECRET`: unique random value with at least 32 characters.
- `INITIAL_OWNER_PASSWORD`: unique password with at least 12 characters.
- `INITIAL_OWNER_NAME`: optional; defaults to `Flemming`.
- `SQL_SERVER` and `SQL_DATABASE`, or a valid `DATABASE_URL`.
- For the recommended Managed Identity setup, leave `SQL_USER` and `SQL_PASSWORD` absent. Enable the App Service system-assigned identity and create an Azure SQL user for that identity with the required database permissions.
- `AZURE_STORAGE_CONNECTION_STRING`, or `AZURE_STORAGE_ACCOUNT_URL` with Managed Identity.
- `AZURE_STORAGE_CONTAINER`: normally `fsq-documents`.
- `OPENAI_API_KEY`: required for ATLAS.
- `OPENAI_MODEL`: optional; defaults to `gpt-5`.
- `AISSTREAM_API_KEY`: free key from AISstream.io for live vessel positions. If omitted, Fleet Map uses each project's manual fallback coordinates.

Never commit real secrets. `.env.example` contains placeholders only.

## Gratis Fleet Map

Create a free account and API key at [AISstream.io](https://aisstream.io/). Add the key as the Azure App Service setting `AISSTREAM_API_KEY`, then restart the app. The key stays on the server and is never sent to the browser.

For every Vessel, Inspection or Service project, add its MMSI. Optional fallback latitude and longitude keep the vessel visible if a live AIS signal is unavailable. AIS data is operational information only and must not be used for navigation.

## Secure upgrade from an older release

On the first start, the application detects accounts still using the old shared password. The selected Owner receives `INITIAL_OWNER_PASSWORD`; other affected accounts are disabled. The Owner must assign each person a new unique password (minimum 12 characters) before reactivating them.

## Local verification

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run test:security
pnpm audit --prod --audit-level high
pnpm run build
```

## Deployment

Push to `main`. GitHub Actions installs from `pnpm-lock.yaml`, runs security checks and audit, builds the app, and deploys only the standalone artifact to Azure App Service.

The Azure startup command should be `npm start` or `node server.js` for the deployed standalone package.

After deployment:

1. Sign in with `INITIAL_OWNER_NAME` and `INITIAL_OWNER_PASSWORD`.
2. Assign unique passwords and permissions to every required user.
3. Verify `/api/diagnostics/database` and `/api/diagnostics/blob` while signed in as Owner or Co-Owner.
4. Test a small PDF in Project Binder and a permitted image in My Jobs.

### Managed Identity for Azure SQL

Run this once in the application database while signed in as a Microsoft Entra administrator. Replace the name if the App Service identity has a different display name:

```sql
CREATE USER [fsq-right-hand] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [fsq-right-hand];
ALTER ROLE db_datawriter ADD MEMBER [fsq-right-hand];
ALTER ROLE db_ddladmin ADD MEMBER [fsq-right-hand];
```

The application rotates its Azure SQL connection pool before the Managed Identity token expires. This prevents intermittent login failures after the service has been idle.
