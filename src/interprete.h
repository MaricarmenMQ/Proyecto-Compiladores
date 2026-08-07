#ifndef INTERPRETE_H
#define INTERPRETE_H

#include <map>
#include <string>
#include <vector>

#include "comunicacion.h"
#include "parser.h"
#include "semantico.h"

struct EstadoAgente {
    std::string nombre;
    std::string objetivo;
    std::string inteligencia;
    std::string memoria;
    std::vector<std::string> herramientas;
    std::vector<std::string> flujos;
    bool activo = false;
};

class RuntimeSAM {
public:
    RuntimeSAM();

    void ejecutar(const NodoPrograma& programa, const TablaSemantica& tabla);
    const std::vector<EstadoAgente>& agentesActivos() const;
    const GestorComunicacion& comunicacion() const;
    std::string reporte() const;

private:
    std::vector<EstadoAgente> agentes;
    GestorComunicacion gestorComunicacion;

    void crearAgente(const NodoAgente& agente);
    void ejecutarFlujos(const NodoAgente& agente);
};

#endif
