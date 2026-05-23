# Byte Plague — Contexto del proyecto

## Narrativa y diseño

Byte Plague es un juego FPS de infiltración en primera persona donde el jugador es un virus ransomware que entró a una red corporativa mediante phishing. El objetivo es cifrar los archivos críticos de la empresa antes de ser detectado por el antivirus.

El juego transcurre en un **único mapa** con estética sci-fi. No hay niveles separados: hay tres etapas que se desarrollan de forma continua a medida que el jugador desbloquea zonas del mismo entorno.

---

## Etapas y flujo de juego

> Los comandos listados en cada etapa son el **camino crítico** — los mínimos necesarios para avanzar. Cada zona puede tener comandos opcionales que otorgan lore, contexto narrativo, ítems extra o respuestas de error con texto narrativo. El sistema debe aceptar cualquier comando válido de Unix aunque no esté en el camino crítico, y responder con un mensaje coherente (permiso denegado, archivo no encontrado, etc.).

### Etapa 1 — Infiltración desde la PC del empleado (EN DESARROLLO)

El jugador spawnea en el túnel inferior. La PC del empleado (jperez) está en la habitación inferior izquierda. Hay que recolectar las credenciales VPN y la IP del servidor para poder conectarse a la red interna.

**Recorrido:** Spawn (túnel) → Oficina de jperez → Barrera hacia red interna

**Comandos:**

1. `whoami` → confirma usuario `jperez` sin privilegios
2. `ls ~/Desktop` → lista archivos del escritorio
3. `cat notas_reunion.txt` → revela IP `10.10.0.20`
4. `cat credenciales_vpn.txt` → obtiene usuario `netops` y contraseña
5. `ssh netops@10.10.0.20` → **barrera desbloqueada**, acceso a la red interna

### Etapa 2 — Escalada de privilegios (PENDIENTE)

El jugador opera en la red interna como `netops`. Necesita credenciales de administrador de dominio para acceder a los archivos críticos. El drone del antivirus aparece por primera vez en esta etapa.

**Recorrido:** Pasillo central → Servidor compartido (izquierda) → Controlador de dominio (sala hexagonal arriba)

**Comandos — Servidor compartido:**

1. `ls /shares` → lista carpetas del servidor
2. `cat /shares/IT_backups/network_map.txt` → revela IPs internas
3. `net user /domain` → lista usuarios del dominio
4. `find /shares/IT_backups -name "*.ps1"` → encuentra script de backup
5. `cat /shares/IT_backups/sync_backup.ps1` → credenciales de `domain_admin` hardcodeadas
6. `request_ticket svc_backup` → obtiene hash Kerberos (Kerberoasting)
7. `crack_ticket svc_backup.ticket` → crackea el hash

**Comandos — Controlador de dominio:** 8. `su svc_backup` → sesión como cuenta de servicio 9. `net group "Domain Admins" /domain` → confirma existencia de domain_admin 10. `su domain_admin` → **barrera desbloqueada**, privilegios de administrador obtenidos

### Etapa 3 — Cifrado de archivos críticos (PENDIENTE)

El jugador tiene privilegios de domain_admin. El drone está en patrulla máxima. Hay que ejecutar cuatro comandos en secuencia para completar el ransomware.

**Recorrido:** Sala de archivos críticos (sala grande derecha)

**Comandos:**

1. `find /critical -name "*.db" -o -name "*.bak" -o -name "*.xlsx"` → localiza archivos objetivo
2. `ls /critical` → confirma contenido del directorio
3. `generate_key --algo RSA-2048 --output session.key` → genera clave de cifrado
4. `encrypt --target /critical --key session.key --ext .BYTEPLAGUE` → cifra todos los archivos (animación de glitch)
5. `deploy_ransom --note "..." --target /critical` → despliega nota de rescate → **misión completada**

Al completar: el drone entra a la sala, 10 segundos para escapar por el camino recorrido.

---

## Layout del mapa

```
           [Sala hex — Controlador de dominio]
                         |
[Servidor compartido] ←─ [Pasillo central] ─────────── [Sala de archivos críticos]
                         |
                    [Túnel largo]
                         |
                 [Oficina de jperez]
                         |
                       SPAWN
```

