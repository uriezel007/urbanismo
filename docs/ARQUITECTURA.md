# Arquitectura y límites metodológicos

## Migración progresiva

1. **Clásico**: `phei/` conserva evaluación de 28 criterios, planos, fotografías temporales, reglas, informes, importación y exportación. Sus datos no se trasladan silenciosamente.
2. **Núcleo**: `web/src/model.ts`, `engine.ts` y `calibration.ts`, sin dependencia de un renderizador.
3. **Entrega autónoma**: `viewer.ts` proyecta geometría 3D mediante Canvas. `app.ts` integra escenarios, procedencia, calibración, copias de proyectos y API. `scripts/build-offline.mjs` genera un HTML único y copia el clásico.
4. **Migración React**: `web/react/App.tsx` muestra la misma geometría y motor con R3F/Three. Es un visor complementario; aún no migra toda la gestión/calibración/evidencia a componentes React.
5. **Servicio**: FastAPI + acceso DB-API parametrizado; PostgreSQL en producción, SQLite para desarrollo. Revisiones y auditoría se escriben en la transacción del proyecto. No hay endpoint para eliminar proyectos.

## Escala humana

Unidad compartida: metro. Persona: piernas 0,80 m, torso 0,60 m, cuello 0,10 m, cabeza 0,25 m = **1,75 m**. Puerta: altura 2,10 m, ancho variable 0,90–1,50 m. Pared: 2,80 m. Mobiliario: alturas de referencia 0,45/0,75 m en Canvas. Estos son parámetros hipotéticos de visualización, no especificaciones de accesibilidad normativa.

Un plano raster no tiene escala real por defecto. Dos puntos A/B y una distancia L producen `metrosPorPixel = L / distanciaEnPixeles(A,B)`. La escala es igual en ambos ejes. Área de polígono: fórmula del cordón por `metrosPorPixel²`. La referencia se etiqueta `user_reference_unverified`. La interfaz guarda imagen, puntos, escala y dimensiones; no hace reconstrucción automática ni navegación en ese plano.

No hay CRS, EPSG, georreferenciación de terreno, extracción EXIF, BIM, plantas múltiples ni corrección de perspectiva. La altura de una persona dibujada no basta para calibrar cualquier fotografía.

## Simulación exploratoria

Semilla reproducible, pasos de 0,1 s, destinos predeterminados mediante PRNG. Estados: pendiente, caminando, esperando, permanencia, finalizado. Movimiento por segmentos entre centros de ambientes y puertas explícitas. Se respeta capacidad hipotética por ambiente; las entradas esperan si está lleno. Caudal hipotético de puerta: `1,3 × ancho` personas/s. Tras permanencia se vuelve a la entrada.

Métricas: ocupación, densidad por superficie bruta, pico, agentes en espera, distancia total, espera acumulada en persona·s. El factor ambiental multiplica una velocidad por elección del operador. La demora de orientación es un tiempo parametrizado, **no un diagnóstico de desorientación de una persona real**.

No hay fuerzas sociales, evitación interpersonal ni de mobiliario, dinámica de multitudes calibrada, evacuación, incendio, pánico ni emociones. Los personajes pueden solaparse en los portales. Capacidades muy reducidas pueden bloquear circulaciones; no se oculta el bloqueo. Límite de interfaz: 200 agentes / 1 hora simulada. Las corridas se archivan al reiniciar/aplicar cambios y se conservan al guardar el proyecto; pueden exportarse por separado.

## Evidencia y fuentes

Cuatro categorías: `measured`, `professional_observation`, `hypothetical`, `simulated`. Cada registro tiene valor, unidad, fuente, fecha y límites. Resultados simulados requieren `run_id`. No se convierten a datos medidos. El usuario es responsable de que su declaración de procedencia sea veraz; no se verifica un instrumento conectado.

PRESER-NIC y La Ciudad que Regula se conservan como marcos metodológicos propios, sin validación psicométrica demostrada en el repositorio. Accesibilidad cognitiva de Berta Brusilovsky se conserva como referencia conceptual y bibliográfica, sin atribuir validación de PHEI a la autora. La rúbrica de 28 criterios es exploratoria.

## Contrato futuro de RAG

Antes de activar recuperación: documento original, autoría, edición, licencia, URL/DOI verificable cuando exista, huella de contenido, fecha de revisión, localizador por página/sección, tipo de evidencia y estado de verificación. Separar documentos metodológicos de estudios empíricos y guías normativas por jurisdicción.

Una respuesta debe conservar consulta, fragmentos recuperados, citas localizables, versión del corpus/modelo y revisión profesional. Tratar contenido recuperado como datos no confiables y rechazar instrucciones incrustadas. Evaluar fidelidad de citas, abstención, contradicciones, cobertura, actualización y límites de población/contexto antes de habilitar generación. La API actual devuelve 503 para RAG; no afirma disponer de fuentes científicas verificadas.
