import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

let cachedService = null;
let cachedFingerprint = null;
let cachedMode = null;

function clean(value) {
  if (value === undefined || value === null) return '';
  let text = String(value).trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\r?\n/g, '').trim();
}

function parseConnectionString(value) {
  const raw = clean(value);
  const fields = {};
  if (!raw) return { raw: '', fields };
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const val = part.slice(index + 1).trim();
    if (key) fields[key.toLowerCase()] = val;
  }
  return { raw, fields };
}

function normalizeAccountUrl(value) {
  const input = clean(value);
  if (!input) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(withProtocol);
    if (!url.hostname) return '';
    return `${url.protocol}//${url.host}`.replace(/\/$/, '');
  } catch {
    if (/^[a-z0-9]{3,24}$/i.test(input)) return `https://${input}.blob.core.windows.net`;
    return '';
  }
}

function accountUrlFromFields(fields) {
  const blobEndpoint = fields.blobendpoint;
  if (blobEndpoint) return normalizeAccountUrl(blobEndpoint);
  const accountName = fields.accountname;
  if (!accountName) return '';
  const suffix = fields.endpointsuffix || 'core.windows.net';
  return `https://${accountName}.blob.${suffix}`;
}

function looksLikeCredentialedConnectionString(parsed) {
  const f = parsed.fields;
  if (!parsed.raw) return false;
  if (/^UseDevelopmentStorage=true$/i.test(parsed.raw)) return true;
  return Boolean(
    f.accountname &&
    (f.accountkey || f.sharedaccesssignature || f.sas)
  );
}

export function getBlobConfiguration() {
  const parsed = parseConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const explicitUrl = normalizeAccountUrl(
    process.env.AZURE_STORAGE_ACCOUNT_URL ||
    process.env.AZURE_STORAGE_ACCOUNT_NAME ||
    process.env.AZURE_STORAGE_BLOB_ENDPOINT
  );
  const inferredUrl = accountUrlFromFields(parsed.fields) || normalizeAccountUrl(parsed.raw);
  const containerName = clean(process.env.AZURE_STORAGE_CONTAINER) || 'fsq-documents';

  if (looksLikeCredentialedConnectionString(parsed)) {
    return {
      mode: 'connection-string',
      connectionString: parsed.raw,
      accountUrl: accountUrlFromFields(parsed.fields) || null,
      accountName: parsed.fields.accountname || null,
      containerName
    };
  }

  const accountUrl = explicitUrl || inferredUrl;
  if (accountUrl) {
    return {
      mode: 'managed-identity',
      connectionString: null,
      accountUrl,
      accountName: parsed.fields.accountname || null,
      containerName
    };
  }

  throw new Error(
    'Azure Blob Storage is not configured. Paste the full Connection string from Storage account > Access keys into AZURE_STORAGE_CONNECTION_STRING, or set AZURE_STORAGE_ACCOUNT_URL and grant the App Service Managed Identity the Storage Blob Data Contributor role.'
  );
}

export function getBlobServiceClient() {
  const config = getBlobConfiguration();
  const fingerprint = `${config.mode}|${config.connectionString || config.accountUrl}`;
  if (cachedService && cachedFingerprint === fingerprint) return cachedService;

  cachedMode = config.mode;
  cachedFingerprint = fingerprint;
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

export function getBlobDiagnosticSummary() {
  const parsed = parseConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  let config = null;
  let configError = null;
  try { config = getBlobConfiguration(); } catch (error) { configError = error?.message || String(error); }
  return {
    connectionSettingPresent: Boolean(parsed.raw),
    connectionSettingLength: parsed.raw.length,
    detectedFields: Object.keys(parsed.fields).sort(),
    hasAccountName: Boolean(parsed.fields.accountname),
    hasAccountKey: Boolean(parsed.fields.accountkey),
    hasSas: Boolean(parsed.fields.sharedaccesssignature || parsed.fields.sas),
    hasBlobEndpoint: Boolean(parsed.fields.blobendpoint),
    accountUrlSettingPresent: Boolean(clean(process.env.AZURE_STORAGE_ACCOUNT_URL)),
    containerSettingPresent: Boolean(clean(process.env.AZURE_STORAGE_CONTAINER)),
    resolvedMode: config?.mode || null,
    resolvedAccountUrl: config?.accountUrl || null,
    resolvedContainer: config?.containerName || null,
    configurationError: configError
  };
}
