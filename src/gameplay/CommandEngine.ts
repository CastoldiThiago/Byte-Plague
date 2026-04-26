export interface CommandResult {
  success: boolean;
  feedback: string;
  objectiveId?: string;
}

interface CommandEntry {
  output: string;
  description: string;
  objectiveId?: string;
}

interface PoiConfig {
  label: string;
  commands: Readonly<Record<string, CommandEntry | undefined>>;
}

// Common Windows commands typed by mistake on a Unix terminal.
const WRONG_COMMAND_HINTS: Readonly<Record<string, string | undefined>> = {
  dir:      "'dir' es de Windows/DOS — en Unix usá 'ls' para listar el directorio.",
  cls:      "'cls' es de Windows — en Unix usá 'clear' para limpiar la pantalla.",
  type:     "'type' es de Windows — en Unix usá 'cat <archivo>' para ver el contenido.",
  copy:     "'copy' es de Windows — en Unix usá 'cp' para copiar archivos.",
  del:      "'del' es de Windows — en Unix usá 'rm' para eliminar archivos.",
  ipconfig: "'ipconfig' es de Windows — en Unix usá 'ifconfig' o 'ip addr'.",
  help:     "No hay comando 'help'. Escribí directamente los comandos para explorar el sistema.",
  ping:     "'ping' verifica si un host responde. Para escanear redes y puertos usá 'nmap'.",
  telnet:   "'telnet' transmite datos sin cifrar. Para sesiones seguras usá 'ssh'.",
};

const POI_COMMANDS: Readonly<Record<string, PoiConfig | undefined>> = {
  'terminal-desktop': {
    label: 'Terminal Desktop',
    commands: {
      'ls': {
        output: 'readme.txt  notas.md  .ssh/',
        description: 'lista los archivos del directorio actual',
      },
      'ls -la': {
        output: 'total 3\n-rw-r--r--  readme.txt\n-rw-------  notas.md\ndrwx------  .ssh/',
        description: 'lista archivos con permisos y ocultos (-l: largo, -a: todos)',
      },
      'cat readme.txt': {
        output: 'Sistema comprometido. El agente debe revisar los logs.',
        description: 'muestra el contenido del archivo readme.txt',
        objectiveId: 'terminal-desktop',
      },
    },
  },

  'lab-terminal-01': {
    label: 'Terminal del Laboratorio',
    commands: {
      'ls': {
        output: 'readme.txt  virus_sample.bin  logs/',
        description: 'lista los archivos del directorio actual',
      },
      'ls -la': {
        output: 'total 3\n-rw-r--r--  readme.txt\n-rwxr-----  virus_sample.bin\ndrwxr-xr-x  logs/',
        description: 'lista archivos con permisos y ocultos (-l: largo, -a: todos)',
      },
      'cat readme.txt': {
        output: 'BYTE-PLAGUE v0.1 — Muestras de malware en cuarentena.\nAnalizá con precaución.',
        description: 'muestra el contenido del archivo readme.txt',
        objectiveId: 'lab-terminal-01',
      },
    },
  },

  'terminal-red-scan': {
    label: 'Terminal de Escaneo de Red',
    commands: {
      'nmap 192.168.1.0/24': {
        output: 'Escaneando red interna 192.168.1.0/24...\n\nHost: 192.168.1.1   — Router       (puertos: 80, 443)\nHost: 192.168.1.5   — Servidor Admin (puertos: 22, 8080)\nHost: 192.168.1.12  — Workstation   (puerto: 3389)\n\n3 hosts activos encontrados.',
        description: 'escanea hosts y puertos activos en toda la subred (/24 = 256 direcciones)',
        objectiveId: 'escanear-red',
      },
    },
  },

  'terminal-ssh-connect': {
    label: 'Terminal de Conexión SSH',
    commands: {
      'ssh admin@192.168.1.5': {
        output: 'Conectando a admin@192.168.1.5 (puerto 22)...\nAutenticando con clave RSA...\n\n[OK] Sesión abierta — Servidor Admin v2.4\nÚltimo acceso: hace 2 días desde 10.0.0.44\n\nAcceso remoto establecido.',
        description: "abre una sesión SSH cifrada como usuario 'admin' en el servidor 192.168.1.5",
        objectiveId: 'acceso-ssh',
      },
    },
  },

  'terminal-inicio': {
    label: 'Terminal de Inicio',
    commands: {
      'ls': {
        output: 'Escritorio/  Descargas/  Documentos/\nreadme.txt  .bashrc  .profile',
        description: 'lista los archivos y carpetas del directorio actual',
      },
      'cat readme.txt': {
        output: 'MISIÓN: El sistema objetivo reinicia cada hora.\nEstablecé persistencia antes de que el agente sea detectado.\nPista: los trabajos programados sobreviven a los reinicios.',
        description: 'muestra la pista de la misión contenida en readme.txt',
      },
      'crontab -e': {
        output: '# Entrada agregada al crontab del usuario:\n@reboot /home/agente/.payload/run.sh\n\n[OK] Persistencia establecida — el payload se ejecutará en cada reinicio.',
        description: 'edita los trabajos programados del usuario (cron jobs) — sobreviven a reinicios',
        objectiveId: 'establecer-persistencia',
      },
    },
  },
};

export class CommandEngine {
  public process(command: string, poiId: string): CommandResult {
    const poiConfig = POI_COMMANDS[poiId];

    if (poiConfig === undefined) {
      return { success: false, feedback: `Terminal '${poiId}' no reconocida.` };
    }

    const entry = poiConfig.commands[command];

    if (entry !== undefined) {
      return { success: true, feedback: entry.output, objectiveId: entry.objectiveId };
    }

    // Educational feedback: identify Windows-to-Unix mix-ups, then list what's available.
    const cmdBase = command.split(' ')[0] ?? command;
    const windowsHint = WRONG_COMMAND_HINTS[cmdBase];

    const availableList = Object.entries(poiConfig.commands)
      .map(([cmd, def]) => `  ${cmd.padEnd(16)} — ${def?.description ?? ''}`)
      .join('\n');

    const prefix = windowsHint !== undefined ? `${windowsHint}\n\n` : '';

    return {
      success: false,
      feedback: `${prefix}Comandos disponibles en ${poiConfig.label}:\n${availableList}`,
    };
  }
}
