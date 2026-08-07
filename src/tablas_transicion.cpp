#include "tablas_transicion.h"

#include <iostream>
#include <sstream>

namespace {

enum { T0, T1, T2, T3, T_ACEPTA, T_ESTADOS };
enum { V0, V1, V2, V3, V_ACEPTA, V_ESTADOS };
enum { ME0, ME1, ME2, ME3, ME_ACEPTA, ME_ESTADOS };
enum { PV0, PV1, PV2, PV3, PV_ACEPTA, PV_ESTADOS };
enum { L0, L1, L2, L_PRIMERO, L_ITEM, L_ESPERA_ITEM, L_CIERRE,
       L_ACEPTA, L_ESTADOS };
enum { RE0, RE1, RE2, RE_PRIMERO, RE_ITEM, RE_ESPERA_ITEM,
       RE_CIERRA_LISTA, RE_ESCALAR, RE_ACEPTA, RE_ESTADOS };
enum { PM0, PM1, PM2, PM_PRIMERO, PM_ITEM, PM_ESPERA_ITEM,
       PM_CIERRE, PM_ACEPTA, PM_ESTADOS };
enum { B0, B1, B2, B3, B_ACEPTA, B_ESTADOS };
enum { Q0, Q1, Q2, Q3, Q_ACEPTA, Q_ESTADOS };
enum { DG0, DG1, DG2, DG3, DG4, DG5, DG_ACEPTA, DG_ESTADOS };
enum { CF0, CF_ACCION, CF_ARGUMENTOS, CF_MENOS, CF_NEGACION,
       CF_IDENTIFICADOR, CF_ACEPTA, CF_ESTADOS };
enum {
    D0, D_LP_INICIO,
    D_LMENOS_NO, D_LNEG_NO, D_OP_NO,
    D_LMENOS_P, D_LNEG_P, D_OP_P,
    D_RINICIO_NO, D_RMENOS_NO, D_RNEG_NO,
    D_RINICIO_P, D_RMENOS_P, D_RNEG_P, D_CIERRA_P,
    D_ACEPTA, D_ESTADOS
};
enum { F0, F1, F2, F3, F4, F_ACEPTA, F_ESTADOS };
enum { LS0, LS_ACEPTA, LS_ESTADOS };
enum { S0, S1, S2, S3, S4, S5, S6, S7, S8, S_ACEPTA, S_ESTADOS };
enum { A0, A1, A2, A_SIN_OBJETIVO, A_CON_OBJETIVO, A_ACEPTA, A_ESTADOS };
enum { R0, R1, R2, R_SIN_COORDINADOR, R_CON_COORDINADOR,
       R_ACEPTA, R_ESTADOS };


} // namespace

TablasSintaxis::TablasSintaxis()
    : transiciones(MAQUINA_COUNT), retornos(MAQUINA_COUNT),
      aceptaciones(MAQUINA_COUNT, -1) {
    crearMaquina(M_CAMPO_TEXTO, T_ESTADOS, T_ACEPTA);
    crearMaquina(M_CAMPO_VAR, V_ESTADOS, V_ACEPTA);
    crearMaquina(M_CAMPO_MEMORIA, ME_ESTADOS, ME_ACEPTA);
    crearMaquina(M_CAMPO_POLITICA, PV_ESTADOS, PV_ACEPTA);
    crearMaquina(M_CAMPO_LISTA, L_ESTADOS, L_ACEPTA);
    crearMaquina(M_CAMPO_RESTRICCIONES, RE_ESTADOS, RE_ACEPTA);
    crearMaquina(M_CAMPO_PERMISOS, PM_ESTADOS, PM_ACEPTA);
    crearMaquina(M_CAMPO_BOOL, B_ESTADOS, B_ACEPTA);
    crearMaquina(M_CAMPO_PERIODICIDAD, Q_ESTADOS, Q_ACEPTA);
    crearMaquina(M_CAMPO_DELEGA, DG_ESTADOS, DG_ACEPTA);
    crearMaquina(M_CADENA_FLUJO, CF_ESTADOS, CF_ACEPTA);
    crearMaquina(M_CONDICION, D_ESTADOS, D_ACEPTA);
    crearMaquina(M_FLUJO, F_ESTADOS, F_ACEPTA);
    crearMaquina(M_LISTA_PASOS, LS_ESTADOS, LS_ACEPTA);
    crearMaquina(M_CONDICIONAL, S_ESTADOS, S_ACEPTA);
    crearMaquina(M_AGENTE, A_ESTADOS, A_ACEPTA);
    crearMaquina(M_RUNTIME, R_ESTADOS, R_ACEPTA);

    llenarCampoTexto();
    llenarCampoVar();
    llenarCampoMemoria();
    llenarCampoPolitica();
    llenarCampoLista();
    llenarCampoRestricciones();
    llenarCampoPermisos();
    llenarCampoBool();
    llenarCampoPeriodicidad();
    llenarCampoDelega();
    llenarCadenaFlujo();
    llenarCondicion();
    llenarFlujo();
    llenarListaPasos();
    llenarCondicional();
    llenarAgente();
    llenarRuntime();
}