**Equivalencias narrativas:**

- Spawn / túnel → punto de entrada, el virus acaba de ejecutarse
- Oficina de jperez → `~/home/jperez`, PC del empleado comprometido
- Pasillo central → red local de la empresa, hub de tránsito
- Servidor compartido → `/shares/`, carpetas internas del equipo de IT
- Sala hexagonal → controlador de dominio, administra usuarios y permisos
- Sala grande derecha → `/critical/`, servidor con archivos objetivo

**Ítems de evasión del antivirus (recolectables en el mapa):**

- `traffic_spoof.exe` — pasillo central → envía el drone a la zona más lejana por 20 seg
- `firewall_rule.sh` — servidor compartido → bloquea al drone de la zona actual por 15 seg
- `stealth_mode.bin` — sala hexagonal → el cono del drone no detecta al jugador por 10 seg

---

## Mecánicas implementadas

- Movimiento WASD + PointerLock (mouse look)
- Barreras holográficas en puertas: plano semitransparente animado con scan lines; se abren cuando el jugador ejecuta el comando correcto en la terminal
- Archivos interactuables (FilePOI): actualmente muestran menú de comandos numerados (1/2/3) — **siendo reemplazado por terminal con input libre**
- Colisión FPS por raycasting: 3 rayos horizontales (ojos / cintura / rodillas), movimiento independiente por eje X/Z para wall-sliding
- Sistema de alerta con barra de progreso: sube por comandos incorrectos y por detección del drone. Al llegar a 100% → game over
- Timer de cuenta regresiva: corre desde que carga el juego. Al llegar a 0 → game over
- GameStateManager con estados: `playing` / `paused` / `game-over`
- AntivirusAgent: actualmente desactivado del flujo principal (rollback 26-04-2026); la detección se representa solo con la barra de alerta. **Pendiente: reactivar como drone físico con cono de visión**
- AudioManager: sonido ambiental tecnológico, sonidos de acierto y error de comandos
- Drone decorativo animado en sala de entrada (hover + rotación)
- Menú de pausa (ESC) sin romper el PointerLock flow — **ESC está ocupado: cualquier sistema nuevo que use ESC debe consultar el estado antes de actuar**
- Modo dev: vuelo (Space sube / Shift baja), noClip, DevPanel con posición en tiempo real y copia al clipboard

---

## Stack

- Three.js 0.184 + TypeScript 6 + Vite 8
- Sin frameworks de UI, sin librerías de estado externas

---

## Arquitectura actual

### Entrada

- `src/main.ts` — punto de entrada: crea SceneManager, HUDManager, PauseMenu e inyecta el HTML del HUD

### Core (infraestructura)

- `src/core/SceneManager.ts` — orquesta la escena, loop de animación (`animate()`), pausa, construye y conecta todos los subsistemas
- `src/core/AudioManager.ts` — sonido ambiental y efectos de audio
- `src/core/GameStateManager.ts` — máquina de estados del juego (`playing` / `paused` / `game-over`), timer, nivel de alerta. **Fuente de verdad única del juego**
- `src/core/InteractionManager.ts` — escucha `poiFocus`/`poiBlur` y la tecla E; despacha `poiInteract` al sistema correcto
- `src/core/AssetLoader.ts` — carga centralizada de assets (texturas, modelos)

### Gameplay (lógica de juego)

- `src/gameplay/player/PlayerController.ts` — movimiento WASD, PointerLock, raycasting hacia interactuables (distancia máx. 5 u + line-of-sight), colisión por raycasting (3 alturas), fly mode y noClip (dev); despacha `poiFocus`/`poiBlur`/`gamePaused`/`gameResumed`
- `src/gameplay/AntivirusAgent.ts` — actualmente: detección por zona (desactivado). **Pendiente: drone 3D con waypoints aleatorios, cono de visión proyectado en el suelo, escalada de agresividad con el tiempo**
- `src/gameplay/CommandEngine.ts` — valida comandos y ejecuta resultados narrativos

### World (construcción del mundo)

