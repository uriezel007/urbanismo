# Registro de validación

Fecha de trabajo: 11 de octubre de 2026. Este documento diferencia ejecución observada y pruebas preparadas.

## Ejecutado en el espacio de trabajo

- Build autónomo `node scripts/build-offline.mjs`: correcto, con comprobación de sintaxis del JavaScript emitido.
- Validación y conservación clásica: 13 pruebas aprobadas.
- Motor: 5 pruebas aprobadas (semilla, conservación, capacidad, finalización normal, conectividad, límites y espera).
- Escala/calibración: 3 pruebas aprobadas (1,75 m, coherencia con puerta/pared, conversión píxel/metro y área, rechazo de referencias inválidas).
- Integración de interfaz con adaptador DOM/Canvas: 4 pruebas aprobadas (inicio, controles, avance/reinicio, archivos de corrida, revisiones, apertura de copia).
- API: 7 pruebas aprobadas en memoria con SQLite (sesión/CSRF/revocación, origen/tamaño, historial/conflictos, aislamiento, procedencia, modo producción/RAG y límite de login).

**Total: 32 pruebas ejecutadas.** La integración PostgreSQL se omite si no se configura una base de pruebas efímera.

La ejecución de API utilizó `PHEI_SANDBOX_INLINE_TESTS=1`, que sustituye únicamente en pruebas el ejecutor de hilos por ejecución directa. El entorno se bloqueó al ejecutar `anyio.to_thread.run_sync`; esta prueba no acredita concurrencia o rendimiento del servidor. La aplicación productiva no aplica esa sustitución.

## Límites encontrados

- Socket TCP local: `PermissionError: [Errno 1] Operation not permitted`.
- Proxy configurado `proxy:8080`: conexión fallida; no se pudo clonar mediante git ni instalar paquetes de npm/pip desde la shell.
- Chromium local: inicialización bloqueada por `setsockopt: Operation not permitted`. No se atribuye a la aplicación una captura ni prueba visual que no se ejecutó.
- Los intentos de habilitar red no completaron; no se siguió solicitando el mismo permiso.
- No hay URL pública de producción verificada ni despliegue Docker comprobado.

## Preparado para verificar en otro ejecutor

`.github/workflows/verify.yml` ejecuta suites sin adaptador de hilos, PostgreSQL efímero, build React y auditoría npm. `tests/browser_smoke.py` comprueba Chromium real, escritorio/móvil, cuenta, sincronización, escala y visor clásico; produce capturas. Tener el workflow en el repositorio no equivale a que haya pasado.

Pendiente hasta ejecución confirmada: instalación y typecheck React/Three/R3F, auditoría transitiva, navegador real, PostgreSQL real, despliegue HTTPS y smoke público. No se declara funcionalidad al 100 %, validación clínica, normativa ni de evacuación.
