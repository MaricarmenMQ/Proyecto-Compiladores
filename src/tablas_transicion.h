#ifndef TABLAS_TRANSICION_H
#define TABLAS_TRANSICION_H

#include <string>
#include <vector>
#include "analisis.h"

constexpr int COMODIN = TOKEN_COUNT;
constexpr int MAXTOK = TOKEN_COUNT + 1;
constexpr int ERROR_TRANSICION = -1;
constexpr int CODIGO_LLAMADA_BASE = -1000;

constexpr int LLAMAR(int maquina) { return CODIGO_LLAMADA_BASE - maquina; }
constexpr int EPSILON(int estado) { return -2 - estado; }

enum Maquina {
    M_CAMPO_TEXTO = 0,
    M_CAMPO_VAR,
    M_CAMPO_MEMORIA,
    M_CAMPO_POLITICA,
    M_CAMPO_LISTA,
    M_CAMPO_RESTRICCIONES,
    M_CAMPO_PERMISOS,
    M_CAMPO_BOOL,
    M_CAMPO_PERIODICIDAD,
    M_CAMPO_DELEGA,
    M_CADENA_FLUJO,
    M_CONDICION,
    M_FLUJO,
    M_LISTA_PASOS,
    M_CONDICIONAL,
    M_AGENTE,
    M_RUNTIME,
    MAQUINA_COUNT
};

class TablasSintaxis {
public:
    TablasSintaxis();

    int obtenerTransicion(Maquina maquina, int estado, int token) const;
    int obtenerRetorno(Maquina maquina, int estado, int token) const;
    int estadoAceptacion(Maquina maquina) const;
    int cantidadEstados(Maquina maquina) const;
    static const char* nombreMaquina(Maquina maquina);

private:
    std::vector<std::vector<std::vector<int>>> transiciones;
    std::vector<std::vector<std::vector<int>>> retornos;
    std::vector<int> aceptaciones;

    void crearMaquina(Maquina maquina, int cantidadEstados, int estadoAceptacion);
    void poner(Maquina maquina, int estado, int token, int destino);
    void llamar(Maquina maquina, int estado, int token,
                Maquina submaquina, int estadoRetorno);

    void llenarCampoTexto();
    void llenarCampoVar();
    void llenarCampoMemoria();
    void llenarCampoPolitica();
    void llenarCampoLista();
    void llenarCampoRestricciones();
    void llenarCampoPermisos();
    void llenarCampoBool();
    void llenarCampoPeriodicidad();
    void llenarCampoDelega();
    void llenarCadenaFlujo();
    void llenarCondicion();
    void llenarFlujo();
    void llenarListaPasos();
    void llenarCondicional();
    void llenarAgente();
    void llenarRuntime();
};

class AnalizadorPDA {
public:
    explicit AnalizadorPDA(const std::vector<Token>& tokens);
    bool analizar(std::string& mensajeError, bool mostrarTraza = false);

private:
    struct Marco {
        Maquina maquina;
        int estado;
    };

    const std::vector<Token>& tokens;
    std::size_t indice = 0;
    TablasSintaxis tablas;

    const Token& actual() const;
    void avanzar();
    bool ejecutarMaquina(Maquina inicial, std::string& mensajeError,
                         bool mostrarTraza);
};

#endif
