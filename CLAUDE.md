# Byte Plague — Contexto del proyecto

> **Proyecto académico:** simulador educativo de ciberseguridad ofensiva para enseñar conceptos de pentesting en un entorno ficticio de videojuego. Todo el contenido es ficticio y no representa ni instruye sobre ataques reales.

## Narrativa y diseño

Byte Plague es un juego FPS educativo de simulación de pentesting en primera persona. El jugador encarna un agente de red team que debe demostrar las vulnerabilidades de una red corporativa simulada. El objetivo es acceder a los archivos críticos del entorno ficticio antes de ser detectado por el sistema de monitoreo de seguridad (antivirus).

El juego transcurre en un **único mapa** con estética sci-fi. No hay niveles separados: hay tres etapas que se desarrollan de forma continua a medida que el jugador desbloquea zonas del mismo entorno.

---

## Etapas y flujo de juego

> Los comandos listados en cada etapa son el **camino crítico** — los mínimos necesarios para avanzar. Cada zona puede tener comandos opcionales que otorgan lore, contexto narrativo o respuestas de error narrativas. El sistema acepta cualquier comando Unix válido y responde con un mensaje coherente (permiso denegado, archivo no encontrado, etc.).

### Etapa 1 — Acceso inicial desde el equipo comprometido (IMPLEMENTADA)

El jugador spawnea en el túnel inferior. El equipo del usuario jperez está en la habitación inferior izquierda. Hay que recolectar los datos de acceso VPN y la IP del servidor para poder conectarse a la red interna.

**Recorrido:** Spawn (túnel) → Oficina de jperez → Barrera hacia red interna

**Camino crítico:**

1. `cat notas_reunion.txt` → revela IP del gateway `10.10.0.20` → otorga `dato-clientes`
2. `cat credenciales_vpn.txt` → obtiene usuario `netops` y contraseña → otorga `dato-soporte`
3. `ssh netops@10.10.0.20` en `puerta-red-interna` → requiere `dato-clientes` + `dato-soporte` → **barrera desbloqueada**, acceso a la red interna

**Terminales opcionales / ítems:** pc-1 (`netstat -an` o `-na` → otorga `item-firewall-rule`), pc-2 (`ps aux`), pc-3 (`ping`), pc-4 (`top`); `archivo-procedimientos` (`cat procedimientos.md` → otorga `item-traffic-spoof`)

### Etapa 2 — Escalada de permisos (IMPLEMENTADA)

El jugador opera en la red interna como `netops`. Al cruzar la barrera de red interna el agente de monitoreo (drone) aparece en escena. Necesita permisos de domain_admin para acceder a los archivos críticos.

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

### Etapa 3 — Acceso y marcado de archivos críticos (IMPLEMENTADA)

El jugador tiene privilegios de domain_admin. Al iniciar el proceso de auditoría el agente de monitoreo entra en modo persecución máxima. El jugador debe marcar la mayor cantidad de archivos como comprometidos antes de ser detectado.

**Recorrido:** Sala de archivos críticos (sala grande derecha)

**Camino crítico:**

1. `encrypt` en `terminal-critical` → otorga `encryption-key` → **narrativa de alerta** → drone entra en modo chase desde sala central

**Mecánica de auditoría:**
- Al completar `encrypt`, los 8 archivos físicos de la sala se vuelven interactuables
- El jugador presiona **E** sobre cada archivo para marcarlo como comprometido (GlitchMaterial aplicado al modelo)
- HUD muestra `⚠ AUDITADOS: N/8` en tiempo real (en código aparece como CIFRADOS por coherencia con el sistema)
- Los ítems de evasión (1/2/3) quedan deshabilitados durante el chase

**Condiciones de fin:**
- **Agente detecta al jugador** (`playerCaught` → `gameCaptured`) → pantalla de puntaje: N/8 archivos auditados, daño estimado, calificación S/A/B/C/F; botones **Reintentar (checkpoint Etapa 3)** y **Inicio**
- **Todos los archivos auditados** (`allFilesEncrypted`) → pantalla de victoria: calificación S perfecta; solo botón **Inicio**

