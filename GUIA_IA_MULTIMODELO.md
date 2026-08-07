# Guía de IA multimodelo · SAM-Lang Studio v2

## 1. Objetivo

La versión 2 desacopla el agente SAM-Lang del proveedor generativo. Un programa puede declarar `herramientas: [ia];` y seleccionar el proveedor desde la interfaz, o declarar un proveedor concreto.

## 2. Proveedores

| Proveedor | Credencial | Valor inicial de modelo |
|---|---|---|
| Gemini | API key | `gemini-2.5-flash` |
| OpenAI | API key | `gpt-5-mini` |
| Anthropic | API key | `claude-sonnet-4-20250514` |
| DeepSeek | API key | `deepseek-v4-flash` |
| Groq | API key | `llama-3.3-70b-versatile` |
| Ollama | No requiere API key | `gemma3` |

Los modelos son editables. Si un modelo no está habilitado para tu cuenta, escribe otro modelo disponible para ese proveedor.

## 3. Configuración desde la interfaz

1. Ejecuta `ABRIR_WEB.bat`.
2. Pulsa **Configurar IA**.
3. Selecciona un proveedor.
4. Introduce credencial y modelo.
5. Activa o desactiva el respaldo entre IAs.
6. Guarda.

Para Ollama, configura la URL local, normalmente `http://127.0.0.1:11434`.

## 4. Selección en tiempo de ejecución

En el panel **Probar agente creado** aparece un selector de proveedor.

- **Proveedor automático**: respeta el proveedor indicado por la herramienta del agente; si el agente usa `[ia]`, utiliza el proveedor preferido de la configuración.
- Un proveedor concreto: fuerza ese proveedor como primera opción para el mensaje actual.

## 5. Fallback

Con fallback activo, el backend intenta primero el proveedor preferido y después los demás proveedores configurados. La respuesta devuelve una traza de intentos. Si todos fallan, la interfaz conserva el resultado del runtime determinista local.

## 6. Compatibilidad

La versión 1.1 utilizaba:

```sam
herramientas: [gemini];
```

Esa sintaxis sigue siendo válida. Para nuevos agentes se recomienda:

```sam
herramientas: [ia];
```

## 7. Archivos técnicos

- `backend/ai/ai_manager.js`: selección, aliases y fallback.
- `backend/ai/openai_compatible_client.js`: OpenAI, DeepSeek y Groq.
- `backend/ai/anthropic_client.js`: Anthropic Messages API.
- `backend/ai/ollama_client.js`: Ollama local.
- `backend/gemini_client.js`: integración Gemini conservada.
- `backend/server.js`: API local y configuración segura.
- `web/app.js`: selector de proveedor, estado, configuración y traza.

## 8. Seguridad

No publiques `config/.env`. La distribución del proyecto debe utilizar `config/.env.example` o un `.env` sin claves.