void TablasSintaxis::crearMaquina(Maquina maquina, int cantidad,
                                  int estadoAceptacion) {
    const auto numeroEstados = static_cast<std::size_t>(cantidad);
    const auto numeroTokens = static_cast<std::size_t>(MAXTOK);
    transiciones[maquina].assign(numeroEstados,
        std::vector<int>(numeroTokens, ERROR_TRANSICION));
    retornos[maquina].assign(numeroEstados,
        std::vector<int>(numeroTokens, ERROR_TRANSICION));
    aceptaciones[maquina] = estadoAceptacion;
}

void TablasSintaxis::poner(Maquina maquina, int estado, int token, int destino) {
    transiciones[maquina][static_cast<std::size_t>(estado)]
                [static_cast<std::size_t>(token)] = destino;
}

void TablasSintaxis::llamar(Maquina maquina, int estado, int token,
                            Maquina submaquina, int estadoRetorno) {
    transiciones[maquina][static_cast<std::size_t>(estado)]
                [static_cast<std::size_t>(token)] = LLAMAR(submaquina);
    retornos[maquina][static_cast<std::size_t>(estado)]
            [static_cast<std::size_t>(token)] = estadoRetorno;
}

int TablasSintaxis::obtenerTransicion(Maquina maquina, int estado, int token) const {
    if (maquina < 0 || maquina >= MAQUINA_COUNT ||
        estado < 0 || estado >= cantidadEstados(maquina) ||
        token < 0 || token >= MAXTOK) {
        return ERROR_TRANSICION;
    }
    return transiciones[maquina][static_cast<std::size_t>(estado)]
                       [static_cast<std::size_t>(token)];
}

int TablasSintaxis::obtenerRetorno(Maquina maquina, int estado, int token) const {
    if (maquina < 0 || maquina >= MAQUINA_COUNT ||
        estado < 0 || estado >= cantidadEstados(maquina) ||
        token < 0 || token >= MAXTOK) {
        return ERROR_TRANSICION;
    }
    return retornos[maquina][static_cast<std::size_t>(estado)]
                   [static_cast<std::size_t>(token)];
}

int TablasSintaxis::estadoAceptacion(Maquina maquina) const {
    return aceptaciones[maquina];
}

int TablasSintaxis::cantidadEstados(Maquina maquina) const {
    return static_cast<int>(transiciones[maquina].size());
}

const char* TablasSintaxis::nombreMaquina(Maquina maquina) {
    static const char* nombres[] = {
        "CAMPO_TEXTO", "CAMPO_VAR", "CAMPO_MEMORIA", "CAMPO_POLITICA",
        "CAMPO_LISTA", "CAMPO_RESTRICCIONES", "CAMPO_PERMISOS",
        "CAMPO_BOOL", "CAMPO_PERIODICIDAD", "CAMPO_DELEGA",
        "CADENA_FLUJO", "CONDICION", "FLUJO", "LISTA_PASOS",
        "CONDICIONAL", "AGENTE", "RUNTIME"
    };
    return (maquina >= 0 && maquina < MAQUINA_COUNT) ? nombres[maquina] : "DESCONOCIDA";
}

void TablasSintaxis::llenarCampoTexto() {
    poner(M_CAMPO_TEXTO, T0, OBJETIVO, T1);
    poner(M_CAMPO_TEXTO, T1, DOSPUNTOS, T2);
    poner(M_CAMPO_TEXTO, T2, CADENA, T3);
    poner(M_CAMPO_TEXTO, T3, PUNTOYCOMA, T_ACEPTA);
}

