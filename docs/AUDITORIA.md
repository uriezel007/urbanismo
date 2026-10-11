# Auditoría y conservación

Revisión sobre `uriezel007/urbanismo`, commit `6320f92bf4fb677ffe2124d7040b8c632ac46565`.
El árbol contenía `.gitkeep` y `phei/index.html` (97.238 bytes). No había AGENTS.md, manifiestos de paquetes, backend, pruebas, CI ni documentación de despliegue.

## Recuperación

- Rama remota observada: `main`. Etiquetas, releases y PR: listas vacías al consultar el conector.
- Historial: inicialización, incorporación de PHEI, plano de siete ambientes y visor volumétrico Canvas.
- La cabecera del archivo dice 0.5; el almacenamiento usa versión 0.4. No hay evidencia de 0.6 en las referencias accesibles. No se inventó ni sustituyó esa versión.
- `archive/phei-0.5-original.html` conserva el original exacto. Git blob SHA-1: `d6d22a2116777229375b39e4f8fb686253bd8314`. Se conserva como material de recuperación, fuera del directorio público de entrega.
- La aplicación clásica sigue en `phei/index.html`. Su funcionalidad se mantiene; los cambios afectan validación, conservación, separación de evidencia y rotulado.

## Hallazgos

| Prioridad | Hallazgo en 0.5 | Tratamiento |
|---|---|---|
| Alta | Importación no valida observaciones; `o.score` se inserta mediante `innerHTML`. Un respaldo con texto HTML en score puede introducir marcado activo. | Validador compartido valida enteros 0–3, IDs, referencias, notas, duplicados y tamaños. También se valida carga de almacenamiento local. Prueba con score HTML. |
| Alta | Cargar plano anula todos los polígonos; restaurar demo, importar y borrar observaciones reemplazan datos. | Guardado archiva el valor anterior antes de sobrescribir. Si el respaldo falla por cuota, se bloquea el guardado. Exportación de historial completo. |
| Alta | `stats()` combina encuestas demo y reales bajo un mismo promedio. | Promedio restringido a `kind=real`; cobertura y hallazgos de resumen excluyen observaciones demo. Registros e informes identifican procedencia. |
| Media | No hay cuenta, permisos entre proyectos, auditoría ni persistencia remota. | API con sesión HttpOnly, CSRF, límite de intentos, propietario obligatorio, revisiones y auditoría en la misma transacción. |
| Media | Archivo monolítico mezcla geometría, datos, interfaz, recomendaciones y almacenamiento. | Módulos TypeScript independientes y API separada. Interfaz clásica retenida durante migración. |
| Media | La geometría normalizada usa factores distintos en cada eje; el visor original es conceptual, no métrico. | Nuevo modelo en metros, figuras de 1,75 m y calibración isotrópica por referencia conocida. El modelo clásico conserva el aviso de no calibración. |
| Media | No se validan intervalos, fechas, muestra ni origen completo de los respaldos. | Validación estricta de frontera. Los datos inválidos originales se conservan, y se avisa antes de editar. |
| Media | Fuentes documentales se mencionan sin originales disponibles. | Se rotulan como referencias heredadas sin cotejo; RAG inactivo y endpoint rechaza consultas. |
| Media | No existían pruebas ni verificación de despliegue. | Suites core/API, pruebas reales de Chromium preparadas, integración PostgreSQL y CI. Ver estado efectivo en VALIDACION.md. |

## Dependencias y límites de seguridad

La aplicación clásica y el build autónomo no usan paquetes externos de navegador. La versión React/WebGL añade React, Three, R3F, Drei, Vite y TypeScript con versiones directas fijadas. El backend añade FastAPI, uvicorn y psycopg. No se completó una consulta de vulnerabilidades ni un lockfile transitivo en el entorno aislado; no se puede afirmar «sin vulnerabilidades».

La API aplica cookies Secure en producción, SameSite=Strict, HttpOnly, expiración de 8 horas, CSRF, host/origin permitidos, tamaño máximo de cuerpo y PBKDF2-SHA256 con sal aleatoria y 600.000 iteraciones. No almacena tokens de sesión en texto plano en la base de datos. No tiene registro público; alta mediante CLI.

El historial local puede agotar cuota; se informa y se permite exportar. No hay cifrado de navegador, MFA, recuperación de contraseña, gestión de equipos, almacenamiento de archivos multiusuario, cuotas por cuenta ni auditoría inmutable ante administradores de base de datos. La protección de login limita por nombre de usuario; el proxy de producción debe añadir límites por IP y cuerpo antes de la API. CSP conserva `unsafe-inline` por compatibilidad con los documentos autónomos; no representa la política final de una aplicación React empaquetada.

Esta revisión estática y sus pruebas no sustituyen una auditoría de penetración ni validación profesional del modelo.
