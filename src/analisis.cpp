#include "analisis.h"

#include <cctype>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <utility>

TablaSimbolos::TablaSimbolos() {
    insertar("agente", AGENTE, "palabra_reservada");
    insertar("runtime", RUNTIME, "palabra_reservada");
    insertar("objetivo", OBJETIVO, "palabra_reservada");
    insertar("inteligencia", INTELIGENCIA, "palabra_reservada");
    insertar("herramientas", HERRAMIENTAS, "palabra_reservada");
    insertar("memoria", MEMORIA, "palabra_reservada");
    insertar("permisos", PERMISOS, "palabra_reservada");
    insertar("restricciones", RESTRICCIONES, "palabra_reservada");
    insertar("depende_de", DEPENDEDE, "palabra_reservada");
    insertar("flujo", FLUJO, "palabra_reservada");
    insertar("flujo_dinamico", FLUJOD, "palabra_reservada");
    insertar("si", SI, "palabra_reservada");
    insertar("sino", SINO, "palabra_reservada");

    insertar("persistente", PERSISTENTE, "palabra_reservada");
    insertar("compartida", COMPARTIDA, "palabra_reservada");
    insertar("solo_lectura", SOLOECTURA, "palabra_reservada");
    insertar("escritura", ESCRITURA, "palabra_reservada");
    insertar("requiere_aprobacion", REQAPROBACION, "palabra_reservada");
    insertar("usar", USAR, "palabra_reservada");
    insertar("leer", LEER, "palabra_reservada");
    insertar("enviar", ENVIAR, "palabra_reservada");

    insertar("coordinador", COORDINADOR, "palabra_reservada");
    insertar("memoria_compartida", MEMCOMP, "palabra_reservada");
    insertar("periodicidad", PERIODICIDAD, "palabra_reservada");
    insertar("tiempo_real", TIEMPOREAL, "palabra_reservada");
    insertar("adaptabilidad", ADAPTABILIDAD, "palabra_reservada");
    insertar("politica_validacion", POLITICAVAL, "palabra_reservada");

    // "mensaje" no se reserva por ahora: puede usarse como identificador.
    insertar("recibir", RECIBIR, "palabra_reservada");
    insertar("responder", RESPONDER, "palabra_reservada");
    insertar("difundir", DIFUNDIR, "palabra_reservada");
    insertar("conectar", CONECTAR, "palabra_reservada");
    insertar("escuchar", ESCUCHAR, "palabra_reservada");
    insertar("delega", DELEGA, "palabra_reservada");
    insertar("coordina", COORDINA, "palabra_reservada");
    insertar("supervisa", SUPERVISA, "palabra_reservada");

    insertar("true", BOOLEANO, "booleano");
    insertar("false", BOOLEANO, "booleano");

    insertar("{", ALLAVE, "simbolo");
    insertar("}", CLLAVE, "simbolo");
    insertar("=", IGUAL, "operador_invalido_en_comparacion");
    insertar(">", MAYOR, "operador");
    insertar("<", MENOR, "operador");
    insertar(">=", MAYORIGUAL, "operador");
    insertar("<=", MENORIGUAL, "operador");
    insertar("==", IGUALIGUAL, "operador");
    insertar("!=", DISTINTO, "operador");
    insertar("-", MENOS, "operador");
    insertar("!", NEGACION, "operador");
    insertar("->", FLECHA, "operador");
    insertar("\xE2\x86\x92", FLECHA, "operador");
    insertar(":", DOSPUNTOS, "simbolo");
    insertar(",", COMA, "simbolo");
    insertar("(", APARENTESIS, "simbolo");
    insertar(")", CPARENTESIS, "simbolo");
    insertar("[", ACORCHETE, "simbolo");
    insertar("]", CCORCHETE, "simbolo");
    insertar(";", PUNTOYCOMA, "simbolo");
}

void TablaSimbolos::insertar(const std::string& lexema, int token,
                             const std::string& tipo) {
    tabla[lexema] = {lexema, token, tipo};
}

int TablaSimbolos::buscar(const std::string& lexema) const {
    const auto it = tabla.find(lexema);
    return it == tabla.end() ? -1 : it->second.token;
}

const Simbolo* TablaSimbolos::buscarSimbolo(const std::string& lexema) const {
    const auto it = tabla.find(lexema);
    return it == tabla.end() ? nullptr : &it->second;
}

