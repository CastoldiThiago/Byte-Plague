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
