---
name: nuevo-poi
description: Agregar un nuevo punto de interés (POI) a la escena. Usar cuando
  se pide crear un objeto interactivo, terminal, archivo o zona nueva.
---

Para crear un nuevo POI:

1. Agregar la geometría THREE.Mesh en SceneManager.setupWorld()
2. Asignar userData.interactive = true y userData.poiId = "id-descriptivo"
3. Hacer push a this.interactables[]
4. Registrar sus comandos válidos en CommandEngine.ts (cuando exista)
5. Confirmar el poiId usado para que se pueda referenciar desde CommandEngine

Al terminar, registrar la decisión en DECISIONES-TECNICAS.md siguiendo el skill registrar-decision:
- Sección: "Mundo / Zonas" si es geometría/zona, "Gameplay" si es mecánica nueva
- Documentar: qué POI se agregó, posición elegida, material/color y por qué, alternativas de ubicación descartadas
- Si el POI introduce un evento nuevo, actualizar la tabla de eventos en la sección Arquitectura
