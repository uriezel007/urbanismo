# Piloto comercial PHEI · 19 de octubre de 2026

## Entrega objetivo
Un servicio pagado de evaluación exploratoria de un ambiente para clínicas, universidades, hoteles y oficinas. Precio de hipótesis para entrevistas: **S/ 2.900**, sujeto a alcance y validación comercial; no es tarifa de mercado.

## Producto mínimo
1. Ficha del ambiente: medidas y procedencia, población usuaria, fecha, criterio y evaluador.
2. Modelo 2D/3D en metros con distinción explícita entre demo, medición y escenario hipotético.
3. Comparación A/B: personas, densidad bruta (personas/m²), área/persona y supuestos declarados.
4. Registro de accesos, obstáculos y limitaciones: nunca derivar aforo legal, ansiedad o certificación.
5. Informe impreso / JSON con conclusiones acotadas, versión del modelo, evidencia y recomendaciones sujetas a verificación.
6. Revisión profesional antes de entregar al cliente.

## Situación actual
PHEI Digital Twin PR #1 y WebGL PR #3 siguen en borrador; CI del 11/10/2026 fue correcta. Esta rama parte de PR #3 y no se fusionará con main sin QA de seguridad, datos, navegador real y validación de las limitaciones.

## Implementación siguiente
- Definir JSON schema para ambientes, fuentes y escenarios; impedir mezcla de demo con datos observados.
- Integrar el módulo de informe con web/src/engine.ts, sin duplicar cálculos.
- Añadir test de regresión: sala de 8 × 6 m, 24 vs 18 personas; densidad .5 vs .375 y cambio relativo -25%.
- Comparar versiones de informe y revisar accesibilidad/impresión en Android.
- Registrar SHA, evidencia de tests, respaldo, despliegue y URL HTTPS real antes de ofrecer servicio digital.

## Criterio de salida
No lanzar servicio como prueba científica normativa ni prometer resultado psicológico. Un piloto comercial solo se vende con alcance contractual y revisión técnica.
