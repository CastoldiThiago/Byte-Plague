import { FILESYSTEM } from '../data/filesystem';
import type { CommandResult, VFSNode } from '../types/game';

type DirNode = Extract<VFSNode, { type: 'dir' }>;
type FileNode = Extract<VFSNode, { type: 'file' }>;

const HOSTNAME = 'corp-ws-67';

export class VirtualFS {
  private static instance: VirtualFS | null = null;

  private cwd = '/home/jperez';
  private user = 'jperez';
  /** Whether cd is allowed in the current terminal context (only door terminals) */
  private cdAllowed = false;
  /** When set, cat is restricted to this filename only (file POI terminals) */
  private restrictedFile: string | null = null;

  public static getInstance(): VirtualFS {
    VirtualFS.instance ??= new VirtualFS();
    return VirtualFS.instance;
  }

  public getPromptLabel(): string {
    const display = this.cwd.startsWith(`/home/${this.user}`)
      ? '~' + this.cwd.slice(`/home/${this.user}`.length)
      : this.cwd;
    return `${this.user}@${HOSTNAME}:${display || '/'}`;
  }

  /** Called when a terminal POI opens. Sets cwd to the room's directory. */
  public setContext(basePath: string, allowCd: boolean, restrictedFile?: string): void {
    this.cwd = basePath;
    this.cdAllowed = allowCd;
    this.restrictedFile = restrictedFile ?? null;
  }

  /** Called after a narrative door unlock to advance cwd to the new room. */
  public setCwd(path: string): void {
    this.cwd = path;
  }

  public setUser(user: string, newCwd?: string): void {
    this.user = user;
    if (newCwd !== undefined) this.cwd = newCwd;
  }

  // ── Public command entry point ──────────────────────────────────────

  /** Returns null if the command is not a generic VFS command (let caller handle it). */
  public tryExecute(raw: string): CommandResult | null {
    const [cmd, ...args] = this.tokenize(raw);
    if (cmd === undefined) return null;

    switch (cmd) {
      case 'ls':    return this.cmdLs(args);
      case 'cd':    return this.cmdCd(args);
      case 'pwd':   return this.cmdPwd();
      case 'cat':   return this.cmdCat(args);
      case 'echo':  return this.cmdEcho(args);
      case 'clear': return { success: true, feedback: '', clear: true };
      case 'whoami': return { success: true, feedback: this.user };
      case 'id':    return this.cmdId();
      case 'hostname': return { success: true, feedback: HOSTNAME };
      case 'uname': return this.cmdUname(args);
      case 'env':   return this.cmdEnv();
      case 'which': return this.cmdWhich(args);
      case 'grep':  return this.cmdGrep(args);
      case 'find':  return this.cmdFind(args);
      case 'ps':    return this.cmdPs(args);
      case 'top':   return this.cmdTop();
      case 'netstat': return this.cmdNetstat(args);
      case 'ping':  return this.cmdPing(args);
      case 'history': return { success: true, feedback: 'El historial de sesion esta en la terminal.' };
      case 'man':   return this.cmdMan(args);
      case 'help':  return this.cmdHelp();
      case 'su':    return { success: false, feedback: `su: Authentication failure` };
      case 'sudo':  return { success: false, feedback: `${this.user} is not in the sudoers file. This incident will be reported.` };
      case 'ssh':   return null; // narrative — let CommandEngine handle
      case 'chmod': return { success: false, feedback: `chmod: cannot change permissions: Operation not permitted` };
      case 'rm':    return { success: false, feedback: `rm: cannot remove: Permission denied` };
      case 'mkdir': return { success: false, feedback: `mkdir: cannot create directory: Permission denied` };
      case 'exit':  return { success: true, feedback: 'logout' };
      case 'date':  return { success: true, feedback: new Date().toUTCString() };
      case 'uptime': return { success: true, feedback: ' 14 days, 03:22:41,  1 user,  load average: 0.18, 0.22, 0.19' };
      default:      return null; // unknown — let caller emit "command not found"
    }
  }

  public getCompletions(partial: string): string[] {
    const tokens = this.tokenize(partial);

    if (tokens.length === 0 || (tokens.length === 1 && !partial.endsWith(' '))) {
      // Complete command name
      const prefix = tokens[0] ?? '';
      return KNOWN_COMMANDS.filter(c => c.startsWith(prefix));
    }

    // Complete path argument
    const lastToken = partial.endsWith(' ') ? '' : (tokens[tokens.length - 1] ?? '');
    return this.completePath(lastToken);
  }

  // ── Navigation ──────────────────────────────────────────────────────

