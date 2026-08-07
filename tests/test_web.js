'use strict';
const fs = require('fs');
const path = require('path');
const SAM = require('../web/sam-lang.js');
const root = path.resolve(__dirname, '..');

let failures = 0;
function check(condition, message) {
  if (condition) console.log('[OK]', message);
  else { console.error('[FALLO]', message); failures += 1; }
}

for (const name of ['medico', 'comunicacion', 'asistente']) {
  const source = fs.readFileSync(path.join(root, 'ejemplos', `${name}.sam`), 'utf8');
  const result = SAM.compile(source, { message: 'hola' });
  check(result.ok, `${name}.sam compila`);
  if (result.ok) {
    check(result.tokens.length > 1, `${name}.sam genera tokens`);
    check(result.ast.agents.length >= 1, `${name}.sam genera AST`);
    check(result.tac.length > 2, `${name}.sam genera TAC`);
    check(result.vm.includes('HALT'), `${name}.sam genera SAM-VM`);
    check(Boolean(result.execution.reply), `${name}.sam ejecuta un agente`);
  }
}

const bad = SAM.compile(fs.readFileSync(path.join(root, 'ejemplos', 'error_semantico.sam'), 'utf8'));
check(!bad.ok && bad.stage === 'semantico', 'error_semantico.sam es rechazado por semántica');

if (failures) process.exit(1);
console.log('\nTodas las pruebas web finalizaron correctamente.');
