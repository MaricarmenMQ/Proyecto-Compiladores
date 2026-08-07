'use strict';

const { buildPrompt, extractText, generateAgentReply } = require('../backend/gemini_client');

let failures = 0;
function check(condition, message) {
  if (condition) console.log('[OK]', message);
  else { console.error('[FALLO]', message); failures += 1; }
}

const agent = {
  name: 'Medico',
  objective: 'Apoyar el triaje y la orientacion clinica inicial',
  intelligence: 'experto',
  memory: 'persistente',
  tools: ['gemini', 'base_clinica'],
  permissions: ['leer', 'usar'],
  restrictions: ['requiere_aprobacion']
};

const prompt = buildPrompt(agent, 'tengo tos');
check(prompt.includes('Nombre del agente: Medico'), 'el prompt incluye el nombre del agente');
check(prompt.includes('orientación general'), 'el prompt médico incluye límites de seguridad');
check(prompt.includes('tengo tos'), 'el prompt incluye el mensaje del usuario');

const sample = {
  candidates: [{ content: { parts: [{ text: 'Respuesta ' }, { text: 'de prueba' }] } }]
};
check(extractText(sample) === 'Respuesta de prueba', 'se extrae texto de la respuesta Gemini');

const fakeFetch = async (url, options) => {
  check(url.includes(':generateContent'), 'se usa el endpoint generateContent');
  check(options.headers['x-goog-api-key'] === 'clave-de-prueba-1234567890', 'la clave viaja en el encabezado y no en el navegador');
  const body = JSON.parse(options.body);
  check(body.contents[0].parts[0].text.includes('Medico'), 'la solicitud contiene el contexto del agente');
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [{ content: { parts: [{ text: 'Orientación generada por Gemini.' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6 }
      };
    }
  };
};

(async () => {
  const result = await generateAgentReply({
    apiKey: 'clave-de-prueba-1234567890',
    model: 'gemini-modelo-prueba',
    agent,
    message: 'tengo tos',
    fetchImpl: fakeFetch,
    timeoutMs: 1000
  });
  check(result.text === 'Orientación generada por Gemini.', 'el cliente devuelve la respuesta generada');
  check(result.model === 'gemini-modelo-prueba', 'el cliente informa el modelo utilizado');

  if (failures) process.exit(1);
  console.log('\nPruebas Gemini finalizadas correctamente.');
})().catch(error => {
  console.error('[FALLO]', error);
  process.exit(1);
});
