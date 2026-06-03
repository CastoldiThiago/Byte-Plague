# Byte Plague — Contexto del proyecto

## Narrativa y diseño

Byte Plague es un juego FPS de infiltración en primera persona donde el jugador es un virus ransomware que entró a una red corporativa mediante phishing. El objetivo es cifrar los archivos críticos de la empresa antes de ser detectado por el antivirus.

El juego transcurre en un **único mapa** con estética sci-fi. No hay niveles separados: hay tres etapas que se desarrollan de forma continua a medida que el jugador desbloquea zonas del mismo entorno.

---

## Etapas y flujo de juego

> Los comandos listados en cada etapa son el **camino crítico** — los mínimos necesarios para avanzar. Cada zona puede tener comandos opcionales que otorgan lore, contexto narrativo o respuestas de error narrativas. El sistema acepta cualquier comando Unix válido y responde con un mensaje coherente (permiso denegado, archivo no encontrado, etc.).

### Etapa 1 — Infiltración desde la PC del empleado (IMPLEMENTADA)

El jugador spawnea en el túnel inferior. La PC del empleado (jperez) está en la habitación inferior izquierda. Hay que recolectar las credenciales VPN y la IP del servidor para poder conectarse a la red interna.

**Recorrido:** Spawn (túnel) → Oficina de jperez → Barrera hacia red interna

**Camino crítico:**

1. `cat notas_reunion.txt` → revela IP del gateway `10.10.0.20` → otorga `dato-clientes`
2. `cat credenciales_vpn.txt` → obtiene usuario `netops` y contraseña → otorga `dato-soporte`
3. `ssh netops@10.10.0.20` en `puerta-red-interna` → requiere `dato-clientes` + `dato-soporte` → **barrera desbloqueada**, acceso a la red interna

**Terminales opcionales / ítems:** pc-1 (`netstat` → otorga `item-firewall-rule`), pc-2 (`ps aux`), pc-3 (`ping`), pc-4 (`top`); `archivo-procedimientos` (`cat procedimientos.md` → otorga `item-traffic-spoof`)

### Etapa 2 — Escalada de privilegios (IMPLEMENTADA)

El jugador opera en la red interna como `netops`. Al cruzar la barrera de red interna el drone del antivirus aparece en escena. Necesita credenciales de domain_admin para acceder a los archivos críticos.

**Recorrido:** Pasillo central → Servidor compartido `/shares` (hab. izquierda) → Controlador de dominio (sala hexagonal)

**Camino crítico — Servidor compartido:**

1. `cd /shares` en `puerta-shares` → **barrera desbloqueada**, acceso al servidor compartido
2. `cat network_map.txt` → revela IPs internas (DC: 10.10.0.5) → otorga `network-map`
3. `cat sync_backup.ps1` → requiere `network-map` → credenciales de `domain_admin` hardcodeadas → otorga `admin-password`
4. `request_ticket svc_backup` en terminal Kerberoasting → ticket TGS capturado → otorga `kerberos-ticket`
5. `crack_ticket svc_backup.ticket` en misma terminal → requiere `kerberos-ticket` → contraseña crackeada → otorga `cracked-password`

**Camino crítico — Controlador de dominio:**

6. `su svc_backup` en `puerta-dc` → requiere `kerberos-ticket` + `cracked-password` → **barrera desbloqueada**
7. `net group "Domain Admins" /domain` en terminal DC → confirma existencia de domain_admin (lore)
8. `su domain_admin` en misma terminal → requiere `admin-password` → otorga `domain-admin-access` → **puerta-critica se abre automáticamente**

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
- Oficina de jperez → `/home/jperez`, PC del empleado comprometido
- Pasillo central → red local de la empresa, hub de tránsito
- Servidor compartido → `/shares/IT_backups/`, carpetas internas del equipo de IT
- Sala hexagonal → controlador de dominio, administra usuarios y permisos
- Sala grande derecha → `/critical/`, servidor con archivos objetivo

**Ítems de evasión del antivirus (IMPLEMENTADOS — teclas 1/2/3):**

