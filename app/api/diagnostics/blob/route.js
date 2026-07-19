import { readSession } from '../../../../lib/auth';
import { getBlobConfiguration, getBlobContainerClient, getBlobDiagnosticSummary } from '../../../../lib/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const diagnostics = getBlobDiagnosticSummary();
  try {
    const config = getBlobConfiguration();
    const container = getBlobContainerClient();
    await container.createIfNotExists();
    const properties = await container.getProperties();
    return Response.json({
      ok: true,
      message: 'Azure Blob Storage connection is working.',
      mode: config.mode,
      container: config.containerName,
      accountUrl: config.accountUrl || 'configured through connection string',
      lastModified: properties.lastModified || null,
      diagnostics
    });
  } catch (error) {
    console.error('Blob diagnostics failed', error);
    return Response.json({
      ok: false,
      error: error?.message || String(error),
      diagnostics,
      guidance: diagnostics.connectionSettingPresent
        ? 'The setting exists, but its value is not usable. Copy the entire Connection string from the Storage account Access keys page, including DefaultEndpointsProtocol, AccountName, AccountKey and EndpointSuffix.'
        : 'Create AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL in App Service Environment variables, save, and restart the app.'
    }, { status: 500 });
  }
}