  private cmdCd(args: string[]): CommandResult {
    if (!this.cdAllowed) {
      return err('bash: cd: Navigation disabled from this workstation.');
    }
    // At door terminals the narrative command handles the correct path;
    // anything that reaches here is a wrong path.
    const target = args[0] ?? '/';
    const resolved = this.resolvePath(target);
    const node = this.getNode(resolved);
    if (node === null) return err(`bash: cd: ${target}: No such file or directory`);
    if (node.type !== 'dir') return err(`bash: cd: ${target}: Not a directory`);
    return err(`bash: cd: ${target}: Permission denied`);
  }

  private cmdPwd(): CommandResult {
    return { success: true, feedback: this.cwd };
  }

  // ── Listing ─────────────────────────────────────────────────────────

  private cmdLs(args: string[]): CommandResult {
    const flags = args.filter(a => a.startsWith('-'));
    const paths = args.filter(a => !a.startsWith('-'));
    const showHidden = flags.some(f => f.includes('a'));
    const longFmt = flags.some(f => f.includes('l'));

    const targetPath = paths[0] !== undefined ? this.resolvePath(paths[0]) : this.cwd;
    const node = this.getNode(targetPath);

    if (node === null) return err(`ls: cannot access '${paths[0]}': No such file or directory`);

    if (node.type === 'file') {
      return { success: true, feedback: paths[0] ?? targetPath };
    }

    const entries = Object.entries(node.children).filter(
      ([, child]) => showHidden || !child.hidden,
    );

    if (entries.length === 0) return { success: true, feedback: '' };

    if (longFmt) {
      const lines = ['total ' + entries.length * 4];
      if (showHidden) {
        lines.push('drwxr-xr-x  2 ' + this.user + ' ' + this.user + '   64 Apr 24 09:00 .');
        lines.push('drwxr-xr-x  3 ' + this.user + ' ' + this.user + '   96 Apr 24 08:00 ..');
      }
      for (const [name, child] of entries) {
        const perms = child.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
        const owner = child.hidden ? this.user : this.user;
        lines.push(`${perms}  1 ${owner} ${owner}  ${String(child.type === 'file' ? (child as FileNode).content.length : 4096).padStart(6)} Apr 24 09:00 ${name}`);
      }
      return { success: true, feedback: lines.join('\n') };
    }

    // Short format — group dirs first
    const dirs = entries.filter(([, c]) => c.type === 'dir').map(([n]) => n + '/');
    const files = entries.filter(([, c]) => c.type === 'file').map(([n]) => n);
    return { success: true, feedback: [...dirs, ...files].join('  ') };
  }

  // ── File reading ────────────────────────────────────────────────────

  private cmdCat(args: string[]): CommandResult {
    if (args.length === 0) return err('cat: missing file operand');

    const results: string[] = [];
    for (const arg of args) {
      if (this.restrictedFile !== null) {
        const basename = arg.split('/').pop() ?? arg;
        if (basename !== this.restrictedFile && arg !== this.restrictedFile) {
          results.push(`cat: ${arg}: Permission denied`);
          continue;
        }
      }
      const resolved = this.resolvePath(arg);
      const node = this.getNode(resolved);
      if (node === null) {
        results.push(`cat: ${arg}: No such file or directory`);
      } else if (node.type === 'dir') {
        results.push(`cat: ${arg}: Is a directory`);
      } else {
        results.push((node as FileNode).content);
      }
    }
    return { success: true, feedback: results.join('\n') };
  }

  // ── Search ──────────────────────────────────────────────────────────

  private cmdGrep(args: string[]): CommandResult {
    const flags = args.filter(a => a.startsWith('-'));
    const rest = args.filter(a => !a.startsWith('-'));
    if (rest.length < 2) return err('grep: usage: grep [OPTION] PATTERN FILE');

    const pattern = rest[0]!;
    const filePath = rest[1]!;
    const resolved = this.resolvePath(filePath);
    const node = this.getNode(resolved);

    if (node === null) return err(`grep: ${filePath}: No such file or directory`);
    if (node.type === 'dir') return err(`grep: ${filePath}: Is a directory`);

    const caseInsensitive = flags.some(f => f.includes('i'));
    const lines = (node as FileNode).content.split('\n');
    const re = new RegExp(pattern, caseInsensitive ? 'i' : '');
    const matches = lines.filter(l => re.test(l));

    if (matches.length === 0) return { success: false, feedback: '' };
    return { success: true, feedback: matches.join('\n') };
  }

  private cmdFind(args: string[]): CommandResult {
    const pathArg = args[0] ?? '.';
    const nameIdx = args.indexOf('-name');
    const namePattern = nameIdx >= 0 ? args[nameIdx + 1] : undefined;

    const startPath = this.resolvePath(pathArg);
    const results: string[] = [];
    this.walkFind(startPath, namePattern, results);

    if (results.length === 0) return { success: true, feedback: '' };
    return { success: true, feedback: results.join('\n') };
  }