**Comportamiento del drone en chase:**
- Snapea a sala central, espera que la narrativa termine (`chaseRushStart`)
- Rush por corredor natural a ~4 u/s hasta entrar a la sala crítica
- Luego persecución directa al jugador a ~5 u/s (jugador corre a 6 u/s)
- El drone respeta `isPaused` (no se mueve durante narrativas)

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

- Spawn / túnel → punto de entrada al entorno simulado
- Oficina de jperez → `/home/jperez`, equipo del usuario jperez (punto de partida de la simulación)
- Pasillo central → red local de la empresa, hub de tránsito
- Servidor compartido → `/shares/IT_backups/`, carpetas internas del equipo de IT
- Sala hexagonal → controlador de dominio, administra usuarios y permisos
- Sala grande derecha → `/critical/`, servidor con archivos objetivo (8 archivos físicos)

**Ítems de evasión del antivirus (teclas 1/2/3, 2 usos cada uno):**

| Ítem | Dónde se encuentra | Efecto | Duración |
|------|-------------------|--------|----------|
| `traffic_spoof.exe` | `cat procedimientos.md` en sala Documents (Etapa 1) | Envía el drone por el pasillo hasta la zona más lejana | 20 s |
| `firewall_rule.sh` | `netstat` en `pc-1` / sala Documents (Etapa 1) | Congela al drone en su posición (el cono mantiene su color) | 15 s |
| `stealth_mode.bin` | `cat stealth_mode.bin` en `terminal-central` (pasillo central, Etapa 2) | El cono del drone no detecta al jugador | 10 s |

Al encontrar un ítem se muestra en el **panel izquierdo persistente** (`#tools-panel`). Los ítems se activan con **1/2/3**. Cada ítem tiene **2 usos máximos**; al agotarse queda deshabilitado. En Etapa 3 (chase) los ítems se deshabilitan completamente. El panel se puede cerrar/abrir con **H**.

---

## Pantalla de inicio (`StartScreen`)

Se muestra al cargar el proyecto (antes del juego). Permite configurar:
- **Nombre del virus** (default: `BYTE-PLAGUE`) — texto libre
- **Empresa objetivo** (default: `corp.internal`) — texto libre
- **Dificultad**: Fácil (+50% tiempo / drone lento), Normal, Difícil (−35% tiempo / drone rápido)
- **Manual de juego** — sección plegable con controles y mecánicas
- **Botón "INICIAR ATAQUE"** — limpia checkpoint y arranca juego nuevo
- **Botón "CONTINUAR PARTIDA"** — visible solo si hay checkpoint guardado

Si se hace clic en "Reintentar" desde la pantalla de puntaje, se setea `sessionStorage('byteplague_autostart')` y la StartScreen se saltea automáticamente al recargar.

La configuración se almacena en `GameConfig` (singleton, `src/core/GameConfig.ts`) y afecta timers y velocidad del antivirus.

---

## Mecánicas implementadas

