'use strict';

const { buildPrompt, generateAgentReply: generateGeminiReply, GeminiError } = require('../gemini_client');
const { AIError, cleanText } = require('./common');
const { requestOpenAI, requestOpenAICompatible } = require('./openai_compatible_client');
const { requestAnthropic } = require('./anthropic_client');
const { requestOllama } = require('./ollama_client');

const PROVIDERS = {
  gemini: {
    id: 'gemini', label: 'Google Gemini', keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-2.5-flash', requiresKey: true
  },
  openai: {
    id: 'openai', label: 'OpenAI', keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-5-mini', requiresKey: true
  },
  anthropic: {
    id: 'anthropic', label: 'Anthropic Claude', keyEnv: 'ANTHROPIC_API_KEY', modelEnv: 'ANTHROPIC_MODEL', defaultModel: 'claude-sonnet-4-20250514', requiresKey: true
  },
  deepseek: {
    id: 'deepseek', label: 'DeepSeek', keyEnv: 'DEEPSEEK_API_KEY', modelEnv: 'DEEPSEEK_MODEL', defaultModel: 'deepseek-v4-flash', requiresKey: true,
    baseUrl: 'https://api.deepseek.com'
  },
  groq: {
    id: 'groq', label: 'Groq', keyEnv: 'GROQ_API_KEY', modelEnv: 'GROQ_MODEL', defaultModel: 'llama-3.3-70b-versatile', requiresKey: true,
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  ollama: {
    id: 'ollama', label: 'Ollama local', modelEnv: 'OLLAMA_MODEL', defaultModel: 'gemma3', requiresKey: false, urlEnv: 'OLLAMA_URL', enabledEnv: 'OLLAMA_ENABLED', defaultUrl: 'http://127.0.0.1:11434'
  }
};

const PROVIDER_ALIASES = {
  ia: null, ai: null,
  gemini: 'gemini', google: 'gemini',
  openai: 'openai', gpt: 'openai',
  anthropic: 'anthropic', claude: 'anthropic',
  deepseek: 'deepseek',
  groq: 'groq',
  ollama: 'ollama', local_llm: 'ollama'
};

function boolValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|si|sí|on)$/i.test(String(value).trim());
}

function providerFromTools(tools = []) {
  for (const raw of tools) {
    const key = String(raw || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PROVIDER_ALIASES, key) && PROVIDER_ALIASES[key]) return PROVIDER_ALIASES[key];
  }
  return null;
}

function hasAITool(tools = []) {
  return tools.some(raw => Object.prototype.hasOwnProperty.call(PROVIDER_ALIASES, String(raw || '').trim().toLowerCase()));
}

function buildProviderConfig(env = {}) {
  const providers = {};
  for (const [id, def] of Object.entries(PROVIDERS)) {
    const apiKey = def.keyEnv ? cleanText(env[def.keyEnv]) : '';
    const model = cleanText(env[def.modelEnv], def.defaultModel);
    const enabled = id === 'ollama' ? boolValue(env[def.enabledEnv], false) : Boolean(apiKey && !/PEGA_AQUI|TU_CLAVE/i.test(apiKey));
    providers[id] = {
      id,
      label: def.label,
      apiKey: enabled && def.requiresKey ? apiKey : '',
      model,
      configured: enabled,
      requiresKey: def.requiresKey,
      baseUrl: id === 'ollama' ? cleanText(env[def.urlEnv], def.defaultUrl) : def.baseUrl || ''
    };
  }
  const activeCandidate = cleanText(env.AI_PROVIDER, 'gemini').toLowerCase();
  const activeProvider = PROVIDERS[activeCandidate] ? activeCandidate : 'gemini';
  return {
    activeProvider,
    fallback: boolValue(env.AI_FALLBACK, true),
    providers
  };
}

function publicStatus(config) {
  return {
    activeProvider: config.activeProvider,
    fallback: config.fallback,
    providers: Object.values(config.providers).map(p => ({
      id: p.id,
      label: p.label,
      configured: p.configured,
      model: p.model,
      requiresKey: p.requiresKey,
      baseUrl: p.id === 'ollama' ? p.baseUrl : undefined
    }))
  };
}

