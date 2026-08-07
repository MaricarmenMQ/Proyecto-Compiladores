'use strict';

const examples = {
  multimodelo: `agente AsistenteMultiIA {
    objetivo: "Responder solicitudes generales usando el proveedor de IA seleccionado";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [ia];
    permisos: [leer, usar, enviar];

    flujo consulta {
        recibir mensaje;
        responder "Solicitud recibida por SAM-Lang";
    }
}`,
  medico: `agente Medico {
    objetivo: "Apoyar el triaje y la orientacion clinica inicial";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [gemini, base_clinica, guia_protocolos];
    permisos: [leer, usar, enviar];
    restricciones: [requiere_aprobacion];

    flujo consulta {
        recibir paciente;
        responder "Registrar signos y sintomas";
    }
}`,
  comunicacion: `agente Analista {
    objetivo: "Analizar datos recibidos";
    inteligencia: razonador;
    memoria: compartida;
    permisos: [leer, usar];

    flujo analisis {
        recibir datos;
        responder "datos procesados";
    }
}

agente Medico {
    objetivo: "Tomar decisiones preliminares con apoyo del analista";
    inteligencia: experto;
    memoria: persistente;
    depende_de: [Analista];
    delega: evaluar -> Analista;

    flujo diagnostico {
        recibir paciente;
        evaluar -> responder "recomendacion generada";
    }
}

runtime HospitalRuntime {
    coordinador: Medico;
    depende_de: [Analista];
    memoria_compartida: true;
    periodicidad: tiempo_real;
    adaptabilidad: supervisada;
    politica_validacion: requiere_aprobacion;
}`,
  asistente: `agente AsistenteGeneral {
    objetivo: "Responder solicitudes generales del usuario";
    inteligencia: basica;
    memoria: solo_lectura;
    herramientas: [busqueda_local];
    permisos: [leer];

    flujo saludo {
        recibir mensaje;
        si mensaje == "hola" {
            responder "Hola, soy un agente SAM-Lang";
        } sino {
            responder "Solicitud recibida";
        }
    }
}`,
  error: `agente Medico {
    objetivo: "Ejemplo con error";
    depende_de: [AgenteInexistente];
}`,
  agricultura: `agente MonitorCultivo {
    objetivo: "Supervisar humedad y temperatura de los cultivos mediante sensores";
    inteligencia: basica;
    memoria: compartida;
    herramientas: [sensores_iot];
    permisos: [leer, usar];
    conectar: red_sensores;

    flujo revisar_humedad {
        recibir humedad;
        si humedad < 30 {
            responder "Se activa el sistema de riego";
        } sino {
            responder "Nivel de humedad adecuado";
        }
    }
}

runtime AgroRuntime {
    coordinador: MonitorCultivo;
    memoria_compartida: true;
    periodicidad: 15;
    adaptabilidad: autonoma;
    politica_validacion: requiere_aprobacion;
}`,
  asesor_legal: `agente AsesorLegal {
    objetivo: "Orientar consultas legales basicas de los usuarios";
    inteligencia: experto;
    memoria: compartida;
    herramientas: [base_normativa, buscador_jurisprudencia];
    permisos: [leer, usar];
    restricciones: [requiere_aprobacion, confidencialidad];

    flujo evaluar_caso {
        recibir prioridad;
        si prioridad >= 8 {
            responder "Caso urgente, se deriva a un abogado humano";
        } sino {
            responder "Caso registrado para revision estandar";
        }
    }
}`,
  atencion_cliente: `agente SoporteCliente {
    objetivo: "Atender consultas de clientes por canal de chat";
    inteligencia: basica;
    memoria: solo_lectura;
    herramientas: [chat_en_vivo];
    permisos: [leer, enviar];
    conectar: canal_chat;
    escuchar: eventos_cliente;

    flujo bienvenida {
        recibir mensaje;
        si mensaje == "ayuda" {
            responder "Cuentame en que puedo ayudarte";
        } sino {
            difundir mensaje;
            responder "Gracias por escribirnos";
        }
    }
}`,
  comercio: `agente RecomendadorTienda {
    objetivo: "Sugerir productos personalizados en la tienda en linea";
    inteligencia: razonador;
    memoria: persistente;
    herramientas: [ia, catalogo_productos];
    permisos: [leer, usar, enviar];

    flujo_dinamico sugerir_producto {
        recibir historial;
        si historial == "vacio" {
            responder "Se muestran los productos mas populares";
        } sino {
            responder "Se generan recomendaciones personalizadas";
        }
    }

    flujo confirmar_compra {
        recibir monto;
        si monto > 100 {
            responder "Se aplica envio gratuito";
        } sino {
            responder "Se calcula el costo de envio estandar";
        }
    }
}`,
  finanzas: `agente ValidadorRiesgo {
    objetivo: "Calcular el nivel de riesgo de una solicitud financiera";
    inteligencia: razonador;
    memoria: compartida;
    permisos: [leer, usar];

    flujo calcular {
        recibir monto;
        responder "riesgo calculado";
    }
}

agente AsesorFinanciero {
    objetivo: "Recomendar productos financieros segun el perfil del cliente";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [ia, base_productos];
    permisos: [leer, usar, enviar];
    depende_de: [ValidadorRiesgo];
    delega: verificar -> ValidadorRiesgo;

    flujo recomendar {
        recibir cliente;
        verificar -> responder "recomendacion financiera generada";
    }
}

runtime BancaRuntime {
    coordinador: AsesorFinanciero;
    depende_de: [ValidadorRiesgo];
    memoria_compartida: true;
    periodicidad: tiempo_real;
    adaptabilidad: supervisada;
    politica_validacion: requiere_aprobacion;
}`,
  investigacion: `agente RecolectorDatos {
    objetivo: "Recolectar y organizar fuentes academicas relevantes";
    inteligencia: basica;
    memoria: compartida;
    herramientas: [buscador_academico];
    permisos: [leer, usar];

    flujo recolectar {
        recibir tema;
        responder "fuentes recolectadas";
    }
}

agente AnalistaInvestigacion {
    objetivo: "Sintetizar hallazgos y proponer conclusiones preliminares";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [ia];
    permisos: [leer, usar, enviar];
    depende_de: [RecolectorDatos];
    delega: recolectar_fuentes -> RecolectorDatos;

    flujo sintetizar {
        recibir tema;
        recolectar_fuentes -> responder "sintesis generada";
    }
}

runtime LaboratorioRuntime {
    coordinador: AnalistaInvestigacion;
    depende_de: [RecolectorDatos];
    memoria_compartida: false;
    periodicidad: 60;
    adaptabilidad: supervisada;
    politica_validacion: requiere_aprobacion;
}`,
  logistica: `agente RepartidorVirtual {
    objetivo: "Actualizar el estado de los pedidos en ruta";
    inteligencia: basica;
    memoria: compartida;
    permisos: [leer, usar];

    flujo actualizar_estado {
        recibir pedido;
        responder "estado de pedido actualizado";
    }
}

agente Almacenista {
    objetivo: "Gestionar el inventario y preparar los pedidos";
    inteligencia: razonador;
    memoria: persistente;
    permisos: [leer, usar];

    flujo preparar_pedido {
        recibir pedido;
        responder "pedido preparado";
    }
}

agente SupervisorLogistico {
    objetivo: "Coordinar y supervisar la cadena de despacho";
    inteligencia: experto;
    memoria: persistente;
    depende_de: [Almacenista, RepartidorVirtual];
    coordina: [Almacenista];
    supervisa: [RepartidorVirtual];

    flujo verificar_cadena {
        recibir pedido;
        si pedido == "retrasado" {
            responder "Se notifica retraso al cliente";
        } sino {
            responder "Cadena logistica dentro de lo esperado";
        }
    }
}

runtime LogisticaRuntime {
    coordinador: SupervisorLogistico;
    depende_de: [Almacenista, RepartidorVirtual];
    memoria_compartida: true;
    periodicidad: 30;
    adaptabilidad: autonoma;
    politica_validacion: requiere_aprobacion;
}`,
  marketing: `agente GestorCampanas {
    objetivo: "Planificar y difundir campanas de marketing digital";
    inteligencia: razonador;
    memoria: compartida;
    herramientas: [ia, redes_sociales];
    permisos: [leer, usar, enviar];
    restricciones: [requiere_aprobacion, presupuesto_limitado];

    flujo lanzar_campana {
        recibir audiencia;
        difundir audiencia -> responder "Campana difundida correctamente";
    }

    flujo evaluar_resultado {
        recibir conversion;
        si conversion >= 5 {
            responder "Campana exitosa, se recomienda escalar presupuesto";
        } sino {
            responder "Se ajustan segmentos de audiencia";
        }
    }
}`,
  recursos_humanos: `agente ReclutadorIA {
    objetivo: "Filtrar candidatos segun los requisitos del puesto";
    inteligencia: razonador;
    memoria: persistente;
    herramientas: [ia, base_curriculums];
    permisos: [leer, usar, escritura];
    restricciones: [requiere_aprobacion];

    flujo filtrar_candidato {
        recibir experiencia;
        si experiencia >= 3 {
            responder "Candidato preseleccionado para entrevista";
        } sino {
            responder "Candidato queda en banco de talento";
        }
    }

    flujo agendar_entrevista {
        recibir disponibilidad;
        responder "Entrevista agendada";
    }
}`,
  robotica: `agente RobotTransportador {
    objetivo: "Trasladar piezas entre estaciones de la planta";
    inteligencia: basica;
    memoria: solo_lectura;
    permisos: [leer, usar];

    flujo trasladar {
        recibir estacion;
        responder "pieza trasladada";
    }
}

agente RobotEnsamblador {
    objetivo: "Ensamblar componentes segun la orden de produccion";
    inteligencia: razonador;
    memoria: compartida;
    permisos: [leer, usar];

    flujo ensamblar {
        recibir orden;
        responder "componente ensamblado";
    }
}

agente ControladorPlanta {
    objetivo: "Coordinar y supervisar la operacion de la flota de robots";
    inteligencia: experto;
    memoria: persistente;
    depende_de: [RobotTransportador, RobotEnsamblador];
    coordina: [RobotTransportador];
    supervisa: [RobotEnsamblador];
    restricciones: requiere_aprobacion;

    flujo monitorear_planta {
        recibir alerta;
        si alerta == "falla" {
            responder "Se detiene la linea de produccion";
        } sino {
            responder "Produccion operando con normalidad";
        }
    }
}

runtime PlantaRuntime {
    coordinador: ControladorPlanta;
    depende_de: [RobotTransportador, RobotEnsamblador];
    memoria_compartida: true;
    periodicidad: tiempo_real;
    adaptabilidad: supervisada;
    politica_validacion: requiere_aprobacion;
}`,
  seguridad: `agente MonitorSeguridad {
    objetivo: "Vigilar el trafico de red en busca de actividad sospechosa";
    inteligencia: experto;
    memoria: persistente;
    herramientas: [firewall, analizador_trafico];
    permisos: [leer, usar, enviar];
    restricciones: [requiere_aprobacion];

    flujo_dinamico analizar_evento {
        recibir alerta;
        si alerta == true {
            responder "Se activa protocolo de contencion";
        } sino {
            responder "Evento registrado sin acciones adicionales";
        }
    }

    flujo revisar_acceso {
        recibir autorizado;
        si autorizado == false {
            responder "Acceso denegado y reportado";
        } sino {
            responder "Acceso permitido";
        }
    }
}`,
  soporte_ti: `agente MesaAyudaTI {
    objetivo: "Clasificar y resolver incidencias tecnicas reportadas";
    inteligencia: basica;
    memoria: solo_lectura;
    herramientas: [base_conocimiento];
    permisos: [leer, usar];

    flujo clasificar_ticket {
        recibir severidad;
        si severidad == "critica" {
            responder "Se escala a soporte de nivel 2";
        } sino si severidad != "baja" {
            responder "Se atiende en cola prioritaria";
        } sino {
            responder "Se atiende en cola estandar";
        }
    }
}`,
  tutor_educativo: `agente TutorMatematicas {
    objetivo: "Ayudar a estudiantes a resolver ejercicios de matematica basica";
    inteligencia: razonador;
    memoria: persistente;
    herramientas: [calculadora, banco_ejercicios];
    permisos: [leer, usar, enviar];
    restricciones: [requiere_aprobacion];

    flujo_dinamico revisar_respuesta {
        recibir respuesta;
        si respuesta == "correcta" {
            responder "Muy bien, avancemos al siguiente ejercicio";
        } sino si respuesta == "vacia" {
            responder "No recibi una respuesta, intenta de nuevo";
        } sino {
            responder "Revisemos juntos el procedimiento";
        }
    }
}`
};