  private walkFind(path: string, pattern: string | undefined, out: string[]): void {
    const node = this.getNode(path);
    if (node === null) return;

    const name = path.split('/').pop() ?? '';
    const matches =
      pattern === undefined ||
      new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(name);

    if (matches) out.push(path);

    if (node.type === 'dir') {
      for (const child of Object.keys(node.children)) {
        this.walkFind(path === '/' ? '/' + child : path + '/' + child, pattern, out);
      }
    }
  }

  // ── Process / network ───────────────────────────────────────────────

  private cmdPs(args: string[]): CommandResult {
    const full = args.some(a => a.includes('a') || a.includes('u') || a.includes('x'));
    if (full) {
      return {
        success: true,
        feedback:
          'USER       PID  %CPU  %MEM  COMMAND\n' +
          'root         1   0.0   0.1  /sbin/init\n' +
          'system     412   0.2   1.4  av_scanner --daemon --pid=/var/run/av.pid\n' +
          'system     413   0.1   0.8  av_watchdog --monitor 412\n' +
          'root       890   0.0   0.1  /usr/sbin/sshd\n' +
          'jperez    1042   0.0   0.3  bash\n' +
          'jperez    1891   2.1   0.5  chrome',
      };
    }
    return {
      success: true,
      feedback:
        '  PID TTY          TIME CMD\n' +
        ' 1042 pts/0    00:00:00 bash\n' +
        ' 2001 pts/0    00:00:00 ps',
    };
  }

  private cmdTop(): CommandResult {
    return {
      success: true,
      feedback:
        'top - ' + new Date().toTimeString().slice(0, 8) + '  up 14 days,  1 user\n' +
        'Tasks:  87 total,   1 running,  86 sleeping\n' +
        '%Cpu(s): 18.4 us,  2.1 sy,  0.0 ni, 79.3 id\n' +
        'MiB Mem:   8192.0 total,   4981.2 free,   3072.1 used\n\n' +
        '  PID USER      %CPU  %MEM  COMMAND\n' +
        '  412 system    12.3   1.4  av_scanner\n' +
        '  413 system     0.1   0.8  av_watchdog\n' +
        '  890 root       3.7   0.2  sshd\n' +
        ' 1042 jperez     0.0   0.3  bash',
    };
  }

  private cmdNetstat(args: string[]): CommandResult {
    const numeric = args.some(a => a.includes('n'));
    const dest1 = numeric ? '10.10.0.20:22' : 'gw-ops.corp.internal:ssh';
    return {
      success: true,
      feedback:
        'Active Internet connections\n' +
        'Proto  Local Address          Foreign Address        State\n' +
        `tcp    192.168.1.67:49201     ${dest1}     ESTABLISHED\n` +
        'tcp    192.168.1.67:49350     172.16.5.11:443        TIME_WAIT\n' +
        'tcp    127.0.0.1:8080         0.0.0.0:*              LISTEN',
    };
  }

  private cmdPing(args: string[]): CommandResult {
    const host = args.filter(a => !a.startsWith('-'))[0];
    if (host === undefined) return err('ping: usage error: Destination address required');

    const hostMap: Record<string, string> = {
      '10.10.0.20': '10.10.0.20',
      'gw-ops.corp.internal': '10.10.0.20',
      'localhost': '127.0.0.1',
      '127.0.0.1': '127.0.0.1',
    };
    const resolved = hostMap[host];
    if (resolved === undefined) {
      return { success: false, feedback: `ping: ${host}: Name or service not known` };
    }

    return {
      success: true,
      feedback:
        `PING ${host} (${resolved}): 56 data bytes\n` +
        `64 bytes from ${resolved}: icmp_seq=0 ttl=64 time=0.82 ms\n` +
        `64 bytes from ${resolved}: icmp_seq=1 ttl=64 time=0.79 ms\n` +
        `64 bytes from ${resolved}: icmp_seq=2 ttl=64 time=0.81 ms\n` +
        `\n--- ${host} ping statistics ---\n` +
        `3 packets transmitted, 3 received, 0% packet loss`,
    };
  }

  // ── Misc ────────────────────────────────────────────────────────────

  private cmdEcho(args: string[]): CommandResult {
    return { success: true, feedback: args.join(' ') };
  }

  private cmdId(): CommandResult {
    return { success: true, feedback: `uid=1001(${this.user}) gid=1001(${this.user}) groups=1001(${this.user}),4(adm)` };
  }