| Ítem | Dónde se encuentra | Efecto | Duración |
|------|-------------------|--------|----------|
| `traffic_spoof.exe` | `cat procedimientos.md` en sala Documents (Etapa 1) | Envía el drone por el pasillo hasta la zona más lejana | 20 s |
| `firewall_rule.sh` | `netstat` en `pc-1` / sala Documents (Etapa 1) | Congela al drone en su posición; su cono vira a verde | 15 s |
| `stealth_mode.bin` | `cat stealth_mode.bin` en `terminal-central` (pasillo central, Etapa 2) | El cono del drone no detecta al jugador | 10 s |

Al encontrar un ítem aparece un toast de confirmación. Los ítems se activan con las teclas **1**, **2**, **3** siempre que no estén en cooldown. El estado se muestra en el panel de notas bajo **HERRAMIENTAS**.

---

## Mecánicas implementadas

- Movimiento WASD + PointerLock (mouse look)
- Barreras holográficas en puertas: plano semitransparente animado con scan lines; se abren cuando el jugador ejecuta el comando correcto. Label configurable por barrera. `puerta-critica` se abre automáticamente sin interacción del jugador.
- **FilePOI**: objeto interactuable tipo archivo — usa `document_folder.glb` con texturas originales sobre un pedestal oscuro. Hitbox invisible para raycasting.
- **TerminalPOI**: objeto interactuable tipo terminal — carga modelos GLB configurables (`scifi_terminal.glb`, `terminal.glb`). Soporta `targetWidth` por instancia y `model` key. El modelo se centra automáticamente dentro de un pivot wrapper para que la rotación no desplace el objeto.
- **Labels de POIs**: punto de luz pulsante verde cuando no está enfocado; al enfocar muestra el nombre del archivo con fondo semitransparente y ancho dinámico (calculado con `measureText`). Sin hint "E para interactuar" (hay uno dinámico en el HUD).
- Terminales multi-paso: `secondCommand` en `Scenario` permite una segunda acción narrativa en la misma terminal, con sus propios `requiredObjectives`, `objectiveId` y `unlocksDoor`.
- Colisión FPS por raycasting: 3 rayos horizontales (ojos / cintura / rodillas), movimiento independiente por eje X/Z para wall-sliding
- Sistema de alerta con barra de progreso: sube **solo** por fallos de comandos narrativos (`[ERROR]` en el output). Comandos VFS genéricos no suben alerta. Al llegar a 100% → game over
- Timer de cuenta regresiva: corre desde que carga el juego. Al llegar a 0 → game over
- GameStateManager: estados `playing` / `paused` / `game-over`, progresión de nivel (`_currentLevel` se incrementa al completar objetivos del nivel)
- AntivirusAgent: conectado al flujo principal. Aparece al desbloquear `puerta-red-interna`. Patrullaje **secuencial** por waypoints reales (coordenadas tomadas del DevPanel): loop completo pasillo central → sala shares → túnel → sala Documents (Etapa 2); añade sala crítica en Etapa 3. Durante el dwell en cada waypoint el cono gira 360° a `LOOK_ANGULAR_SPEED`. Métodos de evasión: `trafficSpoof()` (desvía por pasillo hasta Etapa 1 sin dwell), `stealthMode()` (cono ciego, gris), `firewallRule()` (congela movimiento 15 s, cono verde).
- **EvasionItemManager** (`src/gameplay/EvasionItemManager.ts`): gestiona los 3 ítems de evasión. Escucha `objectiveUnlocked` para desbloquear slots; teclas 1/2/3 activan el efecto; muestra toast al encontrar un ítem y contador de cooldown en el slot.
- AudioManager: sonido ambiental tecnológico, sonidos de acierto y error de comandos. Suspende/reanuda el AudioContext al recibir `gamePaused`/`gameResumed`.
- Menú de pausa (ESC) sin romper el PointerLock flow — **ESC está ocupado: cualquier sistema nuevo que use ESC debe consultar el estado antes de actuar**
- Modo dev: vuelo (Space sube / Shift baja), noClip, DevPanel con posición en tiempo real + copia al clipboard + botón **"⏩ Skip Etapa 1"** (completa objetivos, abre puertas y teleporta al spawn de Etapa 2)

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
- `src/core/AudioManager.ts` — sonido ambiental y efectos de audio. Pausa/reanuda el AudioContext al recibir `gamePaused`/`gameResumed`.
- `src/core/GameStateManager.ts` — fuente de verdad única: estados del juego, timer, nivel de alerta, objetivos completados, progresión de nivel. Al completar todos los objetivos de un nivel dispara `levelComplete` e incrementa `_currentLevel`. Al completar cualquier objetivo individual dispara `objectiveUnlocked { id }`.
- `src/core/InteractionManager.ts` — escucha `poiFocus`/`poiBlur` y la tecla E; despacha `poiInteract` al sistema correcto
- `src/core/AssetLoader.ts` — carga centralizada de assets
- `src/core/VirtualFS.ts` — singleton. Filesystem Linux simulado: `cwd`, `user`, comandos genéricos, restricciones de `cd` (solo puertas) y `cat` (solo archivo propio del POI, acepta tanto basename como path completo). Se sincroniza con el POI activo vía `setContext(basePath, allowCd, restrictedFile)`

