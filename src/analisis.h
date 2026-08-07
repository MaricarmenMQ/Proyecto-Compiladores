#ifndef ANALISIS_H
#define ANALISIS_H

#include <map>
#include <string>
#include <vector>
#include "tokens.h"

struct Simbolo {
    std::string lexema;
    int token;
    std::string tipo;
};

struct Token {
    int codigo = TOKEN_ERROR;
    std::string lexema;
    std::string tipo;
    int linea = 1;
    int columna = 1;
    std::string detalleError;
};

class TablaSimbolos {
public:
    TablaSimbolos();
    int buscar(const std::string& lexema) const;
    const Simbolo* buscarSimbolo(const std::string& lexema) const;

private:
    std::map<std::string, Simbolo> tabla;
    void insertar(const std::string& lexema, int token, const std::string& tipo);
};

class Analisis {
public:
    explicit Analisis(std::string codigoFuente);

    static Analisis desdeArchivo(const std::string& ruta);
    Token siguienteToken();
    std::vector<Token> tokenizar();

    static bool contieneError(const std::vector<Token>& tokens);
    static void imprimirTokens(const std::vector<Token>& tokens);

private:
    TablaSimbolos tablaSimbolos;
    std::string fuente;
    std::size_t pos = 0;
    int linea = 1;
    int columna = 1;

    bool finDeEntrada() const;
    char actual() const;
    char siguiente() const;
    void avanzar();
    void avanzarUtf8(std::size_t bytes);

    Token crearToken(int codigo, const std::string& lexema,
                     const std::string& tipo, int lineaInicio,
                     int columnaInicio, const std::string& detalle = "") const;
    Token leerIdentificadorOPalabra();
    Token leerNumero();
    Token leerCadena();
    Token leerFlechaUnicode();
    Token leerSigno();
};

#endif
