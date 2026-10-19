# PRE–SER Growth OS · Inicio (rama experimental)
Este módulo es distinto de PHEI. Propuesta: crecer por servicios PHEI B2B y productos digitales educativos originales.

## Oferta a validar
- PHEI Diagnóstico exploratorio (1 ambiente): hipótesis S/ 2.900.
- PHEI institucional: desde S/ 9.500, cotización según alcance.
- Kit educativo de observación espacial: hipótesis S/ 59 (producto aún no finalizado).
- Taller remoto: hipótesis S/ 249 (por desarrollar).

## Flujo autorizado
Video educativo -> landing -> opt-in -> contacto personalizado -> propuesta -> link oficial de pago -> confirmación -> entrega -> seguimiento.

## Estado
Existe un prototipo **local descargable** preparado en esta conversación (PRESER_LAB_2026.zip) con tablero de ofertas, oportunidades, guiones y escenario financiero. **No ha sido desplegado ni conectado a redes o cobros.** Esta rama contiene el mapa de integración para Codex. No usar en producción.

## Reglas de operación
- TikTok/YouTube sirven para captar demanda; no presuponer pagos por visualizaciones.
- Hotmart ofrece plataforma de productos digitales en Perú; comisiones y retiros dependen del producto y la moneda.
- Mercado Pago Perú ofrece Link de Pago, sujeto a comisiones.
- Leads opt-in y retención mínima; backend RBAC y HTTPS antes de recopilar datos comerciales reales.
- Estados de ingreso separados: propuesta, facturado, pagado, devuelto. Nunca sumar propuestas como ingresos reales.
- Contenido original revisado profesionalmente, sin imágenes/voz de terceros no autorizadas.

## Sprint siguiente
Crear repo separado (preferible privado) para datos y backend. Incorporar UI local, API con autenticación, roles, tests, historial de consentimiento, pasarela sandbox, cola de aprobación y pruebas móviles.
