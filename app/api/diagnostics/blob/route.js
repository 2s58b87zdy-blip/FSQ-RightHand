import { readSession } from '../../../../lib/auth';
import { getBlobConfiguration, getBlobContainerClient } from '../../../../lib/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const config = getBlobConfiguration();
    const container = getBlobContainerClient();
    await container.createIfNotExists({ access: 'private' });
    const properties = await container.getProperties();
    return Response.json({
      ok: true,
      mode: config.mode,
      container: config.containerName,
      accountUrl: config.accountUrl || 'configured through connection string',
      lastModified: properties.lastModified || null
    });
  } catch (error) {
    console.error('Blob diagnostics failed', error);
    return Response.json({
      ok: false,
      error: error?.message || String(error),
      hasConnectionString: Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING),
      hasAccountUrl: Boolean(process.env.AZURE_STORAGE_ACCOUNT_URL),
      hasContainer: Boolean(process.env.AZURE_STORAGE_CONTAINER)
    }, { status: 500 });
  }
}
