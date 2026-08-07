'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const {
  AIError,
  PROVIDERS,
  buildProviderConfig,
  generateAgentReply,
  hasAITool,
  publicStatus
} = require('./ai/ai_manager');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'web');
const tmpDir = path.join(root, 'tmp');
const configFile = path.join(root, 'config', '.env');
const host = String(process.env.HOST || '127.0.0.1').trim();
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(path.dirname(configFile), { recursive: true });

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const result = {};
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

function currentEnv() {
  return { ...parseEnvFile(path.join(root, '.env')), ...parseEnvFile(configFile), ...process.env };
}

function getConfig() {
  return buildProviderConfig(currentEnv());
}

function webConfigEnabled() {
  return !/^(0|false|no|off)$/i.test(String(process.env.ALLOW_WEB_CONFIG || 'true').trim());
}

const port = Number(process.env.PORT || parseEnvFile(configFile).PORT || 3000);

function findCompiler() {
  const candidates = [
    path.join(root, 'build', 'sam_compilador'),
    path.join(root, 'build', 'sam_compilador.exe'),
    path.join(root, 'build', 'Release', 'sam_compilador.exe'),
    path.join(root, 'build', 'Debug', 'sam_compilador.exe'),
    path.join(root, 'sam_compilador'),
    path.join(root, 'sam_compilador.exe')
  ];
  return candidates.find(fs.existsSync);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  })[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const requested = path.resolve(webRoot, '.' + urlPath);
  if (!requested.startsWith(webRoot + path.sep) && requested !== path.join(webRoot, 'index.html')) {
    res.writeHead(403); res.end('Acceso denegado'); return;
  }
  fs.readFile(requested, (error, data) => {
    if (error) { res.writeHead(404); res.end('Archivo no encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': contentType(requested),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  });
}

function readJson(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > limit) {
        reject(Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (_) { reject(Object.assign(new Error('JSON no válido.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function sanitizeKey(value) {
  const key = String(value || '').trim();
  if (!key) return '';
  if (key.length < 8 || key.length > 500 || /[\r\n\s]/.test(key)) {
    throw Object.assign(new Error('La clave no tiene un formato válido.'), { status: 400 });
  }
  return key;
}

function sanitizeModel(value, fallback = '') {
  const model = String(value || fallback).trim();
  if (!/^[A-Za-z0-9._:\/-]{2,160}$/.test(model)) {
    throw Object.assign(new Error('El nombre del modelo no es válido.'), { status: 400 });
  }
  return model;
}

function sanitizeProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  if (!PROVIDERS[provider]) throw Object.assign(new Error('Proveedor de IA no válido.'), { status: 400 });
  return provider;
}

function sanitizeUrl(value) {
  const text = String(value || '').trim();
  let url;
  try { url = new URL(text); } catch (_) { throw Object.assign(new Error('La URL local no es válida.'), { status: 400 }); }
  if (!['http:', 'https:'].includes(url.protocol)) throw Object.assign(new Error('La URL debe usar http o https.'), { status: 400 });
  return url.toString().replace(/\/$/, '');
}

function serializeEnv(env) {
  const keys = [
    'AI_PROVIDER', 'AI_FALLBACK',
    'GEMINI_API_KEY', 'GEMINI_MODEL',
    'OPENAI_API_KEY', 'OPENAI_MODEL',
    'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL',
    'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL',
    'GROQ_API_KEY', 'GROQ_MODEL',
    'OLLAMA_ENABLED', 'OLLAMA_URL', 'OLLAMA_MODEL',
    'PORT'
  ];
  const lines = [
    '# Configuración local de SAM-Lang Studio. NO compartas este archivo.',
    '# Las claves se usan únicamente desde el backend local.',
    ''
  ];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(env, key)) lines.push(`${key}=${String(env[key] ?? '')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function writeConfig(updates) {
  const env = { ...parseEnvFile(configFile), ...updates, PORT: String(port) };
  const temporary = configFile + '.tmp';
  fs.writeFileSync(temporary, serializeEnv(env), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, configFile);
  return env;
}

async function handleAIStatus(res) {
  const config = getConfig();
  sendJson(res, 200, { ok: true, backend: true, webConfigEnabled: webConfigEnabled(), ...publicStatus(config) });
}

async function handleAIConfigure(req, res) {
  if (!webConfigEnabled()) return sendJson(res, 403, { ok: false, code: 'WEB_CONFIG_DISABLED', error: 'La configuración web está deshabilitada en este despliegue. Usa variables de entorno del servidor.' });
  const payload = await readJson(req, 30_000);
  const provider = sanitizeProvider(payload.provider);
  const def = PROVIDERS[provider];
  const existing = parseEnvFile(configFile);
  const model = sanitizeModel(payload.model, def.defaultModel);
  const updates = {
    AI_PROVIDER: payload.makeActive === false ? (existing.AI_PROVIDER || provider) : provider,
    AI_FALLBACK: payload.fallback === false ? 'false' : 'true',
    [def.modelEnv]: model
  };

  if (def.requiresKey) {
    const apiKey = sanitizeKey(payload.apiKey);
    const previous = String(existing[def.keyEnv] || '').trim();
    if (!apiKey && !previous) throw Object.assign(new Error(`Pega una clave API para ${def.label}.`), { status: 400 });
    if (apiKey) updates[def.keyEnv] = apiKey;
  } else if (provider === 'ollama') {
    updates.OLLAMA_ENABLED = 'true';
    updates.OLLAMA_URL = sanitizeUrl(payload.baseUrl || existing.OLLAMA_URL || def.defaultUrl);
  }

  writeConfig(updates);
  const config = getConfig();
  sendJson(res, 200, {
    ok: true,
    provider,
    model,
    activeProvider: config.activeProvider,
    message: `${def.label} quedó configurado en este equipo.`,
    ...publicStatus(config)
  });
}

async function handleAISelect(req, res) {
  if (!webConfigEnabled()) return sendJson(res, 403, { ok: false, code: 'WEB_CONFIG_DISABLED', error: 'La configuración web está deshabilitada en este despliegue. Usa variables de entorno del servidor.' });
  const payload = await readJson(req, 10_000);
  const provider = sanitizeProvider(payload.provider);
  writeConfig({ AI_PROVIDER: provider, AI_FALLBACK: payload.fallback === false ? 'false' : 'true' });
  const config = getConfig();
  sendJson(res, 200, { ok: true, message: `${PROVIDERS[provider].label} quedó como proveedor preferido.`, ...publicStatus(config) });
}

// Rutas de compatibilidad con la versión Gemini 1.1.
async function handleGeminiStatus(res) {
  const config = getConfig();
  const gemini = config.providers.gemini;
  sendJson(res, 200, { ok: true, backend: true, configured: gemini.configured, model: gemini.model });
}

async function handleGeminiConfigure(req, res) {
  if (!webConfigEnabled()) return sendJson(res, 403, { ok: false, code: 'WEB_CONFIG_DISABLED', error: 'La configuración web está deshabilitada en este despliegue. Usa variables de entorno del servidor.' });
  const payload = await readJson(req, 20_000);
  const apiKey = sanitizeKey(payload.apiKey);
  const model = sanitizeModel(payload.model, PROVIDERS.gemini.defaultModel);
  if (!apiKey) throw Object.assign(new Error('Pega una clave API válida.'), { status: 400 });
  writeConfig({ GEMINI_API_KEY: apiKey, GEMINI_MODEL: model, AI_PROVIDER: 'gemini', AI_FALLBACK: 'true' });
  sendJson(res, 200, { ok: true, configured: true, model, message: 'Gemini quedó configurado en este equipo.' });
}

async function handleAgentMessage(req, res) {
  const payload = await readJson(req, 250_000);
  const config = getConfig();
  const agent = payload.agent || {};
  const message = String(payload.message || '').trim();

  if (!message) return sendJson(res, 400, { ok: false, code: 'EMPTY_MESSAGE', error: 'Escribe un mensaje para el agente.' });
  if (!hasAITool(agent.tools || [])) {
    return sendJson(res, 409, {
      ok: false,
      code: 'AI_NOT_DECLARED',
      error: `El agente ${agent.name || ''} no declaró una herramienta de IA. Agrega herramientas: [ia]; o [gemini], [openai], [claude], [deepseek], [groq] u [ollama].`
    });
  }

  try {
    const result = await generateAgentReply({
      config,
      agent,
      message,
      preferredProvider: payload.provider,
      allowFallback: payload.allowFallback,
      timeoutMs: 35_000
    });
    sendJson(res, 200, {
      ok: true,
      provider: result.provider,
      providerLabel: PROVIDERS[result.provider]?.label || result.provider,
      model: result.model,
      reply: result.text,
      usage: result.usage,
      fallbackUsed: Boolean(result.fallbackUsed),
      preferredProvider: result.preferredProvider,
      attempts: result.attempts || []
    });
  } catch (error) {
    const aiError = error instanceof AIError ? error : new AIError(error.message || 'Error de IA');
    sendJson(res, aiError.status || 500, {
      ok: false,
      code: aiError.code,
      error: aiError.message,
      details: aiError.details || undefined,
      provider: aiError.provider || undefined,
      model: aiError.model || undefined,
      attempts: aiError.attempts || []
    });
  }
}

async function handleCompiler(req, res) {
  const payload = await readJson(req, 2_000_000);
  const source = String(payload.codigo || '');
  const compiler = findCompiler();
  if (!compiler) {
    return sendJson(res, 500, { resultado: 'No se encontró sam_compilador. Compila con: cmake -S . -B build && cmake --build build' });
  }

  const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const file = path.join(tmpDir, `programa_${stamp}.sam`);
  const output = path.join(tmpDir, `programa_${stamp}.samvm`);
  fs.writeFileSync(file, source, 'utf8');

  execFile(compiler, [file, '--resumen', '--salida', output], { cwd: root, timeout: 10000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    const finalOutput = `${stdout || ''}${stderr ? '\n[STDERR]\n' + stderr : ''}`.trim();
    fs.rm(file, { force: true }, () => {});
    fs.rm(output, { force: true }, () => {});
    sendJson(res, err ? 400 : 200, { resultado: finalOutput || 'Ejecución sin salida.' });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${host}:${port}`).pathname;

    if (req.method === 'GET' && pathname === '/api/ai/status') return await handleAIStatus(res);
    if (req.method === 'POST' && pathname === '/api/ai/configure') return await handleAIConfigure(req, res);
    if (req.method === 'POST' && pathname === '/api/ai/select') return await handleAISelect(req, res);
    if (req.method === 'GET' && pathname === '/api/gemini/status') return await handleGeminiStatus(res);
    if (req.method === 'POST' && pathname === '/api/gemini/configure') return await handleGeminiConfigure(req, res);
    if (req.method === 'POST' && pathname === '/api/agent/message') return await handleAgentMessage(req, res);
    if (req.method === 'POST' && pathname === '/ejecutar') return await handleCompiler(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    return sendJson(res, 404, { ok: false, error: 'Ruta no encontrada.' });
  } catch (error) {
    sendJson(res, error.status || 500, { ok: false, error: error.message || 'Error interno del backend.' });
  }
});

server.on('error', error => {
  console.error(`No se pudo iniciar el servidor en ${host}:${port}: ${error.message}`);
  process.exitCode = 1;
});

if (require.main === module) {
  server.listen(port, host, () => {
    const config = getConfig();
    const configured = Object.values(config.providers).filter(p => p.configured).map(p => p.label);
    console.log(`SAM-Lang Studio: http://${host}:${port}`);
    console.log(`IA preferida: ${PROVIDERS[config.activeProvider].label}`);
    console.log(`Proveedores configurados: ${configured.length ? configured.join(', ') : 'ninguno'}`);
    console.log(`Respaldo entre IAs: ${config.fallback ? 'activado' : 'desactivado'}`);
    if (!configured.length) console.log('Abre la web y usa el botón “Configurar IA”.');
  });
}

module.exports = { server, getConfig, parseEnvFile, writeConfig };
