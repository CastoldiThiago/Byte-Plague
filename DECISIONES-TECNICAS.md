# Decisiones Técnicas — Byte Plague

Registro vivo de decisiones de diseño y arquitectura. Cada entrada documenta el contexto, lo elegido, las alternativas descartadas y las consecuencias conocidas. Modificar este archivo cada vez que se tome una decisión de diseño no trivial.

---

## Stack

### [2026-01-xx] Three.js como motor 3D

**Contexto:** Necesitábamos un entorno 3D en el browser sin depender de motores pesados ni plugins.  
**Decisión:** Three.js 0.184 sobre WebGL.  
**Alternativas descartadas:** Babylon.js (más completo pero más pesado y con curva mayor), PlayCanvas (editor online, no encaja con flujo code-first), Unity WebGL (build enorme, poco control sobre el bundle).  
**Consecuencias:** Bundle liviano, control total sobre el render loop, sin abstracciones que oculten lo que pasa en GPU. Responsabilidad de implementar colisiones, audio espacial y UI manualmente.

### [2026-01-xx] TypeScript 6 + Vite 8, sin frameworks de UI ni estado externo

**Contexto:** El equipo es pequeño y el MVP tiene plazos cortos.  
**Decisión:** TypeScript estricto para seguridad de tipos, Vite para HMR rápido. Cero librerías de UI (React, Vue) y cero stores externos (Zustand, Redux).  
**Alternativas descartadas:** React Three Fiber (agrega React como dependencia y abstrae el loop de Three.js, lo que complica la pedagogía del juego). Svelte (innecesario para un HUD tan simple).  
**Consecuencias:** El HUD se construye con DOM nativo. La comunicación entre sistemas usa `CustomEvent`. Menos overhead, pero el equipo debe mantener disciplina para no mezclar lógica de juego con manipulación de DOM.

---

## Arquitectura

### [2026-01-xx] SceneManager como único dueño del loop de animación

**Contexto:** Necesitábamos un punto único que inicializara renderer, cámara, escena y llamara `update()` a todos los sistemas cada frame.  
**Decisión:** `SceneManager` crea e instancia todos los sistemas en su constructor, los actualiza en `animate()` y los destruye en `dispose()`.  
**Alternativas descartadas:** Loop global en `main.ts` (dificulta el dispose limpio), sistema de entidades ECS (overhead innecesario para el scope del MVP).  
**Consecuencias:** Todos los sistemas nuevos deben ser instanciados en `SceneManager`. Si un sistema necesita update por frame, `SceneManager.animate()` debe llamarlo explícitamente.

### [2026-01-xx] CustomEvents nativos del DOM para comunicación entre sistemas

**Contexto:** Los sistemas (GameStateManager, TerminalUI, AntivirusAgent, SceneManager) necesitan coordinarse sin acoplarse directamente entre sí.  
**Decisión:** `window.dispatchEvent(new CustomEvent(...))` y `window.addEventListener(...)` como bus de eventos.  
**Alternativas descartadas:** Referencias directas entre clases (fuerte acoplamiento), EventEmitter de Node (no disponible en browser sin polyfill), RxJS (dependencia externa, overkill).  
**Consecuencias:** Todo listener agregado en el constructor debe tener su `removeEventListener` en `dispose()`. Los nombres de eventos son strings literales — documentarlos aquí o en el tipo cuando haya más de 5.

**Eventos en uso:**
| Evento | Emitido por | Escuchado por | Payload |
|---|---|---|---|
| `gameOver` | GameStateManager (alertLevel=100, timer=0) | SceneManager, GameStateManager, NarrativeScreen | — |
| `levelComplete` | GameStateManager | NarrativeScreen | `{ level: number }` |
| `poiFocus` | PlayerController | InteractionManager | `{ poiId: string; poiLabel?: string; distance: number }` |
| `poiBlur` | PlayerController | InteractionManager | — |
| `poiInteract` | InteractionManager | TerminalUI | `{ poiId: string }` |
| `doorUnlocked` | TerminalUI | SceneManager | `{ poiId: string }` |
| `commandSuccess` | TerminalUI | AudioManager | — |
| `commandFail` | TerminalUI | AudioManager | — |
| `gamePaused` | PlayerController (onControlsUnlock) | PauseMenu, SceneManager | — |
| `gameResumed` | PlayerController (onControlsLock) | PauseMenu, SceneManager | — |

### [2026-04-26] Rollback de arquitectura para enfoque en nivel 1 (phishing -> red interna)

