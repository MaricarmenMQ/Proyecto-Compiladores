#include "parser.h"

#include <iostream>
#include <sstream>

Parser::Parser(const std::vector<Token>& tokensEntrada) : tokens(tokensEntrada) {
    if (tokens.empty()) {
        throw ErrorSintaxis("El flujo de tokens esta vacio");
    }
}

const Token& Parser::actual() const {
    if (indice >= tokens.size()) return tokens.back();
    return tokens[indice];
}

const Token& Parser::anterior() const {
    return tokens[indice == 0 ? 0 : indice - 1];
}

bool Parser::comprobar(int token) const { return actual().codigo == token; }

bool Parser::aceptar(int token) {
    if (!comprobar(token)) return false;
    ++indice;
    return true;
}

Token Parser::consumir(int tokenEsperado, const std::string& mensaje) {
    if (actual().codigo == TOKEN_ERROR) {
        error(actual(), "no se puede continuar por un error lexico: " + actual().detalleError);
    }
    if (!comprobar(tokenEsperado)) error(actual(), mensaje);
    return tokens[indice++];
}

void Parser::error(const Token& token, const std::string& mensaje) const {
    std::ostringstream salida;
    salida << "Linea " << token.linea << ", columna " << token.columna
           << ": " << mensaje << " (se encontro '" << token.lexema
           << "', token " << nombreToken(token.codigo) << ")";
    throw ErrorSintaxis(salida.str());
}

bool Parser::esAccion(int token) {
    return token == RECIBIR || token == RESPONDER || token == DIFUNDIR ||
           token == ENVIAR || token == CONECTAR || token == ESCUCHAR ||
           token == DELEGA || token == COORDINA || token == SUPERVISA;
}

bool Parser::esOperadorComparacion(int token) {
    return token == IGUALIGUAL || token == DISTINTO || token == MAYOR ||
           token == MENOR || token == MAYORIGUAL || token == MENORIGUAL;
}

bool Parser::iniciaValor(int token) {
    return token == VAR || token == NUM || token == CADENA ||
           token == BOOLEANO || token == MENOS || token == NEGACION;
}

PosicionFuente Parser::posicionDe(const Token& token) {
    return {token.linea, token.columna};
}

NodoPrograma Parser::parsear() {
    NodoPrograma programa;
    if (comprobar(FIN)) {
        error(actual(), "el programa debe contener al menos un agente o runtime");
    }

    while (!comprobar(FIN)) {
        if (comprobar(AGENTE)) {
            programa.agentes.push_back(parsearAgente());
        } else if (comprobar(RUNTIME)) {
            programa.runtimes.push_back(parsearRuntime());
        } else {
            error(actual(), "se esperaba una declaracion 'agente' o 'runtime'");
        }
    }
    consumir(FIN, "se esperaba el fin de archivo");
    return programa;
}

