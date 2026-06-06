import type { Scenario } from '../types/game';

export const SCENARIOS: Readonly<Record<string, Scenario | undefined>> = {

  /* ── Terminal de entrada ─────────────────────────────────────────── */
  'terminal-entrada': {
    label: 'Terminal: sistema comprometido',
    prompt: 'Identifica quien sos en este sistema.',
    choices: [
      { command: 'whoami',  description: 'muestra usuario y privilegios actuales' },
      { command: 'ls -la',  description: 'lista archivos del directorio actual' },
      { command: 'uname -a', description: 'muestra información del sistema operativo' },
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
      { command: 'cd Desktop',   description: 'entra al directorio Desktop' },
      { command: 'ls Desktop',   description: 'lista el contenido de Desktop sin entrar' },
      { command: 'open Desktop', description: 'abre Desktop con el administrador de archivos' },
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
      { command: 'cd Documents',   description: 'entra al directorio Documents' },
      { command: 'find Documents', description: 'busca archivos dentro de Documents' },
      { command: 'ls -la',         description: 'lista el contenido del directorio actual' },
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
      { command: 'ssh netops@10.10.0.20', description: 'salto SSH al gateway interno con la cuenta de netops' },
      { command: 'ssh admin@10.10.0.5',   description: 'intenta conectar directamente al controlador de dominio' },
      { command: 'telnet 10.10.0.20',     description: 'conexión sin cifrar al gateway (protocolo legacy)' },
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
      { command: 'cat notas_reunion.txt',   description: 'muestra el contenido del archivo de notas' },
      { command: 'cat inventario_hosts.csv', description: 'muestra el inventario de hosts de la red' },
      { command: 'cat procedimientos.md',   description: 'muestra el manual de procedimientos de IT' },
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
      { command: 'cat credenciales_vpn.txt', description: 'muestra las credenciales de acceso VPN' },
      { command: 'cat notas_reunion.txt',    description: 'muestra las notas de la última reunión de IT' },
      { command: 'cat backup_keys.txt',      description: 'muestra las claves de los servidores de backup' },
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
      { command: 'cat procedimientos.md',  description: 'muestra el manual de procedimientos de IT' },
      { command: 'cat inventario_hosts.csv', description: 'muestra el inventario de hosts de la red' },
      { command: 'cat network_config.txt', description: 'muestra la configuración de red del sistema' },
    ],
    correctCommand: 'cat procedimientos.md',
    hint: 'Para leer el contenido de un archivo usá: cat [nombre]',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nUsá ls para ver los archivos disponibles en este directorio.',
    successOutput:
      '[OK] procedimientos.md — Manual IT Interno v3.2\n\n' +
      '1. Tickets: jira.corp.internal\n' +
      '2. Escalado: Tier1 → Tier2 → Tier3\n' +
      '3. Ventana mant.: domingos 02:00-06:00 UTC\n' +
      '4. Guardia: soporte@empresa.local ext.208\n\n' +
      'Apéndice C — Herramientas de diagnóstico de red\n' +
      '  /opt/tools/traffic_spoof.exe — genera tráfico señuelo para\n' +
      '  redirigir sistemas de monitoreo a segmentos inactivos.\n' +
      '  USO INTERNO — requiere autorización de nivel 2.\n\n' +
      '[HERRAMIENTA ENCONTRADA] traffic_spoof.exe copiado al entorno.',
    conclusion: 'Manual IT con referencia a traffic_spoof.exe — una herramienta de señuelo de tráfico.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para ayuda.',
    objectiveId: 'item-traffic-spoof',
    basePath: '/home/jperez/Desktop/Documents',
  },

  'archivo-inventario': {
    label: 'Archivo: inventario_hosts.csv',
    prompt: 'Leé el archivo.',
    choices: [
      { command: 'cat inventario_hosts.csv', description: 'muestra el inventario de hosts de la red' },
      { command: 'cat users.csv',            description: 'muestra la lista de usuarios del dominio' },
      { command: 'cat network_map.txt',      description: 'muestra el mapa de topología de red' },
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
      { command: 'netstat -an', description: 'muestra todas las conexiones de red con IPs numéricas' },
      { command: 'ifconfig -a', description: 'muestra la configuración de todas las interfaces de red' },
      { command: 'route -n',    description: 'muestra la tabla de ruteo del sistema' },
    ],
    correctCommand: 'netstat -an',
    hint: 'Para ver conexiones de red activas usá: netstat [opciones]',
    helpText: 'Uso: netstat [opciones]\nMuestra las conexiones de red activas y puertos en escucha.\n  -a  muestra todos los sockets\n  -n  muestra IPs numéricas sin resolver nombres',
    successOutput:
      '[OK] Conexiones activas:\n\n' +
      'Proto  Origen              Destino            Estado\n' +
      'TCP    192.168.1.67:49201  10.10.0.20:22      ESTABLISHED\n' +
      'TCP    192.168.1.67:49350  172.16.5.11:443    TIME_WAIT\n' +
      'TCP    127.0.0.1:8080      0.0.0.0:*          LISTEN\n\n' +
      '>> SESION SSH ACTIVA: 192.168.1.67 → 10.10.0.20:22\n' +
      '>> Puerto 22 confirmado. Contacto con la red interna establecido.\n\n' +
      'Archivos del script:\n' +
      '  terminal_red.sh\n' +
      '  firewall_rule.sh   ← script de bloqueo de tráfico de monitoreo\n\n' +
      '[HERRAMIENTA ENCONTRADA] firewall_rule.sh copiado al entorno.',
    conclusion: 'Conexión SSH confirmada. Además encontraste firewall_rule.sh — un script para bloquear el tráfico del scanner.',
    failOutput: '[ERROR] Comando no reconocido. Escribi /help para el formato.',
    objectiveId: 'item-firewall-rule',
    basePath: '/home/jperez/Desktop',
  },

  'pc-2': {
    label: 'Terminal de Monitoreo',
    prompt: 'Listá los procesos corriendo en el sistema.',
    choices: [
      { command: 'ps aux',  description: 'lista todos los procesos activos con detalle de usuario y recursos' },
      { command: 'top',     description: 'monitor interactivo de procesos en tiempo real' },
      { command: 'ls /proc', description: 'lista los descriptores de procesos del kernel' },
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
      { command: 'ping 10.10.0.20',      description: 'prueba la conectividad con el gateway interno' },
      { command: 'ping 192.168.1.1',     description: 'prueba la conectividad con el router local' },
      { command: 'traceroute 10.10.0.20', description: 'traza la ruta de paquetes hasta el gateway' },
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
      { command: 'top',    description: 'monitor de procesos en tiempo real con uso de CPU y RAM' },
      { command: 'ps aux', description: 'lista estática de todos los procesos activos' },
      { command: 'uptime', description: 'muestra el tiempo que lleva encendido el sistema' },
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

  /* ════════════════════════════════════════════════════════════════════
     ETAPA 2 — Escalada de privilegios
     ════════════════════════════════════════════════════════════════════ */

  /* ── Barrera: servidor compartido ───────────────────────────────── */
  'puerta-shares': {
    label: 'Puerta: Servidor compartido /shares',
    prompt: 'Accedé al servidor de archivos compartidos.',
    choices: [
      { command: 'cd /shares',    description: 'navega al punto de montaje del servidor compartido' },
      { command: 'mount /shares', description: 'monta el servidor de archivos en el sistema local' },
      { command: 'ls /shares',    description: 'lista el contenido del servidor sin navegar' },
    ],
    correctCommand: 'cd /shares',
    hint: 'Usá cd /shares para entrar al servidor de archivos',
    helpText: 'Uso: cd [directorio]\nNavega al directorio especificado.\n\nEl servidor compartido está montado en /shares.',
    successOutput:
      '[OK] /shares\n\n' +
      'Conexion al servidor de archivos establecida.\n\n' +
      'Directorios disponibles:\n' +
      '  IT_backups/\n' +
      '  Finance/\n' +
      '  HR/\n\n' +
      'Explorá IT_backups — el equipo de IT suele guardar scripts ahí.',
    conclusion: 'Dentro del servidor compartido. IT_backups puede tener información útil.',
    failOutput: '[ERROR] Directorio no encontrado. Usá cd /shares para acceder.',
    basePath: '/home/netops',
    allowCd: true,
    targetPath: '/shares',
  },

  /* ── Archivos en /shares ─────────────────────────────────────────── */
  'archivo-network-map': {
    label: 'Archivo: network_map.txt',
    prompt: 'Leé el mapa de red interna.',
    choices: [
      { command: 'cat network_map.txt', description: 'muestra el mapa de topología de red interna' },
      { command: 'cat hosts.conf',      description: 'muestra la configuración de resolución de hosts' },
      { command: 'cat topology.csv',    description: 'muestra el inventario de equipos en formato tabla' },
    ],
    correctCommand: 'cat network_map.txt',
    hint: 'Usá cat network_map.txt para leer el archivo',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nEstás en /shares/IT_backups — podés leer directamente por nombre.',
    successOutput:
      '[OK] /shares/IT_backups/network_map.txt\n\n' +
      'Network Topology Map — IT Ops v2.1\n\n' +
      'Segmentos internos:\n' +
      '  corp-core:   10.10.0.0/24\n' +
      '    GW-core:   10.10.0.1\n' +
      '    GW-ops:    10.10.0.20\n' +
      '    DC01:      10.10.0.5   ← Domain Controller\n' +
      '  db-segment:  10.10.0.28/30\n' +
      '    DB01:      10.10.0.30\n\n' +
      'PRIORIDAD: DC01 en 10.10.0.5 controla todo el dominio.',
    conclusion: 'Red mapeada: DC en 10.10.0.5. Revisá los scripts en IT_backups — suelen tener credenciales hardcodeadas.',
    failOutput: '[ERROR] Archivo no encontrado. Usá: cat network_map.txt',
    objectiveId: 'network-map',
    basePath: '/shares/IT_backups',
  },

  'archivo-sync-backup': {
    label: 'Archivo: sync_backup.ps1',
    prompt: 'Leé el script de backup en busca de credenciales.',
    choices: [
      { command: 'cat sync_backup.ps1', description: 'muestra el script de sincronización de backups' },
      { command: 'cat backup_cron.sh',  description: 'muestra el cron job que ejecuta el backup periódico' },
      { command: 'cat restore.bat',     description: 'muestra el script de restauración de backups' },
    ],
    correctCommand: 'cat sync_backup.ps1',
    hint: 'Usá cat sync_backup.ps1 para leer el script',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo en pantalla.\n\nNecesitás el mapa de red primero.',
    successOutput:
      '[OK] /shares/IT_backups/sync_backup.ps1\n\n' +
      '# sync_backup.ps1 — IT Ops\n' +
      '# Autor: svc_backup@corp.internal\n' +
      '# TODO: migrar credenciales a vault antes del Q3-2026\n\n' +
      '$domain = "corp.internal"\n' +
      '$user   = "domain_admin"\n' +
      '$pass   = "D0m@1nAdm1n_2026!"  # TEMP hardcodeado\n\n' +
      'Net-ADUser -Username $user -Password $pass -Domain $domain\n' +
      'Copy-Item "\\\\srv-dc01\\sysvol" "D:\\backups\\sysvol_$(Get-Date -f yyyyMMdd)"\n\n' +
      '[CREDENCIALES ENCONTRADAS]\n' +
      '  usuario:    domain_admin\n' +
      '  contraseña: D0m@1nAdm1n_2026!\n\n' +
      '[NOTA] Script ejecutado por la cuenta de servicio: svc_backup\n' +
      '  Tiene un SPN registrado (backup/srv-dc01) — puede ser objetivo de Kerberoasting.',
    conclusion: 'Credenciales de domain_admin obtenidas. Además, svc_backup tiene SPN — buscá la terminal de Kerberoasting para atacar esa cuenta.',
    failOutput: '[ERROR] Acceso denegado. Necesitás el mapa de red primero.',
    objectiveId: 'admin-password',
    requiredObjectives: ['network-map'],
    basePath: '/shares/IT_backups',
  },

  /* ── Terminal de Kerberoasting ───────────────────────────────────── */
  'terminal-kerberos': {
    label: 'Terminal: Kerberoasting',
    prompt: 'La cuenta que ejecuta el script de backup tiene un SPN registrado — es Kerberoasteable. Capturá su ticket y crackealo.',
    choices: [
      { command: 'request_ticket svc_backup',   description: 'solicita el ticket TGS de Kerberos para la cuenta svc_backup' },
      { command: 'request_ticket domain_admin', description: 'solicita el ticket TGS de Kerberos para domain_admin' },
      { command: 'kerberoast --all',            description: 'ataca todas las cuentas Kerberoasteables del dominio' },
    ],
    correctCommand: 'request_ticket svc_backup',
    hint: 'Encontraste la cuenta en el script de backup. Paso 1: request_ticket [cuenta_servicio]',
    helpText:
      'Esta terminal usa herramientas propias del entorno (no son comandos\n' +
      'estándar de Linux — están instaladas por el equipo de IT).\n\n' +
      'PASO 1 — Capturar ticket de Kerberos:\n' +
      '  request_ticket [cuenta_servicio]\n' +
      '  Solicita un Service Ticket (TGS) al KDC para la cuenta indicada.\n' +
      '  El nombre de la cuenta lo leíste en el script de backup de /IT_backups.\n\n' +
      'PASO 2 — Crackear el ticket capturado:\n' +
      '  crack_ticket [archivo.ticket]\n' +
      '  Ataca el hash del ticket con un diccionario para extraer la contraseña.\n' +
      '  El archivo .ticket se genera automáticamente en el paso 1.',
    successOutput:
      '[OK] Solicitando ticket TGS para svc_backup...\n\n' +
      '[*] Enumerando cuentas Kerberoasteables en corp.internal\n' +
      '[+] svc_backup — SPN: backup/srv-dc01.corp.internal\n' +
      '[*] Solicitando TGS...\n' +
      '[+] Ticket guardado → svc_backup.ticket\n\n' +
      'Hash capturado:\n' +
      '$krb5tgs$23$*svc_backup$CORP.INTERNAL$backup/srv-dc01*\n' +
      '$a3f8c2d1e4b7a9f0[...truncado...]\n\n' +
      'Ticket listo. Ahora crackealo con: crack_ticket svc_backup.ticket',
    conclusion: 'Ticket Kerberos obtenido. Crackealo para extraer la contraseña de svc_backup.',
    failOutput: '[ERROR] No se pudo obtener el ticket. Verificá la conexión a la red interna.',
    objectiveId: 'kerberos-ticket',
    basePath: '/shares',
    secondCommand: 'crack_ticket svc_backup.ticket',
    secondRequiredObjectives: ['kerberos-ticket'],
    secondSuccessOutput:
      '[OK] Crackeando svc_backup.ticket...\n\n' +
      '[*] Cargando diccionario rockyou.txt (14.3M entradas)\n' +
      '[*] Modo híbrido: diccionario + reglas de mutación\n' +
      '[*] Probando combinaciones...\n' +
      '...\n' +
      '[+] CONTRASEÑA ENCONTRADA\n\n' +
      '  cuenta:     svc_backup\n' +
      '  contraseña: Backup@2024!\n' +
      '  dominio:    CORP.INTERNAL\n\n' +
      'Usá estas credenciales para autenticarte en la puerta del DC.',
    secondConclusion: 'svc_backup crackeado: Backup@2024! — Autenticate en la puerta del controlador de dominio.',
    secondObjectiveId: 'cracked-password',
    secondChoices: [
      { command: 'crack_ticket svc_backup.ticket', description: 'ataca el hash del ticket con diccionario rockyou para extraer la contraseña' },
      { command: 'hashcat svc_backup.ticket',      description: 'usa hashcat en modo GPU para crackear el ticket' },
      { command: 'john svc_backup.ticket',         description: 'usa John the Ripper para crackear el hash del ticket' },
    ],
  },

  /* ── Barrera: controlador de dominio ─────────────────────────────── */
  'puerta-dc': {
    label: 'Puerta: Controlador de dominio',
    prompt: 'svc_backup es una service account del grupo Backup Operators — tiene acceso directo al DC. Impersonala con la contraseña crackeada.',
    choices: [
      { command: 'su svc_backup',          description: 'cambia identidad a la service account usando la contraseña crackeada' },
      { command: 'su domain_admin',        description: 'intenta cambiar identidad directamente al administrador del dominio' },
      { command: 'sudo -u svc_backup bash', description: 'abre una shell como svc_backup usando sudo' },
    ],
    correctCommand: 'su svc_backup',
    hint: 'Impersoná la service account con la contraseña crackeada: su svc_backup',
    helpText:
      'Uso: su [usuario]\n' +
      'Cambia la identidad al usuario especificado usando su contraseña.\n\n' +
      'svc_backup es del grupo Backup Operators, que tiene acceso\n' +
      'privilegiado al DC por diseño. domain_admin no tiene acceso\n' +
      'remoto desde esta sesión — necesitás la service account.',
    successOutput:
      '[OK] Identidad cambiada: svc_backup@corp.internal\n\n' +
      'Tipo de cuenta: service account (Backup Operators)\n' +
      'Acceso al controlador de dominio: HABILITADO\n\n' +
      'Privilegios actuales insuficientes para /critical.\n' +
      'Necesitás escalar al grupo Domain Admins — domain_admin es miembro.',
    conclusion: 'Dentro del DC como svc_backup. Enumerá el grupo Domain Admins y escalá.',
    failOutput: '[ERROR] Autenticacion fallida. Necesitás crackear las credenciales de svc_backup primero.',
    objectiveId: 'acceso-dc',
    requiredObjectives: ['kerberos-ticket', 'cracked-password'],
    basePath: '/shares',
  },

  /* ── Terminal central del DC ─────────────────────────────────────── */
  'terminal-dc': {
    label: 'Terminal: Controlador de dominio',
    prompt: 'Estás dentro del DC como svc_backup. Enumerá los administradores y luego escalá con las credenciales del script.',
    choices: [
      { command: 'net group "Domain Admins" /domain', description: 'lista todos los miembros del grupo de administradores del dominio' },
      { command: 'whoami /groups',                    description: 'muestra los grupos a los que pertenece el usuario actual' },
      { command: 'net user domain_admin /domain',     description: 'muestra detalles de la cuenta domain_admin en el dominio' },
    ],
    correctCommand: 'net group "Domain Admins" /domain',
    hint: 'Enumerá los admins del dominio primero, luego escalá con las credenciales que encontraste.',
    helpText:
      'PASO 1 — Enumerar administradores:\n' +
      '  net group "Domain Admins" /domain\n' +
      '  Lista los miembros del grupo de administradores en Active Directory.\n' +
      '  Usá comillas porque el nombre del grupo tiene espacios.\n\n' +
      'PASO 2 — Escalar privilegios:\n' +
      '  su domain_admin\n' +
      '  Usá la contraseña que encontraste hardcodeada en el script de backup.',
    successOutput:
      '[OK] Grupo: Domain Admins\n' +
      'Comentario: Designated administrators of the domain\n\n' +
      'Miembros:\n' +
      '  domain_admin         Administrator        svc_mgmt\n\n' +
      'El comando se completó correctamente.\n\n' +
      'Usuario domain_admin confirmado con privilegios máximos.\n' +
      'Escalá con: su domain_admin',
    conclusion: 'domain_admin existe. Usá las credenciales del script para escalar.',
    failOutput: '[ERROR] Acceso denegado al directorio activo.',
    basePath: '/home/svc_backup',
    secondCommand: 'su domain_admin',
    secondRequiredObjectives: ['admin-password'],
    secondSuccessOutput:
      '[OK] Autenticado como domain_admin\n\n' +
      'Sesion iniciada: domain_admin@corp.internal\n' +
      'Privilegios: Domain Administrator\n' +
      'Acceso a archivos críticos: DESBLOQUEADO\n\n' +
      '[SISTEMA] Nivel de privilegio máximo alcanzado.\n' +
      '[SISTEMA] Acceso a /critical concedido.\n' +
      '[ALERTA]  El antivirus detectó escalada de privilegios.',
    secondConclusion: 'Sos domain_admin. El acceso a los archivos críticos está abierto.',
    secondObjectiveId: 'domain-admin-access',
    secondUnlocksDoor: 'puerta-critica',
    secondChoices: [
      { command: 'su domain_admin',         description: 'escala a domain_admin usando las credenciales del script de backup' },
      { command: 'sudo su -',               description: 'escala a root usando sudo con los privilegios actuales' },
      { command: 'runas /user:domain_admin cmd', description: 'ejecuta cmd.exe con las credenciales de domain_admin (Windows)' },
    ],
  },

  /* ════════════════════════════════════════════════════════════════════
     ETAPA 3 — Cifrado de archivos críticos
     ════════════════════════════════════════════════════════════════════ */

  /* ── Terminal: iniciar cifrado ransomware ────────────────────────── */
  'terminal-critical': {
    label: 'Terminal: /critical',
    prompt: 'Tenés acceso completo a /critical como domain_admin. Los archivos están sin cifrar. Iniciá el ataque.',
    choices: [
      { command: 'encrypt',        description: 'despliega el módulo de cifrado ransomware sobre /critical' },
      { command: 'ls',             description: 'lista los archivos del directorio actual' },
      { command: 'cat database.db', description: 'lee el contenido del archivo de base de datos' },
    ],
    correctCommand: 'encrypt',
    hint: 'Ejecutá el módulo de cifrado',
    helpText:
      'Sos domain_admin. Los archivos de /critical son el objetivo.\n\n' +
      'Comandos disponibles:\n' +
      '  ls          — lista el contenido del directorio\n' +
      '  cat [file]  — lee un archivo\n' +
      '  encrypt     — inicia el módulo de cifrado ransomware\n\n' +
      'Una vez cifrado iniciado, el antivirus detecta la amenaza\n' +
      'y viene directo a esta sala. Usá E en los archivos\n' +
      'físicos de la sala para cifrarlos uno a uno.',
    successOutput:
      '[OK] Iniciando BYTE-PLAGUE Encryption Module...\n\n' +
      '[*] Generando clave RSA-2048...\n' +
      '[*] Escaneando /critical...\n' +
      '[+] 8 archivos objetivo encontrados\n' +
      '[+] Módulo activo — presioná E sobre cada archivo\n\n' +
      '[!] ALERTA: el antivirus detectó actividad.\n' +
      '[!] Viene en camino. Cifrá todo lo que puedas.',
    conclusion: 'Módulo de cifrado activo. Cifrá los archivos antes de ser atrapado.',
    failOutput: '[ERROR] Permiso denegado. Necesitás privilegios de domain_admin.',
    objectiveId: 'encryption-key',
    requiredObjectives: ['domain-admin-access'],
    basePath: '/critical',
  },

  /* ── Terminal pasillo central (stealth_mode.bin) ────────────────── */
  'terminal-central': {
    label: 'Terminal: Monitoreo de red',
    prompt: 'Explorá la terminal de monitoreo de la red interna.',
    choices: [
      { command: 'cat stealth_mode.bin',  description: 'lee el módulo de evasión de escaneo en tiempo real' },
      { command: 'ls -la',                description: 'lista todos los archivos del directorio actual con detalle' },
      { command: 'cat network-map.json',  description: 'lee el mapa de segmentos de red en formato JSON' },
    ],
    correctCommand: 'cat stealth_mode.bin',
    hint: 'Ejecutá ls para ver los archivos del directorio, luego cat [nombre] para leer el que te interese.',
    helpText: 'Uso: cat [archivo]\nMuestra el contenido de un archivo.\n\nEjecutá ls primero para ver qué hay en este directorio.',
    successOutput:
      '[OK] stealth_mode.bin — AV Evasion Module v0.4\n\n' +
      'Descripción: parche de memoria que suprime las firmas de\n' +
      'escaneo activo del av_scanner (PID 412) por un período\n' +
      'limitado. Modifica los punteros de callback del driver\n' +
      'de detección en tiempo real.\n\n' +
      'Duración estimada: 10 segundos antes de que el watchdog\n' +
      '(PID 413) restaure el módulo.\n\n' +
      '[HERRAMIENTA ENCONTRADA] stealth_mode.bin cargado en memoria.',
    conclusion: 'stealth_mode.bin cargado — el cono del antivirus queda ciego por 10 segundos.',
    failOutput: '[ERROR] Archivo no encontrado. Explorá el directorio con ls.',
    objectiveId: 'item-stealth-mode',
    basePath: '/home/netops',
  },

  /* ── Archivo extra (sala red interna) ───────────────────────────── */
  'archivo-red': {
    label: 'Archivo: network-map.json',
    prompt: 'Leé el archivo para validar la topologia.',
    choices: [
      { command: 'cat network-map.json', description: 'lee el mapa de segmentos internos en formato JSON' },
      { command: 'cat hosts.json',       description: 'lee el inventario de hosts en formato JSON' },
      { command: 'ls -la',              description: 'lista todos los archivos del directorio actual' },
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