**Contexto:** El prototipo habia crecido con sistemas de patrulla, cifrado de archivos y efectos visuales que desviaban el foco del nuevo objetivo narrativo: explorar una "casa-computadora" y encontrar el salto a red interna.  
**Decisión:** Simplificar `SceneManager` para nivel 1: mantener loop base + jugador + interaccion + UI + audio + narrativa, removiendo del flujo activo `AntivirusAgent`, `DataParticles` y el reemplazo de materiales por `archivoCifrado`. La deteccion queda representada por barra de alerta y errores de comando.  
**Alternativas descartadas:** Mantener todos los sistemas activos y solo cambiar textos (seguia mezclando objetivos); crear feature flags por sistema (mas complejidad para un solo nivel).  
**Consecuencias:** Menos ruido mecanico, onboarding mas claro y menor acoplamiento en la escena inicial. Para reintroducir patrulla o efectos en niveles futuros, conviene hacerlo como sistemas opcionales por nivel.

### [2026-01-xx] GameStateManager como Singleton

**Contexto:** El estado de alerta, el nivel actual y los objetivos completados necesitan ser leídos desde múltiples sistemas (AntivirusAgent, TerminalUI, HUD en main.ts).  
**Decisión:** Singleton con `getInstance()`. No se puede instanciar dos veces.  
**Alternativas descartadas:** Estado global en un módulo (menos explícito sobre el ciclo de vida), contexto de React (no hay React).  
**Consecuencias:** `resetState()` debe reinicializar todos los campos internos, incluyendo el timer. El singleton vive toda la sesión del browser.

### [2026-04-26] NarrativeScreen: overlay fullscreen con typewriter, sin update por frame

**Contexto:** Se necesitaba mostrar texto narrativo (intro, transiciones de nivel, fin de juego) sin depender de una librería de UI ni de un sistema de animación en el render loop.  
**Decisión:** Clase en `src/ui/NarrativeScreen.ts` que crea su propio DOM y gestiona la animación con `setTimeout` encadenados (40ms/caracter, 900ms entre líneas). API pública: `show(lines, onComplete)` para narrativas con auto-ocultado y `showEndScreen(won)` para pantallas de fin de juego persistentes con botón Reintentar. Se instancia en SceneManager junto a los demás sistemas UI.  
**Alternativas descartadas:** Animación via `requestAnimationFrame` y acumulador de tiempo (más código, innecesario para texto); librería de animación externa como GSAP (dependencia que contradice la decisión de stack); canvas 2D overlay (sin herramientas de texto CSS, más difícil de mantener).  
**Consecuencias:** La narrativa depende de `setTimeout` — si la pestaña se suspende (throttling del browser), los delays se acumulan. No es crítico para el MVP. Los `timeoutIds` se limpian en `dispose()` y al interrumpir, evitando leaks. El overlay usa `z-index: 200` — cualquier UI futura debe respetar la jerarquía de capas.

### [2026-04-26] GameStateManager.setPaused(): freeze de alerta y timer durante overlays narrativos

**Contexto:** El AntivirusAgent tenía línea de visión directa a la cámara desde el inicio (distancia ~8.3 u, sin obstáculos). Con SIGHT_ALERT_RATE=25/s llenaba la alerta en ~4s, disparando `gameOver` durante el intro. El jugador veía el intro cortarse y la pantalla de derrota aparecer "al instante".  
**Decisión:** `GameStateManager` añade `_isPaused: boolean`, `setPaused(v)`, y guards en `increaseAlert` y `tickTimer` que devuelven temprano si está pausado. `NarrativeScreen` llama `setPaused(true)` justo antes del intro y `setPaused(false)` en el `onComplete`. El timer y la detección quedan completamente congelados durante los ~12s del intro.  
**Alternativas descartadas:** Retrasar el registro del listener `gameOver` hasta después del intro (el evento habría sido emitido sin manejarse; el juego quedaría en estado inconsistente — animación detenida, sin pantalla de fin). Posponer `sceneManager.start()` hasta que el intro termine (requería reestructurar la API pública de SceneManager). Ignorar `showEndScreen` si `isIntro` (UX incorrecta: el jugador igual habría perdido sin saberlo).  
**Consecuencias:** La misma lógica de pausa puede reutilizarse para menús o transiciones de nivel. Si en el futuro se agregan más overlays, `setPaused(true/false)` debe envolverlos también. `resetState()` limpia `_isPaused = false` por si se recarga sin recargar la página.

### [2026-04-26] showEndScreen(won): pantalla final con estadísticas o mensaje de derrota + botón Reintentar

