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
| `poiFocus` | PlayerController | InteractionManager | `{ poiId: string }` |
| `poiBlur` | PlayerController | InteractionManager | — |
| `poiInteract` | InteractionManager | TerminalUI | `{ poiId: string }` |
| `commandSuccess` | TerminalUI | AudioManager | — |
| `commandFail` | TerminalUI | AudioManager | — |
| `archivoCifrado` | GameStateManager | SceneManager | `{ objectiveId: string }` |

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

---

## Gameplay

### [2026-01-xx] Sistema de Alerta (0–100) en lugar de vidas o health
**Contexto:** El juego tiene temática de ciberseguridad; un medidor de "detección" es más coherente con el universo que barras de vida.  
**Decisión:** `alertLevel` va de 0 a 100. Al llegar a 100 se emite `gameOver`. El antivirus aumenta la alerta según línea de visión y proximidad.  
**Consecuencias:** El HUD muestra la barra con gradiente verde→rojo. El ritmo del jugador depende de no ser detectado, no de recibir daño.

### [2026-01-xx] AntivirusAgent: patrullaje por waypoints + detección por raycaster
**Contexto:** Necesitábamos un enemigo que patrullara el espacio y detectara al jugador de forma predecible y aprendible.  
**Decisión:** 4 waypoints fijos en loop. Detección activa (raycaster, 10 unidades, línea de visión libre) aumenta alerta 25/s. Detección pasiva (5 unidades, cada 2s) agrega 15 de alerta.  
**Alternativas descartadas:** Pathfinding A* (innecesario para el nivel actual, complejidad alta), detección solo por distancia (no permite al jugador cubrirse).  
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

### [2026-01-xx] Sala de archivos en z=-22, x de -8 a 8
**Contexto:** Necesitábamos ubicar los 5 archivos en una zona claramente separada del resto del mapa.  
**Decisión:** Fila de 5 cajas en z=-22, separadas 4 unidades en X. Luz verde puntual en (0, 4, -22) para distinguir la zona visualmente.  
**Consecuencias:** El jugador debe pasar por la línea de bloques en z=-8 (a través de los huecos de 0.7 unidades) para llegar. La zona no tiene paredes propias — queda abierta al mapa principal.

### [2026-01-xx] Zona de red interna en x=16-24
**Contexto:** Los POIs de escaneo de red y SSH necesitaban estar agrupados en un área diferenciada.  
**Decisión:** Tres bloques decorativos en x=16,20,24 a z=-6. Luz azul puntual en (20, 4, -3). POIs en x=16 y x=24.  
**Consecuencias:** La zona de red queda a la derecha del mapa principal. El jugador se orienta por el color de la luz.

---

## Pendientes / En evaluación

- Menú de inicio: diferir la creación del GameStateManager hasta que el jugador confirme inicio (actualmente el singleton se crea con el SceneManager).
- Colisión: actualmente solo el piso y los bloques están en `obstacles[]`. El jugador puede atravesar objetos pequeños.
- Persistencia de estado: no hay guardado. Al recargar, el estado se resetea.
- Level progression: LEVEL_OBJECTIVES solo cubre niveles 1–4 y no incluye los objetivos de cifrado. Evaluar si los archivos pertenecen a un nivel propio.
- Sonido de cifrado exitoso: agregar feedback de audio al completar `cifrado-N`.
