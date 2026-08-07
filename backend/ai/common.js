'use strict';

class AIError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AIError';
    this.status = options.status || 500;
    this.code = options.code || 'AI_ERROR';
    this.provider = options.provider || '';
    this.model = options.model || '';
    this.details = options.details || '';
    this.attempts = options.attempts || [];
  }
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(timeoutMs || 35000));
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function normalizeHttpError(provider, status, payload, model) {
  const apiMessage = cleanText(
    payload?.error?.message ||
    payload?.message ||
    payload?.error?.type ||
    payload?.detail
  );
  if (status === 400) return new AIError(apiMessage || 'La solicitud enviada al proveedor no fue válida.', { status, code: 'BAD_REQUEST', provider, model });
  if (status === 401 || status === 403) return new AIError('La credencial API no es válida, está restringida o no tiene acceso al modelo.', { status, code: 'AUTH_ERROR', provider, model, details: apiMessage });
  if (status === 404) return new AIError(apiMessage || `El modelo ${model} no está disponible.`, { status, code: 'MODEL_NOT_FOUND', provider, model });
  if (status === 429) return new AIError('Se alcanzó temporalmente el límite o la cuota del proveedor.', { status, code: 'RATE_LIMIT', provider, model, details: apiMessage });
  return new AIError(apiMessage || `${provider} respondió con HTTP ${status}.`, { status, code: 'API_ERROR', provider, model });
}

async function fetchJson({ provider, url, options, model, timeoutMs, fetchImpl }) {
  const impl = fetchImpl || globalThis.fetch;
  if (typeof impl !== 'function') {
    throw new AIError('Esta versión de Node.js no incluye fetch. Instala Node.js 18 o superior.', { status: 500, code: 'FETCH_UNAVAILABLE', provider, model });
  }
  const timer = timeoutSignal(timeoutMs);
  try {
    const response = await impl(url, { ...options, signal: timer.signal });
    let payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    if (!response.ok) throw normalizeHttpError(provider, response.status, payload, model);
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AIError(`La consulta a ${provider} excedió el tiempo de espera.`, { status: 504, code: 'TIMEOUT', provider, model });
    }
    if (error instanceof AIError) throw error;
    throw new AIError(`No se pudo conectar con ${provider}: ${error.message}`, { status: 502, code: 'NETWORK_ERROR', provider, model });
  } finally {
    timer.cancel();
  }
}

module.exports = { AIError, cleanText, fetchJson, normalizeHttpError };