**Contexto:** El fin de juego necesitaba diferenciarse de las narrativas de transición: no auto-ocultarse, mostrar información distinta según victoria/derrota, y ofrecer al jugador una acción explícita.  
**Decisión:** `showEndScreen(won: boolean)` interrumpe cualquier narrativa activa (`clearTimeouts()`) y muestra contenido diferenciado. Victoria: typewriter de estadísticas calculadas en tiempo real (archivos cifrados, tiempo empleado, datos exfiltrados, costo estimado) + texto reflexivo sobre ciberseguridad. Derrota: dos líneas cortas. En ambos casos monta un `<button>` al final del typewriter que llama a `GameStateManager.resetState()` + `window.location.reload()`. El botón se inyecta en `textContainer` para que `prepareOverlay()` lo limpie automáticamente.  
**Alternativas descartadas:** Pantalla de estadísticas como HTML separado fuera del overlay (rompe la coherencia visual); reinicio sin `resetState()` (el singleton no se recrea al recargar si hay caché agresivo — `resetState()` garantiza estado limpio antes del reload); pantalla de derrota sin botón (UX incompleta).  
**Consecuencias:** `window.location.reload()` recarga toda la página — el singleton `GameStateManager` se destruye y recrea. `resetState()` es un seguro ante entornos donde el módulo esté cacheado. La condición de victoria (`CIFRADO_OBJECTIVES`) sigue hardcodeada — si cambia la cantidad de archivos, actualizar esa constante y `buildWinLines()`.

### [2026-04-26] Condición de victoria verificada en NarrativeScreen al recibir gameOver

**Contexto:** No existe un evento `gameWon` separado; `gameOver` dispara tanto victoria como derrota (timer=0 o alertLevel=100).  
**Decisión:** `NarrativeScreen.onGameOver` lee `GameStateManager.objectivesCompleted` y verifica si los 5 `cifrado-N` están presentes. Delega a `showEndScreen(won)`.  
**Alternativas descartadas:** Agregar evento `gameWon` en GameStateManager (cambio mayor, postergado); pasar el resultado como detalle del evento `gameOver` (requeriría cambiar todos los emisores).  
**Consecuencias:** Misma consecuencia que `showEndScreen` — la constante `CIFRADO_OBJECTIVES` es el punto de verdad para la condición de victoria. Pendiente: evaluar si conviene mover esta lógica a GameStateManager.

### [2026-04-26] GlitchMaterial: ShaderMaterial GLSL en src/shaders/, actualizado por frame desde SceneManager

**Contexto:** El feedback visual de "archivo cifrado" era estático (cambio de color en `MeshStandardMaterial`). Se necesitaba una animación continua — glitch, flicker, distorsión de UV — que requiere actualizar un uniform `uTime` en cada frame.  
**Decisión:** `GlitchMaterial` en `src/shaders/GlitchMaterial.ts` extiende `THREE.ShaderMaterial`. Vertex shader trivial (pasa UV). Fragment shader con: desplazamiento blocky por bandas horizontales (cuantizado en tiempo, ~18% de bandas activas por tick), warp sinusoidal de UV, flicker multi-armónico, scanlines y destellos de franja esporádicos. Color base `#ff2244`. `SceneManager` mantiene `glitchMaterials: GlitchMaterial[]` y los itera en `animate()` con `timer.getElapsed()`. Al recibir `archivoCifrado`, `onArchivoCifrado()` descarta el `MeshStandardMaterial` anterior (`.dispose()`) y asigna el nuevo `GlitchMaterial` al mesh.  
**Alternativas descartadas:** Animar `MeshStandardMaterial.emissiveIntensity` (solo flicker, sin distorsión UV, limitado a lo que el PBR permite); textura pre-renderizada en canvas 2D (más setup, sin control preciso por fragment); post-processing de escena completa como `GlitchPass` de Three.js (afecta todos los objetos, no solo los archivos cifrados).  
**Consecuencias:** `src/shaders/` establece el patrón para futuros efectos GLSL del proyecto. Todo `ShaderMaterial` con animación debe registrarse en SceneManager para recibir el tick (actualmente como `glitchMaterials[]`). Usar `timer.getElapsed()` —no `deltaTime`— garantiza que `uTime` sea monotónico aunque el frame rate fluctúe. Los materiales anteriores de los meshes se liberan con `.dispose()` al reemplazarlos, evitando leak de recursos GPU.

### [2026-01-xx] CommandEngine como clase sin estado, resultado por valor

**Contexto:** El procesamiento de comandos de terminal necesitaba ser predecible y testeable.  
**Decisión:** `CommandEngine.process()` recibe comando + poiId y retorna `CommandResult` puro — sin side effects. Los side effects (completeObjective, dispatch de eventos) quedan en `TerminalUI`.  
**Alternativas descartadas:** CommandEngine con acceso directo a GameStateManager (acopla procesamiento con estado).  
**Consecuencias:** Agregar un nuevo POI con comandos requiere solo editar el objeto `POI_COMMANDS` en CommandEngine. TerminalUI maneja el qué hacer con el resultado.

### [2026-01-xx] POI system con userData de Three.js

