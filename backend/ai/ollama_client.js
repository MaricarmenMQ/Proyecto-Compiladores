'use strict';

const { AIError, cleanText, fetchJson } = require('./common');

function normalizeOllamaUrl(value) {
  const raw = cleanText(value, 'http://127.0.0.1:11434').replace(/\/$/, '');
  let url;
  try { url = new URL(raw); } catch (_) {
    throw new AIError('La URL de Ollama no es válida.', { status: 400, code: 'BAD_URL', provider: 'ollama' });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AIError('La URL de Ollama debe usar http o https.', { status: 400, code: 'BAD_URL', provider: 'ollama' });
  }
  return url.toString().replace(/\/$/, '');
}

async function requestOllama({ model, prompt, baseUrl, fetchImpl, timeoutMs }) {
  const provider = 'ollama';
  const url = normalizeOllamaUrl(baseUrl);
  const payload = await fetchJson({
    provider,
    model,
    timeoutMs,
    fetchImpl,
    url: `${url}/api/chat`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.35 }
      })
    }
  });
  const text = cleanText(payload?.message?.content);
  if (!text) throw new AIError('Ollama no devolvió una respuesta de texto.', { status: 502, code: 'EMPTY_RESPONSE', provider, model });
  return {
    text,
    provider,
    model: cleanText(payload?.model, model),
    usage: { prompt_eval_count: payload?.prompt_eval_count || null, eval_count: payload?.eval_count || null }
  };
}

module.exports = { normalizeOllamaUrl, requestOllama };
