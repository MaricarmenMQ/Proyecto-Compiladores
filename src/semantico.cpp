#include "semantico.h"

#include <iostream>
#include <sstream>

bool TablaSemantica::agregarAgente(const NodoAgente& agente) {
    if (existeAgente(agente.nombre)) return false;

    SimboloAgente simbolo;
    simbolo.nombre = agente.nombre;
    simbolo.objetivo = agente.objetivo;
    simbolo.inteligencia = agente.inteligencia;
    simbolo.memoria = agente.memoria;
    simbolo.herramientas = agente.herramientas;
    simbolo.permisos = agente.permisos;
    simbolo.restricciones = agente.restricciones;
    simbolo.dependencias = agente.dependeDe;
    simbolo.coordina = agente.coordina;
    simbolo.supervisa = agente.supervisa;
    simbolo.posicion = agente.posicion;
    for (const auto& flujo : agente.flujos) simbolo.flujos.push_back(flujo.nombre);

    agentes.emplace(simbolo.nombre, simbolo);
    return true;
}

bool TablaSemantica::agregarRuntime(const NodoRuntime& runtime) {
    if (existeRuntime(runtime.nombre)) return false;

    SimboloRuntime simbolo;
    simbolo.nombre = runtime.nombre;
    simbolo.coordinador = runtime.coordinador;
    simbolo.dependencias = runtime.dependeDe;
    simbolo.memoriaCompartida = runtime.memoriaCompartida;
    simbolo.tieneMemoriaCompartida = runtime.tieneMemoriaCompartida;
    simbolo.periodicidad = runtime.periodicidad;
    simbolo.adaptabilidad = runtime.adaptabilidad;
    simbolo.politicaValidacion = runtime.politicaValidacion;
    simbolo.posicion = runtime.posicion;

    runtimes.emplace(simbolo.nombre, simbolo);
    return true;
}

bool TablaSemantica::existeAgente(const std::string& nombre) const {
    return agentes.find(nombre) != agentes.end();
}

bool TablaSemantica::existeRuntime(const std::string& nombre) const {
    return runtimes.find(nombre) != runtimes.end();
}

const SimboloAgente* TablaSemantica::obtenerAgente(const std::string& nombre) const {
    const auto it = agentes.find(nombre);
    return it == agentes.end() ? nullptr : &it->second;
}

const SimboloRuntime* TablaSemantica::obtenerRuntime(const std::string& nombre) const {
    const auto it = runtimes.find(nombre);
    return it == runtimes.end() ? nullptr : &it->second;
}

const std::map<std::string, SimboloAgente>& TablaSemantica::agentesRegistrados() const {
    return agentes;
}

const std::map<std::string, SimboloRuntime>& TablaSemantica::runtimesRegistrados() const {
    return runtimes;
}

AnalizadorSemantico::AnalizadorSemantico(const NodoPrograma& programa)
    : programa(programa) {}

bool AnalizadorSemantico::analizar() {
    listaErrores.clear();
    tabla = TablaSemantica{};

    registrarSimbolos();
    validarAgentes();
    validarRuntimes();

    return listaErrores.empty();
}

const std::vector<ErrorSemantico>& AnalizadorSemantico::errores() const {
    return listaErrores;
}

const TablaSemantica& AnalizadorSemantico::obtenerTabla() const {
    return tabla;
}

void AnalizadorSemantico::registrarError(const std::string& mensaje, PosicionFuente posicion) {
    listaErrores.push_back({mensaje, posicion.linea, posicion.columna});
}

bool AnalizadorSemantico::listaTieneDuplicados(const std::vector<std::string>& valores,
                                               std::string& repetido) const {
    std::set<std::string> vistos;
    for (const auto& valor : valores) {
        if (!vistos.insert(valor).second) {
            repetido = valor;
            return true;
        }
    }
    return false;
}

void AnalizadorSemantico::registrarSimbolos() {
    for (const auto& agente : programa.agentes) {
        if (!tabla.agregarAgente(agente)) {
            registrarError("el agente '" + agente.nombre + "' ya fue declarado", agente.posicion);
        }
    }

    for (const auto& runtime : programa.runtimes) {
        if (!tabla.agregarRuntime(runtime)) {
            registrarError("el runtime '" + runtime.nombre + "' ya fue declarado", runtime.posicion);
        }
    }
}

void AnalizadorSemantico::validarAgentes() {
    for (const auto& agente : programa.agentes) {
        if (agente.objetivo.empty()) {
            registrarError("el agente '" + agente.nombre + "' debe declarar un objetivo", agente.posicion);
        }
        validarDependenciasAgente(agente);
        validarCoordinacion(agente);
        validarDelegaciones(agente);
        validarFlujos(agente);
    }
}

