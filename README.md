# SAM-Lang Studio v2 · IA multimodelo

SAM-Lang Studio es un proyecto académico de compiladores para definir, validar y ejecutar agentes inteligentes. La versión 2 conserva el compilador y el runtime originales y añade una **capa de proveedores de IA intercambiables**.

## Proveedores disponibles

- Google Gemini
- OpenAI
- Anthropic Claude
- DeepSeek
- Groq
- Ollama local

No se requieren SDK externos: el backend usa `fetch` nativo de Node.js 18+.

## Inicio rápido

### Windows

Ejecuta:

```text
ABRIR_WEB.bat
```

El backend se inicia en:

```text
http://127.0.0.1:3000
```

También puedes iniciar manualmente:

```bash
npm start
```

## Configurar una IA

1. Abre SAM-Lang Studio.
2. Pulsa **Configurar IA**.
3. Elige el proveedor.
4. Pega la clave API si corresponde.
5. Indica el modelo.
6. Guarda.

Ollama no necesita clave API, pero debe estar instalado y ejecutándose localmente.

Las credenciales se guardan en `config/.env`, archivo excluido por `.gitignore`.

## Sintaxis SAM-Lang para IA

### Recomendado: proveedor intercambiable

```sam
agente AsistenteMultiIA {
    objetivo: "Responder solicitudes generales";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [ia];
    permisos: [leer, usar, enviar];

    flujo consulta {
        recibir mensaje;
        responder "Solicitud recibida";
    }
}
```

Con `herramientas: [ia];`, el proveedor se elige desde la interfaz.

### Compatibilidad y proveedor explícito

También se reconocen:

```sam
herramientas: [gemini];
herramientas: [openai];
herramientas: [claude];
herramientas: [anthropic];
herramientas: [deepseek];
herramientas: [groq];
herramientas: [ollama];
```

Los agentes antiguos que usan `herramientas: [gemini];` siguen funcionando.

## Respaldo automático

Cuando `AI_FALLBACK=true`:

```text
Proveedor preferido
       ↓ falla
Otro proveedor configurado
       ↓ falla
Siguiente proveedor configurado
       ↓
Runtime local SAM-Lang
```

La traza de ejecución indica qué proveedor se intentó, cuál respondió y qué modelo se utilizó.

## Configuración local

Plantilla: `config/.env.example`.

Variables principales:

```env
AI_PROVIDER=gemini
AI_FALLBACK=true

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

OLLAMA_ENABLED=false
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3

PORT=3000
```

Los nombres de modelo pueden cambiar según el proveedor y el acceso de cada cuenta. La interfaz permite escribir otro identificador de modelo.

## Arquitectura de IA

```text
Agente SAM-Lang
      ↓
backend/server.js
      ↓
backend/ai/ai_manager.js
      ├── Gemini
      ├── OpenAI
      ├── Anthropic
      ├── DeepSeek
      ├── Groq
      └── Ollama
```

Archivos principales:

```text
backend/
├── server.js
├── gemini_client.js
└── ai/
    ├── ai_manager.js
    ├── common.js
    ├── openai_compatible_client.js
    ├── anthropic_client.js
    └── ollama_client.js
```

## API local

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/ai/status` | Estado de todos los proveedores sin revelar claves |
| POST | `/api/ai/configure` | Configura proveedor, modelo y credencial |
| POST | `/api/ai/select` | Cambia el proveedor preferido |
| POST | `/api/agent/message` | Ejecuta el agente mediante la capa multimodelo |
| GET | `/api/gemini/status` | Compatibilidad con la versión 1.1 |
| POST | `/api/gemini/configure` | Compatibilidad con la versión 1.1 |
| POST | `/ejecutar` | Ejecuta el compilador C++ si está compilado |

## Compilador

La ampliación de IA no reemplaza ni simplifica el compilador. Se conservan:

- lexer;
- parser descendente;
- AST;
- PDA tabular;
- análisis semántico;
- runtime;
- comunicación entre agentes;
- TAC;
- optimización;
- SAM-VM.

## Pruebas

Ejecuta:

```bash
npm test
```

La suite valida el compilador web, la integración Gemini y la nueva capa multimodelo con servicios simulados, sin consumir claves reales.

## Seguridad

- Las claves nunca se insertan en `web/app.js` ni en el código C++.
- El navegador envía la clave solo al backend local durante la configuración.
- El backend no devuelve las claves al navegador.
- `config/.env` está excluido por `.gitignore`.
- La copia distribuible del proyecto debe contener claves vacías.

Consulta también `GUIA_IA_MULTIMODELO.md`.