async function requestProvider(id, { providerConfig, prompt, agent, message, fetchImpl, timeoutMs }) {
  const p = providerConfig;
  if (!p?.configured) throw new AIError(`${PROVIDERS[id]?.label || id} no está configurado.`, { status: 503, code: 'NOT_CONFIGURED', provider: id, model: p?.model || '' });

  if (id === 'gemini') {
    try {
      const result = await generateGeminiReply({ apiKey: p.apiKey, model: p.model, agent, message, fetchImpl, timeoutMs });
      return { ...result, provider: 'gemini' };
    } catch (error) {
      if (error instanceof GeminiError) {
        throw new AIError(error.message, { status: error.status, code: error.code, provider: 'gemini', model: error.model || p.model, details: error.details });
      }
      throw error;
    }
  }
  if (id === 'openai') return requestOpenAI({ apiKey: p.apiKey, model: p.model, prompt, fetchImpl, timeoutMs });
  if (id === 'anthropic') return requestAnthropic({ apiKey: p.apiKey, model: p.model, prompt, fetchImpl, timeoutMs });
  if (id === 'deepseek' || id === 'groq') {
    return requestOpenAICompatible({ provider: id, apiKey: p.apiKey, model: p.model, prompt, baseUrl: p.baseUrl, fetchImpl, timeoutMs });
  }
  if (id === 'ollama') return requestOllama({ model: p.model, prompt, baseUrl: p.baseUrl, fetchImpl, timeoutMs });
  throw new AIError(`Proveedor no compatible: ${id}.`, { status: 400, code: 'UNKNOWN_PROVIDER', provider: id });
}

async function generateAgentReply(options = {}) {
  const config = options.config;
  if (!config?.providers) throw new AIError('La configuración de IA no está disponible.', { status: 500, code: 'CONFIG_ERROR' });
  if (!hasAITool(options.agent?.tools || [])) {
    throw new AIError('El agente no declaró una herramienta de IA. Usa herramientas: [ia]; o un proveedor como [gemini].', { status: 409, code: 'AI_NOT_DECLARED' });
  }

  const prompt = buildPrompt(options.agent, options.message);
  const toolProvider = providerFromTools(options.agent?.tools || []);
  const requested = cleanText(options.preferredProvider).toLowerCase();
  const preferred = PROVIDERS[requested] ? requested : (toolProvider || config.activeProvider);
  const allowFallback = options.allowFallback === undefined ? config.fallback : Boolean(options.allowFallback);

  const configuredIds = Object.keys(PROVIDERS).filter(id => config.providers[id]?.configured);
  if (!configuredIds.length) throw new AIError('No hay proveedores de IA configurados.', { status: 503, code: 'NOT_CONFIGURED' });

  const order = [preferred];
  if (allowFallback) {
    for (const id of configuredIds) if (!order.includes(id)) order.push(id);
  }

  const attempts = [];
  let lastError = null;
  for (const id of order) {
    const p = config.providers[id];
    if (!p?.configured) {
      attempts.push({ provider: id, code: 'NOT_CONFIGURED', message: `${PROVIDERS[id].label} no está configurado.` });
      continue;
    }
    try {
      const result = await requestProvider(id, {
        providerConfig: p,
        prompt,
        agent: options.agent,
        message: options.message,
        fetchImpl: options.fetchImpl,
        timeoutMs: Number(options.timeoutMs || 35000)
      });
      return { ...result, preferredProvider: preferred, fallbackUsed: id !== preferred, attempts };
    } catch (error) {
      lastError = error instanceof AIError ? error : new AIError(error.message || 'Error de proveedor', { provider: id });
      attempts.push({ provider: id, code: lastError.code, message: lastError.message });
    }
  }

  throw new AIError(lastError?.message || 'Ningún proveedor de IA respondió.', {
    status: lastError?.status || 502,
    code: 'ALL_PROVIDERS_FAILED',
    provider: lastError?.provider || preferred,
    model: lastError?.model || '',
    details: lastError?.details || '',
    attempts
  });
}

module.exports = {
  AIError,
  PROVIDERS,
  buildProviderConfig,
  generateAgentReply,
  hasAITool,
  providerFromTools,
  publicStatus
};