void AnalizadorSemantico::validarDependenciasAgente(const NodoAgente& agente) {
    std::string repetido;
    if (listaTieneDuplicados(agente.dependeDe, repetido)) {
        registrarError("dependencia duplicada '" + repetido + "' en el agente '" + agente.nombre + "'", agente.posicion);
    }

    for (const auto& dependencia : agente.dependeDe) {
        if (dependencia == agente.nombre) {
            registrarError("el agente '" + agente.nombre + "' no puede depender de si mismo", agente.posicion);
        } else if (!tabla.existeAgente(dependencia)) {
            registrarError("el agente '" + agente.nombre + "' depende de '" + dependencia + "', pero ese agente no existe", agente.posicion);
        }
    }
}

void AnalizadorSemantico::validarCoordinacion(const NodoAgente& agente) {
    std::string repetido;
    if (listaTieneDuplicados(agente.coordina, repetido)) {
        registrarError("agente coordinado duplicado '" + repetido + "' en '" + agente.nombre + "'", agente.posicion);
    }
    if (listaTieneDuplicados(agente.supervisa, repetido)) {
        registrarError("agente supervisado duplicado '" + repetido + "' en '" + agente.nombre + "'", agente.posicion);
    }

    for (const auto& destino : agente.coordina) {
        if (!tabla.existeAgente(destino)) {
            registrarError("el agente '" + agente.nombre + "' coordina a '" + destino + "', pero ese agente no existe", agente.posicion);
        }
    }
    for (const auto& destino : agente.supervisa) {
        if (!tabla.existeAgente(destino)) {
            registrarError("el agente '" + agente.nombre + "' supervisa a '" + destino + "', pero ese agente no existe", agente.posicion);
        }
    }
}

void AnalizadorSemantico::validarDelegaciones(const NodoAgente& agente) {
    for (const auto& delegacion : agente.delegaciones) {
        if (!tabla.existeAgente(delegacion.agenteDestino)) {
            registrarError("la delegacion de la tarea '" + delegacion.tarea + "' apunta al agente inexistente '" + delegacion.agenteDestino + "'", delegacion.posicion);
        }
        if (delegacion.agenteDestino == agente.nombre) {
            registrarError("el agente '" + agente.nombre + "' no debe delegarse una tarea a si mismo", delegacion.posicion);
        }
    }
}

void AnalizadorSemantico::validarFlujos(const NodoAgente& agente) {
    std::set<std::string> nombresFlujo;
    for (const auto& flujo : agente.flujos) {
        if (!nombresFlujo.insert(flujo.nombre).second) {
            registrarError("flujo duplicado '" + flujo.nombre + "' en el agente '" + agente.nombre + "'", flujo.posicion);
        }
        if (flujo.pasos.empty()) {
            registrarError("el flujo '" + flujo.nombre + "' del agente '" + agente.nombre + "' no tiene pasos", flujo.posicion);
        }
    }
}

void AnalizadorSemantico::validarRuntime(const NodoRuntime& runtime) {
    if (runtime.coordinador.empty()) {
        registrarError("el runtime '" + runtime.nombre + "' debe declarar coordinador", runtime.posicion);
    } else if (!tabla.existeAgente(runtime.coordinador)) {
        registrarError("el runtime '" + runtime.nombre + "' usa coordinador inexistente '" + runtime.coordinador + "'", runtime.posicion);
    }

    for (const auto& dependencia : runtime.dependeDe) {
        if (!tabla.existeAgente(dependencia)) {
            registrarError("el runtime '" + runtime.nombre + "' depende del agente inexistente '" + dependencia + "'", runtime.posicion);
        }
    }
}

void AnalizadorSemantico::validarRuntimes() {
    for (const auto& runtime : programa.runtimes) validarRuntime(runtime);
}

void AnalizadorSemantico::imprimirReporte() const {
    if (listaErrores.empty()) {
        std::cout << "[OK] Analisis semantico correcto.\n";
        std::cout << "     Agentes registrados: " << tabla.agentesRegistrados().size() << "\n";
        std::cout << "     Runtimes registrados: " << tabla.runtimesRegistrados().size() << "\n";
        return;
    }

    std::cout << "[ERROR] Analisis semantico con " << listaErrores.size() << " error(es).\n";
    for (const auto& error : listaErrores) {
        std::cout << "  Linea " << error.linea << ", columna " << error.columna
                  << ": " << error.mensaje << "\n";
    }
}
