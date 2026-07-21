const TRANSIENT_CODES = new Set([
  'ETIMEOUT', 'ESOCKET', 'ECONNCLOSED', 'ECONNRESET', 'ELOGIN',
  'ENOTOPEN', 'EAI_AGAIN', 'ETIMEDOUT'
]);

export function isTransientError(error) {
  const code = String(error?.code || error?.originalError?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return TRANSIENT_CODES.has(code)
    || message.includes('timeout')
    || message.includes('temporarily')
    || message.includes('connection is closed')
    || message.includes('socket hang up')
    || message.includes('token');
}

export async function withRetry(operation, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 3));
  const baseDelayMs = Math.max(50, Number(options.baseDelayMs || 250));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientError(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
  throw lastError;
}
