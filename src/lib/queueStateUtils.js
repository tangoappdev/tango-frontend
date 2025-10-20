export function buildQueueStateKey(category, mode) {
  const safeCategory = typeof category === 'string' ? category : '';
  const safeMode = typeof mode === 'string' ? mode : '';
  const raw = `${safeCategory}||${safeMode}`;

  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(raw, 'utf-8').toString('base64url');
    } catch {
      // fall back to browser implementation below
    }
  }

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const bytes = encoder ? encoder.encode(raw) : [];
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : '';
  if (base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  }
  return raw.replace(/[^A-Za-z0-9_-]+/g, '-');
}
