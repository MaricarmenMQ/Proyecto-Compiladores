'use strict';

const { buildProviderConfig, generateAgentReply, hasAITool, providerFromTools } = require('../backend/ai/ai_manager');
const { extractOpenAIResponseText, extractChatCompletionText, requestOpenAICompatible } = require('../backend/ai/openai_compatible_client');
const { extractAnthropicText, requestAnthropic } = require('../backend/ai/anthropic_client');
const { requestOllama } = require('../backend/ai/ollama_client');

let failures = 0;
function check(condition, message) {
  if (condition) console.log('[OK]', message);
  else { console.error('[FALLO]', message); failures += 1; }
}

const agent = {
  name: 'AsistenteMultiIA',
  objective: 'Responder solicitudes generales',
  intelligence: 'experto',
  memory: 'persistente',
  tools: ['ia'],
  permissions: ['leer', 'usar'],
  restrictions: []
};

check(hasAITool(['ia']), 'la herramienta ia activa la capa multimodelo');
check(hasAITool(['claude']), 'el alias claude activa la capa IA');
check(providerFromTools(['gemini']) === 'gemini', 'gemini conserva compatibilidad');
check(providerFromTools(['claude']) === 'anthropic', 'claude se mapea a Anthropic');
check(extractOpenAIResponseText({ output: [{ content: [{ type: 'output_text', text: 'Respuesta OpenAI' }] }] }) === 'Respuesta OpenAI', 'se extrae texto de OpenAI Responses API');
check(extractChatCompletionText({ choices: [{ message: { content: 'Respuesta compatible' } }] }) === 'Respuesta compatible', 'se extrae texto OpenAI-compatible');
check(extractAnthropicText({ content: [{ type: 'text', text: 'Respuesta Claude' }] }) === 'Respuesta Claude', 'se extrae texto Anthropic');

const env = {
  AI_PROVIDER: 'openai',
  AI_FALLBACK: 'true',
  OPENAI_API_KEY: 'openai-test-key-1234567890',
  OPENAI_MODEL: 'gpt-test',
  GROQ_API_KEY: 'groq-test-key-1234567890',
  GROQ_MODEL: 'groq-test',
  GEMINI_MODEL: 'gemini-2.5-flash',
  OLLAMA_ENABLED: 'false'
};
const config = buildProviderConfig(env);
check(config.activeProvider === 'openai', 'se selecciona proveedor activo');
check(config.providers.openai.configured, 'OpenAI aparece configurado con clave');
check(config.providers.groq.configured, 'Groq aparece configurado con clave');
check(!config.providers.gemini.configured, 'Gemini queda pendiente sin clave');

const fakeOpenAIFetch = async (url, options) => {
  check(url === 'https://api.openai.com/v1/responses', 'OpenAI usa Responses API');
  check(options.headers.Authorization === 'Bearer openai-test-key-1234567890', 'OpenAI usa Authorization Bearer');
  const body = JSON.parse(options.body);
  check(body.model === 'gpt-test', 'OpenAI recibe el modelo configurado');
  check(String(body.input).includes('AsistenteMultiIA'), 'OpenAI recibe contexto del agente');
  return {
    ok: true,
    status: 200,
    async json() {
      return { output: [{ content: [{ type: 'output_text', text: 'Respuesta OpenAI simulada.' }] }], usage: { input_tokens: 10, output_tokens: 5 } };
    }
  };
};

const fallbackConfig = buildProviderConfig({
  AI_PROVIDER: 'openai',
  AI_FALLBACK: 'true',
  OPENAI_API_KEY: 'openai-test-key-1234567890',
  OPENAI_MODEL: 'gpt-test',
  GROQ_API_KEY: 'groq-test-key-1234567890',
  GROQ_MODEL: 'groq-test'
});

const fakeFallbackFetch = async (url, options) => {
  if (url.includes('api.openai.com')) {
    return { ok: false, status: 429, async json() { return { error: { message: 'quota test' } }; } };
  }
  if (url.includes('api.groq.com')) {
    const body = JSON.parse(options.body);
    check(body.model === 'groq-test', 'el fallback usa el modelo Groq configurado');
    return { ok: true, status: 200, async json() { return { choices: [{ message: { content: 'Respuesta Groq de respaldo.' } }] }; } };
  }
  throw new Error(`URL inesperada: ${url}`);
};

(async () => {
  const openaiResult = await generateAgentReply({
    config,
    agent,
    message: 'hola',
    preferredProvider: 'openai',
    fetchImpl: fakeOpenAIFetch,
    timeoutMs: 1000
  });
  check(openaiResult.provider === 'openai', 'el manager usa OpenAI');
  check(openaiResult.text === 'Respuesta OpenAI simulada.', 'el manager devuelve la respuesta OpenAI');
  check(!openaiResult.fallbackUsed, 'no marca fallback cuando responde el preferido');

  const fallbackResult = await generateAgentReply({
    config: fallbackConfig,
    agent,
    message: 'hola',
    preferredProvider: 'openai',
    fetchImpl: fakeFallbackFetch,
    timeoutMs: 1000
  });
  check(fallbackResult.provider === 'groq', 'si OpenAI falla se usa otro proveedor configurado');
  check(fallbackResult.fallbackUsed, 'el manager informa que utilizó fallback');
  check(fallbackResult.attempts.some(a => a.provider === 'openai' && a.code === 'RATE_LIMIT'), 'la traza conserva el fallo del proveedor preferido');

  const anthropicResult = await requestAnthropic({
    apiKey: 'anthropic-test-key-1234567890',
    model: 'claude-test',
    prompt: 'hola',
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      check(url === 'https://api.anthropic.com/v1/messages', 'Anthropic usa Messages API');
      check(options.headers['x-api-key'] === 'anthropic-test-key-1234567890', 'Anthropic usa x-api-key');
      return { ok: true, status: 200, async json() { return { content: [{ type: 'text', text: 'Respuesta Claude simulada.' }] }; } };
    }
  });
  check(anthropicResult.text === 'Respuesta Claude simulada.', 'el cliente Anthropic devuelve texto');

  const deepseekResult = await requestOpenAICompatible({
    provider: 'deepseek',
    apiKey: 'deepseek-test-key-1234567890',
    model: 'deepseek-v4-flash',
    prompt: 'hola',
    baseUrl: 'https://api.deepseek.com',
    timeoutMs: 1000,
    fetchImpl: async (url) => {
      check(url === 'https://api.deepseek.com/chat/completions', 'DeepSeek usa chat/completions');
      return { ok: true, status: 200, async json() { return { choices: [{ message: { content: 'Respuesta DeepSeek simulada.' } }] }; } };
    }
  });
  check(deepseekResult.text === 'Respuesta DeepSeek simulada.', 'el cliente DeepSeek devuelve texto');

  const ollamaResult = await requestOllama({
    model: 'gemma3',
    prompt: 'hola',
    baseUrl: 'http://127.0.0.1:11434',
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      check(url === 'http://127.0.0.1:11434/api/chat', 'Ollama usa la API local /api/chat');
      const body = JSON.parse(options.body);
      check(body.stream === false, 'Ollama responde sin streaming para la interfaz');
      return { ok: true, status: 200, async json() { return { model: 'gemma3', message: { content: 'Respuesta Ollama simulada.' } }; } };
    }
  });
  check(ollamaResult.text === 'Respuesta Ollama simulada.', 'el cliente Ollama devuelve texto');

  if (failures) process.exit(1);
  console.log('\nPruebas IA multimodelo finalizadas correctamente.');
})().catch(error => {
  console.error('[FALLO]', error);
  process.exit(1);
});