NodoAgente Parser::parsearAgente() {
    NodoAgente nodo;
    const Token inicio = consumir(AGENTE, "se esperaba 'agente'");
    nodo.posicion = posicionDe(inicio);
    nodo.nombre = consumir(VAR, "se esperaba el nombre del agente").lexema;
    consumir(ALLAVE, "se esperaba '{' despues del nombre del agente");

    bool tieneObjetivo = false;
    while (!comprobar(CLLAVE)) {
        if (comprobar(FIN)) {
            error(actual(), "falta '}' para cerrar el agente '" + nodo.nombre + "'");
        }
        if (actual().codigo == TOKEN_ERROR) {
            error(actual(), "error lexico: " + actual().detalleError);
        }

        const Token campo = actual();
        nodo.camposDeclarados.push_back({campo.codigo, posicionDe(campo)});

        switch (campo.codigo) {
            case OBJETIVO: {
                if (tieneObjetivo) {
                    error(campo, "el campo obligatorio 'objetivo' no puede repetirse");
                }
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'objetivo'");
                nodo.objetivo = consumir(CADENA,
                    "se esperaba una cadena para el objetivo").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues del objetivo");
                tieneObjetivo = true;
                break;
            }
            case INTELIGENCIA:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'inteligencia'");
                nodo.inteligencia = consumir(VAR,
                    "se esperaba un identificador para la inteligencia").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de inteligencia");
                break;

            case MEMORIA:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'memoria'");
                if (!comprobar(PERSISTENTE) && !comprobar(COMPARTIDA) &&
                    !comprobar(SOLOECTURA)) {
                    error(actual(), "se esperaba 'persistente', 'compartida' o 'solo_lectura'");
                }
                nodo.memoria = tokens[indice++].lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de memoria");
                break;

            case RECIBIR:
            case CONECTAR:
            case ESCUCHAR: {
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de '" + campo.lexema + "'");
                const std::string valor = consumir(VAR,
                    "se esperaba un identificador despues de '" + campo.lexema + "'").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de '" + campo.lexema + "'");
                if (campo.codigo == RECIBIR) nodo.recibir = valor;
                if (campo.codigo == CONECTAR) nodo.conectar = valor;
                if (campo.codigo == ESCUCHAR) nodo.escuchar = valor;
                break;
            }

            case HERRAMIENTAS:
            case DEPENDEDE:
            case COORDINA:
            case SUPERVISA: {
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de '" + campo.lexema + "'");
                std::vector<std::string> lista = parsearListaIdentificadores();
                consumir(PUNTOYCOMA, "se esperaba ';' despues de '" + campo.lexema + "'");
                if (campo.codigo == HERRAMIENTAS) nodo.herramientas = std::move(lista);
                if (campo.codigo == DEPENDEDE) nodo.dependeDe = std::move(lista);
                if (campo.codigo == COORDINA) nodo.coordina = std::move(lista);
                if (campo.codigo == SUPERVISA) nodo.supervisa = std::move(lista);
                break;
            }

            case PERMISOS:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'permisos'");
                nodo.permisos = parsearListaPermisos();
                consumir(PUNTOYCOMA, "se esperaba ';' despues de permisos");
                break;

            case RESTRICCIONES:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'restricciones'");
                nodo.restricciones = parsearRestricciones();
                consumir(PUNTOYCOMA, "se esperaba ';' despues de restricciones");
                break;

            case DELEGA:
                nodo.delegaciones.push_back(parsearDelegacion());
                break;

            case FLUJO:
            case FLUJOD:
                nodo.flujos.push_back(parsearFlujo());
                break;

            default:
                error(campo, "campo no valido dentro de un agente");
        }
    }

    if (!tieneObjetivo) {
        error(actual(), "el agente '" + nodo.nombre + "' debe declarar exactamente un objetivo");
    }
    consumir(CLLAVE, "se esperaba '}' al final del agente");
    return nodo;
}

NodoRuntime Parser::parsearRuntime() {
    NodoRuntime nodo;
    const Token inicio = consumir(RUNTIME, "se esperaba 'runtime'");
    nodo.posicion = posicionDe(inicio);
    nodo.nombre = consumir(VAR, "se esperaba el nombre del runtime").lexema;
    consumir(ALLAVE, "se esperaba '{' despues del nombre del runtime");

    bool tieneCoordinador = false;
    while (!comprobar(CLLAVE)) {
        if (comprobar(FIN)) {
            error(actual(), "falta '}' para cerrar el runtime '" + nodo.nombre + "'");
        }
        const Token campo = actual();
        nodo.camposDeclarados.push_back({campo.codigo, posicionDe(campo)});

        switch (campo.codigo) {
            case COORDINADOR:
                if (tieneCoordinador) {
                    error(campo, "el campo obligatorio 'coordinador' no puede repetirse");
                }
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'coordinador'");
                nodo.coordinador = consumir(VAR,
                    "se esperaba el nombre de un agente coordinador").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de coordinador");
                tieneCoordinador = true;
                break;

            case DEPENDEDE:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'depende_de'");
                nodo.dependeDe = parsearListaIdentificadores();
                consumir(PUNTOYCOMA, "se esperaba ';' despues de depende_de");
                break;

            case MEMCOMP:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'memoria_compartida'");
                nodo.memoriaCompartida = consumir(BOOLEANO,
                    "se esperaba 'true' o 'false'").lexema == "true";
                nodo.tieneMemoriaCompartida = true;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de memoria_compartida");
                break;

            case PERIODICIDAD:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'periodicidad'");
                if (!comprobar(TIEMPOREAL) && !comprobar(NUM)) {
                    error(actual(), "se esperaba 'tiempo_real' o un numero");
                }
                nodo.periodicidad = tokens[indice++].lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de periodicidad");
                break;

            case ADAPTABILIDAD:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'adaptabilidad'");
                nodo.adaptabilidad = consumir(VAR,
                    "se esperaba un identificador para adaptabilidad").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de adaptabilidad");
                break;

            case POLITICAVAL:
                ++indice;
                consumir(DOSPUNTOS, "se esperaba ':' despues de 'politica_validacion'");
                nodo.politicaValidacion = consumir(REQAPROBACION,
                    "se esperaba 'requiere_aprobacion'").lexema;
                consumir(PUNTOYCOMA, "se esperaba ';' despues de politica_validacion");
                break;

            default:
                error(campo, "campo no valido dentro de un runtime");
        }
    }

    if (!tieneCoordinador) {
        error(actual(), "el runtime '" + nodo.nombre + "' debe declarar exactamente un coordinador");
    }
    consumir(CLLAVE, "se esperaba '}' al final del runtime");
    return nodo;
}

