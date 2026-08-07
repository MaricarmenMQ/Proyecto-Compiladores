# Despliegue web de SAM-Lang Studio v2

El proyecto incluye `Dockerfile` y `render.yaml` para un despliegue reproducible en un servicio compatible con Docker.

## Requisitos de producción

- `HOST=0.0.0.0` para escuchar en la interfaz de red del contenedor.
- `PORT` es suministrado por la plataforma; el backend lo lee desde `process.env.PORT`.
- `ALLOW_WEB_CONFIG=false` deshabilita la escritura de credenciales desde la interfaz pública.
- Las claves de IA deben configurarse como variables de entorno secretas del servicio, nunca dentro del repositorio.

## Flujo sugerido

1. Subir el código a un repositorio Git.
2. Crear un servicio web desde el repositorio usando el `Dockerfile` o `render.yaml`.
3. Cargar las variables secretas de los proveedores de IA.
4. Desplegar.
5. Verificar la URL pública y ejecutar `multimodelo.sam`.

La URL definitiva depende de la cuenta y nombre asignado por la plataforma de alojamiento.
