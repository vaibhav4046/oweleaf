// Farthing tool layer: a small registry the agent loop calls through.
// Built-in tools wrap the direct PayPal client; an MCP client (when configured)
// exposes PayPal Agent Toolkit tools under the mcp: prefix. This is the
// extension point: register(name, {description, handler}) and the agent can use it.
//
// Honest scope: Farthing uses MCP for PayPal invoice operations. It is not a
// general do-anything agent and does not claim to be.

export class ToolRegistry {
  constructor() { this.tools = new Map(); }
  register(name, tool) {
    if (!tool || typeof tool.handler !== 'function') throw new Error(`tool ${name} needs a handler`);
    this.tools.set(name, tool);
  }
  list() {
    return [...this.tools.entries()].map(([name, t]) => ({ name, description: t.description || '' }));
  }
  async call(name, args) {
    const t = this.tools.get(name);
    if (!t) throw new Error(`unknown tool: ${name}`);
    return t.handler(args);
  }
}

export function buildRegistry({ paypal, mcp = null }) {
  const reg = new ToolRegistry();

  reg.register('paypal.listInvoices', {
    description: 'List PayPal invoices (direct Invoicing API v2)',
    handler: (args) => paypal.listInvoices(args),
  });
  reg.register('paypal.remind', {
    description: "Trigger PayPal's standard invoice reminder (PayPal ignores custom subject/note)",
    handler: (args) => paypal.remind(args.id, args),
  });
  reg.register('paypal.recordPayment', {
    description: 'Record an offline payment against a PayPal invoice',
    handler: (args) => paypal.recordPayment(args.id, args),
  });

  if (mcp) {
    reg.register('mcp.listTools', {
      description: 'List tools exposed by the connected MCP server (PayPal Agent Toolkit)',
      handler: () => mcp.listTools(),
    });
    reg.register('mcp.call', {
      description: 'Call a PayPal Agent Toolkit MCP tool by name',
      handler: (args) => mcp.callTool(args.name, args.arguments || {}),
    });
  }
  return reg;
}

// Load MCP client from env. MCP_TRANSPORT=stdio runs `npx @paypal/agent-toolkit`
// locally with PAYPAL credentials; MCP_TRANSPORT=http posts to MCP_URL (e.g. a
// remote PayPal MCP endpoint) with MCP_HEADERS='{"Authorization":"Bearer ..."}'.
export async function loadMcp(env = process.env) {
  const transport = env.MCP_TRANSPORT || '';
  if (!transport) return null;
  if (transport === 'stdio') {
    const { McpStdioClient } = await import('./mcp.js');
    const client = new McpStdioClient({
      command: env.MCP_COMMAND || 'npx',
      args: (env.MCP_ARGS || '-y @paypal/agent-toolkit').split(' '),
      env: { PAYPAL_CLIENT_ID: env.PAYPAL_CLIENT_ID || '', PAYPAL_CLIENT_SECRET: env.PAYPAL_CLIENT_SECRET || '', PAYPAL_ENVIRONMENT: env.PAYPAL_ENV || 'sandbox' },
    });
    return client;
  }
  if (transport === 'http') {
    const { McpHttpClient } = await import('./mcp.js');
    let headers = {};
    try { headers = JSON.parse(env.MCP_HEADERS || '{}'); } catch { headers = {}; }
    return new McpHttpClient({ url: env.MCP_URL, headers });
  }
  throw new Error(`unknown MCP_TRANSPORT: ${transport}`);
}
