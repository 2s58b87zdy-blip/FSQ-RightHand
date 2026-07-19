import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

let cachedService = null;
let cachedMode = null;

function clean(value) {
  if (!value) return '';
  let text = String(value).trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\r?\n/g, '').trim();
}

function normalizeAccountUrl(value) {
  const input = clean(value);
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input.replace(/\/$/, '');
  if (/^[a-z0-9]{3,24}$/i.test(input)) return `https://${input}.blob.core.windows.net`;
  return '';
}

export function getBlobConfiguration() {
  const rawConnection = clean(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const explicitUrl = normalizeAccountUrl(process.env.AZURE_STORAGE_ACCOUNT_URL || process.env.AZURE_STORAGE_ACCOUNT_NAME);

  if (rawConnection && /(^|;)AccountName=/i.test(rawConnection) && /(^|;)AccountKey=/i.test(rawConnection)) {
    return {
      mode: 'connection-string',
      connectionString: rawConnection,
      accountUrl: null,
      containerName: clean(process.env.AZURE_STORAGE_CONTAINER) || 'fsq-documents'
    };
  }

  const urlFromConnectionSetting = normalizeAccountUrl(rawConnection);
  const accountUrl = explicitUrl || urlFromConnectionSetting;
  if (accountUrl) {
    return {
      mode: 'managed-identity',
      connectionString: null,
      accountUrl,
      containerName: clean(process.env.AZURE_STORAGE_CONTAINER) || 'fsq-documents'
    };
  }

  throw new Error(
    'Azure Blob Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING to the complete connection string from Storage account > Access keys, or set AZURE_STORAGE_ACCOUNT_URL (for example https://mystorage.blob.core.windows.net) and grant the App Service Managed Identity the Storage Blob Data Contributor role.'
  );
}

export function getBlobServiceClient() {
  if (cachedService) return cachedService;
  const config = getBlobConfiguration();
  cachedMode = config.mode;
  cachedService = config.mode === 'connection-string'
    ? BlobServiceClient.fromConnectionString(config.connectionString)
    : new BlobServiceClient(config.accountUrl, new DefaultAzureCredential());
  return cachedService;
}

export function getBlobContainerClient() {
  const config = getBlobConfiguration();
  return getBlobServiceClient().getContainerClient(config.containerName);
}

export function getBlobMode() {
  if (cachedMode) return cachedMode;
  return getBlobConfiguration().mode;
}