Analisis::Analisis(std::string codigoFuente) : fuente(std::move(codigoFuente)) {
    // Visual Studio Code puede guardar archivos UTF-8 con BOM en Windows.
    // Se elimina para que los tres bytes iniciales no se interpreten como error léxico.
    if (fuente.size() >= 3 &&
        static_cast<unsigned char>(fuente[0]) == 0xEF &&
        static_cast<unsigned char>(fuente[1]) == 0xBB &&
        static_cast<unsigned char>(fuente[2]) == 0xBF) {
        fuente.erase(0, 3);
    }
}

Analisis Analisis::desdeArchivo(const std::string& ruta) {
    std::ifstream archivo(ruta, std::ios::binary);
    if (!archivo.is_open()) {
        throw std::runtime_error("No se pudo abrir el archivo: " + ruta);
    }
    std::ostringstream contenido;
    contenido << archivo.rdbuf();
    return Analisis(contenido.str());
}

bool Analisis::finDeEntrada() const { return pos >= fuente.size(); }
char Analisis::actual() const { return finDeEntrada() ? '\0' : fuente[pos]; }
char Analisis::siguiente() const {
    return pos + 1 < fuente.size() ? fuente[pos + 1] : '\0';
}

void Analisis::avanzar() {
    if (finDeEntrada()) return;
    if (fuente[pos] == '\n') {
        ++linea;
        columna = 1;
    } else {
        ++columna;
    }
    ++pos;
}

void Analisis::avanzarUtf8(std::size_t bytes) {
    pos += bytes;
    ++columna;
}

Token Analisis::crearToken(int codigo, const std::string& lexema,
                           const std::string& tipo, int lineaInicio,
                           int columnaInicio, const std::string& detalle) const {
    return {codigo, lexema, tipo, lineaInicio, columnaInicio, detalle};
}

Token Analisis::leerIdentificadorOPalabra() {
    const int lineaInicio = linea;
    const int columnaInicio = columna;
    std::string lexema;

    while (!finDeEntrada()) {
        const unsigned char c = static_cast<unsigned char>(actual());
        if (!std::isalnum(c) && actual() != '_') break;
        lexema += actual();
        avanzar();
    }

    const int codigo = tablaSimbolos.buscar(lexema);
    if (codigo >= 0) {
        const Simbolo* simbolo = tablaSimbolos.buscarSimbolo(lexema);
        return crearToken(codigo, lexema, simbolo->tipo,
                          lineaInicio, columnaInicio);
    }
    return crearToken(VAR, lexema, "identificador", lineaInicio, columnaInicio);
}

Token Analisis::leerNumero() {
    const int lineaInicio = linea;
    const int columnaInicio = columna;
    std::string lexema;
    bool decimal = false;

    while (!finDeEntrada()) {
        if (std::isdigit(static_cast<unsigned char>(actual()))) {
            lexema += actual();
            avanzar();
            continue;
        }
        if (actual() == '.' && !decimal &&
            std::isdigit(static_cast<unsigned char>(siguiente()))) {
            decimal = true;
            lexema += actual();
            avanzar();
            continue;
        }
        break;
    }
    return crearToken(NUM, lexema, decimal ? "decimal" : "entero",
                      lineaInicio, columnaInicio);
}

Token Analisis::leerCadena() {
    const int lineaInicio = linea;
    const int columnaInicio = columna;
    std::string contenido;
    avanzar();

    while (!finDeEntrada() && actual() != '"') {
        if (actual() == '\n' || actual() == '\r') {
            return crearToken(TOKEN_ERROR, contenido, "error_lexico",
                              lineaInicio, columnaInicio,
                              "cadena sin cerrar antes del fin de linea");
        }
        if (actual() == '\\') {
            contenido += actual();
            avanzar();
            if (finDeEntrada()) {
                return crearToken(TOKEN_ERROR, contenido, "error_lexico",
                                  lineaInicio, columnaInicio,
                                  "cadena sin cerrar despues de una secuencia de escape");
            }
            contenido += actual();
            avanzar();
            continue;
        }
        contenido += actual();
        avanzar();
    }

    if (finDeEntrada()) {
        return crearToken(TOKEN_ERROR, contenido, "error_lexico",
                          lineaInicio, columnaInicio,
                          "cadena sin comilla de cierre");
    }

    avanzar();
    return crearToken(CADENA, "\"" + contenido + "\"", "cadena",
                      lineaInicio, columnaInicio);
}

Token Analisis::leerFlechaUnicode() {
    const int lineaInicio = linea;
    const int columnaInicio = columna;
    avanzarUtf8(3);
    return crearToken(FLECHA, "\xE2\x86\x92", "operador",
                      lineaInicio, columnaInicio);
}

