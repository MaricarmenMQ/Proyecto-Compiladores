#include <cstdlib>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#endif

#include "analisis.h"
#include "generador_codigo.h"
#include "interprete.h"
#include "optimizador.h"
#include "parser.h"
#include "semantico.h"
#include "tablas_transicion.h"
#include "tac.h"

namespace {

std::string leerArchivo(const std::string& ruta) {
    std::ifstream archivo(ruta, std::ios::binary);
    if (!archivo.is_open()) throw std::runtime_error("No se pudo abrir el archivo: " + ruta);
    std::ostringstream contenido;
    contenido << archivo.rdbuf();
    return contenido.str();
}

void separador(char caracter = '=', int ancho = 76) {
    std::cout << std::string(static_cast<std::size_t>(ancho), caracter) << '\n';
}

struct Opciones {
    std::string archivo;
    bool mostrarTokens = true;
    bool mostrarAST = true;
    bool verificarPDA = true;
    bool trazaPDA = false;
    bool ejecutarRuntime = true;
    bool generarCodigo = true;
    std::string salidaVM = "programa.samvm";
};

void mostrarUso(const char* ejecutable) {
    std::cout << "Uso:\n"
              << "  " << ejecutable << " archivo.sam [opciones]\n\n"
              << "Opciones:\n"
              << "  --sin-tokens       No imprime la tabla de tokens.\n"
              << "  --sin-ast          No imprime el AST.\n"
              << "  --sin-pda          Omite el verificador PDA tabular.\n"
              << "  --traza-pda        Muestra estado, token y tamano de pila.\n"
              << "  --sin-runtime      Valida y compila sin ejecutar agentes.\n"
              << "  --sin-codigo       No genera TAC ni SAM-VM.\n"
              << "  --salida ruta      Ruta del archivo SAM-VM de salida.\n"
              << "  --resumen          Oculta tokens y AST.\n"
              << "  --ayuda            Muestra esta ayuda.\n";
}

Opciones leerOpciones(int argc, char** argv) {
    if (argc < 2) {
        mostrarUso(argv[0]);
        throw std::runtime_error("Falta la ruta del archivo de entrada");
    }

    const std::string primerArgumento = argv[1];
    if (primerArgumento == "--ayuda" || primerArgumento == "-h") {
        mostrarUso(argv[0]);
        std::exit(0);
    }

    Opciones opciones;
    opciones.archivo = primerArgumento;
    for (int i = 2; i < argc; ++i) {
        const std::string argumento = argv[i];
        if (argumento == "--sin-tokens") opciones.mostrarTokens = false;
        else if (argumento == "--sin-ast") opciones.mostrarAST = false;
        else if (argumento == "--sin-pda") opciones.verificarPDA = false;
        else if (argumento == "--traza-pda") {
            opciones.trazaPDA = true;
            opciones.verificarPDA = true;
        } else if (argumento == "--sin-runtime") opciones.ejecutarRuntime = false;
        else if (argumento == "--sin-codigo") opciones.generarCodigo = false;
        else if (argumento == "--salida") {
            if (i + 1 >= argc) throw std::runtime_error("--salida requiere una ruta");
            opciones.salidaVM = argv[++i];
        } else if (argumento == "--resumen") {
            opciones.mostrarTokens = false;
            opciones.mostrarAST = false;
        } else if (argumento == "--ayuda" || argumento == "-h") {
            mostrarUso(argv[0]);
            std::exit(0);
        } else {
            throw std::runtime_error("Opcion desconocida: " + argumento);
        }
    }
    return opciones;
}

} // namespace

