# Registro de validación

Fecha: 11 de octubre de 2026. Las limitaciones del ejecutor local se resolvieron para QA utilizando GitHub Actions; no se confundió un resultado local con un despliegue público.

## Resultado confirmado en GitHub Actions

Ejecución: https://github.com/uriezel007/urbanismo/actions/runs/38149320239

Código comprobado: `26794e1a1d4646efcef3737ec61ba243436f0a53`.
Jobs **core**, **webgl** y **deployment**: **success**. La ejecución del PR sobre el mismo código también pasó: https://github.com/uriezel007/urbanismo/actions/runs/38149322636.

| Comprobación | Resultado observado |
|---|---|
| Build autónomo | Correcto; JavaScript emitido comprobado sintácticamente. |
| Respaldo/conservación clásica | 13 pruebas aprobadas. |
| Motor de simulación | 5 pruebas aprobadas. |
| Escala/calibración | 3 pruebas aprobadas. |
| Integración DOM/Canvas | 4 pruebas aprobadas. |
| API sin adaptación de hilos | 7 pruebas aprobadas. |
| PostgreSQL 17 real y efímero | 1 prueba aprobada: migraciones, revisión condicional y rollback. |
| Chromium real | Modelo, simulación, exportación, evidencia, escala, cuenta, sincronización, móvil y clásico: correcto. |
| React / TypeScript / R3F / Three | `tsc` y build correctos; Chromium con WebGL software verifica contexto, movimiento, cámaras y selección. |
| Auditoría npm completa | 0 vulnerabilidades informadas por `npm audit --audit-level=high` en esa ejecución. Se corrigió una alerta inicial en herramientas de desarrollo actualizando Vite a 8.3.4. |
| Docker Compose | Build y arranque correctos: API como usuario no root, PostgreSQL, migraciones, `/api/health` y registro persistente tras reiniciar ambos servicios. |

**33 pruebas de unidades/integración aprobadas**, además de tres recorridos de comprobación: aplicación en Chromium, visor WebGL en Chromium y despliegue efímero en Compose. Los artefactos de Actions incluyen capturas de escritorio, móvil y WebGL. Estas capturas se generaron mediante el navegador; no son imágenes de diseño simuladas.

## Trazabilidad de dependencias

El lockfile transitivo de npm se generó en CI y se recuperó como `package-lock.json`. El workflow final utiliza `npm ci --ignore-scripts`. No se afirma ausencia de vulnerabilidades desconocidas ni validez permanente de una consulta de seguridad. La auditoría npm no cubre Python ni imágenes Docker; ampliar análisis de dependencias e imágenes antes de producción.

## Limitaciones locales originales

El entorno de trabajo rechazó sockets TCP (`Operation not permitted`), no pudo contactar al proxy `proxy:8080` y bloqueó Chromium por `setsockopt`. Se ejecutaron 32 pruebas locales, incluidas 7 pruebas API en memoria con SQLite y `PHEI_SANDBOX_INLINE_TESTS=1`. Esa variable reemplaza el ejecutor de hilos solo en las pruebas; **no se usa en el servicio ni en CI**. Posteriormente GitHub Actions comprobó los hilos, PostgreSQL y navegadores sin esa adaptación.

La primera prueba Chromium falló porque su espera utilizaba evaluación de texto bloqueada por CSP. Se corrigió la prueba con aserciones de locadores; no se habilitó `unsafe-eval` en la aplicación.

## Qué no acredita esta entrega

- No existe URL pública de producción verificada. La comprobación de despliegue corresponde a contenedores efímeros en CI; quedan dominio, HTTPS público, operación y respaldos reales.
- No se localizó la versión 0.6. Se conserva exactamente 0.5 y se documenta la búsqueda.
- React es todavía un visor complementario; la interfaz de gestión completa se sirve desde la entrega autónoma TypeScript/Canvas.
- No hay validación científica del motor ni validación clínica, psicométrica, normativa o de evacuación. RAG sigue inactivo.
- Los agentes pueden solaparse; el modelo no resuelve colisiones interpersonales ni evitación automática del mobiliario. La calibración raster no genera topología de navegación.

Por ello se entrega como **1.0 preview**, no como garantía universal de funcionamiento «al 100 %» o producto certificado.
