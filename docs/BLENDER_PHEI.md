# Puente Blender ↔ PHEI WebGL — propuesta experimental

## Qué está implementado
La vista React/WebGL de PHEI (/webgl/) permite **importar desde el navegador un GLB o un glTF 2.0 autocontenido** para visualizar un modelo creado en Blender. No exige conexión con una instalación local de Blender ni envía el archivo al servidor: el navegador lo lee en memoria y lo representa con Three.js/GLTFLoader.

La capa es **estrictamente visual**. No sustituye la geometría, las puertas, el motor de navegación, las zonas, las métricas, las calibraciones, las evaluaciones ni los datos de proyectos PHEI. Al importar, la capa esquemática y los agentes sintéticos se ocultan por defecto, pero el operador puede activarlos manualmente para comparar. Ocultar geometría no altera la simulación.

## Preparar un archivo en Blender
1. Modelar en **metros**, con origen/posición coherentes con el proyecto PHEI (no se realiza una alineación automática).
2. En Blender: **Archivo → Exportar → glTF 2.0**, formato recomendado **glTF Binary (.glb)**. Mantener texturas incrustadas y evitar compresión Draco/Meshopt/BasisU.
3. Abrir /webgl/ en la versión que incluya esta rama, seleccionar **Importar GLB o glTF local** y elegir el archivo, hasta 20 MB.
4. Verificar visualmente orientación, dimensiones y alineación; el panel informa el tamaño aproximado de la caja tridimensional y permite ocultar o retirar la capa.
5. Si se usa .gltf, **todos los buffers y las imágenes deben venir incorporados como data URI**. Los archivos .gltf que referencian un .bin, texturas separadas o enlaces remotos no se admiten; exportar .glb es preferible.

## Restricciones
- GLB/glTF **no** equivale a un modelo BIM ni a información georreferenciada.
- El importador admite glTF 2.0 con límites de 20 MB, 250 mallas, 1000 nodos, 250 materiales, 2000 accessors y hasta 1,5 millones de elementos declarados en accessors.
- Se bloquean referencias externas para reducir solicitudes de red no deseadas. No se admiten SVG externos ni extensiones que requieren decodificadores Draco, Meshopt o BasisU.
- Los datos de tamaño proceden del propio modelo; **no son mediciones verificadas del edificio real**.
- La escena visual se conserva solo en la sesión de la página. **No** se incluye en el JSON del proyecto ni se almacena en la API.
- Los agentes, recorridos, aforos y densidades proceden del modelo paramétrico PHEI original: **no** calculan colisiones ni accesibilidad sobre la malla importada. Está prohibido presentar estos resultados como validación de evacuación, estrés, diagnóstico o cumplimiento normativo.
- La función inversa **PHEI → Blender (.obj)** ya existe en el Digital Twin original como exportador de geometría hipotética en metros.
- Ninguna de estas funciones supone conexión directa de ChatGPT con Blender. Para editar Blender remotamente se necesitaría un agente autorizado o un conector independiente.
- Antes de usar modelos institucionales se deben verificar licencias, autorización y ausencia de datos identificables.

## Comprobaciones
- npm test incluye tests/blender-import.test.ts (GLB/glTF autocontenidos; rechazo de URLs, rutas locales, archivos corruptos o extensiones no compatibles).
- npm run build:webgl compila la vista con TypeScript/Vite.
- python -m tests.webgl_smoke prueba una importación .gltf real en Chromium y comprueba que no cambian las métricas del motor.
- Pasar CI no demuestra interoperabilidad con todos los exportadores de Blender ni que la malla corresponda a un espacio real; sigue pendiente una prueba manual con un GLB creado en la instalación del usuario.

## Dependencias y promoción
La rama de este trabajo parte de codex/phei-webgl-mobile-integration (PR #3), que a su vez parte de codex/phei-digital-twin-1 (PR #1). **No se ha integrado en main.** Resolver los conflictos de los PR existentes, revisar las pruebas y crear una versión de ensayo antes de publicar a terceros.
