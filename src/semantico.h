#ifndef SEMANTICO_H
#define SEMANTICO_H

#include <map>
#include <set>
#include <string>
#include <vector>

#include "parser.h"

struct ErrorSemantico {
    std::string mensaje;
    int linea = 0;
    int columna = 0;
};

struct SimboloAgente {
    std::string nombre;
    std::string objetivo;
    std::string inteligencia;
    std::string memoria;
    std::vector<std::string> herramientas;
    std::vector<std::string> permisos;
    std::vector<std::string> restricciones;
    std::vector<std::string> dependencias;
    std::vector<std::string> coordina;
    std::vector<std::string> supervisa;
    std::vector<std::string> flujos;
    PosicionFuente posicion;
};

struct SimboloRuntime {
    std::string nombre;
    std::string coordinador;
    std::vector<std::string> dependencias;
    bool memoriaCompartida = false;
    bool tieneMemoriaCompartida = false;
    std::string periodicidad;
    std::string adaptabilidad;
    std::string politicaValidacion;
    PosicionFuente posicion;
};

class TablaSemantica {
public:
    bool agregarAgente(const NodoAgente& agente);
    bool agregarRuntime(const NodoRuntime& runtime);

    bool existeAgente(const std::string& nombre) const;
    bool existeRuntime(const std::string& nombre) const;

    const SimboloAgente* obtenerAgente(const std::string& nombre) const;
    const SimboloRuntime* obtenerRuntime(const std::string& nombre) const;

    const std::map<std::string, SimboloAgente>& agentesRegistrados() const;
    const std::map<std::string, SimboloRuntime>& runtimesRegistrados() const;

private:
    std::map<std::string, SimboloAgente> agentes;
    std::map<std::string, SimboloRuntime> runtimes;
};

class AnalizadorSemantico {
public:
    explicit AnalizadorSemantico(const NodoPrograma& programa);

    bool analizar();
    const std::vector<ErrorSemantico>& errores() const;
    const TablaSemantica& obtenerTabla() const;
    void imprimirReporte() const;

private:
    const NodoPrograma& programa;
    TablaSemantica tabla;
    std::vector<ErrorSemantico> listaErrores;

    void registrarError(const std::string& mensaje, PosicionFuente posicion);
    void registrarSimbolos();
    void validarAgentes();
    void validarRuntimes();
    void validarDependenciasAgente(const NodoAgente& agente);
    void validarCoordinacion(const NodoAgente& agente);
    void validarDelegaciones(const NodoAgente& agente);
    void validarFlujos(const NodoAgente& agente);
    void validarRuntime(const NodoRuntime& runtime);
    bool listaTieneDuplicados(const std::vector<std::string>& valores, std::string& repetido) const;
};

#endif
