#ifndef GENERADOR_CODIGO_H
#define GENERADOR_CODIGO_H

#include <string>
#include <vector>

#include "tac.h"

class GeneradorCodigoFinal {
public:
    std::string generarSAMVM(const std::vector<InstruccionTAC>& codigo) const;
    bool guardarArchivo(const std::string& contenido, const std::string& ruta, std::string& error) const;

private:
    std::string traducir(const InstruccionTAC& instruccion) const;
};

#endif
