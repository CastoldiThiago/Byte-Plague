# Byte Plague — Contexto del proyecto

## Narrativa y diseño de niveles

Byte Plague es un juego FPS de infiltración en primera persona donde el jugador es un hacker infiltrado en una red corporativa. El objetivo general es completar los tres niveles sin ser detectado por el antivirus.

### Nivel 1 — Infiltración por phishing (EN DESARROLLO)
El jugador ya entró a la PC de un empleado mediante phishing. Ahora está dentro de la red corporativa y debe moverse por las habitaciones (Entrada → Clientes → Soporte IT → Red Interna) para conseguir las credenciales de acceso a la red interna. Hay un timer de presión y un nivel de alerta que sube si el antivirus detecta actividad sospechosa.

### Nivel 2 — Escalada de privilegios (PENDIENTE)
Una vez dentro de la red interna, el jugador debe escalar privilegios para obtener acceso de administrador. Mecánicas previstas: explotar vulnerabilidades en servicios internos, moverse lateralmente entre nodos de red, evitar detección.

### Nivel 3 — Cifrado de archivos objetivo (PENDIENTE)
Con privilegios elevados, el jugador debe localizar y cifrar archivos objetivo específicos (al estilo ransomware) antes de ser detectado. El antivirus tiene patrullas activas y el riesgo de detección es máximo.

### Mecánicas clave ya implementadas
- Movimiento WASD + PointerLock (mouse look)
- Puertas que se abren al interactuar (sistema de POIs con raycasting)
- Archivos interactuables que muestran menú de comandos (terminal no bloqueante)
- Sistema de alerta con barra de progreso y estados
- Timer de cuenta regresiva por nivel
- GameStateManager con estados: playing / paused / game-over
- Antivirus agent con patrulla y detección por zona (NetworkZoneManager)
- AudioManager para sonido ambiental
- Drone decorativo animado en sala de entrada (hover + rotación)
- Menú de pausa (ESC) sin romper el pointer lock flow

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