- Movimiento WASD + PointerLock (mouse look). Velocidad del jugador: **6 u/s**.
- Barreras holográficas en puertas: plano semitransparente animado con scan lines; se abren cuando el jugador ejecuta el comando correcto. Label configurable por barrera. `puerta-critica` se abre automáticamente sin interacción del jugador.
- **FilePOI**: objeto interactuable tipo archivo — usa `document_folder.glb` con texturas originales sobre un pedestal oscuro. Hitbox invisible para raycasting. Método público `encrypt(mat: GlitchMaterial)` aplica el shader de glitch y colorea el pedestal de rojo (soporta carga async del modelo).
- **TerminalPOI**: objeto interactuable tipo terminal — carga modelos GLB configurables (`scifi_terminal.glb`, `terminal.glb`). Soporta `targetWidth` por instancia y `model` key. El modelo se centra automáticamente dentro de un pivot wrapper para que la rotación no desplace el objeto.
- **Labels de POIs**: punto de luz pulsante verde cuando no está enfocado; al enfocar muestra el nombre del archivo con fondo semitransparente y ancho dinámico (calculado con `measureText`). Sin hint "E para interactuar" (hay uno dinámico en el HUD).
- Terminales multi-paso: `secondCommand` en `Scenario` permite una segunda acción narrativa en la misma terminal, con sus propios `requiredObjectives`, `objectiveId` y `unlocksDoor`.
- Colisión FPS por raycasting: 3 rayos horizontales (ojos / cintura / rodillas), movimiento independiente por eje X/Z para wall-sliding. **Paredes invisibles** agregables en `WorldBuilder.createInvisibleWalls()` como `THREE.BoxGeometry` + `MeshStandardMaterial` coloreado.
- Sistema de alerta con barra de progreso: sube **solo** por fallos de comandos narrativos (`[ERROR]` en el output). Comandos VFS genéricos no suben alerta. Al llegar a 100% → game over. **Durante el chase de Etapa 3 la alerta queda desactivada** (solo cuenta la proximidad del drone).
- Timer de cuenta regresiva: corre desde que carga el juego. Afectado por `GameConfig.timerMultiplier` según dificultad. **Se pausa durante narrativas** (`NarrativeScreen` llama a `GameStateManager.setPaused(true/false)`). Congelado durante el chase de Etapa 3.
- **GameStateManager**: estados `playing` / `paused` / `game-over`, progresión de nivel (`_currentLevel` se incrementa al completar objetivos del nivel). Modo chase: `startChase()` deshabilita alertas y timer. Dificultad: `timerMultiplier` y acceso indirecto vía `GameConfig`.
- **AntivirusAgent**: conectado al flujo principal. Aparece al desbloquear `puerta-red-interna`. Respeta `GameStateManager.isPaused`. Patrullaje secuencial por waypoints reales. Etapa 2: loop pasillo + shares + túnel + Documents. Etapa 3: añade sala crítica. Etapa 3 chase: `enterChaseMode()` → snap a sala central → rush por corredor → persecución directa al jugador. Flag `chaseModeActive` garantiza que nunca vuelva a patrol durante el chase. `hasCaught` evita disparar `playerCaught` múltiples veces. Métodos de evasión bloqueados durante chase.
- **EvasionItemManager** (`src/gameplay/EvasionItemManager.ts`): panel izquierdo persistente (`#tools-panel`) con tarjetas por ítem. Cada ítem tiene **2 usos máximos** (`usesLeft`). Tecla **H** togglea el panel. Al entrar en chase, el panel se deshabilita visualmente.
- **CriticalFileManager** (`src/gameplay/CriticalFileManager.ts`): gestiona los 8 archivos físicos de Etapa 3. Escucha `objectiveUnlocked { id: 'encryption-key' }` para habilitar el cifrado. Escucha `poiInteract` para cifrar archivos (llama a `FilePOI.encrypt()`). Cuando todos son cifrados: `allFilesEncrypted`. Cuando el drone atrapa al jugador: re-despacha `gameCaptured { count, total }`.
- **CommandEngine**: normaliza flags cortas antes de comparar (ej: `netstat -an` ≡ `netstat -na`). Las flags de un solo token se ordenan alfabéticamente.
- AudioManager: sonido ambiental tecnológico, sonidos de acierto y error de comandos. Suspende/reanuda el AudioContext al recibir `gamePaused`/`gameResumed`.
- Menú de pausa (ESC) sin romper el PointerLock flow — **ESC está ocupado: cualquier sistema nuevo que use ESC debe consultar el estado antes de actuar**
- Modo dev: vuelo (Space sube / Shift baja), noClip, DevPanel con posición en tiempo real + copia al clipboard + botón **"⏩ Skip Etapa 1"** y **"⏩ Skip Etapa 2"** (completa objetivos, abre puertas y teleporta al spawn de la etapa siguiente)

---

## Stack