const PROVIDER_LABELS = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  ollama: 'Ollama local'
};

const DEFAULT_MODELS = {
  gemini: 'gemini-3.6-flash',
  openai: 'gpt-5-mini',
  anthropic: 'claude-sonnet-4-20250514',
  deepseek: 'deepseek-v4-flash',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'gemma3'
};

const AI_TOOL_MAP = {
  gemini: 'gemini', google: 'gemini',
  openai: 'openai', gpt: 'openai',
  anthropic: 'anthropic', claude: 'anthropic',
  deepseek: 'deepseek', groq: 'groq', ollama: 'ollama', local_llm: 'ollama'
};
const GENERIC_AI_TOOLS = new Set(['ia', 'ai']);

const $ = id => document.getElementById(id);
const codigo = $('codigo');
const resultado = $('resultado');
const detalle = $('detalle');
const estado = $('estado');
const contador = $('contador');
const agenteSelect = $('agenteSelect');
const providerRuntime = $('providerRuntime');
const btnMensaje = $('btnMensaje');
const configDialog = $('configAIDialog');
let lastCompilation = null;
let activeTab = 'tokens';
let aiStatus = { backend: false, webConfigEnabled: true, activeProvider: 'gemini', fallback: true, providers: [] };

function updateCounter() {
  const lines = codigo.value ? codigo.value.split(/\r?\n/).length : 0;
  contador.textContent = `${lines} ${lines === 1 ? 'línea' : 'líneas'}`;
}