Token Analisis::leerSigno() {
    const int lineaInicio = linea;
    const int columnaInicio = columna;
    const std::string lexema(1, actual());
    avanzar();

    const int codigo = tablaSimbolos.buscar(lexema);
    if (codigo >= 0) {
        const Simbolo* simbolo = tablaSimbolos.buscarSimbolo(lexema);
        return crearToken(codigo, lexema, simbolo->tipo,
                          lineaInicio, columnaInicio);
    }
    return crearToken(TOKEN_ERROR, lexema, "error_lexico",
                      lineaInicio, columnaInicio,
                      "caracter no reconocido");
}

Token Analisis::siguienteToken() {
    while (true) {
        while (!finDeEntrada() &&
               std::isspace(static_cast<unsigned char>(actual()))) {
            avanzar();
        }

        if (finDeEntrada()) {
            return crearToken(FIN, "<EOF>", "fin", linea, columna);
        }

        if (actual() == '/' && siguiente() == '/') {
            while (!finDeEntrada() && actual() != '\n') avanzar();
            continue;
        }

        if (actual() == '/' && siguiente() == '*') {
            const int lineaInicio = linea;
            const int columnaInicio = columna;
            avanzar();
            avanzar();
            bool cerrado = false;
            while (!finDeEntrada()) {
                if (actual() == '*' && siguiente() == '/') {
                    avanzar();
                    avanzar();
                    cerrado = true;
                    break;
                }
                avanzar();
            }
            if (!cerrado) {
                return crearToken(TOKEN_ERROR, "/*", "error_lexico",
                                  lineaInicio, columnaInicio,
                                  "comentario de bloque sin cerrar");
            }
            continue;
        }
        break;
    }

    const char c = actual();
    const int lineaInicio = linea;
    const int columnaInicio = columna;

    const auto tokenDoble = [&](int codigo, const char* lexema) {
        avanzar();
        avanzar();
        return crearToken(codigo, lexema, "operador",
                          lineaInicio, columnaInicio);
    };

    if (c == '-' && siguiente() == '>') return tokenDoble(FLECHA, "->");
    if (c == '>' && siguiente() == '=') return tokenDoble(MAYORIGUAL, ">=");
    if (c == '<' && siguiente() == '=') return tokenDoble(MENORIGUAL, "<=");
    if (c == '=' && siguiente() == '=') return tokenDoble(IGUALIGUAL, "==");
    if (c == '!' && siguiente() == '=') return tokenDoble(DISTINTO, "!=");

    if (static_cast<unsigned char>(c) == 0xE2 && pos + 2 < fuente.size() &&
        static_cast<unsigned char>(fuente[pos + 1]) == 0x86 &&
        static_cast<unsigned char>(fuente[pos + 2]) == 0x92) {
        return leerFlechaUnicode();
    }

    if (c == '"') return leerCadena();
    if (std::isdigit(static_cast<unsigned char>(c))) return leerNumero();
    if (std::isalpha(static_cast<unsigned char>(c)) || c == '_') {
        return leerIdentificadorOPalabra();
    }
    return leerSigno();
}

std::vector<Token> Analisis::tokenizar() {
    std::vector<Token> tokens;
    while (true) {
        Token token = siguienteToken();
        tokens.push_back(token);
        if (token.codigo == FIN || token.codigo == TOKEN_ERROR) break;
    }
    return tokens;
}

bool Analisis::contieneError(const std::vector<Token>& tokens) {
    for (const Token& token : tokens) {
        if (token.codigo == TOKEN_ERROR) return true;
    }
    return false;
}

void Analisis::imprimirTokens(const std::vector<Token>& tokens) {
    std::cout << std::left
              << std::setw(8) << "LINEA"
              << std::setw(10) << "COLUMNA"
              << std::setw(20) << "TOKEN"
              << std::setw(34) << "LEXEMA"
              << "TIPO\n";
    std::cout << std::string(88, '-') << '\n';

    for (const Token& token : tokens) {
        std::cout << std::left
                  << std::setw(8) << token.linea
                  << std::setw(10) << token.columna
                  << std::setw(20) << nombreToken(token.codigo)
                  << std::setw(34) << token.lexema
                  << token.tipo << '\n';
        if (token.codigo == TOKEN_ERROR && !token.detalleError.empty()) {
            std::cout << "  Error: " << token.detalleError << '\n';
        }
    }
}