void TablasSintaxis::llenarCampoVar() {
    for (int token : {INTELIGENCIA, RECIBIR, CONECTAR, ESCUCHAR,
                      ADAPTABILIDAD, COORDINADOR}) {
        poner(M_CAMPO_VAR, V0, token, V1);
    }
    poner(M_CAMPO_VAR, V1, DOSPUNTOS, V2);
    poner(M_CAMPO_VAR, V2, VAR, V3);
    poner(M_CAMPO_VAR, V3, PUNTOYCOMA, V_ACEPTA);
}

void TablasSintaxis::llenarCampoMemoria() {
    poner(M_CAMPO_MEMORIA, ME0, MEMORIA, ME1);
    poner(M_CAMPO_MEMORIA, ME1, DOSPUNTOS, ME2);
    poner(M_CAMPO_MEMORIA, ME2, PERSISTENTE, ME3);
    poner(M_CAMPO_MEMORIA, ME2, COMPARTIDA, ME3);
    poner(M_CAMPO_MEMORIA, ME2, SOLOECTURA, ME3);
    poner(M_CAMPO_MEMORIA, ME3, PUNTOYCOMA, ME_ACEPTA);
}

void TablasSintaxis::llenarCampoPolitica() {
    poner(M_CAMPO_POLITICA, PV0, POLITICAVAL, PV1);
    poner(M_CAMPO_POLITICA, PV1, DOSPUNTOS, PV2);
    poner(M_CAMPO_POLITICA, PV2, REQAPROBACION, PV3);
    poner(M_CAMPO_POLITICA, PV3, PUNTOYCOMA, PV_ACEPTA);
}

void TablasSintaxis::llenarCampoLista() {
    for (int token : {HERRAMIENTAS, DEPENDEDE, COORDINA, SUPERVISA}) {
        poner(M_CAMPO_LISTA, L0, token, L1);
    }
    poner(M_CAMPO_LISTA, L1, DOSPUNTOS, L2);
    poner(M_CAMPO_LISTA, L2, ACORCHETE, L_PRIMERO);
    poner(M_CAMPO_LISTA, L_PRIMERO, CCORCHETE, L_CIERRE);
    poner(M_CAMPO_LISTA, L_PRIMERO, VAR, L_ITEM);
    poner(M_CAMPO_LISTA, L_ITEM, COMA, L_ESPERA_ITEM);
    poner(M_CAMPO_LISTA, L_ITEM, CCORCHETE, L_CIERRE);
    poner(M_CAMPO_LISTA, L_ESPERA_ITEM, VAR, L_ITEM);
    poner(M_CAMPO_LISTA, L_CIERRE, PUNTOYCOMA, L_ACEPTA);
}

void TablasSintaxis::llenarCampoRestricciones() {
    poner(M_CAMPO_RESTRICCIONES, RE0, RESTRICCIONES, RE1);
    poner(M_CAMPO_RESTRICCIONES, RE1, DOSPUNTOS, RE2);
    poner(M_CAMPO_RESTRICCIONES, RE2, VAR, RE_ESCALAR);
    poner(M_CAMPO_RESTRICCIONES, RE2, REQAPROBACION, RE_ESCALAR);
    poner(M_CAMPO_RESTRICCIONES, RE2, ACORCHETE, RE_PRIMERO);
    poner(M_CAMPO_RESTRICCIONES, RE_PRIMERO, CCORCHETE, RE_CIERRA_LISTA);
    poner(M_CAMPO_RESTRICCIONES, RE_PRIMERO, VAR, RE_ITEM);
    poner(M_CAMPO_RESTRICCIONES, RE_PRIMERO, REQAPROBACION, RE_ITEM);
    poner(M_CAMPO_RESTRICCIONES, RE_ITEM, COMA, RE_ESPERA_ITEM);
    poner(M_CAMPO_RESTRICCIONES, RE_ITEM, CCORCHETE, RE_CIERRA_LISTA);
    poner(M_CAMPO_RESTRICCIONES, RE_ESPERA_ITEM, VAR, RE_ITEM);
    poner(M_CAMPO_RESTRICCIONES, RE_ESPERA_ITEM, REQAPROBACION, RE_ITEM);
    poner(M_CAMPO_RESTRICCIONES, RE_CIERRA_LISTA, PUNTOYCOMA, RE_ACEPTA);
    poner(M_CAMPO_RESTRICCIONES, RE_ESCALAR, PUNTOYCOMA, RE_ACEPTA);
}

