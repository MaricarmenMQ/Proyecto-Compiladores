#ifndef PARSER_H
#define PARSER_H

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
#include "analisis.h"

struct ErrorSintaxis : public std::runtime_error {
    explicit ErrorSintaxis(const std::string& mensaje) : std::runtime_error(mensaje) {}
};

struct PosicionFuente {
    int linea = 0;
    int columna = 0;
};

struct CampoDeclarado {
    int tokenCampo = TOKEN_ERROR;
    PosicionFuente posicion;
};

struct NodoValor {
    int token = TOKEN_ERROR;
    std::string lexema;
    PosicionFuente posicion;
};

struct NodoElementoFlujo {
    bool esAccion = false;
    int token = TOKEN_ERROR;
    std::string nombre;
    std::vector<NodoValor> argumentos;
    PosicionFuente posicion;
};

struct NodoCondicional;

struct NodoPaso {
    bool esCondicional = false;
    std::vector<NodoElementoFlujo> cadena;
    std::shared_ptr<NodoCondicional> condicional;
    PosicionFuente posicion;
};

struct NodoCondicional {
    NodoValor izquierda;
    std::string operador;
    NodoValor derecha;
    std::vector<NodoPaso> pasosSi;
    bool tieneSino = false;
    std::vector<NodoPaso> pasosSino;
    std::shared_ptr<NodoCondicional> sinoSi;
    PosicionFuente posicion;
};

struct NodoFlujo {
    std::string nombre;
    bool esDinamico = false;
    std::vector<NodoPaso> pasos;
    PosicionFuente posicion;
};

struct NodoDelegacion {
    std::string tarea;
    std::string agenteDestino;
    PosicionFuente posicion;
};

struct NodoAgente {
    std::string nombre;
    std::string objetivo;
    std::string inteligencia;
    std::string memoria;
    std::string recibir;
    std::string conectar;
    std::string escuchar;
    std::vector<std::string> herramientas;
    std::vector<std::string> permisos;
    std::vector<std::string> restricciones;
    std::vector<std::string> dependeDe;
    std::vector<std::string> coordina;
    std::vector<std::string> supervisa;
    std::vector<NodoDelegacion> delegaciones;
    std::vector<NodoFlujo> flujos;
    std::vector<CampoDeclarado> camposDeclarados;
    PosicionFuente posicion;
};

struct NodoRuntime {
    std::string nombre;
    std::string coordinador;
    std::vector<std::string> dependeDe;
    bool memoriaCompartida = false;
    bool tieneMemoriaCompartida = false;
    std::string periodicidad;
    std::string adaptabilidad;
    std::string politicaValidacion;
    std::vector<CampoDeclarado> camposDeclarados;
    PosicionFuente posicion;
};

struct NodoPrograma {
    std::vector<NodoAgente> agentes;
    std::vector<NodoRuntime> runtimes;
};

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);
    NodoPrograma parsear();

private:
    const std::vector<Token>& tokens;
    std::size_t indice = 0;

    const Token& actual() const;
    const Token& anterior() const;
    bool comprobar(int token) const;
    bool aceptar(int token);
    Token consumir(int tokenEsperado, const std::string& mensaje);
    [[noreturn]] void error(const Token& token, const std::string& mensaje) const;

    static bool esAccion(int token);
    static bool esOperadorComparacion(int token);
    static bool iniciaValor(int token);
    static PosicionFuente posicionDe(const Token& token);

    NodoAgente parsearAgente();
    NodoRuntime parsearRuntime();
    NodoFlujo parsearFlujo();
    std::vector<NodoPaso> parsearListaPasos();
    NodoPaso parsearCadenaFlujo();
    NodoElementoFlujo parsearElementoFlujo();
    std::shared_ptr<NodoCondicional> parsearCondicional();
    NodoValor parsearValor();

    std::vector<std::string> parsearListaIdentificadores();
    std::vector<std::string> parsearListaPermisos();
    std::vector<std::string> parsearRestricciones();
    NodoDelegacion parsearDelegacion();
};

void imprimirAST(const NodoPrograma& programa);

#endif
