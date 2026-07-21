# FSQ Command 1.0 RC2 Secure

Production-hardened Next.js application for FSQ operations, Azure SQL, Azure Blob Storage and ATLAS.

## Required Azure App Service settings

Create these environment variables before the first start:

- `AUTH_SECRET`: unique random value with at least 32 characters.
- `INITIAL_OWNER_PASSWORD`: unique password with at least 12 characters.
- `INITIAL_OWNER_NAME`: optional; defaults to `Flemming`.
- `SQL_SERVER` and `SQL_DATABASE`, or a valid `DATABASE_URL`.
- `AZURE_STORAGE_CONNECTION_STRING`, or `AZURE_STORAGE_ACCOUNT_URL` with Managed Identity.
- `AZURE_STORAGE_CONTAINER`: normally `fsq-documents`.
- `OPENAI_API_KEY`: required for ATLAS.
- `OPENAI_MODEL`: optional; defaults to `gpt-5`.

Never commit real secrets. `.env.example` contains placeholders only.

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

