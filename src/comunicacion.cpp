#include "comunicacion.h"

#include <sstream>

void GestorComunicacion::agregarMensaje(const MensajeAgente& mensaje) {
    mensajes.push_back(mensaje);
}

void GestorComunicacion::construirDesdePrograma(const NodoPrograma& programa) {
    mensajes.clear();

    for (const auto& agente : programa.agentes) {
        for (const auto& dependencia : agente.dependeDe) {
            agregarMensaje({agente.nombre, dependencia,
                            "solicita colaboracion segun depende_de", "dependencia"});
            agregarMensaje({dependencia, agente.nombre,
                            "respuesta simulada: informacion procesada", "respuesta"});
        }
        for (const auto& destino : agente.coordina) {
            agregarMensaje({agente.nombre, destino,
                            "coordina actividad operativa", "coordinacion"});
        }
        for (const auto& destino : agente.supervisa) {
            agregarMensaje({agente.nombre, destino,
                            "supervisa ejecucion del agente", "supervision"});
        }
        for (const auto& delegacion : agente.delegaciones) {
            agregarMensaje({agente.nombre, delegacion.agenteDestino,
                            "delega tarea: " + delegacion.tarea, "delegacion"});
        }
    }
}

const std::vector<MensajeAgente>& GestorComunicacion::historial() const {
    return mensajes;
}

std::string GestorComunicacion::reporte() const {
    std::ostringstream salida;
    salida << "\n========== COMUNICACION ENTRE AGENTES ==========" << '\n';
    if (mensajes.empty()) {
        salida << "No se registraron mensajes entre agentes.\n";
        return salida.str();
    }

    for (const auto& mensaje : mensajes) {
        salida << "[" << mensaje.tipo << "] " << mensaje.origen << " -> "
               << mensaje.destino << ": " << mensaje.contenido << '\n';
    }
    return salida.str();
}
