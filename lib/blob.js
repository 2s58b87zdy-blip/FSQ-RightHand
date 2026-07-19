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

function unwrapConnectionString(value) {
  let raw = clean(value);
  if (!raw) return '';

  // Azure settings are sometimes pasted as JSON or with an environment-variable prefix.
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') raw = parsed;
    else if (parsed && typeof parsed === 'object') {
      raw = parsed.connectionString || parsed.ConnectionString || parsed.value || parsed.Value || raw;
    }
  } catch {}

  raw = clean(raw)
    .replace(/^CUSTOMCONNSTR_/i, '')
    .replace(/^AZURE_STORAGE_CONNECTION_STRING\s*=\s*/i, '');

  // If extra text was pasted, keep only the actual Azure connection string.
  const start = raw.search(/(?:DefaultEndpointsProtocol|BlobEndpoint|AccountName|UseDevelopmentStorage)\s*=/i);
  if (start > 0) raw = raw.slice(start);
  return clean(raw);
}

function parseConnectionString(value) {
  const raw = unwrapConnectionString(value);
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
  if (fields.blobendpoint) return normalizeAccountUrl(fields.blobendpoint);
  if (!fields.accountname) return '';
  const suffix = fields.endpointsuffix || 'core.windows.net';
  return `https://${fields.accountname}.blob.${suffix}`;
}

function looksLikeCredentialedConnectionString(parsed) {
  if (!parsed.raw) return false;
  if (/^UseDevelopmentStorage=true$/i.test(parsed.raw)) return true;
  const f = parsed.fields;
  return Boolean(f.accountname && (f.accountkey || f.sharedaccesssignature || f.sas));
}

function connectionSetting() {
  // Support both App Settings and Azure's Connection strings tab prefixes.
  return process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING ||
    process.env.CUSTOMCONNSTR_AzureStorage ||
    process.env.CUSTOMCONNSTR_Storage ||
    '';
}

export function getBlobConfiguration() {
  const parsed = parseConnectionString(connectionSetting());
  const explicitUrl = normalizeAccountUrl(
    process.env.AZURE_STORAGE_ACCOUNT_URL ||
    process.env.AZURE_STORAGE_BLOB_ENDPOINT ||
    process.env.AZURE_STORAGE_ACCOUNT_NAME
  );
  const inferredUrl = accountUrlFromFields(parsed.fields);
  const defaultAccountUrl = normalizeAccountUrl(process.env.AZURE_STORAGE_DEFAULT_ACCOUNT || 'fsqrighthandstorage');
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

  // Prefer Managed Identity when no usable key/SAS connection string is present.
  const accountUrl = explicitUrl || inferredUrl || defaultAccountUrl;
  if (accountUrl) {
    return {
      mode: 'managed-identity',
      connectionString: null,
      accountUrl,
      accountName: new URL(accountUrl).hostname.split('.')[0],
      containerName
    };
  }

  throw new Error('Azure Blob Storage is not configured. Add a complete AZURE_STORAGE_CONNECTION_STRING or grant the App Service Managed Identity Storage Blob Data Contributor access to the storage account.');
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

export async function ensureBlobContainer() {
  const client = getBlobContainerClient();
  await client.createIfNotExists();
  return client;
}

export function getBlobMode() {
  if (cachedMode) return cachedMode;
  return getBlobConfiguration().mode;
}

export function getBlobDiagnosticSummary() {
  const parsed = parseConnectionString(connectionSetting());
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