### Gameplay (lógica de juego)

- `src/gameplay/player/PlayerController.ts` — movimiento WASD, PointerLock, raycasting hacia interactuables (distancia máx. 5 u + line-of-sight), colisión por raycasting (3 alturas), fly mode y noClip (dev)
- `src/gameplay/AntivirusAgent.ts` — patrullaje secuencial por waypoints reales, cono de visión proyectado en el suelo (y=0.5, renderOrder=1), giro durante dwell. Etapa 2: loop pasillo + shares + túnel + Documents. Etapa 3: añade sala crítica. Métodos públicos: `trafficSpoof()`, `stealthMode()`, `firewallRule()`.
- `src/gameplay/EvasionItemManager.ts` — desbloquea ítems al recibir `objectiveUnlocked`; activa efectos en AntivirusAgent con teclas 1/2/3; gestiona cooldown, toast y slots en NotesPanel.
- `src/gameplay/CommandEngine.ts` — orquestador de cuatro capas: (1) narrativo `correctCommand`, (1b) narrativo `secondCommand`, (2) VirtualFS genérico, (3) command not found

### World (construcción del mundo)

- `src/world/WorldBuilder.ts` — carga escena GLTF, crea barreras, FilePOIs y TerminalPOIs (incluye `terminal-central` en el pasillo central). Escucha `doorUnlocked` internamente para activar el drone al desbloquear `puerta-red-interna`. Expone `build()`, `openDoor()`, `update()`, `dispose()`.
- `src/world/HolographicBarrier.ts` — barrera holográfica animada; label configurable por instancia. Al abrirse se remueve de `interactables` y `collidables`. **`visible=false` no deshabilita raycasting en Three.js r184 — siempre remover del array.**
- `src/world/FilePOI.ts` — archivo interactuable: carga `document_folder.glb` con texturas originales, hitbox invisible, dot pulsante + label al enfocar, event listeners `poiFocus`/`poiBlur`.
- `src/world/TerminalPOI.ts` — terminal interactuable: carga GLB configurable (`model` key → URL), normaliza escala a `targetWidth`, usa pivot wrapper para que la rotación no desplace el modelo, hitbox y sprites se reposicionan al centro real del modelo tras la carga.
- `src/world/LabelSprite.ts` — `createDotSprite()` (punto pulsante verde) y `createFocusedLabel(text)` (canvas con ancho dinámico por `measureText`, fondo semitransparente, borde sutil).
- `src/world/Door.ts` — lógica de apertura/cierre animada (legacy, no usado con la escena GLTF)

### UI

- `src/ui/HUDManager.ts` — actualiza barra de alerta, texto de estado y timer
- `src/ui/TerminalUI.ts` — terminal con input libre: historial ↑↓, Tab completion, Ctrl+L/C, prompt dinámico. Maneja `commandSuccess` y `doorUnlocked` tanto para `correctCommand` como para `secondCommand`. Cierra con backtick.
- `src/ui/PauseMenu.ts` — overlay de pausa (ESC); tiene prioridad sobre otros listeners de ESC
- `src/ui/NarrativeScreen.ts` — pantalla de narrativa/intro con efecto typewriter
- `src/ui/NotesPanel.ts` — panel lateral de objetivos y herramientas. Sección **HERRAMIENTAS** con slots (`#item-slots`) que EvasionItemManager rellena al desbloquear ítems.
- `src/ui/DevPanel.ts` — panel dev: teleport a zonas, toggle de colisiones, posición en tiempo real + copia al clipboard, botón "⏩ Skip Etapa 1" (callback `skipStage`)