**Contexto:** Necesitábamos marcar objetos de la escena como interactivos y asociarles un ID lógico sin crear una capa de entidades propia.  
**Decisión:** `mesh.userData.interactive = true` y `mesh.userData.poiId = "id"`. El raycaster de PlayerController filtra por `userData.interactive`.  
**Alternativas descartadas:** Array separado de entidades con referencia al mesh (más memoria, sincronización manual), componentes ECS.  
**Consecuencias:** `this.interactables[]` en SceneManager debe contener todos los meshes interactivos. El `poiId` en userData es la llave para todo el sistema de comandos y tooltips.

### [2026-04-27] Refactorización de SceneManager monolítico en módulos especializados

**Contexto:** `SceneManager.ts` había crecido a 387 líneas mezclando responsabilidades: setup del renderer, construcción del mundo (suelo, muros, puertas, POIs, labels), animación de puertas, y orquestación del loop. Difícil de escalar cuando se agreguen assets externos (Sketchfab GLTF, texturas AmbientCG).  
**Decisión:** Se extrajeron módulos por responsabilidad única:
- `src/types/game.ts` — interfaces compartidas (`CommandChoice`, `CommandResult`, `Scenario`)
- `src/data/scenarios.ts` — datos de escenarios extraídos de `CommandEngine`
- `src/world/LabelSprite.ts` — factory pura para sprites de canvas (`createLabelSprite`, `disposeLabelSprite`)
- `src/world/Door.ts` — clase `Door` con config, animación propia (`update(dt)`) y `open()`
- `src/world/FilePOI.ts` — clase `FilePOI` con config de color/emissive y lifecycle
- `src/world/WorldBuilder.ts` — compone suelo, muros, luces, puertas y POIs; expone `build()`, `openDoor()`, `update()`, `dispose()`
- `src/core/AssetLoader.ts` — carga unificada de texturas, modelos GLTF y audio con `onProgress` callback
- `src/ui/HUDManager.ts` — el setInterval del HUD extraído de `main.ts`

`SceneManager.ts` pasó de 387 a ~110 líneas. `main.ts` pasó de 64 a ~30 líneas. `CommandEngine.ts` pasó de 160 a ~40 líneas.  
**Alternativas descartadas:** Mantener el monolito y solo agregar comentarios (escala mal); separar por sistema ECS (overkill para el scope actual).  
**Consecuencias:** Agregar una nueva habitación o puerta requiere solo extender `DOOR_CONFIGS` / `FILE_POI_CONFIGS` en `WorldBuilder.ts`. Integrar un modelo GLTF de Sketchfab se hace via `AssetLoader.load({ models: { nombre: url } })`. Las constantes de layout del mundo viven en `WorldBuilder.ts` como arrays de config, no como código imperativo disperso.

### [2026-05-08] Menú de pausa con ESC sin romper el PointerLock flow

**Contexto:** El browser siempre libera el pointer lock al presionar ESC — no hay forma de interceptarlo. Necesitábamos un menú de pausa que aprovechara ese comportamiento en lugar de pelearlo.  
**Decisión:** `PauseMenu` en `src/ui/PauseMenu.ts` escucha `gamePaused`/`gameResumed` (emitidos por `PlayerController` en `onControlsUnlock`/`onControlsLock`) y muestra/oculta el overlay. Para reanudar, el botón y la tecla ESC llaman a `lockFn()` — un callback directo `() => sceneManager.requestPointerLock()` pasado en el constructor — garantizando que `requestPointerLock()` se ejecute dentro del handler nativo (requisito de Chrome). Guard de 250ms en el handler de ESC para evitar que el mismo ESC que causó la pausa la cierre inmediatamente. `SceneManager` setea `isPaused` en esos mismos eventos y, mientras está pausado, salta los `update()` de todos los sistemas pero sigue renderizando.  
**Alternativas descartadas:** Llamar `requestPointerLock()` via `CustomEvent` encadenado desde el click (rechazado por Chrome — ya no cuenta como gesto nativo); un overlay con `pointer-events: auto` que bloquee el canvas (no era necesario con el flow actual).  
**Consecuencias:** El patrón `lockFn: () => void` como callback directo es el que hay que replicar en cualquier otro overlay que necesite rearmar el pointer lock. Si se agrega un menú de inicio, usar el mismo patrón.

### [2026-05-08] Terminal (TerminalUI) cierra con E en lugar de ESC — orden de registro crítico

**Contexto:** El terminal de comandos se abría con E y cerraba con ESC. Cuando se agregó el menú de pausa, ESC pasó a estar reservado para pausar. Colisionaban: abrir el menú de pausa al intentar cerrar el terminal.  
**Decisión:** `TerminalUI.onKeyDown` cierra con `KeyE` (no ESC) cuando el panel está abierto, y llama `event.stopImmediatePropagation()` para que `InteractionManager` no reciba el mismo evento E y reabra el terminal. Para que `stopImmediatePropagation` funcione, `TerminalUI` debe registrar su listener `window.addEventListener('keydown', ...)` **antes** que `InteractionManager`. Esto se garantiza construyendo `new TerminalUI()` antes de `new InteractionManager()` en `SceneManager`.  
**Alternativas descartadas:** Flag global `terminalIsOpen` leído por InteractionManager (acoplamiento implícito); usar `event.stopPropagation()` en lugar de `stopImmediatePropagation()` (no detiene listeners del mismo target registrados después).  
**Consecuencias:** El orden de construcción en `SceneManager` es load-bearing. Si se refactoriza la inicialización, hay que preservar que `TerminalUI` se instancie antes que `InteractionManager`.

