# Byte Plague — Decisiones Técnicas

Registro de decisiones de diseño, arquitectura y gameplay tomadas durante el desarrollo.

---

## Stack

_(sin entradas aún)_

---

## Arquitectura

### 2026-05-28 Terminal Linux simulada con VirtualFS

**Contexto:** La terminal original (`CommandEngine`) solo aceptaba un único comando correcto por POI. Todo lo demás fallaba con alerta. Esto rompía la ilusión de usar una terminal real y limitaba la exploración del jugador.

**Decisión:** Se reemplazó el motor de comandos por un sistema de tres capas:
1. **Narrativo** — si el comando coincide exactamente con el `correctCommand` del POI activo → desbloquea objetivo/puerta.
2. **VirtualFS** — si el comando es genérico conocido (`ls`, `cat`, `pwd`, `ps`, etc.) → responde con output coherente, sin alerta.
3. **Command not found** — si no es ni narrativo ni genérico → `bash: cmd: command not found`, sin alerta.

Se creó `src/core/VirtualFS.ts` (singleton) y `src/data/filesystem.ts` (árbol estático del VFS).

Comandos soportados: `ls [-la]`, `cd`, `pwd`, `cat`, `grep`, `find`, `echo`, `clear`, `whoami`, `id`, `hostname`, `uname`, `env`, `which`, `ps [aux]`, `top`, `netstat`, `ping`, `man`, `help`, `date`, `uptime`, `ssh`, `su`, `sudo`, `chmod`, `rm`, `mkdir`, `exit`.

**Alternativas descartadas:** Ampliar el `correctCommand` para aceptar variantes — descartado porque no escala y no da la sensación de terminal real.

**Consecuencias:** El `CommandEngine` es ahora un orquestador delgado. Toda la lógica de filesystem vive en `VirtualFS`. Las etapas 2 y 3 requieren extender el árbol del VFS y agregar nuevos comandos narrativos.

---

### 2026-05-28 Filesystem anidado espeja el mapa físico

**Contexto:** El mapa tiene habitaciones físicas (oficina → Desktop → Documents). La terminal necesitaba reflejar esa topología para que `ls` y el `cd` de las puertas fueran coherentes entre sí.

**Decisión:** El árbol del VFS es anidado igual que las habitaciones:

```
/home/jperez/
  Desktop/
    acceso_jira.lnk
    pendientes.txt
    Documents/              ← dentro de Desktop, como en el mapa
      notas_reunion.txt
      credenciales_vpn.txt
      procedimientos.md
      inventario_hosts.csv
```

Cada POI tiene un `basePath` que define el `cwd` cuando se abre esa terminal. Los terminales de puerta tienen además un `targetPath` al que avanza el `cwd` tras el unlock.

| Habitación | `basePath` | Prompt |
|---|---|---|
| Oficina / PCs | `/home/jperez` | `jperez@corp-ws-67:~$` |
| Sala Desktop | `/home/jperez/Desktop` | `jperez@corp-ws-67:~/Desktop$` |
| Sala Documents | `/home/jperez/Desktop/Documents` | `jperez@corp-ws-67:~/Desktop/Documents$` |

**Alternativas descartadas:** Filesystem plano (sin anidamiento) — descartado porque rompía la correlación espacial y el prompt no daba info útil.

**Consecuencias:** Al agregar Etapa 2 (`/home/netops`, `/shares/`) hay que extender el árbol, actualizar `basePath` de los nuevos POIs y considerar que el `setUser()` del VFS cambia el prefijo del prompt.

---

### 2026-05-28 `cd` restringido a terminales de puerta; `cat` restringido por POI de archivo

**Contexto:** Con el VirtualFS libre, el jugador podía navegar el filesystem arbitrariamente o leer archivos desde terminales que no correspondían, rompiendo la progresión narrativa.

**Decisión:** Dos restricciones independientes:

- **`cd`**: solo funciona en terminales de puerta (`allowCd: true` en el scenario). En cualquier otro terminal devuelve `bash: cd: Navigation disabled from this workstation.` El único `cd` que realmente "navega" es el comando narrativo correcto; cualquier otro argumento en una puerta devuelve `Permission denied`.

- **`cat`**: en terminales de archivo (`archivo-*`), solo se puede leer el archivo asociado al POI. El archivo permitido se deriva automáticamente del `correctCommand` del scenario (si empieza con `cat `). Cualquier otro `cat` devuelve `Permission denied`.

Los terminales `pc-*`, `terminal-entrada` y `puerta-*` no tienen restricción de `cat`.

**Alternativas descartadas:** Filtrar por directorio en lugar de por archivo — descartado porque el jugador podría leer credenciales de un directorio antes de llegar a la habitación correspondiente.

**Consecuencias:** Cada scenario de archivo (`archivo-*`) funciona como un "sandbox" de un solo archivo. Al agregar Etapa 2 con múltiples archivos en el mismo terminal, habrá que revisar si se mantiene esta restricción o se relaja para terminales de tipo "servidor".

---

## Gameplay

### 2026-05-28 Alertas solo por fallo narrativo, no por comandos VFS

**Contexto:** Con la terminal libre, tirar `ls` o `ping` en el terminal equivocado subía alerta innecesariamente.

**Decisión:** La alerta sube **únicamente** cuando el output contiene `[ERROR]`, lo que ocurre solo en fallos de comandos narrativos (comando incorrecto en el POI) o prerequisitos no cumplidos. Los errores del VFS (`Permission denied`, `command not found`, etc.) no disparan alerta ni sonido de fallo.

**Consecuencias:** El jugador puede explorar libremente sin ser penalizado por curiosidad. La alerta queda reservada para errores narrativos deliberados (ej: intentar el SSH sin tener las credenciales).

---

### 2026-05-28 UX de terminal: historial ↑↓, Tab completion, Ctrl+L/C

**Contexto:** La terminal carecía de las features básicas de cualquier shell real.

**Decisión:** Implementado en `TerminalUI`:
- `↑` / `↓` navega el historial de la sesión actual.
- `Tab` cicla completions de comandos y paths del VFS.
- `Ctrl+L` limpia el historial visible.
- `Ctrl+C` cancela el input actual.
- Prompt dinámico que refleja `user@hostname:cwd$`.
- Historial ilimitado por sesión, hasta 60 entradas visibles (las más viejas se descartan).

---

## Mundo / Zonas

_(sin entradas aún — ver CLAUDE.md para posiciones de POIs)_

---

## Pendientes / En evaluación

- **Etapa 3 — VFS de archivos críticos:** Agregar `/critical/` con archivos `.db`, `.bak`, `.xlsx`. Los comandos `generate_key` y `encrypt` son narrativos puros (no tienen equivalente en VFS genérico).

- **Vignette rojo en HUD:** Al superar 50% de alerta, agregar vignette rojo pulsante en los bordes de pantalla. Está mencionado en `HUDManager.ts` como pendiente.

- **Hints diegéticos de barrera:** Las barreras holográficas deberían mostrar un texto flotante con el comando necesario para abrirlas, visible solo al acercarse. Pendiente en `HolographicBarrier.ts` / `HUDManager.ts`.

- **Terminales de archivo multi-archivo (Etapa 2):** La restricción actual de `cat` a un solo archivo por POI puede necesitar revisarse para terminales de servidor donde hay múltiples archivos relevantes en la misma sesión.
