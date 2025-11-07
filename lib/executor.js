// executor.js - Command Pipeline Executor

export class Executor {
  constructor(registry, vfs) {
    this.registry = registry;
    this.vfs = vfs;
  }

  async runLine(line) {
    const commands = this.parsePipeline(line);
    let stdin = '';
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    for (const cmd of commands) {
      const result = await this.runCommand(cmd, stdin);
      stdout = result.stdout;
      stderr += result.stderr;
      exitCode = result.exitCode;
      stdin = stdout; // pipe
    }

    // Handle redirection
    if (commands.length === 1) {
      const cmd = commands[0];
      if (cmd.redirect) {
        if (cmd.redirect.type === '>') {
          await this.vfs.write(cmd.redirect.file, stdout);
          stdout = '';
        } else if (cmd.redirect.type === '>>') {
          const existing = await this.vfs.read(cmd.redirect.file).catch(() => '');
          await this.vfs.write(cmd.redirect.file, existing + stdout);
          stdout = '';
        }
      }
    }

    return { stdout, stderr, exitCode };
  }

  parsePipeline(line) {
    // Simple parsing: split by |, then parse each command
    const pipes = line.split('|').map(s => s.trim());
    return pipes.map(pipe => this.parseCommand(pipe));
  }

  parseCommand(str) {
    // Simple: command args... > file or >> file
    const parts = str.split(/\s+/);
    let redirect = null;
    const redirectIndex = parts.findIndex(p => p === '>' || p === '>>');
    if (redirectIndex !== -1) {
      redirect = { type: parts[redirectIndex], file: parts[redirectIndex + 1] };
      parts.splice(redirectIndex, 2);
    }
    return { name: parts[0], args: parts.slice(1), redirect };
  }

  async runCommand(cmd, stdin) {
    const fn = this.registry.get(cmd.name);
    if (!fn) {
      return { stdout: '', stderr: `Command not found: ${cmd.name}\n`, exitCode: 127 };
    }
    try {
      const result = await fn({ args: cmd.args, stdin, vfs: this.vfs, swat: null, ctx: {}, registry: this.registry });
      return result;
    } catch (e) {
      return { stdout: '', stderr: e.message + '\n', exitCode: 1 };
    }
  }
}