void TablasSintaxis::llenarCampoPermisos() {
    poner(M_CAMPO_PERMISOS, PM0, PERMISOS, PM1);
    poner(M_CAMPO_PERMISOS, PM1, DOSPUNTOS, PM2);
    poner(M_CAMPO_PERMISOS, PM2, ACORCHETE, PM_PRIMERO);
    poner(M_CAMPO_PERMISOS, PM_PRIMERO, CCORCHETE, PM_CIERRE);
    for (int token : {LEER, ESCRITURA, USAR, ENVIAR}) {
        poner(M_CAMPO_PERMISOS, PM_PRIMERO, token, PM_ITEM);
        poner(M_CAMPO_PERMISOS, PM_ESPERA_ITEM, token, PM_ITEM);
    }
    poner(M_CAMPO_PERMISOS, PM_ITEM, COMA, PM_ESPERA_ITEM);
    poner(M_CAMPO_PERMISOS, PM_ITEM, CCORCHETE, PM_CIERRE);
    poner(M_CAMPO_PERMISOS, PM_CIERRE, PUNTOYCOMA, PM_ACEPTA);
}

void TablasSintaxis::llenarCampoBool() {
    poner(M_CAMPO_BOOL, B0, MEMCOMP, B1);
    poner(M_CAMPO_BOOL, B1, DOSPUNTOS, B2);
    poner(M_CAMPO_BOOL, B2, BOOLEANO, B3);
    poner(M_CAMPO_BOOL, B3, PUNTOYCOMA, B_ACEPTA);
}

void TablasSintaxis::llenarCampoPeriodicidad() {
    poner(M_CAMPO_PERIODICIDAD, Q0, PERIODICIDAD, Q1);
    poner(M_CAMPO_PERIODICIDAD, Q1, DOSPUNTOS, Q2);
    poner(M_CAMPO_PERIODICIDAD, Q2, TIEMPOREAL, Q3);
    poner(M_CAMPO_PERIODICIDAD, Q2, NUM, Q3);
    poner(M_CAMPO_PERIODICIDAD, Q3, PUNTOYCOMA, Q_ACEPTA);
}

void TablasSintaxis::llenarCampoDelega() {
    poner(M_CAMPO_DELEGA, DG0, DELEGA, DG1);
    poner(M_CAMPO_DELEGA, DG1, DOSPUNTOS, DG2);
    poner(M_CAMPO_DELEGA, DG2, VAR, DG3);
    poner(M_CAMPO_DELEGA, DG3, FLECHA, DG4);
    poner(M_CAMPO_DELEGA, DG4, VAR, DG5);
    poner(M_CAMPO_DELEGA, DG5, PUNTOYCOMA, DG_ACEPTA);
}

void TablasSintaxis::llenarCadenaFlujo() {
    poner(M_CADENA_FLUJO, CF0, VAR, CF_IDENTIFICADOR);
    for (int token : {RECIBIR, RESPONDER, DIFUNDIR, ENVIAR, CONECTAR,
                      ESCUCHAR, DELEGA, COORDINA, SUPERVISA}) {
        poner(M_CADENA_FLUJO, CF0, token, CF_ACCION);
    }

    poner(M_CADENA_FLUJO, CF_IDENTIFICADOR, FLECHA, CF0);
    poner(M_CADENA_FLUJO, CF_IDENTIFICADOR, PUNTOYCOMA, CF_ACEPTA);

    for (int estado : {CF_ACCION, CF_ARGUMENTOS}) {
        poner(M_CADENA_FLUJO, estado, VAR, CF_ARGUMENTOS);
        poner(M_CADENA_FLUJO, estado, NUM, CF_ARGUMENTOS);
        poner(M_CADENA_FLUJO, estado, CADENA, CF_ARGUMENTOS);
        poner(M_CADENA_FLUJO, estado, BOOLEANO, CF_ARGUMENTOS);
        poner(M_CADENA_FLUJO, estado, MENOS, CF_MENOS);
        poner(M_CADENA_FLUJO, estado, NEGACION, CF_NEGACION);
        poner(M_CADENA_FLUJO, estado, FLECHA, CF0);
        poner(M_CADENA_FLUJO, estado, PUNTOYCOMA, CF_ACEPTA);
    }
    poner(M_CADENA_FLUJO, CF_MENOS, NUM, CF_ARGUMENTOS);
    poner(M_CADENA_FLUJO, CF_NEGACION, VAR, CF_ARGUMENTOS);
    poner(M_CADENA_FLUJO, CF_NEGACION, BOOLEANO, CF_ARGUMENTOS);
}