std::vector<std::string> Parser::parsearListaIdentificadores() {
    std::vector<std::string> lista;
    consumir(ACORCHETE, "se esperaba '['");
    if (aceptar(CCORCHETE)) return lista;

    lista.push_back(consumir(VAR, "se esperaba un identificador en la lista").lexema);
    while (aceptar(COMA)) {
        lista.push_back(consumir(VAR,
            "se esperaba un identificador despues de ','").lexema);
    }
    consumir(CCORCHETE, "se esperaba ']' al final de la lista");
    return lista;
}

std::vector<std::string> Parser::parsearListaPermisos() {
    std::vector<std::string> lista;
    consumir(ACORCHETE, "se esperaba '['");
    if (aceptar(CCORCHETE)) return lista;

    const auto leerPermiso = [&]() -> std::string {
        if (!comprobar(LEER) && !comprobar(ESCRITURA) &&
            !comprobar(USAR) && !comprobar(ENVIAR)) {
            error(actual(), "permiso invalido; se esperaba leer, escritura, usar o enviar");
        }
        return tokens[indice++].lexema;
    };

    lista.push_back(leerPermiso());
    while (aceptar(COMA)) lista.push_back(leerPermiso());
    consumir(CCORCHETE, "se esperaba ']' al final de permisos");
    return lista;
}

std::vector<std::string> Parser::parsearRestricciones() {
    std::vector<std::string> lista;
    const auto leerRestriccion = [&]() -> std::string {
        if (!comprobar(VAR) && !comprobar(REQAPROBACION)) {
            error(actual(), "se esperaba una restriccion o 'requiere_aprobacion'");
        }
        return tokens[indice++].lexema;
    };

    if (!aceptar(ACORCHETE)) {
        lista.push_back(leerRestriccion());
        return lista;
    }
    if (aceptar(CCORCHETE)) return lista;

    lista.push_back(leerRestriccion());
    while (aceptar(COMA)) lista.push_back(leerRestriccion());
    consumir(CCORCHETE, "se esperaba ']' al final de restricciones");
    return lista;
}

NodoDelegacion Parser::parsearDelegacion() {
    NodoDelegacion nodo;
    const Token inicio = consumir(DELEGA, "se esperaba 'delega'");
    nodo.posicion = posicionDe(inicio);
    consumir(DOSPUNTOS, "se esperaba ':' despues de 'delega'");
    nodo.tarea = consumir(VAR, "se esperaba la tarea delegada").lexema;
    consumir(FLECHA, "se esperaba '->' en la delegacion");
    nodo.agenteDestino = consumir(VAR, "se esperaba el agente destino").lexema;
    consumir(PUNTOYCOMA, "se esperaba ';' despues de la delegacion");
    return nodo;
}

NodoFlujo Parser::parsearFlujo() {
    NodoFlujo nodo;
    const Token inicio = actual();
    nodo.posicion = posicionDe(inicio);
    nodo.esDinamico = inicio.codigo == FLUJOD;
    ++indice;
    nodo.nombre = consumir(VAR, "se esperaba el nombre del flujo").lexema;
    consumir(ALLAVE, "se esperaba '{' al iniciar el flujo");
    nodo.pasos = parsearListaPasos();
    consumir(CLLAVE, "se esperaba '}' al terminar el flujo");
    return nodo;
}

