# PHEI Digital Twin · 1.0 preview

Entrega exploratoria, con prioridad en estabilidad y escala humana. **No es una versión profesional certificada ni está declarada lista para producción.**

## Abrir la entrega

Abre `dist/index.html` en un navegador moderno. El visor Canvas, las personas animadas, las capas, los escenarios, las métricas, la calibración, la evidencia, el historial local y la exportación no requieren instalación ni CDN. El enlace «PHEI Studio clásico» abre las funciones existentes de evaluación, planos, recomendaciones por reglas y respaldos.

El modelo usa **metros**: persona de **1,75 m (175 cm)**, puertas de 2,10 m, paredes de 2,80 m y cuadrícula de 1 m. Las dimensiones del edificio demo son **hipotéticas**, aunque sus proporciones sean coherentes. La solicitud «1.75 cm» se interpretó como estatura humana de 1,75 m.

Para mantener un origen de navegador estable y usar cuentas:

```sh
python -m pip install -r api/requirements.txt
python -m api.manage create-user TU_USUARIO
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Abre `http://127.0.0.1:8000`. Desarrollo utiliza SQLite en `/tmp/phei-dev.sqlite3`; para persistencia real configura `DATABASE_URL` y usa PostgreSQL. El usuario se crea con contraseña interactiva de al menos 12 caracteres. No hay credenciales predeterminadas.

**No cambies el origen de una aplicación existente sin exportar sus datos.** El almacenamiento local depende del navegador y del origen; mover archivos o dominio no traslada esos datos. Nunca se leen ni borran claves clásicas desde el nuevo visor. La versión clásica conserva la clave `PHEI_STUDIO_0_4` y guarda copias antes de sustituirla.

## Qué incluye

- Aplicación autónoma: `dist/`; fuentes TypeScript: `web/src/`.
- Motor determinista de rutas por portales: ocupación, capacidad hipotética, densidad bruta, distancias, permanencia, orientación, espera y factor ambiental hipotético.
- Calibración de planos por dos puntos, sin deformar los ejes, con referencia de longitud de 1,75 m. No genera geometría navegable automáticamente.
- API FastAPI: cuentas, cookies de sesión, CSRF, control de origen/host, proyectos por propietario, revisiones y auditoría transaccionales, conflictos de edición.
- PostgreSQL mediante psycopg; SQLite limitado a desarrollo/pruebas.
- Visor complementario React/React Three Fiber/Three.js en `web/react/`. Requiere dependencias y verificación separada; no sustituye aún toda la interfaz autónoma.
- Recuperación exacta de 0.5 en `archive/`, auditoría, pruebas, CI y configuración de despliegue.

## Construir y probar

Node 24 o superior; la compilación autónoma **no necesita `npm install`**:

```sh
node scripts/build-offline.mjs
npm test
python -m pip install httpx==0.28.1
python -m unittest discover -s tests -p 'test_*.py' -v
```

Pruebas reales de navegador, en un host con sockets permitidos:

```sh
python -m pip install playwright==1.55.0
python -m playwright install chromium
python -m tests.browser_smoke
```

Visor React/WebGL complementario:

```sh
npm install --ignore-scripts
npm run dev:webgl
npm run build:webgl
```

El build autónomo elimina tipos mediante Node; **no equivale a una comprobación estática de TypeScript**. El build WebGL ejecuta `tsc`. No se produjo un lockfile de npm porque el entorno de entrega no pudo acceder al registro: antes de distribuir WebGL en producción, generar/revisar el lockfile, ejecutar auditoría y utilizar `npm ci`.

## Estado verificable

Lee [VALIDACION.md](docs/VALIDACION.md) para resultados, pruebas pendientes y restricciones. No se ha recuperado 0.6: no apareció en ramas, etiquetas, releases, PR ni historial disponible, y el usuario no conoce su ubicación. Se preservó 0.5 y la evolución es aditiva.

[Auditoría](docs/AUDITORIA.md) · [Arquitectura y metodología](docs/ARQUITECTURA.md) · [Despliegue](docs/DESPLIEGUE.md) · [Cambios](CHANGELOG.md).
