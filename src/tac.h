#ifndef TAC_H
#define TAC_H

#include <string>
#include <vector>

#include "parser.h"

struct InstruccionTAC {
    std::string operacion;
    std::string argumento1;
    std::string argumento2;
    std::string resultado;
};

class GeneradorTAC {
public:
    GeneradorTAC();

    std::vector<InstruccionTAC> generar(const NodoPrograma& programa);
    static void imprimir(const std::vector<InstruccionTAC>& codigo);
    static std::string comoTexto(const std::vector<InstruccionTAC>& codigo);

private:
    int contadorTemporal = 0;
    int contadorEtiqueta = 0;

    std::string nuevoTemporal();
    std::string nuevaEtiqueta(const std::string& prefijo);

    void generarAgente(const NodoAgente& agente, std::vector<InstruccionTAC>& codigo);
    void generarRuntime(const NodoRuntime& runtime, std::vector<InstruccionTAC>& codigo);
    void generarFlujo(const NodoAgente& agente, const NodoFlujo& flujo, std::vector<InstruccionTAC>& codigo);
    void generarPaso(const NodoAgente& agente, const NodoPaso& paso, std::vector<InstruccionTAC>& codigo);
    void generarElemento(const NodoAgente& agente, const NodoElementoFlujo& elemento, std::vector<InstruccionTAC>& codigo);
    void generarCondicional(const NodoAgente& agente, const NodoCondicional& cond, std::vector<InstruccionTAC>& codigo);
};

#endif
