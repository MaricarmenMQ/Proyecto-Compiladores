#ifndef OPTIMIZADOR_H
#define OPTIMIZADOR_H

#include <string>
#include <vector>

#include "tac.h"

class OptimizadorTAC {
public:
    std::vector<InstruccionTAC> optimizar(const std::vector<InstruccionTAC>& codigo) const;
    static std::string reporteComparativo(const std::vector<InstruccionTAC>& original,
                                          const std::vector<InstruccionTAC>& optimizado);

private:
    static bool esInstruccionRedundante(const InstruccionTAC& instr);
};

#endif
