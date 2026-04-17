# Byte Plague

Juego 3D educativo en primera persona desarrollado con Three.js + TypeScript.

Este repositorio contiene la base tecnica del MVP con foco en inmersion espacial, movimiento del jugador e interacciones iniciales con puntos de interes (POIs).

## Objetivo del MVP (2 meses)

Construir una experiencia jugable educativa en primera persona que permita:

- Navegacion fluida en entorno 3D.
- Interaccion con puntos de interes educativos.
- Ciclo de juego base estable para iterar contenido.

## Estado actual

Sprint actual completado:

- Entorno 3D inicial con luces, sombras y fog atmosferico.
- Control FPS base (WASD + rotacion con mouse usando pointer lock).
- Raycaster central desde la camara para deteccion de POIs.

## Stack tecnologico

- Vite
- TypeScript
- Three.js

## Estructura del proyecto

```text
Byte_Plague/
  public/
  src/
    core/
      SceneManager.ts
    gameplay/
      player/
        PlayerController.ts
    assets/
    main.ts
    style.css
  index.html
  package.json
  tsconfig.json
```

## Setup local

### Requisitos

- Node.js 20+ recomendado
- npm 10+

### Instalacion

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

App local por defecto:

- http://localhost:5173

### Build de produccion

```bash
npm run build
```

## Controles actuales

- Click sobre el canvas: captura el mouse (Pointer Lock).
- Mouse: rotacion de camara.
- W A S D: movimiento del jugador.
- ESC: libera el cursor.

## Flujo de trabajo en Git

### Ramas

- `main`: rama estable.
- `develop`: integracion del equipo.
- `feature/<nombre-corto>`: nuevas funcionalidades.
- `fix/<nombre-corto>`: correcciones.
- `chore/<nombre-corto>`: tareas de mantenimiento.

Ejemplos:

- `feature/poi-interaction`
- `feature/basic-collision`
- `fix/raycaster-target-reset`

### Proceso recomendado

1. Crear rama desde `develop`.
2. Implementar cambios pequenos y enfocados.
3. Subir rama al remoto.
4. Abrir PR hacia `develop`.
5. Obtener al menos 1 aprobacion.
6. Hacer merge con squash.

## Convencion de commits

Formato:

`tipo: descripcion breve`

Tipos sugeridos:

- `feat`: nueva funcionalidad.
- `fix`: correccion de bug.
- `chore`: mantenimiento.
- `docs`: documentacion.
- `refactor`: mejora interna sin cambio funcional.

Ejemplos:

- `feat: add fps player controller`
- `fix: avoid duplicate raycast logs on same poi`
- `docs: add team git workflow`

## Definition of Done (DoD)

Una tarea se considera lista cuando:

- Compila sin errores (`npm run build`).
- Fue probada localmente.
- No rompe controles FPS ni raycasting existente.
- Incluye ajustes de documentacion si cambia flujo o arquitectura.
- Tiene PR revisada y aprobada.

## Roadmap MVP (alto nivel)

- Sprint 1: inmersion espacial y movimiento base. (actual)
- Sprint 2: interacciones de POIs y feedback al jugador.
- Sprint 3: objetivos educativos y progression loop.
- Sprint 4: pulido final, testing y entrega.

## Notas de arquitectura

- Se prioriza modularidad simple para velocidad de iteracion.
- No se implementan maquinas de estados de UI en esta fase.
- Las decisiones se orientan a llegar a MVP funcional en plazo.

## Colaboracion del equipo

Para mantener ritmo y calidad:

- PRs chicas y frecuentes.
- Evitar cambios no relacionados en una misma rama.
- Documentar decisiones tecnicas importantes en el README o en un archivo de arquitectura cuando corresponda.