  private cmdUname(args: string[]): CommandResult {
    if (args.includes('-a') || args.includes('--all')) {
      return { success: true, feedback: 'Linux corp-ws-67 5.15.0-105-generic #115-Ubuntu SMP x86_64 GNU/Linux' };
    }
    return { success: true, feedback: 'Linux' };
  }

  private cmdEnv(): CommandResult {
    return {
      success: true,
      feedback:
        `HOME=/home/${this.user}\n` +
        `USER=${this.user}\n` +
        `SHELL=/bin/bash\n` +
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n' +
        'TERM=xterm-256color\n' +
        'LANG=en_US.UTF-8',
    };
  }

  private cmdWhich(args: string[]): CommandResult {
    const cmd = args[0];
    if (cmd === undefined) return err('which: missing argument');
    if (KNOWN_COMMANDS.includes(cmd)) return { success: true, feedback: `/usr/bin/${cmd}` };
    return { success: false, feedback: `which: no ${cmd} in (/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin)` };
  }

  private cmdMan(args: string[]): CommandResult {
    const subject = args[0];
    if (subject === undefined) return err('What manual page do you want?');
    const pages: Record<string, string> = {
      ls:   'ls — list directory contents\nUsage: ls [-la] [path]',
      cat:  'cat — concatenate and print files\nUsage: cat FILE...',
      cd:   'cd — change working directory\nUsage: cd [dir]',
      grep: 'grep — search text using patterns\nUsage: grep [-i] PATTERN FILE',
      find: 'find — search for files\nUsage: find [path] [-name PATTERN]',
      ssh:  'ssh — OpenSSH remote login client\nUsage: ssh user@host',
      ps:   'ps — report process status\nUsage: ps [aux]',
      ping: 'ping — send ICMP ECHO_REQUEST\nUsage: ping HOST',
    };
    const page = pages[subject];
    if (page === undefined) return err(`No manual entry for ${subject}`);
    return { success: true, feedback: page };
  }

  private cmdHelp(): CommandResult {
    return {
      success: true,
      feedback:
        'Comandos disponibles:\n' +
        '  Navegacion:  ls, cd, pwd\n' +
        '  Archivos:    cat, grep, find\n' +
        '  Sistema:     whoami, id, hostname, uname, env, which, ps, top\n' +
        '  Red:         ping, netstat, ssh\n' +
        '  Shell:       echo, clear, date, uptime, history, man, help',
    };
  }

  // ── Path resolution ─────────────────────────────────────────────────

  public resolvePath(input: string): string {
    const relative = input.startsWith('/') ? input : input.startsWith('~')
      ? input.replace(/^~/, '/home/' + this.user)
      : (this.cwd === '/' ? '/' : this.cwd) + '/' + input;

    const parts = relative.split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') { resolved.pop(); continue; }
      resolved.push(p);
    }
    return '/' + resolved.join('/');
  }

  public getNode(path: string): VFSNode | null {
    if (path === '/') return FILESYSTEM;
    const parts = path.split('/').filter(Boolean);
    let node: VFSNode = FILESYSTEM;
    for (const part of parts) {
      if (node.type !== 'dir') return null;
      const child = (node as DirNode).children[part];
      if (child === undefined) return null;
      node = child;
    }
    return node;
  }

  private completePath(partial: string): string[] {
    const lastSlash = partial.lastIndexOf('/');
    const dirPart = lastSlash >= 0 ? partial.slice(0, lastSlash + 1) : '';
    const namePart = lastSlash >= 0 ? partial.slice(lastSlash + 1) : partial;

    const dirPath = dirPart === '' ? this.cwd : this.resolvePath(dirPart);
    const node = this.getNode(dirPath);
    if (node === null || node.type !== 'dir') return [];

    return Object.keys((node as DirNode).children)
      .filter(name => name.startsWith(namePart))
      .map(name => dirPart + name);
  }

  // ── Tokenizer ───────────────────────────────────────────────────────

  private tokenize(raw: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote: '"' | "'" | null = null;

    for (const ch of raw) {
      if (inQuote !== null) {
        if (ch === inQuote) { inQuote = null; }
        else { current += ch; }
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === ' ') {
        if (current !== '') { tokens.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current !== '') tokens.push(current);
    return tokens;
  }
}

function err(msg: string): CommandResult {
  return { success: false, feedback: msg };
}

const KNOWN_COMMANDS = [
  'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'echo', 'clear', 'whoami', 'id',
  'hostname', 'uname', 'env', 'which', 'ps', 'netstat', 'ping', 'man', 'help',
  'history', 'date', 'uptime', 'ssh', 'su', 'sudo', 'chmod', 'rm', 'mkdir', 'exit',
];