std::vector<NodoPaso> Parser::parsearListaPasos() {
    std::vector<NodoPaso> pasos;
    while (!comprobar(CLLAVE)) {
        if (comprobar(FIN)) {
            error(actual(), "fin de archivo inesperado; falta cerrar el bloque con '}'");
        }
        if (comprobar(SI)) {
            NodoPaso paso;
            paso.esCondicional = true;
            paso.posicion = posicionDe(actual());
            paso.condicional = parsearCondicional();
            pasos.push_back(std::move(paso));
        } else if (comprobar(VAR) || esAccion(actual().codigo)) {
            pasos.push_back(parsearCadenaFlujo());
        } else {
            error(actual(), "se esperaba un paso de flujo o una sentencia 'si'");
        }
    }
    return pasos;
}

NodoPaso Parser::parsearCadenaFlujo() {
    NodoPaso paso;
    paso.posicion = posicionDe(actual());
    paso.cadena.push_back(parsearElementoFlujo());
    while (aceptar(FLECHA)) {
        paso.cadena.push_back(parsearElementoFlujo());
    }
    consumir(PUNTOYCOMA, "se esperaba ';' al final del paso de flujo");
    return paso;
}

NodoElementoFlujo Parser::parsearElementoFlujo() {
    NodoElementoFlujo elemento;
    const Token inicio = actual();
    elemento.posicion = posicionDe(inicio);

    if (comprobar(VAR)) {
        elemento.token = VAR;
        elemento.nombre = tokens[indice++].lexema;
        return elemento;
    }

    if (!esAccion(actual().codigo)) {
        error(actual(), "se esperaba un identificador o accion de flujo");
    }

    elemento.esAccion = true;
    elemento.token = actual().codigo;
    elemento.nombre = tokens[indice++].lexema;
    while (iniciaValor(actual().codigo)) {
        elemento.argumentos.push_back(parsearValor());
    }
    return elemento;
}

NodoValor Parser::parsearValor() {
    NodoValor valor;
    const Token inicio = actual();
    valor.posicion = posicionDe(inicio);

    if (aceptar(MENOS)) {
        const Token numero = consumir(NUM, "el signo '-' solo puede preceder a un numero");
        valor.token = NUM;
        valor.lexema = "-" + numero.lexema;
        return valor;
    }

    if (aceptar(NEGACION)) {
        if (!comprobar(VAR) && !comprobar(BOOLEANO)) {
            error(actual(), "el operador '!' solo puede preceder a un identificador o booleano");
        }
        const Token operando = tokens[indice++];
        valor.token = operando.codigo;
        valor.lexema = "!" + operando.lexema;
        return valor;
    }

    if (!comprobar(VAR) && !comprobar(NUM) &&
        !comprobar(CADENA) && !comprobar(BOOLEANO)) {
        error(actual(), "se esperaba un valor");
    }
    const Token token = tokens[indice++];
    valor.token = token.codigo;
    valor.lexema = token.lexema;
    return valor;
}

std::shared_ptr<NodoCondicional> Parser::parsearCondicional() {
    auto nodo = std::make_shared<NodoCondicional>();
    const Token inicio = consumir(SI, "se esperaba 'si'");
    nodo->posicion = posicionDe(inicio);

    const bool conParentesis = aceptar(APARENTESIS);
    nodo->izquierda = parsearValor();
    if (!esOperadorComparacion(actual().codigo)) {
        if (comprobar(IGUAL)) {
            error(actual(), "use '==' para comparar; '=' no es un operador de comparacion");
        }
        error(actual(), "se esperaba ==, !=, >, <, >= o <=");
    }
    nodo->operador = tokens[indice++].lexema;
    nodo->derecha = parsearValor();
    if (conParentesis) {
        consumir(CPARENTESIS, "se esperaba ')' al final de la condicion");
    }

    consumir(ALLAVE, "se esperaba '{' despues de la condicion");
    nodo->pasosSi = parsearListaPasos();
    consumir(CLLAVE, "se esperaba '}' al final del bloque 'si'");

    if (aceptar(SINO)) {
        nodo->tieneSino = true;
        if (comprobar(SI)) {
            nodo->sinoSi = parsearCondicional();
        } else {
            consumir(ALLAVE, "se esperaba '{' o 'si' despues de 'sino'");
            nodo->pasosSino = parsearListaPasos();
            consumir(CLLAVE, "se esperaba '}' al final del bloque 'sino'");
        }
    }
    return nodo;
}

static std::string sangria(int nivel) {
    return std::string(static_cast<std::size_t>(nivel) * 2, ' ');
}

static void imprimirLista(const std::string& nombre,
                          const std::vector<std::string>& valores, int nivel) {
    if (valores.empty()) return;
    std::cout << sangria(nivel) << nombre << ": [";
    for (std::size_t i = 0; i < valores.size(); ++i) {
        if (i > 0) std::cout << ", ";
        std::cout << valores[i];
    }
    std::cout << "]\n";
}

