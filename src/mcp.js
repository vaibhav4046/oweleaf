// Minimal MCP (Model Context Protocol) client: JSON-RPC 2.0 over a single
// HTTP POST endpoint (streamable-http style) or stdio child process.
// Enough for PayPal's Agent Toolkit MCP server: initialize, tools/list, tools/call.
// Spec: https://modelcontextprotocol.io - PayPal: https://developer.paypal.com/ai-tools/mcp-server

import { spawn } from 'node:child_process';

export class McpError extends Error {}

let nextId = 1;

export class McpHttpClient {
  constructor({ url, headers = {}, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
    if (!url) throw new Error('MCP url required');
    this.url = url;
    this.headers = headers;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.sessionId = null;
    this.initialized = false;
  }

  async rpc(method, params = {}) {
    const controller=new AbortController();let timer;
    const task=(async()=>{const res = await this.fetch(this.url, {
      signal:controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
        ...this.headers,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    });
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;
    const text = await res.text();
    // streamable-http may answer SSE: take the last data: line
    let payload = text;
    if (text.startsWith('event:') || text.includes('\ndata:')) {
      const dataLines = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
      payload = dataLines[dataLines.length - 1] || '{}';
    }
    let body;
    try { body = JSON.parse(payload); } catch { throw new McpError(`mcp ${method}: non-JSON response (${res.status})`); }
    if (body.error) throw new McpError(`mcp ${method}: ${body.error.code} ${body.error.message}`);
    if (!res.ok) throw new McpError(`mcp ${method}: http ${res.status}`);
    return body.result;})();
    try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new McpError('MCP dependency timeout'));},this.timeoutMs)})])}finally{clearTimeout(timer)}
  }

  async initialize() {
    const r = await this.rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'farthing', version: '0.1.0' },
    });
    this.initialized = true;
    // notifications/initialized is required by the spec
    try { await this.rpc('notifications/initialized'); } catch { /* tolerated */ }
    return r;
  }

  async listTools() {
    if (!this.initialized) await this.initialize();
    const r = await this.rpc('tools/list');
    return r.tools || [];
  }

  async callTool(name, args = {}) {
    if (!this.initialized) await this.initialize();
    const r = await this.rpc('tools/call', { name, arguments: args });
    return r;
  }
}

// Stdio transport: run a local MCP server process (e.g. npx @paypal/agent-toolkit).
export class McpStdioClient {
  constructor({ command, args = [], env = {} }) {
    this.command = command;
    this.args = args;
    this.env = env;
    this.proc = null;
    this.buffer = '';
    this.pending = new Map();
    this.initialized = false;
  }

  async start() {
    this.proc = spawn(this.command, this.args, { env: { ...process.env, ...this.env }, stdio: ['pipe', 'pipe', 'inherit'] });
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      let idx;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const { resolve: res, reject: rej } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            msg.error ? rej(new McpError(`${msg.error.code} ${msg.error.message}`)) : res(msg.result);
          }
        } catch { /* partial/garbage line */ }
      }
    });
  }

  async rpc(method, params = {}) {
    if (!this.proc) await this.start();
    const id = nextId++;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new McpError(`mcp ${method}: timeout`)); } }, 30_000);
    });
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return p;
  }

  async initialize() {
    const r = await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'farthing', version: '0.1.0' } });
    this.initialized = true;
    try { await this.rpc('notifications/initialized'); } catch { /* tolerated */ }
    return r;
  }
  async listTools() { if (!this.initialized) await this.initialize(); return (await this.rpc('tools/list')).tools || []; }
  async callTool(name, args = {}) { if (!this.initialized) await this.initialize(); return this.rpc('tools/call', { name, arguments: args }); }
}