function setStatus(text, kind) {
  estado.textContent = text;
  estado.className = `badge ${kind}`;
}

function providerInfo(id) {
  return aiStatus.providers?.find(item => item.id === id) || null;
}

function configuredProviders() {
  return (aiStatus.providers || []).filter(item => item.configured);
}

function renderProviderSummary() {
  const box = $('providerSummary');
  if (!box) return;
  if (!aiStatus.backend) {
    box.innerHTML = '<span class="provider-chip offline-chip">Backend no disponible</span>';
    return;
  }
  box.innerHTML = (aiStatus.providers || []).map(p =>
    `<span class="provider-chip ${p.configured ? 'configured-chip' : ''}">${p.label}: ${p.configured ? 'configurado' : 'pendiente'}</span>`
  ).join('');
}

function populateRuntimeProviders() {
  const previous = providerRuntime.value || 'auto';
  providerRuntime.innerHTML = '<option value="auto">Proveedor automático</option>';
  for (const p of aiStatus.providers || []) {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.label}${p.configured ? '' : ' · sin configurar'}`;
    providerRuntime.appendChild(option);
  }
  providerRuntime.value = [...providerRuntime.options].some(o => o.value === previous) ? previous : 'auto';
}

function setAIStatus(status) {
  aiStatus = { backend: false, webConfigEnabled: true, activeProvider: 'gemini', fallback: true, providers: [], ...status };
  const card = $('aiStatusCard');
  const title = $('aiStatusText');
  const detailText = $('aiStatusDetail');
  card.classList.remove('online', 'warning', 'offline');

  if (!aiStatus.backend) {
    card.classList.add('offline');
    title.textContent = 'IA sin backend';
    detailText.textContent = 'Abre con ABRIR_WEB.bat';
  } else if (!configuredProviders().length) {
    card.classList.add('warning');
    title.textContent = 'IA sin configurar';
    detailText.textContent = 'Agrega al menos un proveedor';
  } else {
    card.classList.add('online');
    const active = providerInfo(aiStatus.activeProvider);
    title.textContent = 'IA multimodelo lista';
    detailText.textContent = `${active?.label || aiStatus.activeProvider} · ${configuredProviders().length} proveedor(es)`;
  }
  populateRuntimeProviders();
  renderProviderSummary();
}

async function checkAIStatus() {
  if (location.protocol === 'file:') {
    setAIStatus({ backend: false });
    return;
  }
  try {
    const response = await fetch('/api/ai/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Backend no disponible');
    setAIStatus(await response.json());
  } catch (_) {
    setAIStatus({ backend: false });
  }
}

function tokenText(tokens) {
  const header = ['LINEA'.padEnd(8), 'COLUMNA'.padEnd(10), 'TOKEN'.padEnd(24), 'LEXEMA'].join('');
  const rows = tokens.filter(t => t.type !== 'EOF').map(t =>
    String(t.line).padEnd(8) + String(t.column).padEnd(10) + t.type.padEnd(24) + t.lexeme
  );
  return [header, '-'.repeat(72), ...rows].join('\n');
}

function astText(ast) {
  return JSON.stringify(ast, (key, value) => key === 'fields' ? undefined : value, 2);
}

function tacText(code) {
  return ['========== CODIGO INTERMEDIO TAC ==========', ...code.map(SAMLang.tacLine)].join('\n');
}

function renderDetail() {
  if (!lastCompilation) { detalle.textContent = 'Los resultados detallados aparecerán aquí.'; return; }
  if (activeTab === 'tokens') detalle.textContent = lastCompilation.tokens ? tokenText(lastCompilation.tokens) : 'No se generaron tokens.';
  if (activeTab === 'ast') detalle.textContent = lastCompilation.ast ? astText(lastCompilation.ast) : 'No se construyó AST.';
  if (activeTab === 'runtime') detalle.textContent = lastCompilation.runtime?.text || 'El runtime no se ejecutó.';
  if (activeTab === 'tac') detalle.textContent = lastCompilation.optimized ? tacText(lastCompilation.optimized) : 'No se generó TAC.';
  if (activeTab === 'vm') detalle.textContent = lastCompilation.vm || 'No se generó SAM-VM.';
}

function formatErrors(compilation) {
  const stage = (compilation.stage || 'compilacion').toUpperCase();
  const lines = [`[ERROR ${stage}]`];
  for (const e of compilation.errors || []) {
    const pos = e.line ? `Linea ${e.line}, columna ${e.column}: ` : '';
    lines.push(`${pos}${e.message}`);
  }
  return lines.join('\n');
}

function agentSpecificProvider(agent) {
  for (const raw of agent?.tools || []) {
    const key = String(raw || '').toLowerCase();
    if (AI_TOOL_MAP[key]) return AI_TOOL_MAP[key];
  }
  return null;
}

function agentUsesAI(agent) {
  return Boolean(agent?.tools?.some(raw => {
    const key = String(raw || '').toLowerCase();
    return GENERIC_AI_TOOLS.has(key) || Boolean(AI_TOOL_MAP[key]);
  }));
}

function runtimePreferredProvider(agent) {
  if (providerRuntime.value && providerRuntime.value !== 'auto') return providerRuntime.value;
  return agentSpecificProvider(agent) || aiStatus.activeProvider || 'gemini';
}

function populateAgents(compilation) {
  agenteSelect.innerHTML = '';
  const agents = compilation.ok ? compilation.ast.agents : [];
  for (const agent of agents) {
    const option = document.createElement('option');
    option.value = agent.name;
    const provider = agentSpecificProvider(agent);
    option.textContent = agentUsesAI(agent)
      ? `${agent.name} · ${provider ? PROVIDER_LABELS[provider] : 'IA multimodelo'}`
      : agent.name;
    agenteSelect.appendChild(option);
  }
  const enabled = agents.length > 0;
  agenteSelect.disabled = !enabled;
  btnMensaje.disabled = !enabled;
  if (!enabled) agenteSelect.innerHTML = '<option>No hay agentes</option>';
  updateAgentModeBadge();
}

function selectedAgent() {
  return lastCompilation?.ast?.agents?.find(agent => agent.name === agenteSelect.value) || lastCompilation?.ast?.agents?.[0] || null;
}

function updateAgentModeBadge() {
  const badge = $('agentMode');
  const agent = selectedAgent();
  if (!agent) {
    badge.textContent = 'Sin agente';
    badge.className = 'badge neutral';
    providerRuntime.disabled = true;
    return;
  }
  if (agentUsesAI(agent)) {
    const preferred = runtimePreferredProvider(agent);
    const configured = providerInfo(preferred)?.configured;
    badge.textContent = `IA · ${PROVIDER_LABELS[preferred] || preferred}`;
    badge.className = `badge ${configured ? 'success' : 'working'}`;
    providerRuntime.disabled = false;
  } else {
    badge.textContent = 'Runtime local';
    badge.className = 'badge neutral';
    providerRuntime.disabled = true;
  }
}

function compileAndRun() {
  setStatus('Compilando', 'working');
  resultado.textContent = 'Ejecutando cadena de compilación...';
  const compilation = SAMLang.compile(codigo.value, { message: $('mensaje').value });
  lastCompilation = compilation;
  populateAgents(compilation);

  if (!compilation.ok) {
    setStatus('Rechazado', 'error');
    resultado.textContent = formatErrors(compilation);
    $('respuestaAgente').textContent = 'El agente no se activó porque el programa contiene errores.';
    $('trazaAgente').textContent = 'Sin traza.';
    renderDetail();
    return;
  }

  const lines = [
    '[1] ANALISIS LEXICO: OK',
    `[2] TOKENS GENERADOS: ${compilation.tokens.length - 1}`,
    '[3] ANALISIS SINTACTICO Y AST: OK',
    '[4] ANALISIS SEMANTICO: OK',
    `[5] AGENTES ACTIVOS: ${compilation.ast.agents.length}`,
    `[6] RUNTIMES REGISTRADOS: ${compilation.ast.runtimes.length}`,
    `[7] TAC: ${compilation.tac.length} instrucciones`,
    `[8] TAC OPTIMIZADO: ${compilation.optimized.length} instrucciones`,
    '[9] CODIGO FINAL SAM-VM: GENERADO',
    '',
    'Resultado final: compilacion y ejecucion completadas correctamente.'
  ];
  resultado.textContent = lines.join('\n');
  setStatus('Correcto', 'success');
  const agent = selectedAgent();
  $('respuestaAgente').textContent = agentUsesAI(agent)
    ? `${agent.name} está activo. Selecciona un proveedor o deja “automático” y envía un mensaje.`
    : `${agent.name} está activo en modo local. Escribe un mensaje para ejecutar sus flujos.`;
  $('trazaAgente').textContent = `Agente activado: ${agent.name}\nHerramientas: ${agent.tools.length ? agent.tools.join(', ') : 'ninguna'}`;
  renderDetail();
}

function localExecution(agent, message) {
  const execution = SAMLang.runAgent(lastCompilation.ast, agent.name, message);
  return { reply: execution.reply, trace: execution.trace, agent: execution.agent };
}

async function callAI(agent, message) {
  const preferredProvider = runtimePreferredProvider(agent);
  const response = await fetch('/api/agent/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: preferredProvider,
      allowFallback: aiStatus.fallback,
      agent: {
        name: agent.name,
        objective: agent.objective,
        intelligence: agent.intelligence,
        memory: agent.memory,
        tools: agent.tools,
        permissions: agent.permissions,
        restrictions: agent.restrictions
      },
      message
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || `Error HTTP ${response.status}`);
    error.code = payload.code || 'API_ERROR';
    error.details = payload.details || '';
    error.attempts = payload.attempts || [];
    throw error;
  }
  return payload;
}

async function executeMessage() {
  if (!lastCompilation?.ok) return;
  const agent = selectedAgent();
  const message = $('mensaje').value.trim();
  if (!message) {
    $('respuestaAgente').textContent = 'Escribe un mensaje antes de enviarlo.';
    return;
  }

  const local = localExecution(agent, message);
  if (!agentUsesAI(agent)) {
    $('respuestaAgente').textContent = `${local.agent}: ${local.reply}`;
    $('trazaAgente').textContent = [...local.trace, 'Motor: runtime determinista local'].join('\n');
    return;
  }

  if (!aiStatus.backend) {
    $('respuestaAgente').textContent = `${local.agent}: ${local.reply}\n\n[La IA no se ejecutó: abre el proyecto con ABRIR_WEB.bat para iniciar el backend.]`;
    $('trazaAgente').textContent = [...local.trace, 'IA: backend no disponible', 'Modo de respaldo: respuesta local'].join('\n');
    return;
  }

  if (!configuredProviders().length) {
    $('respuestaAgente').textContent = 'No hay proveedores de IA configurados. Presiona “Configurar IA” y agrega al menos uno.';
    $('trazaAgente').textContent = [...local.trace, 'IA: configuración pendiente'].join('\n');
    openConfigDialog();
    return;
  }

  const preferred = runtimePreferredProvider(agent);
  btnMensaje.disabled = true;
  btnMensaje.textContent = 'Consultando...';
  $('respuestaAgente').textContent = `${agent.name} está consultando ${PROVIDER_LABELS[preferred] || preferred}...`;
  $('trazaAgente').textContent = [...local.trace, 'Accion: construir contexto SAM-Lang', `Proveedor preferido: ${PROVIDER_LABELS[preferred] || preferred}`].join('\n');

  try {
    const response = await callAI(agent, message);
    const attemptLines = (response.attempts || []).map(a => `Intento previo ${PROVIDER_LABELS[a.provider] || a.provider}: ${a.code}`);
    $('respuestaAgente').textContent = `${agent.name}:\n${response.reply}`;
    $('trazaAgente').textContent = [
      ...local.trace,
      'Accion: construir contexto SAM-Lang',
      `Proveedor preferido: ${PROVIDER_LABELS[response.preferredProvider] || response.preferredProvider}`,
      ...attemptLines,
      `Proveedor utilizado: ${response.providerLabel || PROVIDER_LABELS[response.provider] || response.provider}`,
      `Modelo: ${response.model}`,
      response.fallbackUsed ? 'Respaldo entre IAs: utilizado' : 'Respaldo entre IAs: no fue necesario',
      'Estado: respuesta generada correctamente'
    ].join('\n');
  } catch (error) {
    const attemptLines = (error.attempts || []).map(a => `${PROVIDER_LABELS[a.provider] || a.provider}: ${a.code}`);
    $('respuestaAgente').textContent = `${agent.name}: ${local.reply}\n\n[Ningún proveedor disponible respondió correctamente: ${error.message}. Se utilizó el modo local de respaldo.]`;
    $('trazaAgente').textContent = [
      ...local.trace,
      `IA: error ${error.code || ''}`.trim(),
      ...attemptLines,
      error.details ? `Detalle: ${error.details}` : '',
      'Modo de respaldo final: respuesta local'
    ].filter(Boolean).join('\n');
    if (error.code === 'NOT_CONFIGURED' || error.code === 'ALL_PROVIDERS_FAILED') await checkAIStatus();
  } finally {
    btnMensaje.disabled = false;
    btnMensaje.textContent = 'Enviar mensaje';
  }
}

function currentConfigProvider() {
  const runtime = providerRuntime.value;
  if (runtime && runtime !== 'auto') return runtime;
  const specific = agentSpecificProvider(selectedAgent());
  return specific || aiStatus.activeProvider || 'gemini';
}

function updateConfigFields() {
  const provider = $('configProvider').value;
  const info = providerInfo(provider);
  $('aiModel').value = info?.model || DEFAULT_MODELS[provider] || '';
  $('aiApiKey').value = '';
  $('apiKeyGroup').hidden = provider === 'ollama';
  $('ollamaUrlGroup').hidden = provider !== 'ollama';
  if (provider === 'ollama') $('ollamaUrl').value = info?.baseUrl || 'http://127.0.0.1:11434';
  $('configMessage').textContent = info?.configured
    ? `${PROVIDER_LABELS[provider]} ya está configurado. Puedes cambiar el modelo sin volver a pegar la clave.`
    : provider === 'ollama'
      ? 'Ollama no necesita clave API. Debe estar ejecutándose en este equipo.'
      : `Pega una clave API para ${PROVIDER_LABELS[provider]}.`;
}

function openConfigDialog() {
  $('configProvider').value = currentConfigProvider();
  $('aiFallback').checked = aiStatus.fallback !== false;
  updateConfigFields();
  renderProviderSummary();
  $('btnGuardarIA').disabled = !aiStatus.backend || aiStatus.webConfigEnabled === false;
  if (!aiStatus.backend) $('configMessage').textContent = 'Primero abre el proyecto mediante ABRIR_WEB.bat.';
  else if (aiStatus.webConfigEnabled === false) $('configMessage').textContent = 'Configuración administrada por el servidor. Las credenciales se cargan como variables de entorno del despliegue.';
  if (typeof configDialog.showModal === 'function') configDialog.showModal();
  else configDialog.setAttribute('open', '');
}

async function saveAIConfig(event) {
  event.preventDefault();
  const provider = $('configProvider').value;
  const model = $('aiModel').value.trim();
  const apiKey = $('aiApiKey').value.trim();
  const fallback = $('aiFallback').checked;
  const baseUrl = $('ollamaUrl').value.trim();
  const existing = providerInfo(provider);

  if (!model) {
    $('configMessage').textContent = 'Indica un modelo.';
    return;
  }
  if (provider !== 'ollama' && !apiKey && !existing?.configured) {
    $('configMessage').textContent = `Pega una clave API para ${PROVIDER_LABELS[provider]}.`;
    return;
  }

  $('btnGuardarIA').disabled = true;
  $('configMessage').textContent = 'Guardando configuración...';
  try {
    const response = await fetch('/api/ai/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model, baseUrl, fallback, makeActive: true })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo guardar la configuración.');
    $('configMessage').textContent = payload.message;
    await checkAIStatus();
    providerRuntime.value = provider;
    updateAgentModeBadge();
    setTimeout(() => configDialog.close(), 700);
  } catch (error) {
    $('configMessage').textContent = error.message;
  } finally {
    $('btnGuardarIA').disabled = false;
  }
}

$('btnCargar').addEventListener('click', () => { codigo.value = examples[$('ejemplo').value]; updateCounter(); });
$('btnEjecutar').addEventListener('click', compileAndRun);
$('btnLimpiar').addEventListener('click', () => {
  resultado.textContent = 'Salida limpiada.'; detalle.textContent = 'Sin detalle.';
  $('respuestaAgente').textContent = 'Sin respuesta.'; $('trazaAgente').textContent = 'Sin traza.';
  setStatus('Sin ejecutar', 'neutral');
});
$('btnConfigurarIA').addEventListener('click', openConfigDialog);
$('btnCancelarIA').addEventListener('click', () => configDialog.close());
$('configAIForm').addEventListener('submit', saveAIConfig);
$('configProvider').addEventListener('change', updateConfigFields);
btnMensaje.addEventListener('click', executeMessage);
agenteSelect.addEventListener('change', updateAgentModeBadge);
providerRuntime.addEventListener('change', updateAgentModeBadge);
$('mensaje').addEventListener('keydown', event => { if (event.key === 'Enter' && !btnMensaje.disabled) executeMessage(); });
codigo.addEventListener('input', updateCounter);

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active'); activeTab = tab.dataset.tab; renderDetail();
  });
}

codigo.value = examples.multimodelo;
updateCounter();
checkAIStatus().then(updateAgentModeBadge);
