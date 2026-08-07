(function (global) {
  'use strict';

  class SAMError extends Error {
    constructor(stage, message, line = 0, column = 0) {
      super(message);
      this.name = 'SAMError';
      this.stage = stage;
      this.line = line;
      this.column = column;
    }
    format() {
      const pos = this.line ? ` (linea ${this.line}, columna ${this.column})` : '';
      return `[ERROR ${this.stage.toUpperCase()}] ${this.message}${pos}`;
    }
  }

  const KEYWORDS = new Map([
    ['agente', 'AGENTE'], ['runtime', 'RUNTIME'], ['objetivo', 'OBJETIVO'],
    ['inteligencia', 'INTELIGENCIA'], ['herramientas', 'HERRAMIENTAS'],
    ['memoria', 'MEMORIA'], ['permisos', 'PERMISOS'],
    ['restricciones', 'RESTRICCIONES'], ['depende_de', 'DEPENDE_DE'],
    ['flujo', 'FLUJO'], ['flujo_dinamico', 'FLUJO_DINAMICO'],
    ['si', 'SI'], ['sino', 'SINO'], ['persistente', 'PERSISTENTE'],
    ['compartida', 'COMPARTIDA'], ['solo_lectura', 'SOLO_LECTURA'],
    ['escritura', 'ESCRITURA'], ['requiere_aprobacion', 'REQUIERE_APROBACION'],
    ['usar', 'USAR'], ['leer', 'LEER'], ['enviar', 'ENVIAR'],
    ['coordinador', 'COORDINADOR'], ['memoria_compartida', 'MEMORIA_COMPARTIDA'],
    ['periodicidad', 'PERIODICIDAD'], ['tiempo_real', 'TIEMPO_REAL'],
    ['adaptabilidad', 'ADAPTABILIDAD'], ['politica_validacion', 'POLITICA_VALIDACION'],
    ['recibir', 'RECIBIR'], ['responder', 'RESPONDER'], ['difundir', 'DIFUNDIR'],
    ['conectar', 'CONECTAR'], ['escuchar', 'ESCUCHAR'], ['delega', 'DELEGA'],
    ['coordina', 'COORDINA'], ['supervisa', 'SUPERVISA'],
    ['true', 'BOOLEANO'], ['false', 'BOOLEANO']
  ]);

  const ACTIONS = new Set([
    'RECIBIR', 'RESPONDER', 'DIFUNDIR', 'ENVIAR', 'CONECTAR', 'ESCUCHAR',
    'DELEGA', 'COORDINA', 'SUPERVISA'
  ]);
  const COMPARATORS = new Set(['IGUAL_IGUAL', 'DISTINTO', 'MAYOR', 'MENOR', 'MAYOR_IGUAL', 'MENOR_IGUAL']);
  const VALUE_START = new Set(['IDENTIFICADOR', 'NUMERO', 'CADENA', 'BOOLEANO', 'MENOS', 'NEGACION']);

  class Lexer {
    constructor(source) {
      this.source = String(source || '').replace(/^\uFEFF/, '');
      this.index = 0;
      this.line = 1;
      this.column = 1;
      this.tokens = [];
    }

    eof() { return this.index >= this.source.length; }
    current() { return this.eof() ? '\0' : this.source[this.index]; }
    peek(n = 1) { return this.index + n < this.source.length ? this.source[this.index + n] : '\0'; }
    advance() {
      if (this.eof()) return;
      if (this.source[this.index] === '\n') { this.line += 1; this.column = 1; }
      else this.column += 1;
      this.index += 1;
    }
    add(type, lexeme, value, line, column) {
      this.tokens.push({ type, lexeme, value, line, column });
    }

    scan() {
      while (!this.eof()) {
        const c = this.current();
        if (/\s/.test(c)) { this.advance(); continue; }
        if (c === '/' && this.peek() === '/') { this.skipLineComment(); continue; }
        if (c === '/' && this.peek() === '*') { this.skipBlockComment(); continue; }
        if (c === '"') { this.scanString(); continue; }
        if (/[0-9]/.test(c)) { this.scanNumber(); continue; }
        if (/[A-Za-z_]/.test(c)) { this.scanIdentifier(); continue; }
        this.scanSymbol();
      }
      this.add('EOF', '<EOF>', null, this.line, this.column);
      return this.tokens;
    }

    skipLineComment() {
      while (!this.eof() && this.current() !== '\n') this.advance();
    }

    skipBlockComment() {
      const line = this.line, column = this.column;
      this.advance(); this.advance();
      while (!this.eof()) {
        if (this.current() === '*' && this.peek() === '/') { this.advance(); this.advance(); return; }
        this.advance();
      }
      throw new SAMError('lexico', 'comentario de bloque sin cerrar', line, column);
    }

    scanString() {
      const line = this.line, column = this.column;
      this.advance();
      let value = '';
      while (!this.eof() && this.current() !== '"') {
        if (this.current() === '\n' || this.current() === '\r') {
          throw new SAMError('lexico', 'cadena sin cerrar antes del fin de linea', line, column);
        }
        if (this.current() === '\\') {
          this.advance();
          if (this.eof()) throw new SAMError('lexico', 'secuencia de escape incompleta', line, column);
          const escaped = this.current();
          const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' };
          value += Object.prototype.hasOwnProperty.call(map, escaped) ? map[escaped] : escaped;
          this.advance();
        } else {
          value += this.current();
          this.advance();
        }
      }
      if (this.eof()) throw new SAMError('lexico', 'cadena sin comilla de cierre', line, column);
      this.advance();
      this.add('CADENA', `"${value}"`, value, line, column);
    }

    scanNumber() {
      const line = this.line, column = this.column;
      let text = '';
      while (/[0-9]/.test(this.current())) { text += this.current(); this.advance(); }
      if (this.current() === '.' && /[0-9]/.test(this.peek())) {
        text += '.'; this.advance();
        while (/[0-9]/.test(this.current())) { text += this.current(); this.advance(); }
      }
      this.add('NUMERO', text, Number(text), line, column);
    }

    scanIdentifier() {
      const line = this.line, column = this.column;
      let text = '';
      while (/[A-Za-z0-9_]/.test(this.current())) { text += this.current(); this.advance(); }
      const type = KEYWORDS.get(text) || 'IDENTIFICADOR';
      let value = text;
      if (type === 'BOOLEANO') value = text === 'true';
      this.add(type, text, value, line, column);
    }

    scanSymbol() {
      const line = this.line, column = this.column;
      const two = this.current() + this.peek();
      const doubles = {
        '->': 'FLECHA', '>=': 'MAYOR_IGUAL', '<=': 'MENOR_IGUAL',
        '==': 'IGUAL_IGUAL', '!=': 'DISTINTO'
      };
      if (doubles[two]) {
        this.advance(); this.advance(); this.add(doubles[two], two, two, line, column); return;
      }
      if (this.current() === '→') {
        this.advance(); this.add('FLECHA', '→', '->', line, column); return;
      }
      const singles = {
        '{': 'LLAVE_ABRE', '}': 'LLAVE_CIERRA', '=': 'IGUAL', '>': 'MAYOR', '<': 'MENOR',
        '-': 'MENOS', '!': 'NEGACION', ':': 'DOS_PUNTOS', ',': 'COMA',
        '(': 'PAREN_ABRE', ')': 'PAREN_CIERRA', '[': 'CORCHETE_ABRE',
        ']': 'CORCHETE_CIERRA', ';': 'PUNTO_COMA'
      };
      const c = this.current();
      if (!singles[c]) throw new SAMError('lexico', `caracter no reconocido '${c}'`, line, column);
      this.advance();
      this.add(singles[c], c, c, line, column);
    }
  }

  class Parser {
    constructor(tokens) { this.tokens = tokens; this.index = 0; }
    current() { return this.tokens[Math.min(this.index, this.tokens.length - 1)]; }
    check(type) { return this.current().type === type; }
    match(type) { if (!this.check(type)) return false; this.index += 1; return true; }
    consume(type, message) {
      if (!this.check(type)) {
        const t = this.current();
        throw new SAMError('sintactico', `${message}; se encontro '${t.lexeme}' (${t.type})`, t.line, t.column);
      }
      return this.tokens[this.index++];
    }
    pos(token) { return { line: token.line, column: token.column }; }

    parse() {
      const program = { type: 'Program', agents: [], runtimes: [] };
      if (this.check('EOF')) throw new SAMError('sintactico', 'el programa debe contener al menos un agente o runtime', 1, 1);
      while (!this.check('EOF')) {
        if (this.check('AGENTE')) program.agents.push(this.parseAgent());
        else if (this.check('RUNTIME')) program.runtimes.push(this.parseRuntime());
        else {
          const t = this.current();
          throw new SAMError('sintactico', "se esperaba una declaracion 'agente' o 'runtime'", t.line, t.column);
        }
      }
      this.consume('EOF', 'se esperaba fin de archivo');
      return program;
    }

    newAgent(start, name) {
      return {
        type: 'Agent', name, objective: '', intelligence: '', memory: '', receive: '', connect: '', listen: '',
        tools: [], permissions: [], restrictions: [], dependencies: [], coordinates: [], supervises: [],
        delegations: [], flows: [], fields: [], position: this.pos(start)
      };
    }

    parseAgent() {
      const start = this.consume('AGENTE', "se esperaba 'agente'");
      const name = this.consume('IDENTIFICADOR', 'se esperaba el nombre del agente').lexeme;
      const agent = this.newAgent(start, name);
      this.consume('LLAVE_ABRE', "se esperaba '{' despues del nombre del agente");
      while (!this.check('LLAVE_CIERRA')) {
        if (this.check('EOF')) throw new SAMError('sintactico', `falta '}' para cerrar el agente '${name}'`, this.current().line, this.current().column);
        const field = this.current();
        agent.fields.push({ name: field.lexeme, type: field.type, position: this.pos(field) });
        switch (field.type) {
          case 'OBJETIVO':
            this.index++; this.colon(); agent.objective = this.consume('CADENA', 'se esperaba una cadena para objetivo').value; this.semicolon(); break;
          case 'INTELIGENCIA':
            this.index++; this.colon(); agent.intelligence = this.consumeIdentifierLike('se esperaba un identificador para inteligencia').lexeme; this.semicolon(); break;
          case 'MEMORIA':
            this.index++; this.colon();
            if (!['PERSISTENTE', 'COMPARTIDA', 'SOLO_LECTURA'].includes(this.current().type)) this.fail("se esperaba 'persistente', 'compartida' o 'solo_lectura'");
            agent.memory = this.tokens[this.index++].lexeme; this.semicolon(); break;
          case 'RECIBIR': case 'CONECTAR': case 'ESCUCHAR': {
            this.index++; this.colon(); const value = this.consumeIdentifierLike(`se esperaba un identificador despues de '${field.lexeme}'`).lexeme; this.semicolon();
            if (field.type === 'RECIBIR') agent.receive = value;
            if (field.type === 'CONECTAR') agent.connect = value;
            if (field.type === 'ESCUCHAR') agent.listen = value;
            break;
          }
          case 'HERRAMIENTAS': case 'DEPENDE_DE': case 'COORDINA': case 'SUPERVISA': {
            this.index++; this.colon(); const list = this.parseIdentifierList(); this.semicolon();
            if (field.type === 'HERRAMIENTAS') agent.tools = list;
            if (field.type === 'DEPENDE_DE') agent.dependencies = list;
            if (field.type === 'COORDINA') agent.coordinates = list;
            if (field.type === 'SUPERVISA') agent.supervises = list;
            break;
          }
          case 'PERMISOS':
            this.index++; this.colon(); agent.permissions = this.parsePermissionList(); this.semicolon(); break;
          case 'RESTRICCIONES':
            this.index++; this.colon(); agent.restrictions = this.parseRestrictions(); this.semicolon(); break;
          case 'DELEGA':
            agent.delegations.push(this.parseDelegation()); break;
          case 'FLUJO': case 'FLUJO_DINAMICO':
            agent.flows.push(this.parseFlow()); break;
          default:
            this.fail('campo no valido dentro de un agente');
        }
      }
      this.consume('LLAVE_CIERRA', "se esperaba '}' al final del agente");
      return agent;
    }

    parseRuntime() {
      const start = this.consume('RUNTIME', "se esperaba 'runtime'");
      const name = this.consume('IDENTIFICADOR', 'se esperaba el nombre del runtime').lexeme;
      const runtime = {
        type: 'Runtime', name, coordinator: '', dependencies: [], sharedMemory: false,
        hasSharedMemory: false, periodicity: '', adaptability: '', validationPolicy: '',
        fields: [], position: this.pos(start)
      };
      this.consume('LLAVE_ABRE', "se esperaba '{' despues del nombre del runtime");
      while (!this.check('LLAVE_CIERRA')) {
        if (this.check('EOF')) throw new SAMError('sintactico', `falta '}' para cerrar el runtime '${name}'`, this.current().line, this.current().column);
        const field = this.current();
        runtime.fields.push({ name: field.lexeme, type: field.type, position: this.pos(field) });
        switch (field.type) {
          case 'COORDINADOR':
            this.index++; this.colon(); runtime.coordinator = this.consumeIdentifierLike('se esperaba un agente coordinador').lexeme; this.semicolon(); break;
          case 'DEPENDE_DE':
            this.index++; this.colon(); runtime.dependencies = this.parseIdentifierList(); this.semicolon(); break;
          case 'MEMORIA_COMPARTIDA':
            this.index++; this.colon(); runtime.sharedMemory = this.consume('BOOLEANO', "se esperaba 'true' o 'false'").value; runtime.hasSharedMemory = true; this.semicolon(); break;
          case 'PERIODICIDAD':
            this.index++; this.colon();
            if (!['TIEMPO_REAL', 'NUMERO'].includes(this.current().type)) this.fail("se esperaba 'tiempo_real' o un numero");
            runtime.periodicity = this.tokens[this.index++].lexeme; this.semicolon(); break;
          case 'ADAPTABILIDAD':
            this.index++; this.colon(); runtime.adaptability = this.consumeIdentifierLike('se esperaba un identificador para adaptabilidad').lexeme; this.semicolon(); break;
          case 'POLITICA_VALIDACION':
            this.index++; this.colon(); runtime.validationPolicy = this.consume('REQUIERE_APROBACION', "se esperaba 'requiere_aprobacion'").lexeme; this.semicolon(); break;
          default: this.fail('campo no valido dentro de un runtime');
        }
      }
      this.consume('LLAVE_CIERRA', "se esperaba '}' al final del runtime");
      return runtime;
    }

    consumeIdentifierLike(message) {
      const allowed = new Set(['IDENTIFICADOR', 'TIEMPO_REAL']);
      if (!allowed.has(this.current().type)) this.fail(message);
      return this.tokens[this.index++];
    }
    colon() { this.consume('DOS_PUNTOS', "se esperaba ':'"); }
    semicolon() { this.consume('PUNTO_COMA', "se esperaba ';'"); }
    fail(message) { const t = this.current(); throw new SAMError('sintactico', `${message}; se encontro '${t.lexeme}'`, t.line, t.column); }

    parseIdentifierList() {
      const list = [];
      this.consume('CORCHETE_ABRE', "se esperaba '['");
      if (this.match('CORCHETE_CIERRA')) return list;
      list.push(this.consumeIdentifierLike('se esperaba un identificador en la lista').lexeme);
      while (this.match('COMA')) list.push(this.consumeIdentifierLike("se esperaba identificador despues de ','").lexeme);
      this.consume('CORCHETE_CIERRA', "se esperaba ']' al final de la lista");
      return list;
    }

    parsePermissionList() {
      const list = [];
      const allowed = new Set(['LEER', 'ESCRITURA', 'USAR', 'ENVIAR']);
      this.consume('CORCHETE_ABRE', "se esperaba '['");
      if (this.match('CORCHETE_CIERRA')) return list;
      const read = () => { if (!allowed.has(this.current().type)) this.fail('permiso invalido'); return this.tokens[this.index++].lexeme; };
      list.push(read()); while (this.match('COMA')) list.push(read());
      this.consume('CORCHETE_CIERRA', "se esperaba ']' al final de permisos");
      return list;
    }

    parseRestrictions() {
      const list = [];
      const read = () => {
        if (!['IDENTIFICADOR', 'REQUIERE_APROBACION'].includes(this.current().type)) this.fail('se esperaba una restriccion');
        return this.tokens[this.index++].lexeme;
      };
      if (!this.match('CORCHETE_ABRE')) return [read()];
      if (this.match('CORCHETE_CIERRA')) return list;
      list.push(read()); while (this.match('COMA')) list.push(read());
      this.consume('CORCHETE_CIERRA', "se esperaba ']' al final de restricciones");
      return list;
    }

    parseDelegation() {
      const start = this.consume('DELEGA', "se esperaba 'delega'");
      this.colon();
      const task = this.consumeIdentifierLike('se esperaba la tarea delegada').lexeme;
      this.consume('FLECHA', "se esperaba '->' en la delegacion");
      const destination = this.consumeIdentifierLike('se esperaba el agente destino').lexeme;
      this.semicolon();
      return { type: 'Delegation', task, destination, position: this.pos(start) };
    }

    parseFlow() {
      const start = this.current();
      const dynamic = start.type === 'FLUJO_DINAMICO';
      this.index++;
      const name = this.consumeIdentifierLike('se esperaba el nombre del flujo').lexeme;
      this.consume('LLAVE_ABRE', "se esperaba '{' al iniciar el flujo");
      const steps = this.parseSteps();
      this.consume('LLAVE_CIERRA', "se esperaba '}' al terminar el flujo");
      return { type: 'Flow', name, dynamic, steps, position: this.pos(start) };
    }

    parseSteps() {
      const steps = [];
      while (!this.check('LLAVE_CIERRA')) {
        if (this.check('EOF')) this.fail("fin de archivo inesperado; falta '}'");
        if (this.check('SI')) steps.push({ type: 'ConditionalStep', conditional: this.parseConditional(), position: this.pos(this.current()) });
        else if (this.check('IDENTIFICADOR') || ACTIONS.has(this.current().type)) steps.push(this.parseChain());
        else this.fail("se esperaba un paso de flujo o una sentencia 'si'");
      }
      return steps;
    }

    parseChain() {
      const position = this.pos(this.current());
      const elements = [this.parseFlowElement()];
      while (this.match('FLECHA')) elements.push(this.parseFlowElement());
      this.semicolon();
      return { type: 'ChainStep', elements, position };
    }

    parseFlowElement() {
      const token = this.current();
      if (this.match('IDENTIFICADOR')) return { type: 'Node', name: token.lexeme, action: false, args: [], position: this.pos(token) };
      if (!ACTIONS.has(token.type)) this.fail('se esperaba un identificador o accion de flujo');
      this.index++;
      const args = [];
      while (VALUE_START.has(this.current().type)) args.push(this.parseValue());
      return { type: 'Action', name: token.lexeme, action: true, args, position: this.pos(token) };
    }

    parseValue() {
      const start = this.current();
      if (this.match('MENOS')) {
        const n = this.consume('NUMERO', "el signo '-' solo puede preceder a un numero");
        return { type: 'number', value: -n.value, raw: `-${n.lexeme}`, position: this.pos(start) };
      }
      if (this.match('NEGACION')) {
        if (!['IDENTIFICADOR', 'BOOLEANO'].includes(this.current().type)) this.fail("el operador '!' solo puede preceder a identificador o booleano");
        const t = this.tokens[this.index++];
        return { type: 'negation', value: t.value, raw: `!${t.lexeme}`, position: this.pos(start) };
      }
      if (!['IDENTIFICADOR', 'NUMERO', 'CADENA', 'BOOLEANO'].includes(this.current().type)) this.fail('se esperaba un valor');
      const t = this.tokens[this.index++];
      const map = { IDENTIFICADOR: 'identifier', NUMERO: 'number', CADENA: 'string', BOOLEANO: 'boolean' };
      return { type: map[t.type], value: t.value, raw: t.type === 'CADENA' ? `"${t.value}"` : t.lexeme, position: this.pos(t) };
    }

    parseConditional() {
      const start = this.consume('SI', "se esperaba 'si'");
      const parenthesized = this.match('PAREN_ABRE');
      const left = this.parseValue();
      if (this.check('IGUAL')) this.fail("use '==' para comparar; '=' no es un operador de comparacion");
      if (!COMPARATORS.has(this.current().type)) this.fail('se esperaba ==, !=, >, <, >= o <=');
      const operator = this.tokens[this.index++].lexeme;
      const right = this.parseValue();
      if (parenthesized) this.consume('PAREN_CIERRA', "se esperaba ')' al final de la condicion");
      this.consume('LLAVE_ABRE', "se esperaba '{' despues de la condicion");
      const thenSteps = this.parseSteps();
      this.consume('LLAVE_CIERRA', "se esperaba '}' al final del bloque 'si'");
      let elseSteps = [], elseIf = null;
      if (this.match('SINO')) {
        if (this.check('SI')) elseIf = this.parseConditional();
        else {
          this.consume('LLAVE_ABRE', "se esperaba '{' o 'si' despues de 'sino'");
          elseSteps = this.parseSteps();
          this.consume('LLAVE_CIERRA', "se esperaba '}' al final del bloque 'sino'");
        }
      }
      return { type: 'Conditional', left, operator, right, thenSteps, elseSteps, elseIf, position: this.pos(start) };
    }
  }

  function duplicateIn(values) {
    const seen = new Set();
    for (const value of values) { if (seen.has(value)) return value; seen.add(value); }
    return null;
  }

  class SemanticAnalyzer {
    constructor(program) { this.program = program; this.errors = []; this.agentMap = new Map(); this.runtimeMap = new Map(); }
    add(message, pos) { this.errors.push({ message, line: pos?.line || 0, column: pos?.column || 0 }); }
    analyze() {
      for (const a of this.program.agents) {
        if (this.agentMap.has(a.name)) this.add(`el agente '${a.name}' ya fue declarado`, a.position);
        else this.agentMap.set(a.name, a);
      }
      for (const r of this.program.runtimes) {
        if (this.runtimeMap.has(r.name)) this.add(`el runtime '${r.name}' ya fue declarado`, r.position);
        else this.runtimeMap.set(r.name, r);
      }
      for (const a of this.program.agents) this.validateAgent(a);
      for (const r of this.program.runtimes) this.validateRuntime(r);
      return { ok: this.errors.length === 0, errors: this.errors, agents: this.agentMap, runtimes: this.runtimeMap };
    }
    validateUniqueFields(entity, repeatable) {
      const counts = new Map();
      for (const field of entity.fields) {
        if (repeatable.has(field.type)) continue;
        counts.set(field.type, (counts.get(field.type) || 0) + 1);
        if (counts.get(field.type) > 1) this.add(`el campo '${field.name}' no puede repetirse en '${entity.name}'`, field.position);
      }
    }
    validateAgent(a) {
      this.validateUniqueFields(a, new Set(['DELEGA', 'FLUJO', 'FLUJO_DINAMICO']));
      if (!a.objective) this.add(`el agente '${a.name}' debe declarar un objetivo`, a.position);
      for (const [values, label] of [[a.dependencies, 'dependencia'], [a.coordinates, 'coordinacion'], [a.supervises, 'supervision'], [a.tools, 'herramienta'], [a.permissions, 'permiso']]) {
        const d = duplicateIn(values); if (d) this.add(`${label} duplicada '${d}' en el agente '${a.name}'`, a.position);
      }
      for (const dep of a.dependencies) {
        if (dep === a.name) this.add(`el agente '${a.name}' no puede depender de si mismo`, a.position);
        else if (!this.agentMap.has(dep)) this.add(`el agente '${a.name}' depende de '${dep}', pero ese agente no existe`, a.position);
      }
      for (const target of [...a.coordinates, ...a.supervises]) if (!this.agentMap.has(target)) this.add(`el agente '${a.name}' referencia al agente inexistente '${target}'`, a.position);
      for (const d of a.delegations) {
        if (!this.agentMap.has(d.destination)) this.add(`la delegacion '${d.task}' apunta al agente inexistente '${d.destination}'`, d.position);
        if (d.destination === a.name) this.add(`el agente '${a.name}' no debe delegarse una tarea a si mismo`, d.position);
      }
      const flowNames = new Set();
      for (const f of a.flows) {
        if (flowNames.has(f.name)) this.add(`el flujo '${f.name}' esta duplicado en el agente '${a.name}'`, f.position);
        flowNames.add(f.name);
        if (!f.steps.length) this.add(`el flujo '${f.name}' no contiene pasos`, f.position);
      }
    }
    validateRuntime(r) {
      this.validateUniqueFields(r, new Set());
      if (!r.coordinator) this.add(`el runtime '${r.name}' debe declarar un coordinador`, r.position);
      else if (!this.agentMap.has(r.coordinator)) this.add(`el coordinador '${r.coordinator}' del runtime '${r.name}' no existe`, r.position);
      const d = duplicateIn(r.dependencies); if (d) this.add(`dependencia duplicada '${d}' en runtime '${r.name}'`, r.position);
      for (const dep of r.dependencies) if (!this.agentMap.has(dep)) this.add(`el runtime '${r.name}' depende del agente inexistente '${dep}'`, r.position);
    }
  }

  function valueText(v) { return v.raw; }

  class TACGenerator {
    constructor() { this.temp = 0; this.label = 0; }
    newTemp() { return `T${++this.temp}`; }
    newLabel(prefix) { return `${prefix}_${++this.label}`; }
    emit(code, operation, argument1 = '', argument2 = '', result = '') { code.push({ operation, argument1, argument2, result }); }
    generate(program) {
      const code = []; this.emit(code, 'PROGRAM_BEGIN', 'SAM_LANG');
      for (const a of program.agents) this.agent(a, code);
      for (const r of program.runtimes) this.runtime(r, code);
      this.emit(code, 'PROGRAM_END', 'SAM_LANG'); return code;
    }
    agent(a, code) {
      this.emit(code, 'CREATE_AGENT', a.name); this.emit(code, 'SET_OBJECTIVE', a.name, `"${a.objective}"`);
      if (a.intelligence) this.emit(code, 'SET_INTELLIGENCE', a.name, a.intelligence);
      if (a.memory) this.emit(code, 'SET_MEMORY', a.name, a.memory);
      for (const x of a.tools) this.emit(code, 'ADD_TOOL', a.name, x);
      for (const x of a.permissions) this.emit(code, 'ADD_PERMISSION', a.name, x);
      for (const x of a.restrictions) this.emit(code, 'ADD_RESTRICTION', a.name, x);
      for (const x of a.dependencies) this.emit(code, 'LINK_DEPENDENCY', a.name, x);
      for (const x of a.coordinates) this.emit(code, 'COORDINATE', a.name, x);
      for (const x of a.supervises) this.emit(code, 'SUPERVISE', a.name, x);
      for (const d of a.delegations) this.emit(code, 'DELEGATE', a.name, d.task, d.destination);
      for (const f of a.flows) this.flow(a, f, code);
    }
    runtime(r, code) {
      this.emit(code, 'CREATE_RUNTIME', r.name); this.emit(code, 'SET_COORDINATOR', r.name, r.coordinator);
      for (const x of r.dependencies) this.emit(code, 'RUNTIME_DEPENDENCY', r.name, x);
      if (r.hasSharedMemory) this.emit(code, 'SET_SHARED_MEMORY', r.name, String(r.sharedMemory));
      if (r.periodicity) this.emit(code, 'SET_PERIODICITY', r.name, r.periodicity);
      if (r.adaptability) this.emit(code, 'SET_ADAPTABILITY', r.name, r.adaptability);
      if (r.validationPolicy) this.emit(code, 'SET_VALIDATION_POLICY', r.name, r.validationPolicy);
    }
    flow(a, f, code) {
      this.emit(code, 'BEGIN_FLOW', a.name, f.name, f.dynamic ? 'dynamic' : 'static');
      for (const s of f.steps) this.step(a, s, code);
      this.emit(code, 'END_FLOW', a.name, f.name);
    }
    step(a, s, code) {
      if (s.type === 'ConditionalStep') { this.conditional(a, s.conditional, code); return; }
      for (const e of s.elements) {
        if (!e.action) this.emit(code, 'VISIT_NODE', a.name, e.name);
        else {
          const t = this.newTemp(); this.emit(code, 'CALL', a.name, e.name, t);
          if (e.args.length) this.emit(code, 'ARGUMENTS', t, e.args.map(valueText).join(', '));
        }
      }
    }
    conditional(a, c, code) {
      const elseLabel = this.newLabel('ELSE'), endLabel = this.newLabel('ENDIF');
      this.emit(code, 'IF_FALSE_GOTO', `${valueText(c.left)} ${c.operator} ${valueText(c.right)}`, '', elseLabel);
      for (const s of c.thenSteps) this.step(a, s, code);
      this.emit(code, 'GOTO', '', '', endLabel); this.emit(code, 'LABEL', elseLabel);
      if (c.elseIf) this.conditional(a, c.elseIf, code); else for (const s of c.elseSteps) this.step(a, s, code);
      this.emit(code, 'LABEL', endLabel);
    }
  }

  function tacLine(i) {
    const a = i.argument1, b = i.argument2, r = i.result;
    switch (i.operation) {
      case 'PROGRAM_BEGIN': return `PROGRAM_BEGIN ${a}`; case 'PROGRAM_END': return `PROGRAM_END ${a}`;
      case 'CREATE_AGENT': return `CREATE_AGENT ${a}`; case 'CREATE_RUNTIME': return `CREATE_RUNTIME ${a}`;
      case 'CALL': return `CALL ${a}, ${b} -> ${r}`; case 'ARGUMENTS': return `ARGUMENTS ${a}, ${b}`;
      case 'DELEGATE': return `DELEGATE ${a}, ${b} -> ${r}`;
      case 'IF_FALSE_GOTO': return `IF_FALSE_GOTO ${a} -> ${r}`; case 'GOTO': return `GOTO -> ${r}`;
      case 'LABEL': return `LABEL ${a}`; case 'VISIT_NODE': return `VISIT_NODE ${a}, ${b}`;
      case 'BEGIN_FLOW': return `BEGIN_FLOW ${a}, ${b}${r === 'dynamic' ? ' [dynamic]' : ''}`;
      case 'END_FLOW': return `END_FLOW ${a}, ${b}`;
      default: return `${i.operation} ${a}${b ? ', ' + b : ''}${r ? ' -> ' + r : ''}`;
    }
  }

  function optimize(code) {
    const out = [];
    const idempotent = new Set(['SET_OBJECTIVE', 'SET_INTELLIGENCE', 'SET_MEMORY', 'SET_COORDINATOR', 'SET_SHARED_MEMORY', 'SET_PERIODICITY', 'SET_ADAPTABILITY', 'SET_VALIDATION_POLICY']);
    const last = new Map();
    for (let index = 0; index < code.length; index += 1) {
      let i = { ...code[index] };
      if (i.operation === 'NOP') continue;

      // Peephole: fusiona CALL + ARGUMENTS en una sola instruccion.
      const next = code[index + 1];
      if (i.operation === 'CALL' && next?.operation === 'ARGUMENTS' && next.argument1 === i.result && next.argument2) {
        i.argument2 = `${i.argument2} ${next.argument2}`;
        index += 1;
      }

      const key = `${i.operation}|${i.argument1}`;
      if (idempotent.has(i.operation)) {
        const signature = JSON.stringify(i);
        if (last.get(key) === signature) continue;
        last.set(key, signature);
      }
      const previous = out[out.length - 1];
      if (previous && ['ADD_TOOL', 'ADD_PERMISSION', 'ADD_RESTRICTION', 'LINK_DEPENDENCY'].includes(i.operation) && JSON.stringify(previous) === JSON.stringify(i)) continue;
      out.push(i);
    }
    return out;
  }

  function vmLine(i) {
    const a = i.argument1, b = i.argument2, r = i.result;
    const map = {
      PROGRAM_BEGIN: `.program ${a}`, PROGRAM_END: `.end_program ${a}`,
      CREATE_AGENT: `LOAD_AGENT ${a}`, SET_OBJECTIVE: `SET_OBJECTIVE ${a} ${b}`,
      SET_INTELLIGENCE: `SET_INTELLIGENCE ${a} ${b}`, SET_MEMORY: `SET_MEMORY ${a} ${b}`,
      ADD_TOOL: `ADD_TOOL ${a} ${b}`, ADD_PERMISSION: `GRANT ${a} ${b}`,
      ADD_RESTRICTION: `RESTRICT ${a} ${b}`, LINK_DEPENDENCY: `LINK ${a} -> ${b}`,
      COORDINATE: `COORDINATE ${a} -> ${b}`, SUPERVISE: `SUPERVISE ${a} -> ${b}`,
      DELEGATE: `DELEGATE ${a} ${b} -> ${r}`, BEGIN_FLOW: `BEGIN_FLOW ${a}.${b}`,
      END_FLOW: `END_FLOW ${a}.${b}`, CALL: `EXECUTE ${a}.${b} -> ${r}`,
      ARGUMENTS: `PUSH_ARGS ${a} ${b}`, VISIT_NODE: `VISIT ${a}.${b}`,
      IF_FALSE_GOTO: `JUMP_IF_FALSE ${a} ${r}`, GOTO: `JUMP ${r}`,
      LABEL: `${a}:`, CREATE_RUNTIME: `LOAD_RUNTIME ${a}`,
      SET_COORDINATOR: `SET_COORDINATOR ${a} ${b}`, RUNTIME_DEPENDENCY: `RUNTIME_LINK ${a} ${b}`,
      SET_SHARED_MEMORY: `SET_SHARED_MEMORY ${a} ${b}`, SET_PERIODICITY: `SET_PERIODICITY ${a} ${b}`,
      SET_ADAPTABILITY: `SET_ADAPTABILITY ${a} ${b}`, SET_VALIDATION_POLICY: `SET_VALIDATION_POLICY ${a} ${b}`
    };
    return map[i.operation] || `NOP ; ${i.operation}`;
  }

  function toVM(code) {
    return ['; SAM-Lang Virtual Machine Code', '; Generado por el compilador web SAM-Lang', '', ...code.map(vmLine), 'HALT'].join('\n');
  }

  function buildCommunication(program) {
    const messages = [];
    for (const a of program.agents) {
      for (const x of a.dependencies) {
        messages.push({ type: 'dependencia', origin: a.name, destination: x, content: 'solicita colaboracion segun depende_de' });
        messages.push({ type: 'respuesta', origin: x, destination: a.name, content: 'informacion procesada' });
      }
      for (const x of a.coordinates) messages.push({ type: 'coordinacion', origin: a.name, destination: x, content: 'coordina actividad operativa' });
      for (const x of a.supervises) messages.push({ type: 'supervision', origin: a.name, destination: x, content: 'supervisa ejecucion' });
      for (const d of a.delegations) messages.push({ type: 'delegacion', origin: a.name, destination: d.destination, content: `delega tarea: ${d.task}` });
    }
    return messages;
  }

  function resolveValue(v, env) {
    if (v.type === 'identifier') return Object.prototype.hasOwnProperty.call(env, v.value) ? env[v.value] : v.value;
    if (v.type === 'negation') return !Boolean(Object.prototype.hasOwnProperty.call(env, v.value) ? env[v.value] : v.value);
    return v.value;
  }
  function compare(left, op, right) {
    switch (op) { case '==': return left == right; case '!=': return left != right; case '>': return left > right; case '<': return left < right; case '>=': return left >= right; case '<=': return left <= right; default: return false; }
  }

  function executeSteps(steps, env, trace) {
    let reply = null;
    for (const step of steps) {
      if (step.type === 'ConditionalStep') {
        const c = step.conditional; const ok = compare(resolveValue(c.left, env), c.operator, resolveValue(c.right, env));
        trace.push(`Condicion ${valueText(c.left)} ${c.operator} ${valueText(c.right)} => ${ok}`);
        const selected = ok ? c.thenSteps : (c.elseIf ? [{ type: 'ConditionalStep', conditional: c.elseIf }] : c.elseSteps);
        const nested = executeSteps(selected, env, trace); if (nested !== null) reply = nested;
        continue;
      }
      for (const e of step.elements) {
        trace.push(`${e.action ? 'Accion' : 'Nodo'}: ${e.name}${e.args.length ? ' ' + e.args.map(valueText).join(' ') : ''}`);
        if (e.name === 'recibir' && e.args[0]?.type === 'identifier') env[e.args[0].value] = env.__message || '';
        if (e.name === 'responder') {
          if (e.args.length) reply = String(resolveValue(e.args[0], env));
          else reply = 'Respuesta generada por el agente.';
        }
      }
    }
    return reply;
  }

  function runAgent(program, agentName, message) {
    const agent = program.agents.find(a => a.name === agentName) || program.agents[0];
    if (!agent) return { agent: null, reply: 'No hay agentes declarados.', trace: [] };
    const env = { __message: String(message || '') };
    const trace = [];
    let reply = null;
    for (const flow of agent.flows) {
      trace.push(`Flujo: ${flow.name}${flow.dynamic ? ' (dinamico)' : ''}`);
      const result = executeSteps(flow.steps, env, trace);
      if (result !== null) reply = result;
    }
    if (reply === null) reply = `${agent.name} recibio el mensaje. Objetivo activo: ${agent.objective}.`;
    return { agent: agent.name, reply, trace };
  }

  function runtimeReport(program) {
    const messages = buildCommunication(program);
    const lines = ['========== RUNTIME SAM-LANG ==========', `Agentes activos: ${program.agents.length}`];
    for (const a of program.agents) lines.push(`- ${a.name} | objetivo: "${a.objective}" | inteligencia: ${a.intelligence || 'basica'} | memoria: ${a.memory || 'temporal'}`);
    lines.push('', '========== COMUNICACION ENTRE AGENTES ==========');
    if (!messages.length) lines.push('No se registraron mensajes entre agentes.');
    for (const m of messages) lines.push(`[${m.type}] ${m.origin} -> ${m.destination}: ${m.content}`);
    return { text: lines.join('\n'), messages };
  }

  function compile(source, options = {}) {
    try {
      const tokens = new Lexer(source).scan();
      const ast = new Parser(tokens).parse();
      const semantic = new SemanticAnalyzer(ast).analyze();
      if (!semantic.ok) return { ok: false, stage: 'semantico', tokens, ast, semantic, errors: semantic.errors };
      const tac = new TACGenerator().generate(ast);
      const optimized = optimize(tac);
      const vm = toVM(optimized);
      const runtime = runtimeReport(ast);
      const execution = runAgent(ast, options.agentName, options.message || '');
      return { ok: true, tokens, ast, semantic, runtime, tac, optimized, vm, execution };
    } catch (error) {
      if (error instanceof SAMError) return { ok: false, stage: error.stage, error, errors: [{ message: error.message, line: error.line, column: error.column }] };
      throw error;
    }
  }

  const api = { SAMError, Lexer, Parser, SemanticAnalyzer, TACGenerator, compile, optimize, toVM, tacLine, runAgent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SAMLang = api;
})(typeof window !== 'undefined' ? window : globalThis);
