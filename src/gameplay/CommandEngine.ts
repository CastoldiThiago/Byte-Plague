export interface CommandResult {
  success: boolean;
  feedback: string;
  conclusion?: string;
  objectiveId?: string;
}

export interface CommandChoice {
  command: string;
  description: string;
}

interface DoorScenario {
  label: string;
  prompt: string;
  choices: readonly CommandChoice[];
  correctCommand: string;
  successOutput: string;
  conclusion: string;
  failOutput: string;
  objectiveId?: string;
  requiredObjectives?: readonly string[];
}

const DOOR_SCENARIOS: Readonly<Record<string, DoorScenario | undefined>> = {
  'puerta-clientes': {
    label: 'Puerta: carpeta clientes',
    prompt: 'Elegi el comando correcto para entrar al directorio de clientes.',
    choices: [
      { command: 'cd clientes', description: 'entra al directorio de clientes' },
      { command: 'rm -rf clientes', description: 'borra todo el directorio (ruidoso y peligroso)' },
      { command: 'ping clientes', description: 'solo prueba conectividad de red' },
    ],
    correctCommand: 'cd clientes',
    successOutput:
      '[OK] Puerta abierta.\n\nDentro ves tres pistas:\n- clientes.db\n- contratos_2026.pdf\n- vpn-notes.txt\n\nEl archivo importante para seguir es clientes.db.',
    conclusion: 'Esta habitacion te orienta hacia clientes.db, que despues habilita el salto a soporte IT.',
    failOutput: '[ERROR] Comando invalido para abrir esta puerta. El antivirus registra actividad sospechosa.',
  },
  'puerta-soporte': {
    label: 'Puerta: carpeta soporte-it',
    prompt: 'Necesitas entrar al area de soporte IT para buscar credenciales o rutas internas.',
    choices: [
      { command: 'cd soporte-it', description: 'entra al directorio de soporte' },
      { command: 'mkdir soporte-it', description: 'crea carpeta nueva, no entra' },
      { command: 'sudo reboot', description: 'reinicia la maquina y arruina la intrusion' },
    ],
    correctCommand: 'cd soporte-it',
    successOutput:
      '[OK] Acceso concedido a soporte-it.\n\nDentro ves tres pistas:\n- inventario_hosts.csv\n- credenciales_vpn.txt\n- procedimientos.md\n\nEl archivo importante para seguir es credenciales_vpn.txt.',
    conclusion: 'Esta habitacion te entrega credenciales_vpn.txt, necesarias para el acceso final a la red.',
    failOutput: '[ERROR] Intento fallido. El antivirus aumento su nivel de sospecha.',
    requiredObjectives: ['dato-clientes'],
  },
  'puerta-red-interna': {
    label: 'Puerta: salto a red interna',
    prompt: 'Ya tienes pistas. Selecciona el comando para pivotear a la red interna de la empresa.',
    choices: [
      { command: 'ssh netops@10.10.0.20', description: 'salto SSH al gateway interno' },
      { command: 'format c:', description: 'comando destructivo y fuera de objetivo' },
      { command: 'shutdown /s', description: 'apaga el host y activa alertas de SOC' },
    ],
    correctCommand: 'ssh netops@10.10.0.20',
    successOutput:
      '[OK] TUNEL ESTABLECIDO.\nConexion a 10.10.0.20 exitosa.\nHas encontrado la via de entrada a la red interna.',
    conclusion: 'Con este salto confirmas la ruta interna y completas el objetivo del nivel 1.',
    failOutput: '[ERROR] Comando rechazado. El antivirus asocia tu actividad con una intrusion activa.',
    objectiveId: 'acceso-red-interna',
    requiredObjectives: ['dato-clientes', 'dato-soporte'],
  },
  'archivo-clientes': {
    label: 'Archivo: clientes.db',
    prompt: 'Selecciona el comando correcto para inspeccionar el archivo de clientes.',
    choices: [
      { command: 'cat clientes.db', description: 'inspecciona contenido legible del archivo' },
      { command: 'rm clientes.db', description: 'elimina evidencia valiosa' },
      { command: 'shutdown /r', description: 'reinicia sistema y corta la infiltracion' },
    ],
    correctCommand: 'cat clientes.db',
    successOutput:
      '[OK] clientes.db abierto en modo lectura.\n\nEntradas relevantes:\n- employee_id: 302\n- vpn_profile: remote-netops\n- default_gateway_hint: 10.10.0.20\n\nCon esto ya sabes que el siguiente paso esta en soporte IT.',
    conclusion: 'La base de clientes te da la primera pista util para buscar soporte IT.',
    failOutput: '[ERROR] Comando no valido para inspeccionar este archivo.',
    objectiveId: 'dato-clientes',
  },
  'archivo-soporte': {
    label: 'Archivo: credenciales_vpn.txt',
    prompt: 'Necesitas extraer credenciales sin romper el entorno del empleado.',
    choices: [
      { command: 'cat credenciales_vpn.txt', description: 'muestra credenciales en texto plano' },
      { command: 'chmod 777 credenciales_vpn.txt', description: 'altera permisos y deja huella' },
      { command: 'echo hola', description: 'no aporta informacion util' },
    ],
    correctCommand: 'cat credenciales_vpn.txt',
    successOutput:
      '[OK] credenciales_vpn.txt\nuser: netops\nlast_login: 2026-04-24\nnote: acceso preferente por SSH al gateway 10.10.0.20\n\nCon este usuario podes entrar a la habitacion final.',
    conclusion: 'Las credenciales te dejan a un paso de la red interna.',
    failOutput: '[ERROR] Fallo de operacion. La accion no extrae datos utiles.',
    objectiveId: 'dato-soporte',
  },
  'archivo-red': {
    label: 'Archivo: network-map.json',
    prompt: 'Valida la topologia antes de intentar moverte lateralmente.',
    choices: [
      { command: 'cat network-map.json', description: 'lee el mapa de segmentos internos' },
      { command: 'truncate -s 0 network-map.json', description: 'borra el archivo' },
      { command: 'ping 8.8.8.8', description: 'test externo sin valor para la mision' },
    ],
    correctCommand: 'cat network-map.json',
    successOutput:
      '[OK] Segmentos detectados:\n- corp-core: 10.10.0.0/24\n- ops-tools: 10.10.2.0/24\n- backups: 10.10.4.0/24\n\nEl salto a red interna queda confirmado.',
    conclusion: 'El mapa de red sirve para ubicar el objetivo final una vez dentro.',
    failOutput: '[ERROR] Operacion invalida sobre network-map.json.',
    objectiveId: 'dato-red',
  },
};

export class CommandEngine {
  public getScenario(poiId: string): DoorScenario | null {
    return DOOR_SCENARIOS[poiId] ?? null;
  }

  public process(
    command: string,
    poiId: string,
    unlockedObjectives: readonly string[] = [],
  ): CommandResult {
    const scenario = DOOR_SCENARIOS[poiId];

    if (scenario === undefined) {
      return { success: false, feedback: `Puerta '${poiId}' no reconocida.` };
    }

    if (command === scenario.correctCommand) {
      const requirements = scenario.requiredObjectives ?? [];
      const hasAllRequirements = requirements.every(req => unlockedObjectives.includes(req));

      if (!hasAllRequirements) {
        return {
          success: false,
          feedback:
            '[ERROR] Aun no tienes la informacion necesaria para este salto.\n\nExplora primero clientes y soporte-it para obtener ruta y credenciales.',
        };
      }

      return {
        success: true,
        feedback: scenario.successOutput,
        conclusion: scenario.conclusion,
        objectiveId: scenario.objectiveId,
      };
    }

    return {
      success: false,
      feedback: `${scenario.failOutput}\n\n${scenario.prompt}`,
    };
  }
}