### [2026-05-08] Fix: poiFocus siempre se despacha con distancia actualizada

**Contexto:** Si el jugador apuntaba a un POI desde lejos (recibía "Acercate para interactuar") y luego caminaba hacia él sin mover la vista, `updateRaycastTarget` detectaba `firstInteractiveObject === this.currentTarget` y hacía early return — `poiFocus` no se volvía a emitir, la distancia no se actualizaba, y el tooltip nunca cambiaba a "interactuar".  
**Decisión:** Se eliminó el early return por mismo target en `PlayerController.updateRaycastTarget()`. Ahora `poiFocus` se despacha en cada frame mientras el jugador mira al POI, con la distancia calculada en ese frame. `InteractionManager` actualiza su estado interno de distancia en cada `poiFocus`.  
**Alternativas descartadas:** Emitir `poiDistanceUpdate` como evento separado (más eventos para el mismo problema); recalcular la distancia en `InteractionManager` de forma independiente (duplicación de lógica).  
**Consecuencias:** `poiFocus` pasa de ser un evento de "cambio de target" a un evento de "frame con target activo". Si algún sistema escucha `poiFocus` y asume que solo se emite al enfocar un nuevo objeto, hay que revisarlo.

### [2026-05-08] Drone decorativo con hover y rotación en sala de entrada

**Contexto:** La sala de entrada (z=0..12) estaba visualmente vacía. Se quería agregar un elemento ambiental que reforzara la atmósfera sin afectar el gameplay.  
**Decisión:** `WorldBuilder` carga `src/assets/models/drone.glb` de forma asíncrona con `GLTFLoader` usando el sufijo `?url` de Vite para importar el path del binario. El modelo se coloca en `(0, 1.8, 5)`, escala `0.008` (el modelo está en unidades de milímetros), y se anima cada frame con hover senoidal (`y = 1.8 + sin(t*1.4)*0.12`) y rotación en Y continua. Si la carga falla, se imprime un `console.warn` y el juego continúa sin el modelo.  
**Alternativas descartadas:** Cargar el modelo en `AssetLoader` centralizado (válido, pero innecesario para un único modelo decorativo sin dependencias); escala mayor (el modelo a escala 1.0 ocupa toda la habitación — el factor 0.008 se determinó empíricamente).  
**Consecuencias:** Assets `.glb` en `src/assets/` con `?url` son copiados al bundle por Vite. El drone es puramente decorativo — no tiene colisión ni interacción. Si el modelo cambia de origen (ej: Sketchfab con escala en metros), hay que revisar la escala.

### [2026-04-26] Apertura visual de puertas desacoplada via evento doorUnlocked

**Contexto:** Al acertar un comando de puerta, la UI cerraba panel pero no habia feedback diegetico en la escena. Hacia falta mostrar visualmente que la puerta se desbloqueo sin acoplar `TerminalUI` con `SceneManager`.  
**Decisión:** `TerminalUI` emite `doorUnlocked` con `{ poiId }` en exito. `SceneManager` escucha el evento y anima la rotacion de la puerta asociada (`openProgress` damped por frame), ademas de liberar su colision (`ignoreCollision = true`).  
**Alternativas descartadas:** Abrir puerta directamente desde `TerminalUI` por referencia (acoplamiento fuerte UI-escena); eliminar puerta al acertar (feedback brusco y poco natural).  
**Consecuencias:** Se mantiene arquitectura orientada a eventos y las puertas quedan preparadas para estados adicionales (cerrada, abriendo, abierta) sin tocar la UI.

### [2026-04-26] Interaccion con proximidad real en lugar de E a distancia

**Contexto:** El jugador podia apuntar a un POI desde cualquier punto de la habitacion y activar `E`, lo que rompía la lectura espacial y trivializaba la exploracion.  
**Decisión:** `PlayerController` calcula la distancia al POI enfocado y la publica en `poiFocus`. `InteractionManager` solo emite `poiInteract` si la distancia es menor o igual a 2.4 unidades. Si no, mantiene el tooltip con el mensaje "Acercate para interactuar".  
**Alternativas descartadas:** Comprobar distancia en `PlayerController` antes de enfocar (ocultaba demasiada informacion); usar un collider de proximidad separado (mas piezas para un problema simple).  
**Consecuencias:** La interaccion ahora exige posicionamiento real frente al objeto, reforzando la fantasia de explorar habitaciones y leer elementos cercanos.

