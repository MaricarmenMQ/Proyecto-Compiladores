#include "tac.h"

#include <iostream>
#include <sstream>

GeneradorTAC::GeneradorTAC() = default;

std::string GeneradorTAC::nuevoTemporal() {
    return "T" + std::to_string(++contadorTemporal);
}

std::string GeneradorTAC::nuevaEtiqueta(const std::string& prefijo) {
    return prefijo + "_" + std::to_string(++contadorEtiqueta);
}

std::vector<InstruccionTAC> GeneradorTAC::generar(const NodoPrograma& programa) {
    std::vector<InstruccionTAC> codigo;
    codigo.push_back({"PROGRAM_BEGIN", "SAM_LANG", "", ""});
    for (const auto& agente : programa.agentes) generarAgente(agente, codigo);
    for (const auto& runtime : programa.runtimes) generarRuntime(runtime, codigo);
    codigo.push_back({"PROGRAM_END", "SAM_LANG", "", ""});
    return codigo;
}

void GeneradorTAC::generarAgente(const NodoAgente& agente, std::vector<InstruccionTAC>& codigo) {
    codigo.push_back({"CREATE_AGENT", agente.nombre, "", ""});
    codigo.push_back({"SET_OBJECTIVE", agente.nombre, agente.objetivo, ""});
    if (!agente.inteligencia.empty()) codigo.push_back({"SET_INTELLIGENCE", agente.nombre, agente.inteligencia, ""});
    if (!agente.memoria.empty()) codigo.push_back({"SET_MEMORY", agente.nombre, agente.memoria, ""});

    for (const auto& herramienta : agente.herramientas) codigo.push_back({"ADD_TOOL", agente.nombre, herramienta, ""});
    for (const auto& permiso : agente.permisos) codigo.push_back({"ADD_PERMISSION", agente.nombre, permiso, ""});
    for (const auto& restriccion : agente.restricciones) codigo.push_back({"ADD_RESTRICTION", agente.nombre, restriccion, ""});
    for (const auto& dependencia : agente.dependeDe) codigo.push_back({"LINK_DEPENDENCY", agente.nombre, dependencia, ""});
    for (const auto& delegacion : agente.delegaciones) codigo.push_back({"DELEGATE", agente.nombre, delegacion.tarea, delegacion.agenteDestino});
    for (const auto& flujo : agente.flujos) generarFlujo(agente, flujo, codigo);
}

void GeneradorTAC::generarRuntime(const NodoRuntime& runtime, std::vector<InstruccionTAC>& codigo) {
    codigo.push_back({"CREATE_RUNTIME", runtime.nombre, "", ""});
    codigo.push_back({"SET_COORDINATOR", runtime.nombre, runtime.coordinador, ""});
    for (const auto& dependencia : runtime.dependeDe) codigo.push_back({"RUNTIME_DEPENDENCY", runtime.nombre, dependencia, ""});
    if (runtime.tieneMemoriaCompartida) codigo.push_back({"SET_SHARED_MEMORY", runtime.nombre, runtime.memoriaCompartida ? "true" : "false", ""});
    if (!runtime.periodicidad.empty()) codigo.push_back({"SET_PERIODICITY", runtime.nombre, runtime.periodicidad, ""});
    if (!runtime.adaptabilidad.empty()) codigo.push_back({"SET_ADAPTABILITY", runtime.nombre, runtime.adaptabilidad, ""});
    if (!runtime.politicaValidacion.empty()) codigo.push_back({"SET_VALIDATION_POLICY", runtime.nombre, runtime.politicaValidacion, ""});
}

void GeneradorTAC::generarFlujo(const NodoAgente& agente, const NodoFlujo& flujo, std::vector<InstruccionTAC>& codigo) {
    codigo.push_back({flujo.esDinamico ? "BEGIN_DYNAMIC_FLOW" : "BEGIN_FLOW", agente.nombre, flujo.nombre, ""});
    for (const auto& paso : flujo.pasos) generarPaso(agente, paso, codigo);
    codigo.push_back({"END_FLOW", agente.nombre, flujo.nombre, ""});
}

void GeneradorTAC::generarPaso(const NodoAgente& agente, const NodoPaso& paso, std::vector<InstruccionTAC>& codigo) {
    if (paso.esCondicional && paso.condicional) {
        generarCondicional(agente, *paso.condicional, codigo);
        return;
    }
    for (const auto& elemento : paso.cadena) generarElemento(agente, elemento, codigo);
}

void GeneradorTAC::generarElemento(const NodoAgente& agente, const NodoElementoFlujo& elemento, std::vector<InstruccionTAC>& codigo) {
    if (!elemento.esAccion) {
        codigo.push_back({"VISIT_NODE", agente.nombre, elemento.nombre, ""});
        return;
    }

    std::string temporal = nuevoTemporal();
    std::string argumentos;
    for (std::size_t i = 0; i < elemento.argumentos.size(); ++i) {
        if (i > 0) argumentos += ",";
        argumentos += elemento.argumentos[i].lexema;
    }
    codigo.push_back({"CALL", agente.nombre, elemento.nombre, temporal});
    if (!argumentos.empty()) codigo.push_back({"ARGUMENTS", temporal, argumentos, ""});
}

void GeneradorTAC::generarCondicional(const NodoAgente& agente, const NodoCondicional& cond, std::vector<InstruccionTAC>& codigo) {
    const std::string etiquetaSino = nuevaEtiqueta("ELSE");
    const std::string etiquetaFin = nuevaEtiqueta("ENDIF");
    const std::string expr = cond.izquierda.lexema + " " + cond.operador + " " + cond.derecha.lexema;
    codigo.push_back({"IF_FALSE_GOTO", expr, "", etiquetaSino});
    for (const auto& paso : cond.pasosSi) generarPaso(agente, paso, codigo);
    codigo.push_back({"GOTO", "", "", etiquetaFin});
    codigo.push_back({"LABEL", etiquetaSino, "", ""});
    if (cond.sinoSi) generarCondicional(agente, *cond.sinoSi, codigo);
    for (const auto& paso : cond.pasosSino) generarPaso(agente, paso, codigo);
    codigo.push_back({"LABEL", etiquetaFin, "", ""});
}

void GeneradorTAC::imprimir(const std::vector<InstruccionTAC>& codigo) {
    std::cout << comoTexto(codigo);
}

std::string GeneradorTAC::comoTexto(const std::vector<InstruccionTAC>& codigo) {
    std::ostringstream salida;
    salida << "\n========== CODIGO INTERMEDIO TAC ==========" << '\n';
    for (const auto& instruccion : codigo) {
        salida << instruccion.operacion;
        if (!instruccion.argumento1.empty()) salida << " " << instruccion.argumento1;
        if (!instruccion.argumento2.empty()) salida << ", " << instruccion.argumento2;
        if (!instruccion.resultado.empty()) salida << " -> " << instruccion.resultado;
        salida << '\n';
    }
    return salida.str();
}
