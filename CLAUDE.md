# Byte Plague — Contexto del proyecto

## Stack

- Three.js 0.184 + TypeScript 6 + Vite 8
- Sin frameworks de UI, sin librerías de estado externas

## Arquitectura actual

- `src/core/SceneManager.ts` — orquesta toda la escena, loop de animación
- `src/gameplay/player/PlayerController.ts` — WASD + PointerLock + raycaster
- `src/main.ts` — entrada, crea SceneManager, HTML del HUD

## Convenciones de código

- Clases TypeScript con métodos privados como `private readonly método = () => {}`
- Sin console.log en producción, solo en archivos de debug
- Eventos nativos del DOM (CustomEvent) para comunicación entre sistemas
- Nuevos sistemas van en `src/core/` (infraestructura) o `src/gameplay/` (lógica de juego)

## Comandos del proyecto

- `npm run dev` — servidor local en localhost:5173
- `npm run build` — build de producción (tsc + vite)

## Lo que NO hacer

- No usar librerías externas sin consultar
- No modificar tsconfig.json ni package.json sin avisar
- No romper el loop existente en SceneManager.animate()