### [2026-04-26] Retorno automatico al pointer lock tras elegir un comando

**Contexto:** Al cerrar la UI de comandos, el jugador tenia que volver a clickear la pantalla para recuperar el control del mouse, lo que cortaba el ritmo de exploracion.  
**Decisión:** `TerminalUI` recibe el canvas de render y, al acertar un comando, cierra el overlay y llama `requestPointerLock()` en el mismo gesto del click. El cierre con `Escape` sigue dejando el puntero libre.  
**Alternativas descartadas:** Requerir un click manual para rearmar el pointer lock (friccion innecesaria); usar un evento global para que `SceneManager` lo gestione (mas complejidad que beneficio).  
**Consecuencias:** El flujo queda continuo: resolver una puerta o archivo devuelve inmediatamente el control al jugador para seguir avanzando por la PC.

---

## Gameplay

### [2026-01-xx] Sistema de Alerta (0–100) en lugar de vidas o health

**Contexto:** El juego tiene temática de ciberseguridad; un medidor de "detección" es más coherente con el universo que barras de vida.  
**Decisión:** `alertLevel` va de 0 a 100. Al llegar a 100 se emite `gameOver`. El antivirus aumenta la alerta según línea de visión y proximidad.  
**Consecuencias:** El HUD muestra la barra con gradiente verde→rojo. El ritmo del jugador depende de no ser detectado, no de recibir daño.

### [2026-04-26] Puertas con 3 comandos clickeables y un unico comando correcto

**Contexto:** La nueva jugabilidad del nivel 1 requiere decisiones directas de comando en cada puerta, sin parser libre de terminal ni escritura manual.  
**Decisión:** `CommandEngine` pasa a modelar escenarios de puerta con `choices` (3 opciones), `correctCommand`, feedback de exito/error y objetivo opcional. `TerminalUI` muestra botones de comando y procesa click. Si el comando falla, aumenta alerta en +20 y dispara `commandFail`; si acierta, dispara `commandSuccess` y cierra panel.  
**Alternativas descartadas:** Mantener input libre de texto (mas friccion y ambiguedad para primer nivel); mostrar mas de 3 opciones por puerta (sobrecarga cognitiva); resolver por prompt textual sin botones (peor legibilidad en gameplay FPS).  
**Consecuencias:** El nivel se vuelve mas legible y rapido de iterar: cada puerta define su micro-desafio en una sola estructura de datos. El balance de dificultad ahora depende de la penalizacion por error y de la secuencia de puertas.

### [2026-04-26 → 2026-05-09] Colision FPS: AABB reemplazado por raycasting en PlayerController

**Contexto original (AABB):** El jugador podia atravesar muros. Se implementó chequeo AABB con `Box3.setFromObject`. Funcionó con el mundo procedural.  
**Problema:** Al integrar la escena GLTF (Sketchfab), los bounding boxes de los meshes complejos cubrían habitaciones enteras, bloqueando todo movimiento.  
**Decisión (2026-05-09):** Se reemplazó AABB por raycasting de colisión. `PlayerController` dispara 3 rayos horizontales desde la posición actual del jugador (alturas: ojos `+0`, cintura `-0.7`, rodillas `-1.4`) en la dirección de movimiento. `near=0.05` evita auto-intersección. `far = moveDist + playerRadius (0.35)`. X y Z se testean de forma independiente para permitir wall-sliding. Si `noClip=true`, `willCollide()` devuelve `false` directamente.  
**Alternativas descartadas:** Fisica externa ammo/cannon (costo y dependencia); AABB con geometría simplificada separada (requería authoring de colisionadores extra por cada zona GLTF).  
**Consecuencias:** Navegación correcta con geometría GLTF arbitraria. El array `collidables[]` se comparte con el raycaster de interacción (line-of-sight). Las barreras holográficas se agregan y se eliminan de `collidables[]` dinámicamente al abrirse.

### [2026-01-xx] AntivirusAgent: patrullaje por waypoints + detección por raycaster

**Contexto:** Necesitábamos un enemigo que patrullara el espacio y detectara al jugador de forma predecible y aprendible.  
**Decisión:** 4 waypoints fijos en loop. Detección activa (raycaster, 10 unidades, línea de visión libre) aumenta alerta 25/s. Detección pasiva (5 unidades, cada 2s) agrega 15 de alerta.  
**Alternativas descartadas:** Pathfinding A\* (innecesario para el nivel actual, complejidad alta), detección solo por distancia (no permite al jugador cubrirse).  
**Consecuencias:** El jugador puede aprender el patrón y esquivarlo. A alertLevel > 60 el agente duplica velocidad.

### [2026-01-xx] Timer de 120 segundos para la misión de cifrado