void TablasSintaxis::llenarCondicion() {
    const auto valores = [&](int estado, int destino) {
        poner(M_CONDICION, estado, VAR, destino);
        poner(M_CONDICION, estado, NUM, destino);
        poner(M_CONDICION, estado, CADENA, destino);
        poner(M_CONDICION, estado, BOOLEANO, destino);
    };
    const auto operadores = [&](int estado, int destino) {
        for (int token : {IGUALIGUAL, DISTINTO, MAYOR, MENOR,
                          MAYORIGUAL, MENORIGUAL}) {
            poner(M_CONDICION, estado, token, destino);
        }
    };

    poner(M_CONDICION, D0, APARENTESIS, D_LP_INICIO);
    valores(D0, D_OP_NO);
    poner(M_CONDICION, D0, MENOS, D_LMENOS_NO);
    poner(M_CONDICION, D0, NEGACION, D_LNEG_NO);
    poner(M_CONDICION, D_LMENOS_NO, NUM, D_OP_NO);
    poner(M_CONDICION, D_LNEG_NO, VAR, D_OP_NO);
    poner(M_CONDICION, D_LNEG_NO, BOOLEANO, D_OP_NO);

    valores(D_LP_INICIO, D_OP_P);
    poner(M_CONDICION, D_LP_INICIO, MENOS, D_LMENOS_P);
    poner(M_CONDICION, D_LP_INICIO, NEGACION, D_LNEG_P);
    poner(M_CONDICION, D_LMENOS_P, NUM, D_OP_P);
    poner(M_CONDICION, D_LNEG_P, VAR, D_OP_P);
    poner(M_CONDICION, D_LNEG_P, BOOLEANO, D_OP_P);

    operadores(D_OP_NO, D_RINICIO_NO);
    operadores(D_OP_P, D_RINICIO_P);

    valores(D_RINICIO_NO, D_ACEPTA);
    poner(M_CONDICION, D_RINICIO_NO, MENOS, D_RMENOS_NO);
    poner(M_CONDICION, D_RINICIO_NO, NEGACION, D_RNEG_NO);
    poner(M_CONDICION, D_RMENOS_NO, NUM, D_ACEPTA);
    poner(M_CONDICION, D_RNEG_NO, VAR, D_ACEPTA);
    poner(M_CONDICION, D_RNEG_NO, BOOLEANO, D_ACEPTA);

    valores(D_RINICIO_P, D_CIERRA_P);
    poner(M_CONDICION, D_RINICIO_P, MENOS, D_RMENOS_P);
    poner(M_CONDICION, D_RINICIO_P, NEGACION, D_RNEG_P);
    poner(M_CONDICION, D_RMENOS_P, NUM, D_CIERRA_P);
    poner(M_CONDICION, D_RNEG_P, VAR, D_CIERRA_P);
    poner(M_CONDICION, D_RNEG_P, BOOLEANO, D_CIERRA_P);
    poner(M_CONDICION, D_CIERRA_P, CPARENTESIS, D_ACEPTA);
}

void TablasSintaxis::llenarFlujo() {
    poner(M_FLUJO, F0, FLUJO, F1);
    poner(M_FLUJO, F0, FLUJOD, F1);
    poner(M_FLUJO, F1, VAR, F2);
    poner(M_FLUJO, F2, ALLAVE, F3);
    llamar(M_FLUJO, F3, COMODIN, M_LISTA_PASOS, F4);
    poner(M_FLUJO, F4, CLLAVE, F_ACEPTA);
}

