'use strict';

const { AIError, fetchJson } = require('./common');

function extractAnthropicText(payload) {
  return (payload?.content || [])
    .filter(part => part?.type === 'text' && typeof part?.text === 'string')
    .map(part => part.text)
    .join('')
    .trim();
}

async function requestAnthropic({ apiKey, model, prompt, fetchImpl, timeoutMs }) {
  const provider = 'anthropic';
  const payload = await fetchJson({
    provider,
    model,
    timeoutMs,
    fetchImpl,
    url: 'https://api.anthropic.com/v1/messages',
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }]
      })
    }
  });
  const text = extractAnthropicText(payload);
  if (!text) throw new AIError('Anthropic no devolvió una respuesta de texto.', { status: 502, code: 'EMPTY_RESPONSE', provider, model });
  return { text, provider, model, usage: payload.usage || null };
}

module.exports = { extractAnthropicText, requestAnthropic };
