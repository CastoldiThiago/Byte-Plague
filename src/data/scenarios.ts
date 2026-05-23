import type { Scenario } from '../types/game';

export const SCENARIOS: Readonly<Record<string, Scenario | undefined>> = {

  /* ── Terminal de entrada ─────────────────────────────────────────── */
  'terminal-entrada': {
    label: 'Terminal: sistema comprometido',
    prompt: 'Identifica quien sos en este sistema.',
    choices: [
      { command: 'whoami', description: 'muestra usuario y privilegios actuales' },
    ],
    correctCommand: 'whoami',
    hint: 'Identifica quien sos y qué privilegios tenés en este sistema',
    helpText: 'Uso: whoami\nMuestra el usuario actual y sus privilegios.\n\nNo requiere argumentos.',
    successOutput:
      '[OK] phishing_session_302\n\nusuario:     empleado_comprometido\nprivilegios: usuario_estandar\ncontexto:    PC corporativa (192.168.1.67)\nsesion:      activa desde 2026-04-24\n\nTenes acceso limitado. Explora el sistema para avanzar.',
    conclusion: 'Sos un usuario estandar en una PC corporativa comprometida.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para ayuda.',
  },

  /* ── Puertas ─────────────────────────────────────────────────────── */
  'puerta-clientes': {
    label: 'Puerta: /desktop',
    prompt: 'Accedé al directorio desktop del sistema.',
    choices: [
      { command: 'cd /desktop', description: 'entra al directorio desktop' },
    ],
    correctCommand: 'cd /desktop',
    hint: 'Para moverte a un directorio usá: cd [ruta]',
    helpText: 'Uso: cd [directorio]\nNavega al directorio especificado.\n\nEjemplo: cd /desktop',
    successOutput:
      '[OK] /desktop\n\nUbicacion: C:/Users/jperez/Desktop\nSesion activa.\n\nExplora el entorno para encontrar informacion util.',
    conclusion: 'Accediste al desktop. Mirá alrededor.',
    failOutput: '[ERROR] Directorio no encontrado. Escribi /help para ver el formato correcto.',
  },

  'puerta-soporte': {
    label: 'Puerta: /documentos',
    prompt: 'Accedé al directorio de documentos.',
    choices: [
      { command: 'cd documentos', description: 'entra al directorio documentos' },
    ],
    correctCommand: 'cd documentos',
    hint: 'Para moverte a un directorio usá: cd [nombre]',
    helpText: 'Uso: cd [directorio]\nNavega al directorio especificado.\n\nEjemplo: cd documentos',
    successOutput:
      '[OK] documentos\n\nContenido:\n  credenciales_vpn.txt\n  inventario_hosts.csv\n  procedimientos.md\n\nAlgunos archivos pueden tener informacion critica.',
    conclusion: 'Accediste a documentos. Hay credenciales guardadas en alguno de estos archivos.',
    failOutput: '[ERROR] Directorio no encontrado. Escribi /help para ver el formato correcto.',
  },

  'puerta-red-interna': {
    label: 'Puerta: red interna',
    prompt: 'Conectate a la red interna usando las credenciales que encontraste.',
    choices: [
      { command: 'ssh netops@10.10.0.20', description: 'salto SSH al gateway interno' },
    ],
    correctCommand: 'ssh netops@10.10.0.20',
    hint: 'Para conectarte a un host remoto usá: ssh usuario@host',
    helpText: 'Uso: ssh usuario@host\nEstablece una conexion SSH con el servidor remoto.\nNecesitas usuario y direccion IP del gateway.\n\nEjemplo: ssh netops@10.10.0.20',
    successOutput:
      '[OK] TUNEL ESTABLECIDO.\nConexion a 10.10.0.20 exitosa.\nHas encontrado la via de entrada a la red interna.',
    conclusion: 'Con este salto confirmas la ruta interna y completas el objetivo del nivel 1.',
    failOutput: '[ERROR] Conexion rechazada. Verificá usuario y host. Escribi /help para el formato.',
    objectiveId: 'acceso-red-interna',
    requiredObjectives: ['dato-clientes', 'dato-soporte'],
  },

  /* ── Archivos clave ──────────────────────────────────────────────── */
  'archivo-clientes': {
    label: 'Archivo: notas_reunion.txt',
    prompt: 'Leé el archivo para obtener informacion.',
    choices: [
      { command: 'cat notas_reunion.txt', description: 'muestra el contenido del archivo' },
    ],
    correctCommand: 'cat notas_reunion.txt',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido del archivo en pantalla.\n\nEjemplo: cat notas_reunion.txt',
    successOutput:
      '[OK] notas_reunion.txt — Notas reunion IT (2026-04-18)\n\nAsistentes: equipo ops, red interna\nPuntos clave:\n  - Ampliacion segmento ops: 10.10.2.0/24\n  - Gateway de acceso interno: 10.10.0.20\n  - Credenciales VPN: ver archivo en /documentos\n  - Prox. mantenimiento: 01/05/2026\n\nRELEVANTE: gateway interno identificado → 10.10.0.20',
    conclusion: 'Las notas revelan el gateway interno: 10.10.0.20. El siguiente paso esta en /documentos.',
    failOutput: '[ERROR] Comando no valido. Escribi /help para ver el formato correcto.',
    objectiveId: 'dato-clientes',
  },

  'archivo-soporte': {
    label: 'Archivo: credenciales_vpn.txt',
    prompt: 'Leé el archivo para obtener credenciales.',
    choices: [
      { command: 'cat credenciales_vpn.txt', description: 'muestra credenciales en texto plano' },
    ],
    correctCommand: 'cat credenciales_vpn.txt',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido del archivo en pantalla.\n\nEjemplo: cat credenciales_vpn.txt',
    successOutput:
      '[OK] credenciales_vpn.txt\n\nusuario:      netops\ncontrasena:   n3t0ps_2026\nacceso:       SSH → 10.10.0.20\nultimo_login: 2026-04-24\nnota:         cuenta de servicio, no modificar',
    conclusion: 'Credenciales obtenidas: netops / n3t0ps_2026. Acceso SSH a 10.10.0.20.',
    failOutput: '[ERROR] Operacion invalida. Escribi /help para ver el formato correcto.',
    objectiveId: 'dato-soporte',
  },

  /* ── Archivos distractores (sala documentos) ─────────────────────── */
  'archivo-procedimientos': {
    label: 'Archivo: procedimientos.md',
    prompt: 'Leé el archivo.',
    choices: [
      { command: 'cat procedimientos.md', description: 'muestra el contenido del archivo' },
    ],
    correctCommand: 'cat procedimientos.md',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido del archivo en pantalla.\n\nEjemplo: cat procedimientos.md',
    successOutput:
      '[OK] procedimientos.md — Manual IT Interno v3.2\n\n1. Tickets: jira.corp.internal\n2. Escalado: Tier1 → Tier2 → Tier3\n3. Ventana mant.: domingos 02:00-06:00 UTC\n4. Guardia: soporte@empresa.local ext.208\n\n[Sin datos de red relevantes para la mision]',
    conclusion: 'Manual de procedimientos IT. Sin informacion util.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para ayuda.',
  },

  'archivo-inventario': {
    label: 'Archivo: inventario_hosts.csv',
    prompt: 'Leé el archivo.',
    choices: [
      { command: 'cat inventario_hosts.csv', description: 'muestra el inventario de hosts' },
    ],
    correctCommand: 'cat inventario_hosts.csv',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido del archivo en pantalla.\n\nEjemplo: cat inventario_hosts.csv',
    successOutput:
      '[OK] inventario_hosts.csv\n\nhostname          ip               os\n─────────────────────────────────────────\nws-martha         192.168.1.45     Win10\nws-carlos         192.168.1.67     Win10\nsrv-file01        192.168.1.100    Win2019\nsrv-db01          192.168.1.110    Ubuntu22\n\n[Red de usuarios — distinto segmento a ops]',
    conclusion: 'Inventario de PCs de usuarios. No es la red interna ops.',
    failOutput: '[ERROR] Operacion no reconocida. Escribi /help para ayuda.',
  },

  /* ── PCs interactuables ─────────────────────────────────────────── */
  'pc-1': {
    label: 'PC Corporativa — jperez',
    prompt: 'Revisá las conexiones activas del sistema.',
    choices: [
      { command: 'netstat -an', description: 'muestra conexiones de red activas' },
    ],
    correctCommand: 'netstat -an',
    hint: 'Para ver conexiones de red activas usá: netstat [opciones]',
    helpText: 'Uso: netstat -an\nMuestra todas las conexiones de red y puertos en escucha.\n  -a  muestra todos los sockets\n  -n  muestra IPs numéricas sin resolver nombres',
    successOutput:
      '[OK] Conexiones activas:\n\nProto  Origen             Destino            Estado\nTCP    192.168.1.67:49201  10.10.0.20:22     ESTABLISHED\nTCP    192.168.1.67:49350  172.16.5.11:443   TIME_WAIT\nTCP    127.0.0.1:8080      0.0.0.0:*         LISTEN\n\nHay una sesion SSH abierta hacia 10.10.0.20.\nEsta maquina ya tenia contacto previo con la red interna.',
    conclusion: 'La PC de jperez tiene una conexion previa a 10.10.0.20 por SSH.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
  },

  'pc-2': {
    label: 'Terminal de Monitoreo',
    prompt: 'Listá los procesos corriendo en el sistema.',
    choices: [
      { command: 'ps aux', description: 'lista todos los procesos activos' },
    ],
    correctCommand: 'ps aux',
    hint: 'Para ver procesos en ejecución usá: ps [opciones]',
    helpText: 'Uso: ps aux\nMuestra todos los procesos del sistema con usuario, PID y uso de CPU/RAM.\n  a  procesos de todos los usuarios\n  u  formato detallado\n  x  incluye procesos sin terminal',
    successOutput:
      '[OK] Procesos activos:\n\nUSER       PID  %CPU  %MEM  COMMAND\nroot         1   0.0   0.1  /sbin/init\nsystem     412   0.2   1.4  av_scanner --daemon --pid=/var/run/av.pid\nsystem     413   0.1   0.8  av_watchdog --monitor 412\njperez    1042   0.0   0.3  bash\njperez    1891   2.1   0.5  chrome\n\nPID 412: av_scanner corriendo como daemon.\nPID 413: watchdog que lo reinicia si cae.',
    conclusion: 'El antivirus corre como av_scanner (PID 412) con un watchdog en PID 413.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
  },

  'pc-3': {
    label: 'Consola de Red',
    prompt: 'Verificá la conectividad con el gateway interno.',
    choices: [
      { command: 'ping 10.10.0.20', description: 'prueba la conectividad con el gateway' },
    ],
    correctCommand: 'ping 10.10.0.20',
    hint: 'Para probar conectividad con un host remoto usá: ping [ip]',
    helpText: 'Uso: ping [ip]\nEnvía paquetes ICMP para verificar si un host está activo y medir latencia.\n\nEjemplo: ping 10.10.0.20',
    successOutput:
      '[OK] PING 10.10.0.20\n\n64 bytes de 10.10.0.20: icmp_seq=1 ttl=64 tiempo=0.82 ms\n64 bytes de 10.10.0.20: icmp_seq=2 ttl=64 tiempo=0.79 ms\n64 bytes de 10.10.0.20: icmp_seq=3 ttl=64 tiempo=0.81 ms\n\nHost alcanzable. Latencia baja — está en la misma red local.\nEl gateway interno responde en 10.10.0.20.',
    conclusion: 'El gateway 10.10.0.20 está activo y es alcanzable desde esta red.',
    failOutput: '[ERROR] Destino no alcanzable. Verificá la IP. Escribi /help para el formato.',
  },

  'pc-4': {
    label: 'Estación de Seguridad',
    prompt: 'Revisá el estado del sistema y los procesos críticos.',
    choices: [
      { command: 'top', description: 'muestra procesos en tiempo real con uso de recursos' },
    ],
    correctCommand: 'top',
    hint: 'Para ver el estado del sistema en tiempo real usá: top',
    helpText: 'Uso: top\nMonitor interactivo de procesos. Muestra CPU, RAM y procesos ordenados por uso.\n\nNo requiere argumentos.',
    successOutput:
      '[OK] Estado del sistema — instantanea\n\nCPU: 18.4%   RAM: 3.1/8.0 GB   Uptime: 14 dias\n\nPID   USUARIO   %CPU  %MEM  PROCESO\n412   system    12.3   1.4  av_scanner\n413   system     0.1   0.8  av_watchdog\n890   root       3.7   0.2  sshd\n1042  jperez     0.0   0.3  bash\n\nEl av_scanner consume el 12% de CPU — está en modo activo.\nDetectó actividad inusual: ultima alerta hace 4 minutos.',
    conclusion: 'El antivirus está en modo activo y registró actividad hace 4 minutos. Moverse rápido.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
  },

  /* ── Archivo extra (sala red interna) ───────────────────────────── */
  'archivo-red': {
    label: 'Archivo: network-map.json',
    prompt: 'Leé el archivo para validar la topologia.',
    choices: [
      { command: 'cat network-map.json', description: 'lee el mapa de segmentos internos' },
    ],
    correctCommand: 'cat network-map.json',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido del archivo en pantalla.\n\nEjemplo: cat network-map.json',
    successOutput:
      '[OK] Segmentos detectados:\n- corp-core: 10.10.0.0/24\n- ops-tools: 10.10.2.0/24\n- backups:   10.10.4.0/24\n\nEl salto a red interna queda confirmado.',
    conclusion: 'El mapa de red sirve para ubicar el objetivo final una vez dentro.',
    failOutput: '[ERROR] Operacion invalida sobre network-map.json.',
    objectiveId: 'dato-red',
  },
};
