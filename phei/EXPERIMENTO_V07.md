# PHEI Studio · Experimento v0.7 (rama de integración)

Base original: `phei/index.html` (PHEI Studio 0.5 en `main`). Esta rama **no reemplaza** la aplicación real ni el almacenamiento original.

## Cambios agregados
- `simulacion.js`: simulación de agentes sintéticos sobre el visor espacial original, sin modificar los registros de evaluación. Controles de escenario, 8–150 agentes, ancho hipotético, semilla, reproducción/pausa, comparación pareada de 12 semillas y CSV.
- `exportar_obj.js`: exportación de polígonos a muros y suelo OBJ importables en Blender. Unidades arbitrarias. No hay BIM, alturas reales, puertas, escaleras, ni geometría calibrada.
- `index.html`: dos referencias a scripts y un puente de **solo lectura** `window.PHEI_RUNTIME` con acceso a la escena vigente.
- `tests/simulacion.test.cjs`: regresión básica, reproducibilidad, índices y exportación.

## Cómo revisar
1. Mantener `main` publicado sin cambios. Abrir el archivo de la rama desde un servidor local o desplegar **una previsualización aislada** que incluya `index.html`, `simulacion.js` y `exportar_obj.js`.
2. Ir a **Modelo 3D por capas**. Los controles experimentales aparecen bajo el visor principal.
3. Seleccionar Flujo mixto, 72 agentes, semilla 42, ejecutar, comparar 1.4 vs 3.0 y exportar CSV.
4. Pulsar **OBJ para Blender**, importar el archivo en Blender y confirmar geometría editable; escala arbitraria.
5. Regresar a evaluación: comprobar que observaciones, biblioteca, planos, copia JSON e informes siguen funcionando.

## Pruebas
```bash
node --test phei/tests/simulacion.test.cjs
```

## Limitaciones y precauciones
- Los agentes, las velocidades, la capacidad del cuello de botella y las dimensiones son **hipótesis implementadas en código**, no mediciones.
- La simulación **no** representa estrés emocional, llanto, agresión, seguridad de evacuación ni aforo reglamentario.
- La escena no es BIM ni un modelo georreferenciado. No se debe utilizar para certificación de accesibilidad ni diseño de evacuación.
- El sitio es una aplicación estática monolítica de HTML/CSS/JavaScript; el plan React/FastAPI/GIS aún no está incorporado en esta rama.
- Los ensayos programáticos no sustituyen una prueba visual en el navegador Android del usuario.
- Mantener la funcionalidad original **sin cambios** es condición obligatoria antes de fusionar.

## Estado
En desarrollo en rama separada. Requiere revisión del PR y prueba en navegador antes de fusionar.
