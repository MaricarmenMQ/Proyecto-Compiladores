'use strict';

const { AIError, cleanText, fetchJson } = require('./common');

function extractOpenAIResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const texts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') texts.push(content.text);
    }
  }
  return texts.join('').trim();
}

function extractChatCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(part => part?.text || part?.content || '').join('').trim();
  return '';
}

async function requestOpenAI({ apiKey, model, prompt, fetchImpl, timeoutMs }) {
  const provider = 'openai';
  const payload = await fetchJson({
    provider,
    model,
    timeoutMs,
    fetchImpl,
    url: 'https://api.openai.com/v1/responses',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: prompt, max_output_tokens: 700 })
    }
  });
  const text = extractOpenAIResponseText(payload);
  if (!text) throw new AIError('OpenAI no devolvió una respuesta de texto.', { status: 502, code: 'EMPTY_RESPONSE', provider, model });
  return { text, provider, model, usage: payload.usage || null };
}

async function requestOpenAICompatible({ provider, apiKey, model, prompt, baseUrl, fetchImpl, timeoutMs }) {
  const normalizedBase = cleanText(baseUrl).replace(/\/$/, '');
  const payload = await fetchJson({
    provider,
    model,
    timeoutMs,
    fetchImpl,
    url: `${normalizedBase}/chat/completions`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 700
      })
    }
  });
  const text = extractChatCompletionText(payload);
  if (!text) throw new AIError(`${provider} no devolvió una respuesta de texto.`, { status: 502, code: 'EMPTY_RESPONSE', provider, model });
  return { text, provider, model, usage: payload.usage || null };
}

module.exports = { extractOpenAIResponseText, extractChatCompletionText, requestOpenAI, requestOpenAICompatible };