static void imprimirPasos(const std::vector<NodoPaso>& pasos, int nivel);

static void imprimirCondicional(const NodoCondicional& nodo, int nivel,
                                bool imprimirPrefijo = true) {
    if (imprimirPrefijo) std::cout << sangria(nivel);
    std::cout << "SI " << nodo.izquierda.lexema << ' ' << nodo.operador << ' '
              << nodo.derecha.lexema << " {\n";
    imprimirPasos(nodo.pasosSi, nivel + 1);
    std::cout << sangria(nivel) << "}\n";
    if (nodo.tieneSino) {
        std::cout << sangria(nivel) << "SINO ";
        if (nodo.sinoSi) {
            imprimirCondicional(*nodo.sinoSi, nivel, false);
        } else {
            std::cout << "{\n";
            imprimirPasos(nodo.pasosSino, nivel + 1);
            std::cout << sangria(nivel) << "}\n";
        }
    }
}

static void imprimirPasos(const std::vector<NodoPaso>& pasos, int nivel) {
    for (const NodoPaso& paso : pasos) {
        if (paso.esCondicional) {
            imprimirCondicional(*paso.condicional, nivel);
            continue;
        }
        std::cout << sangria(nivel);
        for (std::size_t i = 0; i < paso.cadena.size(); ++i) {
            if (i > 0) std::cout << " -> ";
            const NodoElementoFlujo& elemento = paso.cadena[i];
            std::cout << elemento.nombre;
            for (const NodoValor& argumento : elemento.argumentos) {
                std::cout << ' ' << argumento.lexema;
            }
        }
        std::cout << ";\n";
    }
}

void imprimirAST(const NodoPrograma& programa) {
    for (const NodoAgente& agente : programa.agentes) {
        std::cout << "AGENTE " << agente.nombre << "\n";
        std::cout << "  objetivo: " << agente.objetivo << "\n";
        if (!agente.inteligencia.empty()) std::cout << "  inteligencia: " << agente.inteligencia << "\n";
        if (!agente.memoria.empty()) std::cout << "  memoria: " << agente.memoria << "\n";
        if (!agente.recibir.empty()) std::cout << "  recibir: " << agente.recibir << "\n";
        if (!agente.conectar.empty()) std::cout << "  conectar: " << agente.conectar << "\n";
        if (!agente.escuchar.empty()) std::cout << "  escuchar: " << agente.escuchar << "\n";
        imprimirLista("herramientas", agente.herramientas, 1);
        imprimirLista("permisos", agente.permisos, 1);
        imprimirLista("restricciones", agente.restricciones, 1);
        imprimirLista("depende_de", agente.dependeDe, 1);
        imprimirLista("coordina", agente.coordina, 1);
        imprimirLista("supervisa", agente.supervisa, 1);
        for (const NodoDelegacion& delegacion : agente.delegaciones) {
            std::cout << "  delega: " << delegacion.tarea << " -> "
                      << delegacion.agenteDestino << "\n";
        }
        for (const NodoFlujo& flujo : agente.flujos) {
            std::cout << "  " << (flujo.esDinamico ? "FLUJO_DINAMICO " : "FLUJO ")
                      << flujo.nombre << " {\n";
            imprimirPasos(flujo.pasos, 2);
            std::cout << "  }\n";
        }
        std::cout << '\n';
    }

    for (const NodoRuntime& runtime : programa.runtimes) {
        std::cout << "RUNTIME " << runtime.nombre << "\n";
        std::cout << "  coordinador: " << runtime.coordinador << "\n";
        imprimirLista("depende_de", runtime.dependeDe, 1);
        if (runtime.tieneMemoriaCompartida) {
            std::cout << "  memoria_compartida: "
                      << (runtime.memoriaCompartida ? "true" : "false") << "\n";
        }
        if (!runtime.periodicidad.empty()) std::cout << "  periodicidad: " << runtime.periodicidad << "\n";
        if (!runtime.adaptabilidad.empty()) std::cout << "  adaptabilidad: " << runtime.adaptabilidad << "\n";
        if (!runtime.politicaValidacion.empty()) {
            std::cout << "  politica_validacion: " << runtime.politicaValidacion << "\n";
        }
        std::cout << '\n';
    }
}