**Contexto:** La sala de archivos requería presión temporal para hacer la misión interesante.  
**Decisión:** `GameStateManager` arranca un `setInterval` de 1 segundo en el constructor. Al llegar a 0 emite `gameOver`. El timer se detiene si `gameOver` ya fue emitido por otra causa.  
**Alternativas descartadas:** Timer solo en el HUD (sin fuente de verdad en el estado), timer por nivel (complejidad prematura).  
**Consecuencias:** El timer corre desde que carga el juego, no desde que el jugador entra a la sala. Si se agrega un menú de inicio, habrá que diferir la creación del singleton.

### [2026-01-xx → 2026-04-26] Feedback visual en archivos: verde emisivo → GlitchMaterial al cifrar

**Contexto:** El jugador necesita saber cuáles archivos ya cifró sin abrir un menú de inventario.  
**Decisión:** Al completar `cifrado-N`, el evento `archivoCifrado` reemplaza el `MeshStandardMaterial` verde del mesh por un `GlitchMaterial` (ver sección Arquitectura). El material anterior se libera con `.dispose()`.  
**Alternativas descartadas:** Overlay de texto sobre el objeto (requiere CSS en 3D), partículas (overhead para MVP), cambio de color estático a rojo (implementado inicialmente, reemplazado por el shader animado).  
**Consecuencias:** Cada archivo cifrado tiene su propia instancia de `GlitchMaterial` (no compartida), lo que permite que los uniforms de tiempo funcionen de forma independiente. El material verde inicial sigue clonado por instancia en `setupWorld()`.

### [2026-04-26] DataParticles: THREE.Points con BufferGeometry, update por frame, reactividad al alertLevel

**Contexto:** La escena necesitaba un efecto ambiental que reforzara la atmósfera de sistema comprometido y que respondiera al estado de alerta del juego.  
**Decisión:** `DataParticles` en `src/effects/` crea un `THREE.Points` con `BufferGeometry` de 500 partículas. Las posiciones se almacenan en un `Float32Array` (PARTICLE_COUNT × 3) junto a un `Float32Array` de velocidades aleatorias individuales (0.3–0.8 u/s). En `update(deltaTime)` se itera el array directamente, se incrementa y por partícula, y se reinicia con x/z aleatorio al superar `Y_MAX=8`. Cuando `alertLevel > 60` la velocidad se multiplica por 3. `geometry.attributes.position.needsUpdate = true` al final del loop para subir la geometría a GPU. Material: `PointsMaterial` verde `#4af626`, `size: 0.05`, `opacity: 0.6`, `depthWrite: false`.  
**Alternativas descartadas:** Shader de partículas con `uTime` (más control visual pero innecesario para partículas ambientales — el CPU update es suficiente para 500 puntos). `THREE.InstancedMesh` (overkill para puntos sin geometría propia). `depthWrite: true` (causa z-fighting con objetos transparentes superpuestos).  
**Consecuencias:** Iterar 500 partículas en CPU cada frame es trivial (~0.01ms). Si la cantidad crece a miles, hay que migrar a GPU particles (shader con `uTime` + `gl_PointSize`). El multiplicador de velocidad por alertLevel es la única reactividad al estado — no hay cambio de color ni opacidad dinámicos aún.

---

## Mundo / Zonas

### [2026-05-09] Integración de escena GLTF (scifi_scene) reemplazando mundo procedural

**Contexto:** El mundo procedural (cajas, muros planos) no comunicaba la ambientación scifi necesaria para el nivel 1.  
**Decisión:** Se integró `public/scifi_scene/scene.gltf` (asset de Sketchfab). El archivo `.gltf` debe estar en `public/` (no en `src/assets/`) para que Vite lo sirva estáticamente junto a sus referencias relativas (`.bin` y texturas). No se usa el sufijo `?url` — el `GLTFLoader` resuelve rutas relativas en runtime. La escena se carga con `scale.setScalar(50)` para compensar el factor de escala efectivo ~0.023 producido por los transforms anidados de Sketchfab (`Sketchfab_model × .fbx`). Se centra automáticamente en XZ y se ubica el piso en `Y=0` con `Box3.setFromObject` calculado antes de agregar a la escena.  
**Alternativas descartadas:** Importar como `.glb` (el asset referenciaba binarios externos, no era self-contained); procesar la escena con `?url` de Vite (rompe la resolución de rutas relativas del GLTFLoader).  
**Consecuencias:** Todo mesh del GLTF se agrega a `collidables[]` automáticamente. El spawn se fijó en `-14.80, 1.7, 19.81` (pasillo de entrada). Si el modelo cambia, los valores de escala y posición de barreras/POIs hardcodeados en `WorldBuilder` deben recalibrarse.

### [2026-05-09] Layout del nivel 1 con la escena scifi (coordenadas Three.js)