- Three.js 0.184 + TypeScript 6 + Vite 8
- Sin frameworks de UI, sin librerías de estado externas

---

## Arquitectura actual

### Entrada

- `src/main.ts` — punto de entrada: muestra `StartScreen`; tras confirmar config, crea SceneManager, HUDManager, PauseMenu e inyecta el HTML del HUD. Si `GameConfig.consumeAutostart()` es true (Reintentar), saltea la StartScreen.

### Core (infraestructura)

- `src/core/SceneManager.ts` — orquesta la escena, loop de animación (`animate()`), pausa, construye y conecta todos los subsistemas. Maneja `gameOver`, `gameWon`, `gameCaptured`, `allFilesEncrypted`. Checkpoint: guarda etapa 3 al completar nivel 2.
- `src/core/AudioManager.ts` — sonido ambiental y efectos de audio. Pausa/reanuda el AudioContext al recibir `gamePaused`/`gameResumed`.
- `src/core/GameStateManager.ts` — fuente de verdad única: estados del juego, timer, nivel de alerta, objetivos completados, progresión de nivel. Métodos: `startChase()` (Etapa 3, deshabilita alertas/timer), `setPaused()`. Aplica `GameConfig.timerMultiplier` al inicializar timers.
- `src/core/GameConfig.ts` — singleton de configuración: `virusName`, `targetCompany`, `difficulty`. Expone `timerMultiplier` y `antivirusSpeedMultiplier`. `flagAutostart()` / `consumeAutostart()` gestionan el flag de sesión para Reintentar.
- `src/core/InteractionManager.ts` — escucha `poiFocus`/`poiBlur` y la tecla E; despacha `poiInteract` al sistema correcto
- `src/core/AssetLoader.ts` — carga centralizada de assets
- `src/core/VirtualFS.ts` — singleton. Filesystem Linux simulado: `cwd`, `user`, comandos genéricos, restricciones de `cd` (solo puertas) y `cat` (solo archivo propio del POI, acepta tanto basename como path completo). Se sincroniza con el POI activo vía `setContext(basePath, allowCd, restrictedFile)`. `/critical/` tiene 8 archivos objetivo.
- `src/core/SaveManager.ts` — `save(stage, objectives)`, `load()`, `clear()`. Usa `sessionStorage`.

### Gameplay (lógica de juego)

- `src/gameplay/player/PlayerController.ts` — movimiento WASD (6 u/s), PointerLock, raycasting hacia interactuables (distancia máx. 5 u + line-of-sight), colisión por raycasting (3 alturas), fly mode y noClip (dev)
- `src/gameplay/AntivirusAgent.ts` — patrullaje secuencial, cono de visión proyectado en el suelo. Etapa 3: `enterChaseMode()` activa `chaseModeActive` (permanente), snap a sala central, rush por corredor (`WP_RUSH_CRITICAL`), luego chase directo. Velocidades multiplicadas por `GameConfig.antivirusSpeedMultiplier`. Respeta `isPaused`. Métodos públicos: `trafficSpoof()`, `stealthMode()`, `firewallRule()` (bloqueados en chase).
- `src/gameplay/EvasionItemManager.ts` — panel izquierdo persistente con tarjetas de ítems. 2 usos por ítem. Tecla H para toggle. Se deshabilita en Etapa 3 chase (`encryptionEnabled`).
- `src/gameplay/CriticalFileManager.ts` — gestiona 8 `FilePOI` de Etapa 3. Habilita cifrado con E al recibir `encryption-key`. Despacha `fileEncrypted { count, total }` y `allFilesEncrypted` / `gameCaptured`.
- `src/gameplay/CommandEngine.ts` — orquestador de cuatro capas: (1) narrativo `correctCommand`, (1b) narrativo `secondCommand`, (2) VirtualFS genérico, (3) command not found. Normaliza flags cortas antes de comparar (`-an` ≡ `-na`).

### World (construcción del mundo)

