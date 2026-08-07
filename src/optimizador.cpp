#include "optimizador.h"

#include <set>
#include <sstream>

std::vector<InstruccionTAC> OptimizadorTAC::optimizar(const std::vector<InstruccionTAC>& codigo) const {
    std::vector<InstruccionTAC> resultado;
    std::set<std::string> configuracionesVistas;

    for (std::size_t i = 0; i < codigo.size(); ++i) {
        InstruccionTAC instr = codigo[i];
        if (esInstruccionRedundante(instr)) continue;

        // Optimizacion peephole: una llamada seguida por su lista de argumentos
        // se fusiona en una sola instruccion TAC. Esto reduce temporales de enlace
        // y evita una instruccion separada ARGUMENTS en el codigo final.
        if (instr.operacion == "CALL" && i + 1 < codigo.size()) {
            const InstruccionTAC& siguiente = codigo[i + 1];
            if (siguiente.operacion == "ARGUMENTS" &&
                siguiente.argumento1 == instr.resultado &&
                !siguiente.argumento2.empty()) {
                instr.argumento2 += " " + siguiente.argumento2;
                ++i;
            }
        }

        if (instr.operacion == "SET_MEMORY" ||
            instr.operacion == "SET_INTELLIGENCE" ||
            instr.operacion == "SET_OBJECTIVE") {
            const std::string clave = instr.operacion + "|" + instr.argumento1;
            if (configuracionesVistas.find(clave) != configuracionesVistas.end()) continue;
            configuracionesVistas.insert(clave);
        }

        // Evita instrucciones de configuracion/lista exactamente repetidas.
        if (!resultado.empty() &&
            (instr.operacion == "ADD_TOOL" || instr.operacion == "ADD_PERMISSION" ||
             instr.operacion == "ADD_RESTRICTION" || instr.operacion == "LINK_DEPENDENCY") &&
            resultado.back().operacion == instr.operacion &&
            resultado.back().argumento1 == instr.argumento1 &&
            resultado.back().argumento2 == instr.argumento2 &&
            resultado.back().resultado == instr.resultado) {
            continue;
        }

        resultado.push_back(std::move(instr));
    }

    return resultado;
}

bool OptimizadorTAC::esInstruccionRedundante(const InstruccionTAC& instr) {
    if (instr.operacion == "ARGUMENTS" && instr.argumento2.empty()) return true;
    if (instr.operacion == "VISIT_NODE" && instr.argumento2.empty()) return true;
    if (instr.operacion == "SET_MEMORY" && instr.argumento2 == "temporal") return true;
    if (instr.operacion == "NOP") return true;
    return false;
}

std::string OptimizadorTAC::reporteComparativo(const std::vector<InstruccionTAC>& original,
                                               const std::vector<InstruccionTAC>& optimizado) {
    std::ostringstream salida;
    salida << "\n========== OPTIMIZACION ==========" << '\n';
    salida << "Instrucciones originales: " << original.size() << '\n';
    salida << "Instrucciones optimizadas: " << optimizado.size() << '\n';
    salida << "Reduccion: "
           << (original.size() >= optimizado.size() ? original.size() - optimizado.size() : 0)
           << '\n';
    salida << "Tecnicas: fusion CALL+ARGUMENTS, eliminacion NOP y redundancias de configuracion.\n";
    return salida.str();
}
