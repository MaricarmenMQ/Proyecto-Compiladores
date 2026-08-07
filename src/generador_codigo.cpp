#include "generador_codigo.h"

#include <fstream>
#include <sstream>

namespace {
std::string sinComillasExternas(const std::string& valor) {
    if (valor.size() >= 2 && valor.front() == '"' && valor.back() == '"') {
        return valor.substr(1, valor.size() - 2);
    }
    return valor;
}
}

std::string GeneradorCodigoFinal::traducir(const InstruccionTAC& i) const {
    if (i.operacion == "PROGRAM_BEGIN") return ".program " + i.argumento1;
    if (i.operacion == "PROGRAM_END") return ".end_program " + i.argumento1;
    if (i.operacion == "CREATE_AGENT") return "LOAD_AGENT " + i.argumento1;
    if (i.operacion == "SET_OBJECTIVE") return "SET_OBJECTIVE " + i.argumento1 + " \"" + sinComillasExternas(i.argumento2) + "\"";
    if (i.operacion == "SET_INTELLIGENCE") return "SET_INTELLIGENCE " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "SET_MEMORY") return "SET_MEMORY " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "ADD_TOOL") return "ADD_TOOL " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "ADD_PERMISSION") return "GRANT " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "ADD_RESTRICTION") return "RESTRICT " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "LINK_DEPENDENCY") return "LINK " + i.argumento1 + " -> " + i.argumento2;
    if (i.operacion == "DELEGATE") return "DELEGATE " + i.argumento1 + " " + i.argumento2 + " -> " + i.resultado;
    if (i.operacion == "BEGIN_FLOW") return "BEGIN_FLOW " + i.argumento1 + "." + i.argumento2;
    if (i.operacion == "BEGIN_DYNAMIC_FLOW") return "BEGIN_DYNAMIC_FLOW " + i.argumento1 + "." + i.argumento2;
    if (i.operacion == "END_FLOW") return "END_FLOW " + i.argumento1 + "." + i.argumento2;
    if (i.operacion == "CALL") return "EXECUTE " + i.argumento1 + "." + i.argumento2 + " -> " + i.resultado;
    if (i.operacion == "ARGUMENTS") return "PUSH_ARGS " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "IF_FALSE_GOTO") return "JUMP_IF_FALSE " + i.argumento1 + " " + i.resultado;
    if (i.operacion == "GOTO") return "JUMP " + i.resultado;
    if (i.operacion == "LABEL") return i.argumento1 + ":";
    if (i.operacion == "CREATE_RUNTIME") return "LOAD_RUNTIME " + i.argumento1;
    if (i.operacion == "SET_COORDINATOR") return "SET_COORDINATOR " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "RUNTIME_DEPENDENCY") return "RUNTIME_LINK " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "SET_SHARED_MEMORY") return "SET_SHARED_MEMORY " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "SET_PERIODICITY") return "SET_PERIODICITY " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "SET_ADAPTABILITY") return "SET_ADAPTABILITY " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "SET_VALIDATION_POLICY") return "SET_VALIDATION_POLICY " + i.argumento1 + " " + i.argumento2;
    if (i.operacion == "VISIT_NODE") return "VISIT " + i.argumento1 + "." + i.argumento2;
    return "NOP ; " + i.operacion;
}

std::string GeneradorCodigoFinal::generarSAMVM(const std::vector<InstruccionTAC>& codigo) const {
    std::ostringstream salida;
    salida << "; SAM-Lang Virtual Machine Code\n";
    salida << "; Generado automaticamente por el compilador SAM-Lang\n\n";
    for (const auto& instruccion : codigo) salida << traducir(instruccion) << '\n';
    salida << "HALT\n";
    return salida.str();
}

bool GeneradorCodigoFinal::guardarArchivo(const std::string& contenido, const std::string& ruta, std::string& error) const {
    std::ofstream archivo(ruta, std::ios::binary);
    if (!archivo.is_open()) {
        error = "no se pudo crear el archivo: " + ruta;
        return false;
    }
    archivo << contenido;
    if (!archivo.good()) {
        error = "error al escribir el archivo: " + ruta;
        return false;
    }
    return true;
}