- `src/world/WorldBuilder.ts` — carga escena GLTF, crea barreras, FilePOIs, TerminalPOIs y CriticalFilePOIs (Etapa 3). Método `createInvisibleWalls(collidables)` para paredes de `MeshStandardMaterial` coloreado. Expone `build()`, `openDoor()`, `update()`, `dispose()`.
- `src/world/HolographicBarrier.ts` — barrera holográfica animada; label configurable por instancia. Al abrirse se remueve de `interactables` y `collidables`. **`visible=false` no deshabilita raycasting en Three.js r184 — siempre remover del array.**
- `src/world/FilePOI.ts` — archivo interactuable: carga `document_folder.glb`, hitbox invisible, dot pulsante + label al enfocar. Método `encrypt(mat: GlitchMaterial)` reemplaza materiales del modelo y colorea el pedestal de rojo (maneja carga async con `pendingGlitch`). Getter `hitboxMesh` para que `CriticalFileManager` pueda removerlo de `interactables`.
- `src/world/TerminalPOI.ts` — terminal interactuable: carga GLB configurable (`model` key → URL), normaliza escala a `targetWidth`, usa pivot wrapper para que la rotación no desplace el modelo, hitbox y sprites se reposicionan al centro real del modelo tras la carga.
- `src/world/LabelSprite.ts` — `createDotSprite()` (punto pulsante verde) y `createFocusedLabel(text)` (canvas con ancho dinámico por `measureText`, fondo semitransparente, borde sutil).
- `src/world/Door.ts` — lógica de apertura/cierre animada (legacy, no usado con la escena GLTF)

### UI

- `src/ui/StartScreen.ts` — pantalla de inicio: configura virusName, targetCompany, dificultad; manual plegable; botones Iniciar / Continuar. Se destruye al confirmar y llama al callback `onStart`.
- `src/ui/HUDManager.ts` — actualiza barra de alerta, texto de estado y timer. En modo chase (`encryptionEnabled`): muestra `⚠ CIFRADOS: N/8` en lugar del timer. Escucha `fileEncrypted`.
- `src/ui/TerminalUI.ts` — terminal con input libre: historial ↑↓, Tab completion, Ctrl+L/C, prompt dinámico. Cierra con **°** (backtick físico). Maneja `commandSuccess` y `doorUnlocked` tanto para `correctCommand` como para `secondCommand`.
- `src/ui/PauseMenu.ts` — overlay de pausa (ESC); tiene prioridad sobre otros listeners de ESC
- `src/ui/NarrativeScreen.ts` — pantalla de narrativa/intro con efecto typewriter. Pausa el juego (`setPaused`) durante las transiciones de nivel. Al terminar nivel 3: despacha `chaseRushStart`. Maneja `gameOver` (derrota), `gameCaptured` (puntaje + Reintentar/Inicio), `allFilesEncrypted` (victoria + solo Inicio).
- `src/ui/NotesPanel.ts` — panel lateral derecho de objetivos (tecla N). Muestra Etapas 1/2/3 con pistas de ubicación. Sección HERRAMIENTAS con slots compactos (`#item-slots`).
- `src/ui/DevPanel.ts` — panel dev: teleport a zonas, toggle de colisiones, posición en tiempo real + copia al clipboard, botones **"⏩ Skip Etapa 1"** y **"⏩ Skip Etapa 2"** (callbacks `skipStage` / `skipStage2`)

### Efectos y shaders

- `src/effects/DataParticles.ts` — partículas ambientales tipo "datos flotantes" (500 puntos, reactivas al alertLevel)
- `src/shaders/GlitchMaterial.ts` — material con efecto glitch aplicado a los archivos cifrados en Etapa 3. `update(elapsed)` anima los uniforms cada frame.

### Datos y tipos