void TablasSintaxis::llenarListaPasos() {
    llamar(M_LISTA_PASOS, LS0, VAR, M_CADENA_FLUJO, LS0);
    for (int token : {RECIBIR, RESPONDER, DIFUNDIR, ENVIAR, CONECTAR,
                      ESCUCHAR, DELEGA, COORDINA, SUPERVISA}) {
        llamar(M_LISTA_PASOS, LS0, token, M_CADENA_FLUJO, LS0);
    }
    llamar(M_LISTA_PASOS, LS0, SI, M_CONDICIONAL, LS0);
    poner(M_LISTA_PASOS, LS0, CLLAVE, EPSILON(LS_ACEPTA));
}

void TablasSintaxis::llenarCondicional() {
    poner(M_CONDICIONAL, S0, SI, S1);
    llamar(M_CONDICIONAL, S1, COMODIN, M_CONDICION, S2);
    poner(M_CONDICIONAL, S2, ALLAVE, S3);
    llamar(M_CONDICIONAL, S3, COMODIN, M_LISTA_PASOS, S4);
    poner(M_CONDICIONAL, S4, CLLAVE, S5);
    poner(M_CONDICIONAL, S5, SINO, S6);
    poner(M_CONDICIONAL, S5, COMODIN, EPSILON(S_ACEPTA));
    llamar(M_CONDICIONAL, S6, SI, M_CONDICIONAL, S_ACEPTA);
    poner(M_CONDICIONAL, S6, ALLAVE, S7);
    llamar(M_CONDICIONAL, S7, COMODIN, M_LISTA_PASOS, S8);
    poner(M_CONDICIONAL, S8, CLLAVE, S_ACEPTA);
}

void TablasSintaxis::llenarAgente() {
    poner(M_AGENTE, A0, AGENTE, A1);
    poner(M_AGENTE, A1, VAR, A2);
    poner(M_AGENTE, A2, ALLAVE, A_SIN_OBJETIVO);

    llamar(M_AGENTE, A_SIN_OBJETIVO, OBJETIVO,
           M_CAMPO_TEXTO, A_CON_OBJETIVO);

    const auto llenarCampos = [&](int estado) {
        for (int token : {INTELIGENCIA, RECIBIR, CONECTAR, ESCUCHAR}) {
            llamar(M_AGENTE, estado, token, M_CAMPO_VAR, estado);
        }
        llamar(M_AGENTE, estado, MEMORIA, M_CAMPO_MEMORIA, estado);
        for (int token : {HERRAMIENTAS, DEPENDEDE, COORDINA, SUPERVISA}) {
            llamar(M_AGENTE, estado, token, M_CAMPO_LISTA, estado);
        }
        llamar(M_AGENTE, estado, RESTRICCIONES,
               M_CAMPO_RESTRICCIONES, estado);
        llamar(M_AGENTE, estado, PERMISOS, M_CAMPO_PERMISOS, estado);
        llamar(M_AGENTE, estado, DELEGA, M_CAMPO_DELEGA, estado);
        llamar(M_AGENTE, estado, FLUJO, M_FLUJO, estado);
        llamar(M_AGENTE, estado, FLUJOD, M_FLUJO, estado);
    };

    llenarCampos(A_SIN_OBJETIVO);
    llenarCampos(A_CON_OBJETIVO);
    poner(M_AGENTE, A_CON_OBJETIVO, CLLAVE, A_ACEPTA);
}

void TablasSintaxis::llenarRuntime() {
    poner(M_RUNTIME, R0, RUNTIME, R1);
    poner(M_RUNTIME, R1, VAR, R2);
    poner(M_RUNTIME, R2, ALLAVE, R_SIN_COORDINADOR);
    llamar(M_RUNTIME, R_SIN_COORDINADOR, COORDINADOR,
           M_CAMPO_VAR, R_CON_COORDINADOR);

    const auto llenarCampos = [&](int estado) {
        llamar(M_RUNTIME, estado, DEPENDEDE, M_CAMPO_LISTA, estado);
        llamar(M_RUNTIME, estado, MEMCOMP, M_CAMPO_BOOL, estado);
        llamar(M_RUNTIME, estado, PERIODICIDAD,
               M_CAMPO_PERIODICIDAD, estado);
        llamar(M_RUNTIME, estado, ADAPTABILIDAD, M_CAMPO_VAR, estado);
        llamar(M_RUNTIME, estado, POLITICAVAL, M_CAMPO_POLITICA, estado);
    };

    llenarCampos(R_SIN_COORDINADOR);
    llenarCampos(R_CON_COORDINADOR);
    poner(M_RUNTIME, R_CON_COORDINADOR, CLLAVE, R_ACEPTA);
}

