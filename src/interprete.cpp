#include "interprete.h"

#include <iostream>
#include <sstream>

RuntimeSAM::RuntimeSAM() = default;

void RuntimeSAM::ejecutar(const NodoPrograma& programa, const TablaSemantica&) {
    agentes.clear();
    std::cout << "\n[5] RUNTIME SAM-LANG\n";
    std::cout << "    Inicializando agentes declarados...\n";

    for (const auto& agente : programa.agentes) {
        crearAgente(agente);
        ejecutarFlujos(agente);
    }

    gestorComunicacion.construirDesdePrograma(programa);
    std::cout << reporte();
}

void RuntimeSAM::crearAgente(const NodoAgente& agente) {
    EstadoAgente estado;
    estado.nombre = agente.nombre;
    estado.objetivo = agente.objetivo;
    estado.inteligencia = agente.inteligencia.empty() ? "basica" : agente.inteligencia;
    estado.memoria = agente.memoria.empty() ? "temporal" : agente.memoria;
    estado.herramientas = agente.herramientas;
    for (const auto& flujo : agente.flujos) estado.flujos.push_back(flujo.nombre);
    estado.activo = true;

    agentes.push_back(estado);
    std::cout << "    [AGENTE ACTIVO] " << estado.nombre << " | objetivo=" << estado.objetivo
              << " | memoria=" << estado.memoria << "\n";
}

void RuntimeSAM::ejecutarFlujos(const NodoAgente& agente) {
    for (const auto& flujo : agente.flujos) {
        std::cout << "      Ejecutando flujo: " << flujo.nombre
                  << (flujo.esDinamico ? " (dinamico)" : "") << "\n";
        for (const auto& paso : flujo.pasos) {
            if (paso.esCondicional) {
                std::cout << "        Condicional evaluable en runtime.\n";
                continue;
            }
            std::cout << "        Paso: ";
            for (std::size_t i = 0; i < paso.cadena.size(); ++i) {
                if (i > 0) std::cout << " -> ";
                std::cout << paso.cadena[i].nombre;
            }
            std::cout << "\n";
        }
    }
}

const std::vector<EstadoAgente>& RuntimeSAM::agentesActivos() const {
    return agentes;
}

const GestorComunicacion& RuntimeSAM::comunicacion() const {
    return gestorComunicacion;
}

std::string RuntimeSAM::reporte() const {
    std::ostringstream salida;
    salida << "\n========== REPORTE RUNTIME ==========" << '\n';
    salida << "Agentes activos: " << agentes.size() << '\n';
    for (const auto& agente : agentes) {
        salida << "- " << agente.nombre << " | objetivo: " << agente.objetivo
               << " | inteligencia: " << agente.inteligencia
               << " | memoria: " << agente.memoria << '\n';
    }
    salida << gestorComunicacion.reporte();
    return salida.str();
}
