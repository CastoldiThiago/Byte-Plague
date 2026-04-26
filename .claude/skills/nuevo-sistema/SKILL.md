---
name: nuevo-sistema
description:
  Crear un nuevo sistema TypeScript integrado al proyecto. Usar cuando
  se pide crear un Manager, Controller, UI o Effect nuevo.
---

Antes de escribir código:

1. Leer SceneManager.ts para entender cómo se instancian los sistemas
2. Leer PlayerController.ts para ver el patrón de clase usado
3. El nuevo archivo va en src/core/ (infraestructura) o src/gameplay/ (lógica)

Al crear el sistema:

- Usar el mismo patrón: clase con constructor, método update(deltaTime), método dispose()
- Conectar al SceneManager si necesita update por frame
- Emitir/escuchar CustomEvents para comunicación con otros sistemas
- Agregar el import y la instancia en SceneManager.ts

Al terminar, registrar la decisión en DECISIONES-TECNICAS.md siguiendo el skill registrar-decision:
- Sección: "Arquitectura" para sistemas de infraestructura, "Gameplay" para lógica de juego
- Documentar: por qué el sistema merece su propia clase, qué patrón de comunicación usa (CustomEvent, referencia directa, etc.), alternativas descartadas
- Si el sistema emite o escucha eventos nuevos, actualizar la tabla de eventos en la sección Arquitectura
- Confirmar qué archivos se modificaron
