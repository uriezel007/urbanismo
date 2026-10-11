# PHEI Digital Twin · Integración WebGL y revisión móvil

## Alcance implementado
Esta rama parte de `codex/phei-digital-twin-1` (PR #1). No modifica `main` ni la versión clásica 0.5 desplegada en GitHub Pages.

- La aplicación autónoma Canvas sigue en `/`, con evidencia, proyectos, respaldos, calibración, API y simulaciones.
- La vista 3D de React/Three/R3F se compila en `dist-webgl/` y se publica en `/webgl/` **solo cuando el bundle está presente**.
- Ambas vistas utilizan el mismo motor `web/src/engine.ts`, los tipos `model.ts` y las unidades de geometría.
- Desde `/`, el botón **Abrir WebGL 3D** aparece si `/webgl/` responde. Antes de navegar crea una revisión local del proyecto activo.
- `sessionStorage.PHEI_WEBGL_SCENE_V1` transmite solo geometría hipotética y parámetros de simulación del mismo origen. No envía evidencia, notas, registros clínicos ni credenciales.
- WebGL utiliza una representación de tres dimensiones con cámara orbital, persona a escala 1,75 m, ambientes, paredes, mobiliario, controles y selección por botones. Muestra métricas obtenidas del motor compartido.

## Construcción y servidor
```bash
npm ci --ignore-scripts
node scripts/build-offline.mjs
npm run build:webgl
python -m pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```
Abrir `http://127.0.0.1:8000/` y utilizar el acceso contextual WebGL. También puede abrirse directamente `http://127.0.0.1:8000/webgl/` para la demostración.

El Dockerfile multietapa genera ambos bundles. La app autónoma sigue funcionando offline incluso si la compilación WebGL no está instalada.

## Pruebas y aceptación
- `npm test` (motor, geometría, regresión clásica, pruebas de interfaz).
- `npm run build:webgl` (TypeScript estricto + producción Vite).
- `python -m tests.webgl_smoke` (Chromium SwiftShader, interacción WebGL, captura 1440 px, pantallas 390 y 320 px, overflow horizontal, selección y handoff).
- `python -m tests.browser_smoke` (Canvas/FastAPI, evaluaciones, proyecto, navegación a WebGL y regreso).
- `python -m tests.deployment_smoke` (Docker y PostgreSQL efímeros, continuidad después de reinicio).

GitHub Actions registra resultados por commit. Una ejecución de CI exitosa acredita los casos cubiertos, **no garantiza** compatibilidad con cualquier teléfono.

## Protección de datos y decisiones pendientes
- El plano importado en el módulo de calibración no se transforma automáticamente en muros reales para WebGL; el modelo 3D usa la escena espacial hipotética (explícito en interfaz).
- La sesión de navegación al WebGL no incorpora notas, encuestas, fotografías, pacientes ni información personal.
- Revisa `Proyectos e historial` al volver de WebGL para abrir una revisión anterior del proyecto; el trabajo se guarda antes de salir.
- No hay física de colisiones validada ni inferencias sobre estrés, emociones, llanto o evacuación.
- **Prueba física pendiente:** Samsung Android y navegadores de destino en orientación vertical/horizontal, rendimiento sostenido, pérdida de contexto WebGL, accesibilidad táctil y datos reales anonimizados.
- **Promoción pendiente:** revisión del PR, build final con SHA conocido, backup, URL HTTPS, control de acceso y restauración verificada.