- `src/world/WorldBuilder.ts` — carga la escena GLTF (`/scifi_scene/scene.gltf`, scale=50, auto-centrado en XZ), crea barreras holográficas en las puertas narrativas y los FilePOIs; expone `build()`, `openDoor()`, `update()`, `dispose()`
- `src/world/HolographicBarrier.ts` — barrera holográfica animada (scan lines en canvas, pulsación de opacidad); al abrirse se elimina de `interactables` y `collidables`. **Importante: `visible=false` no deshabilita raycasting en Three.js r184, hay que remover del array**
- `src/world/FilePOI.ts` — objeto interactuable tipo archivo (mesh + base + label sprite + userData)
- `src/world/LabelSprite.ts` — helper para crear sprites de texto 2D en el mundo 3D
- `src/world/Door.ts` — lógica de apertura/cierre animada (legacy, no usado con la escena GLTF)

### UI

- `src/ui/HUDManager.ts` — actualiza barra de alerta, texto de estado y timer en el HUD. **Pendiente: vignette rojo al superar 50% de alerta, hints diegéticos de barrera**
- `src/ui/TerminalUI.ts` — actualmente: panel de comandos numerados (1/2/3). **Pendiente: reemplazar por input de texto libre. Conflicto ESC con PauseMenu: usar `stopPropagation()` o variable `terminalOpen` en GameStateManager**
- `src/ui/PauseMenu.ts` — overlay de pausa (ESC); tiene prioridad sobre otros listeners de ESC
- `src/ui/NarrativeScreen.ts` — pantalla de narrativa/intro con efecto typewriter
- `src/ui/DevPanel.ts` — panel de desarrollo (solo en dev mode): teleport a zonas, toggle de colisiones, posición en tiempo real + copia al clipboard

### Efectos y shaders

- `src/effects/DataParticles.ts` — partículas ambientales tipo "datos flotantes" (500 puntos, reactivas al alertLevel)
- `src/shaders/GlitchMaterial.ts` — material con efecto glitch para archivos cifrados en Etapa 3

### Datos y tipos

- `src/data/scenarios.ts` — definición de escenarios: textos narrativos, comandos disponibles por archivo, resultados
- `src/types/game.ts` — tipos e interfaces compartidos entre sistemas

---

## Comunicación entre sistemas

CustomEvents nativos del DOM (`window.dispatchEvent` / `window.addEventListener`). Todo listener registrado en constructor debe tener su `removeEventListener` en `dispose()`.

| Evento           | Emitido por        | Escuchado por                     |
| ---------------- | ------------------ | --------------------------------- |
| `gameOver`       | GameStateManager   | SceneManager, NarrativeScreen     |
| `levelComplete`  | GameStateManager   | NarrativeScreen                   |
| `poiFocus`       | PlayerController   | InteractionManager, HUDManager    |
| `poiBlur`        | PlayerController   | InteractionManager, HUDManager    |
| `poiInteract`    | InteractionManager | TerminalUI                        |
| `doorUnlocked`   | TerminalUI         | SceneManager (llama `openDoor()`) |
| `commandSuccess` | TerminalUI         | AudioManager                      |
| `commandFail`    | TerminalUI         | AudioManager, GameStateManager    |
| `gamePaused`     | PlayerController   | PauseMenu, SceneManager           |
| `gameResumed`    | PlayerController   | PauseMenu, SceneManager           |

---

## Convenciones de código

- Clases TypeScript con métodos privados como `private readonly método = () => {}`
- Sin `console.log` en producción, solo en archivos de debug
- Eventos nativos del DOM (CustomEvent) para comunicación entre sistemas
- Nuevos sistemas van en `src/core/` (infraestructura) o `src/gameplay/` (lógica de juego)
- Todo sistema nuevo se instancia en SceneManager. Si necesita update por frame, `SceneManager.animate()` debe llamarlo explícitamente

## Comandos del proyecto

- `npm run dev` — servidor local en localhost:5173
- `npm run build` — build de producción (tsc + vite)

---

## Lo que NO hacer

- No usar librerías externas sin consultar
- No modificar `tsconfig.json` ni `package.json` sin avisar
- No romper el loop existente en `SceneManager.animate()`
- No usar `visible=false` para deshabilitar colisión/interacción — remover del array `collidables[]` o `interactables[]`
- No asumir que ESC está libre — consultar estado de terminal y pausa antes de asignar ese listener
