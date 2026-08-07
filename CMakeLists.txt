cmake_minimum_required(VERSION 3.10)
project(SAM_LANG_FINAL LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(sam_compilador
    src/main.cpp
    src/analisis.cpp
    src/parser.cpp
    src/tablas_transicion.cpp
    src/semantico.cpp
    src/comunicacion.cpp
    src/interprete.cpp
    src/tac.cpp
    src/optimizador.cpp
    src/generador_codigo.cpp
)

target_include_directories(sam_compilador PRIVATE src)

if(MSVC)
    target_compile_options(sam_compilador PRIVATE /W4)
else()
    target_compile_options(sam_compilador PRIVATE -Wall -Wextra -pedantic)
endif()
