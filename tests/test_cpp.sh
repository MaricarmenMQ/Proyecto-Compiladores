#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD="$ROOT/build_test"
rm -rf "$BUILD"
cmake -S "$ROOT" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release
cmake --build "$BUILD"
EXE="$BUILD/sam_compilador"
[ -x "$EXE" ] || EXE="$BUILD/Release/sam_compilador.exe"
"$EXE" "$ROOT/ejemplos/medico.sam" --resumen --salida "$BUILD/medico.samvm"
"$EXE" "$ROOT/ejemplos/comunicacion.sam" --resumen --salida "$BUILD/comunicacion.samvm"
"$EXE" "$ROOT/ejemplos/asistente.sam" --resumen --salida "$BUILD/asistente.samvm"
if "$EXE" "$ROOT/ejemplos/error_semantico.sam" --resumen --salida "$BUILD/error.samvm"; then
  echo "FALLO: el ejemplo semánticamente inválido fue aceptado"
  exit 1
fi
printf '\nTodas las pruebas C++ finalizaron correctamente.\n'
