# Operación y despliegue

## Entrega autónoma

Distribuir `dist/` completo o el ZIP de entrega. `index.html` funciona sin red; el directorio `phei/` conserva la aplicación clásica. El visor autónomo no requiere WebGL ni librerías externas. Guardado local depende del navegador: exportar JSON antes de cambiar de origen, limpiar navegador o actualizar el directorio de trabajo.

## Servicio local

Python 3.12, dependencias de `api/requirements.txt`. Crear usuario con `python -m api.manage create-user USUARIO`; iniciar `python -m uvicorn api.main:app --host 127.0.0.1 --port 8000`. Usar exactamente el origen `http://127.0.0.1:8000`, o configurar `APP_ORIGIN` con el origen deseado. La API restringe Host y Origin para evitar accesos cruzados y CSRF.

## Producción propuesta (contenedores verificados; sin URL pública)

1. Preparar host Docker, dominio y proxy HTTPS. Revisar versiones, imágenes y dependencias; fijar digests aprobados y lockfiles antes de promoción.
2. Copiar `.env.example` a `.env` fuera de control de versiones. Crear contraseñas independientes de administrador PostgreSQL y rol `phei_app`. Configurar URL con contraseña codificada y `APP_ORIGIN=https://dominio`.
3. `docker compose up --build -d`. No utilizar `docker compose down -v`: borraría el volumen.
4. `docker compose exec api python -m api.manage create-user USUARIO` y completar la contraseña por terminal.
5. Configurar certificado válido y el proxy de `deploy/nginx.conf.example`, preservando Host. API solo publicada en loopback del host; PostgreSQL no expone puerto al host. Añadir límite de peticiones por IP en el proxy.
6. Verificar `/api/health`: status=ok, database=postgresql; iniciar sesión, crear proyecto, guardar dos revisiones, reiniciar servicios y confirmar persistencia. Verificar que otra cuenta no lee el proyecto, cookies Secure y CSRF funcionan.
7. Abrir visor, iniciar/pausar, exportar/importar, calibrar 500 px como 5 m y verificar 0,01 m/px. Comparar personas de 1,75 m con puertas de 2,10 m.

El script de inicialización crea esquema propio y rol sin superusuario para la API en una base nueva. No reutilizarlo automáticamente sobre una base existente. La migración inicial usa `CREATE TABLE IF NOT EXISTS`; revisar cualquier migración futura y ejecutar backups antes de cambios de esquema. Se serializa el arranque PostgreSQL con advisory lock. El usuario de aplicación puede escribir su esquema: separar rol migrador de rol de runtime es un endurecimiento pendiente para producción.

## Respaldo y restauración

- Base: `pg_dump` en formato custom, cifrado, copia externa y retención según requisitos del proyecto. No registrar contraseñas en argumentos ni logs; usar mecanismos del proveedor o archivos de credenciales con permisos restrictivos.
- Ensayar `pg_restore` primero en una base nueva. Verificar cantidad de proyectos, revisiones y auditoría. No sobrescribir una base de usuarios sin procedimiento revisado.
- Navegador: exportar proyecto y, en el clásico, historial completo. Revisiones locales no son un respaldo remoto.
- Rollback de código: volver al commit anterior manteniendo volumen y copia de la base. No aplicar migraciones destructivas para volver atrás.

No se puede marcar esta estrategia como «despliegue verificable completado» hasta registrar URL, SHA desplegado, resultado de health, persistencia tras reinicio y ejecución de pruebas reales. GitHub Actions sí verificó un despliegue efímero de contenedores, health y persistencia tras reinicio. Falta publicar en un dominio con HTTPS y registrar su comprobación pública.