AnalizadorPDA::AnalizadorPDA(const std::vector<Token>& tokensEntrada)
    : tokens(tokensEntrada) {}

const Token& AnalizadorPDA::actual() const {
    if (indice >= tokens.size()) return tokens.back();
    return tokens[indice];
}

void AnalizadorPDA::avanzar() {
    if (indice < tokens.size()) ++indice;
}

bool AnalizadorPDA::ejecutarMaquina(Maquina inicial,
                                    std::string& mensajeError,
                                    bool mostrarTraza) {
    std::vector<Marco> pila;
    Maquina maquina = inicial;
    int estado = 0;
    std::size_t pasos = 0;

    while (true) {
        if (++pasos > 1000000) {
            mensajeError = "Error interno: el PDA excedio el limite de pasos";
            return false;
        }

        if (mostrarTraza) {
            std::cout << "  [PDA] maquina=" << TablasSintaxis::nombreMaquina(maquina)
                      << " estado=" << estado
                      << " token=" << nombreToken(actual().codigo)
                      << " lexema='" << actual().lexema << "'"
                      << " pila=" << pila.size() << '\n';
        }

        if (estado == tablas.estadoAceptacion(maquina)) {
            if (pila.empty()) return true;
            const Marco retorno = pila.back();
            pila.pop_back();
            maquina = retorno.maquina;
            estado = retorno.estado;
            continue;
        }

        if (actual().codigo == TOKEN_ERROR) {
            mensajeError = "Linea " + std::to_string(actual().linea) +
                           ", columna " + std::to_string(actual().columna) +
                           ": error lexico: " + actual().detalleError;
            return false;
        }

        int tokenConsulta = actual().codigo;
        int transicion = tablas.obtenerTransicion(maquina, estado, tokenConsulta);
        if (transicion == ERROR_TRANSICION) {
            tokenConsulta = COMODIN;
            transicion = tablas.obtenerTransicion(maquina, estado, COMODIN);
        }

        if (transicion == ERROR_TRANSICION) {
            std::ostringstream salida;
            salida << "Linea " << actual().linea << ", columna "
                   << actual().columna << ": token inesperado '"
                   << actual().lexema << "' (" << nombreToken(actual().codigo)
                   << ") en la maquina " << TablasSintaxis::nombreMaquina(maquina)
                   << ", estado " << estado;
            mensajeError = salida.str();
            return false;
        }

        if (transicion <= CODIGO_LLAMADA_BASE) {
            const Maquina destino = static_cast<Maquina>(CODIGO_LLAMADA_BASE - transicion);
            int retorno = tablas.obtenerRetorno(maquina, estado, tokenConsulta);
            if (retorno == ERROR_TRANSICION) {
                mensajeError = "Error interno: llamada de submaquina sin estado de retorno";
                return false;
            }
            pila.push_back({maquina, retorno});
            maquina = destino;
            estado = 0;
            continue;
        }

        if (transicion <= -2) {
            estado = -2 - transicion;
            continue;
        }

        estado = transicion;
        avanzar();
    }
}

bool AnalizadorPDA::analizar(std::string& mensajeError, bool mostrarTraza) {
    indice = 0;
    if (tokens.empty()) {
        mensajeError = "El flujo de tokens esta vacio";
        return false;
    }
    if (actual().codigo == FIN) {
        mensajeError = "El programa debe contener al menos un agente o runtime";
        return false;
    }

    while (actual().codigo != FIN) {
        if (actual().codigo == AGENTE) {
            if (!ejecutarMaquina(M_AGENTE, mensajeError, mostrarTraza)) return false;
        } else if (actual().codigo == RUNTIME) {
            if (!ejecutarMaquina(M_RUNTIME, mensajeError, mostrarTraza)) return false;
        } else {
            mensajeError = "Linea " + std::to_string(actual().linea) +
                           ", columna " + std::to_string(actual().columna) +
                           ": se esperaba 'agente' o 'runtime'";
            return false;
        }
    }
    return true;
}
