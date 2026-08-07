#ifndef COMUNICACION_H
#define COMUNICACION_H

#include <string>
#include <vector>

#include "parser.h"

struct MensajeAgente {
    std::string origen;
    std::string destino;
    std::string contenido;
    std::string tipo;
};

class GestorComunicacion {
public:
    void construirDesdePrograma(const NodoPrograma& programa);
    void agregarMensaje(const MensajeAgente& mensaje);
    const std::vector<MensajeAgente>& historial() const;
    std::string reporte() const;

private:
    std::vector<MensajeAgente> mensajes;
};

#endif
