import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

function clean(value) {
  let result = String(value || '').trim();
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1).trim();
  }
  return result.replace(/[\r\n]/g, '').trim();
}

function normalizeAccountUrl(value) {
  const cleaned = clean(value).replace(/\/+$/, '');
  if (!/^https:\/\//i.test(cleaned)) return '';
  try {
    const url = new URL(cleaned);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING contains an invalid Azure Storage URL. Copy the complete connection string from Storage account > Access keys.');
  }
}

export function getStorageConfigSummary() {
  const raw = clean(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const accountUrl = clean(process.env.AZURE_STORAGE_ACCOUNT_URL);
  return {
    configured: Boolean(raw || accountUrl),
    mode: raw.includes('DefaultEndpointsProtocol=') || raw.includes('AccountName=') ? 'connection-string' : (raw.startsWith('https://') || accountUrl ? 'managed-identity-url' : 'unknown'),
    container: clean(process.env.AZURE_STORAGE_CONTAINER) || 'fsq-documents'
  };
}

export function getBlobServiceClient() {
  const raw = clean(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const explicitUrl = clean(process.env.AZURE_STORAGE_ACCOUNT_URL);

  if (raw && (raw.includes('DefaultEndpointsProtocol=') || raw.includes('AccountName='))) {
    try {
      return BlobServiceClient.fromConnectionString(raw);
    } catch (error) {
      console.error('Azure Blob connection string could not be parsed:', error?.message || error);
      throw new Error('Azure Blob Storage connection string is invalid. Copy the entire Connection string from Storage account > Access keys > key1.');
    }
  }

  const accountUrl = normalizeAccountUrl(explicitUrl || raw);
  if (accountUrl) {
    return new BlobServiceClient(accountUrl, new DefaultAzureCredential());
  }

  throw new Error('Azure Blob Storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING to the full connection string, or set AZURE_STORAGE_ACCOUNT_URL and grant the App Service Managed Identity Storage Blob Data Contributor access.');
}

export function getDocumentContainerClient() {
  const containerName = clean(process.env.AZURE_STORAGE_CONTAINER) || 'fsq-documents';
  return getBlobServiceClient().getContainerClient(containerName);
}
