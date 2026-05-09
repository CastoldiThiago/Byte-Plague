# Byte Plague — Contexto del proyecto

## Narrativa y diseño de niveles

Byte Plague es un juego FPS de infiltración en primera persona donde el jugador es un hacker infiltrado en una red corporativa. El objetivo general es completar los tres niveles sin ser detectado por el antivirus.

### Nivel 1 — Infiltración por phishing (EN DESARROLLO)
El jugador ya entró a la PC de un empleado mediante phishing. Ahora está dentro de la red corporativa y debe moverse por las habitaciones (Entrada → Clientes → Soporte IT → Red Interna) para conseguir las credenciales de acceso a la red interna. Hay un timer de presión y un nivel de alerta que sube si el antivirus detecta actividad sospechosa.

### Nivel 2 — Escalada de privilegios (PENDIENTE)
Una vez dentro de la red interna, el jugador debe escalar privilegios para obtener acceso de administrador. Mecánicas previstas: explotar vulnerabilidades en servicios internos, moverse lateralmente entre nodos de red, evitar detección.

### Nivel 3 — Cifrado de archivos objetivo (PENDIENTE)
Con privilegios elevados, el jugador debe localizar y cifrar archivos objetivo específicos (al estilo ransomware) antes de ser detectado. El antivirus tiene patrullas activas y el riesgo de detección es máximo.

### Flujo actual del nivel 1

1. Spawn en el pasillo de entrada (`-14.80, 1.7, 19.81`)
2. Barrera `puerta-clientes` → comando `cd clientes` → sala de clientes/soporte
3. Barrera `puerta-soporte` → comando `cd soporte-it` → sala de soporte (no requiere prerequisito)
4. En sala de soporte: leer `clientes.db` y `credenciales_vpn.txt` → obtener `dato-clientes` y `dato-soporte`
5. Barrera `puerta-red-interna` → requiere ambos datos → comando `ssh netops@10.10.0.20` → nivel completo

### Mecánicas clave ya implementadas
- Movimiento WASD + PointerLock (mouse look)
- Barreras holográficas en puertas: plano semitransparente animado con scan lines; se abren eligiendo el comando correcto en el terminal
- Archivos interactuables (FilePOI) que muestran menú de comandos (terminal no bloqueante)
- Colisión FPS por raycasting: 3 rayos horizontales (ojos / cintura / rodillas), movimiento independiente por eje X/Z para wall-sliding
- Sistema de alerta con barra de progreso y estados
- Timer de cuenta regresiva por nivel
- GameStateManager con estados: playing / paused / game-over
- Antivirus agent con patrulla y detección por zona (NetworkZoneManager)
- AudioManager para sonido ambiental
- Drone decorativo animado en sala de entrada (hover + rotación)
- Menú de pausa (ESC) sin romper el pointer lock flow
- Modo dev: vuelo (Space sube / Shift baja), noClip, DevPanel con posición en tiempo real y copia al clipboard

## Stack

- Three.js 0.184 + TypeScript 6 + Vite 8
- Sin frameworks de UI, sin librerías de estado externas

## Arquitectura actual

### Entrada
- `src/main.ts` — punto de entrada: crea SceneManager, HUDManager, PauseMenu e inyecta el HTML del HUD

### Core (infraestructura)
- `src/core/SceneManager.ts` — orquesta la escena, loop de animación (`animate()`), pausa, construye y conecta todos los subsistemas
- `src/core/AudioManager.ts` — sonido ambiental y efectos de audio
- `src/core/GameStateManager.ts` — máquina de estados del juego (playing / paused / game-over), timer de nivel, nivel de alerta
- `src/core/InteractionManager.ts` — escucha `poiFocus`/`poiBlur` y la tecla E; despacha `poiInteract` al sistema correcto
- `src/core/AssetLoader.ts` — carga centralizada de assets (texturas, modelos)

### Gameplay (lógica de juego)
- `src/gameplay/player/PlayerController.ts` — movimiento WASD, PointerLock, raycasting hacia interactuables (distancia máx. 5 u + line-of-sight), colisión por raycasting (3 alturas), fly mode y noClip (dev); despacha `poiFocus`/`poiBlur`/`gamePaused`/`gameResumed`
- `src/gameplay/AntivirusAgent.ts` — agente de patrulla con detección por zona; sube el nivel de alerta si el jugador está en zona de red
- `src/gameplay/CommandEngine.ts` — ejecuta los comandos que elige el jugador en los archivos (lógica de resultado, narrativa)

### World (construcción del mundo)
- `src/world/WorldBuilder.ts` — carga la escena GLTF (`/scifi_scene/scene.gltf`, scale=50, auto-centrado en XZ), crea barreras holográficas en las 3 puertas narrativas y los FilePOIs de sala 2; expone `build()`, `openDoor()`, `update()`, `dispose()`
- `src/world/HolographicBarrier.ts` — barrera holográfica animada (scan lines en canvas, pulsación de opacidad); al abrirse se elimina de `interactables` y `collidables` para deshabilitar interacción y colisión
- `src/world/FilePOI.ts` — objeto interactuable tipo archivo (mesh + base + label sprite + userData)
- `src/world/LabelSprite.ts` — helper para crear sprites de texto 2D en el mundo 3D
- `src/world/Door.ts` — lógica de apertura/cierre animada (legacy, no usado en nivel 1 con escena GLTF)

### UI
- `src/ui/HUDManager.ts` — actualiza barra de alerta, texto de estado y timer en el HUD
- `src/ui/TerminalUI.ts` — panel de comandos no bloqueante (abre/cierra con E, opciones 1/2/3)
- `src/ui/PauseMenu.ts` — overlay de pausa (abre/cierra con ESC, botón Reanudar)
- `src/ui/NarrativeScreen.ts` — pantalla de narrativa/intro entre niveles
- `src/ui/DevPanel.ts` — panel de desarrollo (solo en dev mode): teleport a zonas, toggle de colisiones, posición en tiempo real + copia al clipboard

### Efectos y shaders
- `src/effects/DataParticles.ts` — partículas ambientales tipo "datos flotantes"
- `src/shaders/GlitchMaterial.ts` — material con efecto glitch para elementos de UI 3D

### Datos y tipos
- `src/data/scenarios.ts` — definición de escenarios: textos narrativos, comandos disponibles por archivo, resultados
- `src/types/game.ts` — tipos e interfaces compartidos entre sistemas

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