**Zonas identificadas (medidas con DevPanel en dev mode):**
- **Pasillo de entrada**: spawn en `(-14.80, 1.7, 19.81)`, barrera `puerta-clientes` en `(-14.78, z=15.25)`, orientación Z
- **Sala de clientes / soporte** (entre puerta 1 y puerta 2): corredor curvo; sin objetos interactuables
- **Barrera puerta-soporte**: `(-23.57, z=12.01)`, orientación X
- **Sala de soporte** (después de puerta 2): contiene los dos FilePOIs narrativos
  - `clientes.db` en `(-30.23, z=13.20)` — primera vista al entrar
  - `credenciales_vpn.txt` en `(-31.27, z=5.59)` — oculto detrás de mueble
- **Barrera puerta-red-interna**: `(0.97, z=-11.96)`, orientación Z

### [2026-05-09] Barreras holográficas en puertas narrativas

**Contexto:** Las puertas de la escena GLTF son decorativas (no tienen lógica). Se necesitaba bloqueo visual + colisión + interacción en cada umbral narrativo.  
**Decisión:** `HolographicBarrier` crea un `PlaneGeometry` con `MeshBasicMaterial` semitransparente (`DoubleSide`, `depthWrite:false`) con textura de scan lines generada en canvas. El plano se posiciona en el centro del umbral medido con DevPanel. Ancho hardcodeado a 6 unidades (suficiente para cubrir el marco con margen). Al llamar `open()`: el mesh se vuelve invisible Y se elimina del array `interactables[]` y `collidables[]` — esto es necesario porque `visible=false` NO deshabilita raycasting en Three.js r184.  
**Alternativas descartadas:** Auto-detección de umbrales por nombre de mesh GLTF (frágil ante cambios en el modelo); `visible=false` como único mecanismo de deshabilitación (no deshabilita raycasting — bug verificado).  
**Consecuencias:** Las barreras están hardcodeadas en `WorldBuilder.createBarriers()`. Si cambia el modelo, recalibrar posiciones con DevPanel. El ancho de 6 unidades puede requerir ajuste por puerta si hay huecos entre barrera y marco.

### [2026-05-09] Modo dev: fly, noClip y DevPanel

**Contexto:** Para calibrar posiciones de barreras y POIs en el mapa GLTF se necesitaba moverse libremente por la escena sin depender de colisiones ni interacciones.  
**Decisión:** `isDevMode()` detecta el entorno (Vite dev server). En dev mode, `SceneManager` activa `flyMode=true` y `noClip=true` en `PlayerController`, solicita pointer lock con un delay de 250ms, e instancia `DevPanel`. `PlayerController` usa `Space` (subir) y `Shift` (bajar) en fly mode, agregando movimiento vertical directo en `moveDirection.y`. `DevPanel` muestra posición X/Y/Z actualizada cada frame desde `SceneManager.animate()` con un botón de copia al clipboard.  
**Alternativas descartadas:** Hardcodear posiciones a ojo (error propenso en escenas GLTF con transforms anidados).  
**Consecuencias:** El Toggle Collisions del DevPanel alterna `noClip` en runtime, permitiendo testear colisiones de barreras sin reiniciar. El DevPanel solo se instancia si `isDevMode()` es true — no hay costo en producción.

### [2026-04-26] Progresion basada en pistas leidas en archivos

**Contexto:** Abrir habitaciones por si solo no bastaba para que el avance tuviera sentido narrativo.  
**Decisión:** Los comandos de archivos devuelven objetivos de progreso (`dato-clientes`, `dato-soporte`). La puerta a la red interna (`puerta-red-interna`) exige ambos para aceptar `ssh netops@10.10.0.20`. `puerta-soporte` NO requiere prerequisito — el corredor entre puerta 1 y 2 no tiene objetos, y exigir `dato-clientes` antes bloqueaba el avance.  
**Alternativas descartadas:** Hacer que la puerta final se abra solo por recorrido físico; encadenar prerequisitos en cada puerta (creaba bloqueo si no había objetos en el corredor intermedio).  
**Consecuencias:** El avance queda encadenado: explorar sala de soporte → leer dos archivos → abrir puerta 3. `puerta-red-interna.requiredObjectives = ['dato-clientes', 'dato-soporte']` es el único point-of-truth de la condición de paso.

---

## Pendientes / En evaluación

- Menú de inicio: diferir la creación del GameStateManager hasta que el jugador confirme inicio (actualmente el singleton se crea con el SceneManager).
- Persistencia de estado: no hay guardado. Al recargar, el estado se resetea.
- Level progression: definir estructura de nivel 2 (movimiento lateral dentro de red interna) sin reintroducir ruido del prototipo anterior.
- Optimizacion de colisiones: evaluar cache de bounds por collider estatico si crece el numero de habitaciones/props.
