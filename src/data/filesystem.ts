import type { VFSNode } from '../types/game';

export const FILESYSTEM: VFSNode = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        jperez: {
          type: 'dir',
          children: {
            Desktop: {
              type: 'dir',
              children: {
                'terminal_red.sh': {
                  type: 'file',
                  content:
                    '#!/bin/bash\n' +
                    '# Script de monitoreo de conexiones — jperez\n' +
                    'netstat -an',
                },
                Documents: {
                  type: 'dir',
                  children: {
                    'notas_reunion.txt': {
                      type: 'file',
                      content:
                        'Notas reunion IT — 2026-04-18\n' +
                        'Asistentes: equipo ops, red interna\n\n' +
                        'Puntos clave:\n' +
                        '  - Ampliacion segmento ops: 10.10.2.0/24\n' +
                        '  - Gateway de acceso interno: 10.10.0.20\n' +
                        '  - Credenciales VPN: ver credenciales_vpn.txt\n' +
                        '  - Prox. mantenimiento: 01/05/2026\n\n' +
                        'RELEVANTE: gateway interno identificado → 10.10.0.20',
                    },
                    'credenciales_vpn.txt': {
                      type: 'file',
                      content:
                        'usuario:      netops\n' +
                        'contrasena:   n3t0ps_2026\n' +
                        'acceso:       SSH → 10.10.0.20\n' +
                        'ultimo_login: 2026-04-24\n' +
                        'nota:         cuenta de servicio, no modificar',
                    },
                    'procedimientos.md': {
                      type: 'file',
                      content:
                        '# Manual IT Interno v3.2\n\n' +
                        '1. Tickets: jira.corp.internal\n' +
                        '2. Escalado: Tier1 → Tier2 → Tier3\n' +
                        '3. Ventana mant.: domingos 02:00-06:00 UTC\n' +
                        '4. Guardia: soporte@empresa.local ext.208',
                    },
                    'inventario_hosts.csv': {
                      type: 'file',
                      content:
                        'hostname,ip,os\n' +
                        'ws-martha,192.168.1.45,Win10\n' +
                        'ws-carlos,192.168.1.67,Win10\n' +
                        'srv-file01,192.168.1.100,Win2019\n' +
                        'srv-db01,192.168.1.110,Ubuntu22',
                    },
                  },
                },
              },
            },
            '.bash_history': {
              type: 'file',
              hidden: true,
              content:
                'ls\n' +
                'cd Desktop\n' +
                'ls\n' +
                'cd Documents\n' +
                'cat credenciales_vpn.txt\n' +
                'ssh netops@10.10.0.20\n' +
                'exit\n' +
                'ping 10.10.0.20\n' +
                'ls -la',
            },
            '.bashrc': {
              type: 'file',
              hidden: true,
              content:
                '# .bashrc\nexport PATH=$PATH:/usr/local/bin\nexport HISTSIZE=1000\nalias ll="ls -la"\nalias cls="clear"',
            },
          },
        },
      },
    },
    etc: {
      type: 'dir',
      children: {
        passwd: {
          type: 'file',
          content:
            'root:x:0:0:root:/root:/bin/bash\n' +
            'jperez:x:1001:1001:Juan Perez:/home/jperez:/bin/bash\n' +
            'netops:x:1042:1042:Network Ops:/home/netops:/bin/bash\n' +
            'av_service:x:999:999:Antivirus Service:/var/av:/bin/false',
        },
        hostname: {
          type: 'file',
          content: 'corp-ws-67\n',
        },
        hosts: {
          type: 'file',
          content:
            '127.0.0.1       localhost\n' +
            '192.168.1.67    corp-ws-67\n' +
            '10.10.0.20      gw-ops.corp.internal\n' +
            '10.10.0.1       router-core.corp.internal',
        },
        shadow: {
          type: 'file',
          content: 'Permission denied.',
        },
      },
    },
    var: {
      type: 'dir',
      children: {
        log: {
          type: 'dir',
          children: {
            syslog: {
              type: 'file',
              content:
                'Apr 24 08:12:01 corp-ws-67 kernel: eth0: link up 1000Mbps\n' +
                'Apr 24 08:14:22 corp-ws-67 sshd[890]: Accepted publickey for jperez\n' +
                'Apr 24 09:01:55 corp-ws-67 av_scanner[412]: scan started — 14203 files\n' +
                'Apr 24 09:02:11 corp-ws-67 av_scanner[412]: WARNING: unusual outbound traffic on eth0\n' +
                'Apr 24 09:02:14 corp-ws-67 av_scanner[412]: source 192.168.1.67 → 10.10.0.20:22\n' +
                'Apr 24 09:02:14 corp-ws-67 av_scanner[412]: alert level: LOW — monitoring\n' +
                'Apr 24 09:15:00 corp-ws-67 cron[1100]: running backup script\n',
            },
            'auth.log': {
              type: 'file',
              content:
                'Apr 24 08:14:22 corp-ws-67 sshd[890]: Accepted publickey for jperez from 192.168.1.67\n' +
                'Apr 24 08:59:03 corp-ws-67 sudo[1042]: jperez NOT in sudoers file. Incident reported.\n' +
                'Apr 24 09:00:18 corp-ws-67 login[1055]: FAILED LOGIN for root from tty1',
            },
          },
        },
        run: {
          type: 'dir',
          children: {
            'av.pid': {
              type: 'file',
              content: '412\n',
            },
          },
        },
      },
    },
    tmp: {
      type: 'dir',
      children: {},
    },
    bin: {
      type: 'dir',
      children: {
        bash: { type: 'file', content: 'ELF binary' },
        ls: { type: 'file', content: 'ELF binary' },
        cat: { type: 'file', content: 'ELF binary' },
      },
    },
    usr: {
      type: 'dir',
      children: {
        bin: {
          type: 'dir',
          children: {
            ssh: { type: 'file', content: 'ELF binary' },
            ping: { type: 'file', content: 'ELF binary' },
            grep: { type: 'file', content: 'ELF binary' },
            find: { type: 'file', content: 'ELF binary' },
          },
        },
        local: {
          type: 'dir',
          children: {
            bin: { type: 'dir', children: {} },
          },
        },
      },
    },
    proc: {
      type: 'dir',
      children: {
        '1': { type: 'dir', children: { cmdline: { type: 'file', content: '/sbin/init' } } },
        '412': { type: 'dir', children: { cmdline: { type: 'file', content: 'av_scanner --daemon --pid=/var/run/av.pid' } } },
        '413': { type: 'dir', children: { cmdline: { type: 'file', content: 'av_watchdog --monitor 412' } } },
      },
    },
    root: {
      type: 'dir',
      children: {
        '.bashrc': {
          type: 'file',
          hidden: true,
          content: '# root bashrc — acceso no autorizado',
        },
      },
    },
  },
};
