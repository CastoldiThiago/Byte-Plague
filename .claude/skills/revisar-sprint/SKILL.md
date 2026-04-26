---
name: revisar-sprint
description: Revisar el estado del proyecto al final de una semana de trabajo.
---

Hacer las siguientes verificaciones en orden:

1. `npm run build` — confirmar que compila sin errores
2. Listar todos los archivos en src/ y verificar que ninguno tenga console.log de debug
3. Verificar que SceneManager.ts llame a dispose() de todos los sistemas instanciados
4. Revisar que todos los EventListeners agregados tengan su removeEventListener en dispose()
5. Leer DECISIONES-TECNICAS.md y verificar que la sección "Pendientes / En evaluación" esté actualizada con todo lo que quedó sin resolver en el sprint
6. Si durante la revisión se identifican decisiones tomadas implícitamente (sin registro), agregarlas en DECISIONES-TECNICAS.md usando el skill registrar-decision
7. Generar un resumen de qué sistemas están completos y qué falta para el próximo sprint