int main(int argc, char** argv) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
#endif

    try {
        const Opciones opciones = leerOpciones(argc, argv);
        const std::string fuente = leerArchivo(opciones.archivo);

        separador('*');
        std::cout << "SAM-LANG - COMPILADOR E INTERPRETE DE AGENTES\n";
        std::cout << "Entrada: " << opciones.archivo << '\n';
        separador('*');

        Analisis lexer(fuente);
        const std::vector<Token> tokens = lexer.tokenizar();

        std::cout << "\n[1] ANALISIS LEXICO (AFD)\n";
        if (opciones.mostrarTokens) Analisis::imprimirTokens(tokens);
        if (Analisis::contieneError(tokens)) {
            for (const Token& token : tokens) {
                if (token.codigo == TOKEN_ERROR) {
                    std::cerr << "[ERROR LEXICO] Linea " << token.linea
                              << ", columna " << token.columna << ": "
                              << token.detalleError << " (lexema '" << token.lexema << "')\n";
                    break;
                }
            }
            return 2;
        }
        std::cout << "[OK] Secuencia de tokens valida.\n";

        bool pdaValido = true;
        std::string errorPDA;
        if (opciones.verificarPDA) {
            std::cout << "\n[2] VERIFICACION SINTACTICA POR PDA TABULAR\n";
            AnalizadorPDA pda(tokens);
            pdaValido = pda.analizar(errorPDA, opciones.trazaPDA);
            if (pdaValido) std::cout << "[OK] El PDA acepta la secuencia de tokens.\n";
            else std::cerr << "[RECHAZO PDA] " << errorPDA << '\n';
        }

        std::cout << "\n[3] PARSER DESCENDENTE RECURSIVO Y AST\n";
        bool parserValido = false;
        NodoPrograma ast;
        try {
            Parser parser(tokens);
            ast = parser.parsear();
            parserValido = true;
            std::cout << "[OK] Sintaxis valida y AST construido.\n";
        } catch (const ErrorSintaxis& error) {
            std::cerr << "[RECHAZO PARSER] " << error.what() << '\n';
        }

        if (opciones.verificarPDA && pdaValido != parserValido) {
            std::cerr << "\n[ERROR INTERNO] El PDA y el parser no coinciden.\n"
                      << "PDA: " << (pdaValido ? "acepta" : "rechaza") << '\n'
                      << "Parser: " << (parserValido ? "acepta" : "rechaza") << '\n';
            return 5;
        }

        if (!parserValido) {
            std::cerr << "\nResultado: sintaxis invalida.\n";
            return 4;
        }

        if (opciones.mostrarAST) {
            std::cout << "\nAST:\n";
            separador('-');
            imprimirAST(ast);
        }

        std::cout << "\n[4] ANALISIS SEMANTICO\n";
        AnalizadorSemantico semantico(ast);
        const bool semanticaValida = semantico.analizar();
        semantico.imprimirReporte();
        if (!semanticaValida) {
            std::cerr << "Resultado: programa rechazado por errores semanticos.\n";
            return 6;
        }

        if (opciones.ejecutarRuntime) {
            RuntimeSAM runtime;
            runtime.ejecutar(ast, semantico.obtenerTabla());
        }

        if (opciones.generarCodigo) {
            std::cout << "\n[6] GENERACION DE CODIGO INTERMEDIO\n";
            GeneradorTAC generadorTAC;
            const auto codigoTAC = generadorTAC.generar(ast);
            GeneradorTAC::imprimir(codigoTAC);

            std::cout << "\n[7] OPTIMIZACION TAC\n";
            OptimizadorTAC optimizador;
            const auto codigoOptimizado = optimizador.optimizar(codigoTAC);
            std::cout << OptimizadorTAC::reporteComparativo(codigoTAC, codigoOptimizado);
            std::cout << GeneradorTAC::comoTexto(codigoOptimizado);

            std::cout << "\n[8] GENERACION DE CODIGO FINAL SAM-VM\n";
            GeneradorCodigoFinal generadorFinal;
            const std::string codigoFinal = generadorFinal.generarSAMVM(codigoOptimizado);
            std::cout << codigoFinal;
            std::string errorSalida;
            if (!generadorFinal.guardarArchivo(codigoFinal, opciones.salidaVM, errorSalida)) {
                std::cerr << "[ERROR] " << errorSalida << '\n';
                return 7;
            }
            std::cout << "[OK] Codigo final guardado en: " << opciones.salidaVM << '\n';
        }

        std::cout << "\nResultado final: compilacion y ejecucion completadas correctamente.\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "[ERROR] " << error.what() << '\n';
        return 1;
    }
}