### Efectos y shaders

- `src/effects/DataParticles.ts` — partículas ambientales tipo "datos flotantes" (500 puntos, reactivas al alertLevel)
- `src/shaders/GlitchMaterial.ts` — material con efecto glitch para archivos cifrados en Etapa 3

### Datos y tipos

- `src/data/scenarios.ts` — escenarios de Etapas 1 y 2: `correctCommand`, `secondCommand` (opcional, para terminales multi-paso), `basePath`, `targetPath`, `requiredObjectives`, `objectiveId`, `secondUnlocksDoor`. Incluye `terminal-central` (stealth_mode.bin). Los archivos del servidor compartido se leen con nombre corto (`cat network_map.txt`, `cat sync_backup.ps1`) porque `basePath` ya es `/shares/IT_backups`.
- `src/data/filesystem.ts` — árbol estático del VFS: `/home/jperez/`, `/home/netops/` (incluye `stealth_mode.bin`), `/home/svc_backup/`, `/shares/IT_backups/` (con `network_map.txt` y `sync_backup.ps1`), `/etc/`, `/var/`, `/proc/`
- `src/types/game.ts` — tipos compartidos. `Scenario` incluye campos `second*` para terminales multi-paso. `CommandResult` incluye `unlocksDoor` para que el motor de comandos indique qué barrera abrir.

---

## Comunicación entre sistemas

CustomEvents nativos del DOM (`window.dispatchEvent` / `window.addEventListener`). Todo listener registrado en constructor debe tener su `removeEventListener` en `dispose()`.

| Evento           | Emitido por        | Escuchado por                                  |
| ---------------- | ------------------ | ---------------------------------------------- |
| `gameOver`       | GameStateManager   | SceneManager, NarrativeScreen                  |
| `levelComplete`  | GameStateManager   | NarrativeScreen                                |
| `poiFocus`       | PlayerController   | InteractionManager, HUDManager, FilePOI, TerminalPOI |
| `poiBlur`        | PlayerController   | InteractionManager, HUDManager, FilePOI, TerminalPOI |
| `poiInteract`    | InteractionManager | TerminalUI                                     |
| `doorUnlocked`   | TerminalUI         | SceneManager (`openDoor()`), WorldBuilder (drone) |
| `commandSuccess` | TerminalUI         | AudioManager                                   |
| `commandFail`    | TerminalUI         | AudioManager, GameStateManager                 |
| `gamePaused`        | PlayerController   | PauseMenu, SceneManager, AudioManager          |
| `gameResumed`       | PlayerController   | PauseMenu, SceneManager, AudioManager          |
| `objectiveUnlocked` | GameStateManager   | EvasionItemManager                             |
| `levelSpawnReady`   | WorldBuilder       | SceneManager (teleporta al spawn)              |

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
- No agregar archivos al VFS sin actualizar también el scenario correspondiente (`basePath`, `restrictedFile` si aplica)
- No asumir que `cd` es libre — solo funciona en puertas (`allowCd: true`) y únicamente mediante el comando narrativo correcto
- No romper el loop existente en `SceneManager.animate()`
- No usar `visible=false` para deshabilitar colisión/interacción — remover del array `collidables[]` o `interactables[]`
- No asumir que ESC está libre — consultar estado de terminal y pausa antes de asignar ese listener
- No agregar un modelo GLB y asumir que su pivot está en el centro visual — los GLBs de Sketchfab suelen tener offsets internos. `TerminalPOI` usa un pivot wrapper que resuelve esto; `FilePOI` resetea `root.position` antes de calcular el bbox.
- No agregar escenarios con `secondCommand` sin verificar que el comando no sea interceptado por VirtualFS antes de llegar a la capa narrativa (ej: `su` es manejado por VFS como error genérico — el `secondCommand` lo intercepta en capa 1b antes que VFS)