- `src/data/scenarios.ts` — escenarios de Etapas 1, 2 y 3: `correctCommand`, `secondCommand` (opcional), `basePath`, `targetPath`, `requiredObjectives`, `objectiveId`, `secondUnlocksDoor`. Etapa 3: `terminal-critical` con comando `encrypt`.
- `src/data/filesystem.ts` — árbol estático del VFS: `/home/jperez/`, `/home/netops/`, `/home/svc_backup/`, `/shares/IT_backups/`, `/critical/` (8 archivos: `database.db`, `backup_2026.bak`, `employees.xlsx`, `contracts.db`, `budget_Q1.xlsx`, `server_config.bak`, `audit_2026.db`, `payroll_Q1.xlsx`), `/etc/`, `/var/`, `/proc/`
- `src/types/game.ts` — tipos compartidos. `Scenario` incluye campos `second*` para terminales multi-paso. `CommandResult` incluye `unlocksDoor`.

---

## Comunicación entre sistemas

CustomEvents nativos del DOM (`window.dispatchEvent` / `window.addEventListener`). Todo listener registrado en constructor debe tener su `removeEventListener` en `dispose()`.

| Evento               | Emitido por           | Escuchado por                                              |
| -------------------- | --------------------- | ---------------------------------------------------------- |
| `gameOver`           | GameStateManager      | SceneManager, NarrativeScreen                              |
| `gameWon`            | GameStateManager      | SceneManager, NarrativeScreen                              |
| `gameCaptured`       | CriticalFileManager   | SceneManager, NarrativeScreen                              |
| `allFilesEncrypted`  | CriticalFileManager   | SceneManager, NarrativeScreen                              |
| `levelComplete`      | GameStateManager      | NarrativeScreen, AntivirusAgent, SceneManager              |
| `poiFocus`           | PlayerController      | InteractionManager, HUDManager, FilePOI, TerminalPOI       |
| `poiBlur`            | PlayerController      | InteractionManager, HUDManager, FilePOI, TerminalPOI       |
| `poiInteract`        | InteractionManager    | TerminalUI, CriticalFileManager                            |
| `doorUnlocked`       | TerminalUI            | SceneManager (`openDoor()`), WorldBuilder (drone)          |
| `commandSuccess`     | TerminalUI            | AudioManager                                               |
| `commandFail`        | TerminalUI            | AudioManager, GameStateManager                             |
| `gamePaused`         | PlayerController      | PauseMenu, SceneManager, AudioManager                      |
| `gameResumed`        | PlayerController      | PauseMenu, SceneManager, AudioManager                      |
| `objectiveUnlocked`  | GameStateManager      | EvasionItemManager, CriticalFileManager, NotesPanel        |
| `levelSpawnReady`    | WorldBuilder          | SceneManager (teleporta al spawn)                          |
| `playerCaught`       | AntivirusAgent        | CriticalFileManager                                        |
| `encryptionEnabled`  | CriticalFileManager   | EvasionItemManager, HUDManager                             |
| `fileEncrypted`      | CriticalFileManager   | HUDManager                                                 |
| `chaseRushStart`     | NarrativeScreen       | AntivirusAgent (inicia el rush post-narrativa)             |

---

## Controles

| Tecla | Acción |
|-------|--------|
| WASD | Movimiento |
| Mouse | Apuntar (PointerLock) |
| E | Interactuar con terminal/archivo |
| Enter | Ejecutar comando |
| ° (backtick físico) | Cerrar terminal |
| N | Toggle panel de objetivos (derecha) |
| H | Toggle panel de herramientas (izquierda) |
| 1 / 2 / 3 | Activar ítems de evasión |
| ESC | Pausa |

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
- No asumir que el AntivirusAgent se mueve siempre — respeta `GameStateManager.isPaused`. Durante narrativas de transición el drone está frozen.
- No agregar lógica de fin de juego sin considerar los tres caminos: `gameOver` (alerta/timer), `gameCaptured` (drone atrapa en Etapa 3), `allFilesEncrypted` (victoria Etapa 3).
- No crear paredes de colisión con `MeshBasicMaterial` transparente — usar `MeshStandardMaterial` con color oscuro para que tapen el exterior del mapa.
- No normalizar flags de comandos manualmente — `CommandEngine.normalize()` ya lo hace automáticamente.
