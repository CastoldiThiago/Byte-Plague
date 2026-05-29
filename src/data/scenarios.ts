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
    helpText: 'Uso: whoami\nMuestra el usuario actual del sistema y sus privilegios.\n\nNo requiere argumentos.',
    successOutput:
      '[OK] phishing_session_302\n\nusuario:     empleado_comprometido\nprivilegios: usuario_estandar\ncontexto:    PC corporativa (192.168.1.67)\nsesion:      activa desde 2026-04-24\n\nTenes acceso limitado. Explora el sistema para avanzar.',
    conclusion: 'Sos un usuario estandar en una PC corporativa comprometida.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para ayuda.',
    basePath: '/home/jperez',
  },

  /* ── Puertas ─────────────────────────────────────────────────────── */
  'puerta-clientes': {
    label: 'Puerta: Desktop/',
    prompt: 'Accedé al directorio Desktop del sistema.',
    choices: [
      { command: 'cd Desktop', description: 'entra al directorio Desktop' },
    ],
    correctCommand: 'cd Desktop',
    hint: 'Usá ls para ver los directorios disponibles y cd [nombre] para entrar',
    helpText: 'Uso: cd [directorio]\nNavega al directorio especificado.\n\nUsá ls para ver qué directorios hay disponibles.',
    successOutput:
      '[OK] Desktop\n\nContenido:\n  Documents/\n  terminal_red.sh\n\nExplorá el entorno para encontrar informacion util.',
    conclusion: 'Accediste al Desktop. Mirá alrededor.',
    failOutput: '[ERROR] Directorio no encontrado. Usá ls para ver los directorios disponibles.',
    basePath: '/home/jperez',
    allowCd: true,
    targetPath: '/home/jperez/Desktop',
  },

  'puerta-soporte': {
    label: 'Puerta: Documents/',
    prompt: 'Accedé al directorio de documentos.',
    choices: [
      { command: 'cd Documents', description: 'entra al directorio Documents' },
    ],
    correctCommand: 'cd Documents',
    hint: 'Usá ls para ver los directorios disponibles y cd [nombre] para entrar',
    helpText: 'Uso: cd [directorio]\nNavega al directorio especificado.\n\nUsá ls para ver qué directorios hay disponibles.',
    successOutput:
      '[OK] Documents\n\nContenido:\n  notas_reunion.txt\n  credenciales_vpn.txt\n  inventario_hosts.csv\n  procedimientos.md\n\nAlgunos archivos pueden tener informacion critica.',
    conclusion: 'Accediste a Documents. Explorá los archivos para obtener credenciales y la IP del gateway.',
    failOutput: '[ERROR] Directorio no encontrado. Usá ls para ver los directorios disponibles.',
    basePath: '/home/jperez/Desktop',
    allowCd: true,
    targetPath: '/home/jperez/Desktop/Documents',
  },

  'puerta-red-interna': {
    label: 'Puerta: red interna',
    prompt: 'Conectate a la red interna usando las credenciales que encontraste.',
    choices: [
      { command: 'ssh netops@10.10.0.20', description: 'salto SSH al gateway interno' },
    ],
    correctCommand: 'ssh netops@10.10.0.20',
    hint: 'Necesitás usuario, contraseña e IP del gateway. Revisá los archivos que encontraste.',
    helpText: 'Uso: ssh usuario@host\nEstablece una conexion SSH con un servidor remoto.\n\nNecesitas un usuario válido y la IP del gateway interno.\nEncontrá esos datos explorando el sistema.',
    successOutput:
      '[OK] TUNEL ESTABLECIDO.\nConexion a 10.10.0.20 exitosa.\nHas encontrado la via de entrada a la red interna.',
    conclusion: 'Con este salto confirmas la ruta interna y completas el objetivo del nivel 1.',
    failOutput: '[ERROR] Conexion rechazada. Verificá usuario y host. Escribi /help para el formato.',
    objectiveId: 'acceso-red-interna',
    requiredObjectives: ['dato-clientes', 'dato-soporte'],
    basePath: '/home/jperez',
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
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] notas_reunion.txt — Notas reunion IT (2026-04-18)\n\nAsistentes: equipo ops, red interna\nPuntos clave:\n  - Ampliacion segmento ops: 10.10.2.0/24\n  - Gateway de acceso interno: 10.10.0.20\n  - Credenciales VPN: ver credenciales_vpn.txt\n  - Prox. mantenimiento: 01/05/2026\n\nRELEVANTE: gateway interno identificado → 10.10.0.20',
    conclusion: 'Las notas revelan el gateway interno: 10.10.0.20. Buscá credenciales_vpn.txt en este mismo directorio.',
    failOutput: '[ERROR] Comando no valido. Escribi /help para ver el formato correcto.',
    objectiveId: 'dato-clientes',
    basePath: '/home/jperez/Desktop/Documents',
  },

  'archivo-soporte': {
    label: 'Archivo: credenciales_vpn.txt',
    prompt: 'Leé el archivo para obtener credenciales.',
    choices: [
      { command: 'cat credenciales_vpn.txt', description: 'muestra credenciales en texto plano' },
    ],
    correctCommand: 'cat credenciales_vpn.txt',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] credenciales_vpn.txt\n\nusuario:      netops\ncontrasena:   n3t0ps_2026\nacceso:       SSH → 10.10.0.20\nultimo_login: 2026-04-24\nnota:         cuenta de servicio, no modificar',
    conclusion: 'Credenciales obtenidas: netops / n3t0ps_2026. Acceso SSH a 10.10.0.20.',
    failOutput: '[ERROR] Operacion invalida. Escribi /help para ver el formato correcto.',
    objectiveId: 'dato-soporte',
    basePath: '/home/jperez/Desktop/Documents',
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
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] procedimientos.md — Manual IT Interno v3.2\n\n1. Tickets: jira.corp.internal\n2. Escalado: Tier1 → Tier2 → Tier3\n3. Ventana mant.: domingos 02:00-06:00 UTC\n4. Guardia: soporte@empresa.local ext.208\n\n[Sin datos de red relevantes para la mision]',
    conclusion: 'Manual de procedimientos IT. Sin informacion util.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para ayuda.',
    basePath: '/home/jperez/Desktop/Documents',
  },

  'archivo-inventario': {
    label: 'Archivo: inventario_hosts.csv',
    prompt: 'Leé el archivo.',
    choices: [
      { command: 'cat inventario_hosts.csv', description: 'muestra el inventario de hosts' },
    ],
    correctCommand: 'cat inventario_hosts.csv',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] inventario_hosts.csv\n\nhostname          ip               os\n─────────────────────────────────────────\nws-martha         192.168.1.45     Win10\nws-carlos         192.168.1.67     Win10\nsrv-file01        192.168.1.100    Win2019\nsrv-db01          192.168.1.110    Ubuntu22\n\n[Red de usuarios — distinto segmento a ops]',
    conclusion: 'Inventario de PCs de usuarios. No es la red interna ops.',
    failOutput: '[ERROR] Operacion no reconocida. Escribi /help para ayuda.',
    basePath: '/home/jperez/Desktop/Documents',
  },

  /* ── PCs interactuables ─────────────────────────────────────────── */
  'pc-1': {
    label: 'terminal_red.sh — conexiones activas',
    prompt: 'Ejecutá el script para ver las conexiones de red activas.',
    choices: [
      { command: 'netstat -an', description: 'muestra conexiones de red activas' },
    ],
    correctCommand: 'netstat -an',
    hint: 'Para ver conexiones de red activas usá: netstat [opciones]',
    helpText: 'Uso: netstat [opciones]\nMuestra las conexiones de red activas y puertos en escucha.\n  -a  muestra todos los sockets\n  -n  muestra IPs numéricas sin resolver nombres',
    successOutput:
      '[OK] Conexiones activas:\n\nProto  Origen             Destino            Estado\nTCP    192.168.1.67:49201  10.10.0.20:22     ESTABLISHED\nTCP    192.168.1.67:49350  172.16.5.11:443   TIME_WAIT\nTCP    127.0.0.1:8080      0.0.0.0:*         LISTEN\n\n>> SESION SSH ACTIVA detectada: 192.168.1.67 → 10.10.0.20:22\n>> Puerto 22 confirmado. Esta maquina ya establecio contacto con la red interna.',
    conclusion: 'Puerto y host confirmados: SSH a 10.10.0.20:22. Buscá credenciales para usar esa ruta.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
    basePath: '/home/jperez/Desktop',
  },

  'pc-2': {
    label: 'Terminal de Monitoreo',
    prompt: 'Listá los procesos corriendo en el sistema.',
    choices: [
      { command: 'ps aux', description: 'lista todos los procesos activos' },
    ],
    correctCommand: 'ps aux',
    hint: 'Para ver procesos en ejecución usá: ps [opciones]',
    helpText: 'Uso: ps [opciones]\nMuestra los procesos activos del sistema.\n  a  procesos de todos los usuarios\n  u  formato detallado con usuario y recursos\n  x  incluye procesos sin terminal asociada',
    successOutput:
      '[OK] Procesos activos:\n\nUSER       PID  %CPU  %MEM  COMMAND\nroot         1   0.0   0.1  /sbin/init\nsystem     412   0.2   1.4  av_scanner --daemon --pid=/var/run/av.pid\nsystem     413   0.1   0.8  av_watchdog --monitor 412\njperez    1042   0.0   0.3  bash\njperez    1891   2.1   0.5  chrome\n\nPID 412: av_scanner corriendo como daemon.\nPID 413: watchdog que lo reinicia si cae.',
    conclusion: 'El antivirus corre como av_scanner (PID 412) con un watchdog en PID 413.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
    basePath: '/home/jperez',
  },

  'pc-3': {
    label: 'Consola de Red',
    prompt: 'Verificá la conectividad con el gateway interno.',
    choices: [
      { command: 'ping 10.10.0.20', description: 'prueba la conectividad con el gateway' },
    ],
    correctCommand: 'ping 10.10.0.20',
    hint: 'Para probar conectividad con un host remoto usá: ping [ip]',
    helpText: 'Uso: ping [host]\nEnvía paquetes ICMP para verificar si un host está activo.\n\nNecesitás la IP del host al que querés hacer ping.\nEncontrá esa información explorando el sistema.',
    successOutput:
      '[OK] PING 10.10.0.20\n\n64 bytes de 10.10.0.20: icmp_seq=1 ttl=64 tiempo=0.82 ms\n64 bytes de 10.10.0.20: icmp_seq=2 ttl=64 tiempo=0.79 ms\n64 bytes de 10.10.0.20: icmp_seq=3 ttl=64 tiempo=0.81 ms\n\nHost alcanzable. Latencia baja — está en la misma red local.\nEl gateway interno responde en 10.10.0.20.',
    conclusion: 'El gateway 10.10.0.20 está activo y es alcanzable desde esta red.',
    failOutput: '[ERROR] Destino no alcanzable. Verificá la IP. Escribi /help para el formato.',
    basePath: '/home/jperez',
  },

  'pc-4': {
    label: 'Estación de Seguridad',
    prompt: 'Revisá el estado del sistema y los procesos críticos.',
    choices: [
      { command: 'top', description: 'muestra procesos en tiempo real con uso de recursos' },
    ],
    correctCommand: 'top',
    hint: 'Para ver el estado del sistema en tiempo real usá: top',
    helpText: 'Uso: top\nMonitor interactivo de procesos del sistema.\nMuestra CPU, RAM y procesos ordenados por consumo.\n\nNo requiere argumentos.',
    successOutput:
      '[OK] Estado del sistema — instantanea\n\nCPU: 18.4%   RAM: 3.1/8.0 GB   Uptime: 14 dias\n\nPID   USUARIO   %CPU  %MEM  PROCESO\n412   system    12.3   1.4  av_scanner\n413   system     0.1   0.8  av_watchdog\n890   root       3.7   0.2  sshd\n1042  jperez     0.0   0.3  bash\n\nEl av_scanner consume el 12% de CPU — está en modo activo.\nDetectó actividad inusual: ultima alerta hace 4 minutos.',
    conclusion: 'El antivirus está en modo activo y registró actividad hace 4 minutos. Moverse rápido.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
    basePath: '/home/jperez',
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
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] Segmentos detectados:\n- corp-core: 10.10.0.0/24\n- ops-tools: 10.10.2.0/24\n- backups:   10.10.4.0/24\n\nEl salto a red interna queda confirmado.',
    conclusion: 'El mapa de red sirve para ubicar el objetivo final una vez dentro.',
    failOutput: '[ERROR] Operacion invalida sobre network-map.json.',
    objectiveId: 'dato-red',
    basePath: '/home/netops',
  },
};
