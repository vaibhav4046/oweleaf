import { requestJson } from './http.js';
// PayPal Invoicing API v2 client. Sandbox or live, credentials via env.
// Docs: https://developer.paypal.com/docs/api/invoicing/v2/

const BASES = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

export class PayPalError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class PayPalClient {
  constructor({ clientId, clientSecret, env = 'sandbox', fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
    if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    if (!Object.hasOwn(BASES,env)) throw Error('PAYPAL_ENV must be sandbox or live');
    this.env = env;
    this.base = BASES[env];
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this._token = null;
    this._tokenExpiry = 0;
  }

  async token() {
    if (this._token && Date.now() < this._tokenExpiry - 30_000) return this._token;
    const res = await requestJson(this.fetch, `${this.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }, this.timeoutMs);
    const body = res.data;
    if (!res.ok) throw new PayPalError(`auth failed: ${res.status}`, res.status, body);
    this._token = body.access_token;
    this._tokenExpiry = Date.now() + (body.expires_in || 300) * 1000;
    return this._token;
  }

  async api(path, { method = 'GET', body } = {}) {
    const token = await this.token();
    const res = await requestJson(this.fetch, `${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    }, this.timeoutMs);
    if (res.status === 204) return null;
    const data = res.data;
    if (!res.ok) throw new PayPalError(`${method} ${path} failed: ${res.status}`, res.status, data);
    return data;
  }

  // Read the complete bounded list. Never silently treat page one as the account.
  async listInvoices({ page = 1, pageSize = 100, maxPages = 50 } = {}) {
    if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>100||!Number.isInteger(maxPages)||maxPages<1||maxPages>50)throw Error('Invalid invoice pagination limits');
    const items=[],seen=new Set();let totalPages;
    for(let n=page;n<page+maxPages;n++){
      const data=await this.api(`/v2/invoicing/invoices?page=${n}&page_size=${pageSize}&total_required=true`);
      if(!data||!Array.isArray(data.items))throw Error('PayPal returned an unreadable invoice list; no partial list accepted');
      if(data.total_pages!==undefined){const pages=Number(data.total_pages);if(!Number.isInteger(pages)||pages<0)throw Error('Invalid PayPal pagination metadata');if(totalPages!==undefined&&totalPages!==pages)throw Error('Invoice pages changed while reading. Check again; no partial list accepted');totalPages=pages;}
      for(const item of data.items){if(!item||typeof item.id!=='string'||seen.has(item.id))throw Error('Invoice pages overlapped or changed. Check again; no partial list accepted');seen.add(item.id);items.push(item);}
      if(totalPages!==undefined&&n>=totalPages)return items;
      if(totalPages===undefined&&data.items.length<pageSize)return items;
      if(!data.items.length)throw Error('Incomplete PayPal pagination; check again');
    }
    throw Error('Invoice list exceeds the local page limit. No partial list accepted; narrow the account before retrying');
  }

  async getInvoice(id) {
    return this.api(`/v2/invoicing/invoices/${id}`);
  }

  // Experimental read-only extensions. Live account permissions vary.
  async getSubscription(id) {
    return this.api(`/v1/billing/subscriptions/${encodeURIComponent(id)}?fields=last_failed_payment`);
  }
  async getPayoutBatch(id) {
    return this.api(`/v1/payments/payouts/${encodeURIComponent(id)}?total_required=true`);
  }
  async getDispute(id) {
    return this.api(`/v1/customer/disputes/${encodeURIComponent(id)}`);
  }

  async createInvoice(draft) {
    return this.api('/v2/invoicing/invoices', { method: 'POST', body: draft });
  }

  async sendInvoice(id) {
    return this.api(`/v2/invoicing/invoices/${id}/send`, { method: 'POST', body: { send_to_invoicer: true } });
  }

  // Reminder carries the agent's drafted subject + note - the chaser goes through PayPal itself.
  async remind(id, { subject, note, ccEmails = [] } = {}) {
    return this.api(`/v2/invoicing/invoices/${id}/remind`, {
      method: 'POST',
      body: {
        subject: subject || 'Payment reminder',
        note: note || '',
        cc_emails: ccEmails,
        send_to_invoicer: true,
      },
    });
  }

  async recordPayment(id, { amount, method = 'OTHER', note } = {}) {
    return this.api(`/v2/invoicing/invoices/${id}/payments`, {
      method: 'POST',
      body: { method, payment_date: new Date().toISOString().slice(0, 10), amount, note },
    });
  }
}

// An invoice is chaseable when it was sent, is unpaid, and its due date has passed.
export function overdueDays(invoice, now = new Date()) {
  const due = invoice?.detail?.payment_term?.due_date || invoice?.due_date?.date || invoice?.detail?.due_date;
  if (!due) return null;
  const dueDate = new Date(due + 'T00:00:00Z');
  if (Number.isNaN(dueDate.getTime())) return null;
  return Math.floor((now - dueDate) / 86_400_000);
}

export function invoiceSummary(inv, now = new Date()) {
  const days = overdueDays(inv, now);
  const amount = inv.due_amount?.value ?? inv.amount?.value ?? null;
  const currency = inv.due_amount?.currency_code ?? inv.amount?.currency_code ?? '';
  const payer = inv.primary_recipients?.[0]?.billing_info;
  return {
    id: inv.id,
    number: inv.detail?.invoice_number || inv.id,
    status: inv.status,
    payerName: payer?.name ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim() : 'unknown payer',
    payerEmail: payer?.email_address || null,
    amount,
    totalAmount: inv.amount?.value ?? amount,
    paidAmount: inv.status === 'PAID' ? (inv.amount?.value ?? null) : null,
    senderName: inv.invoicer?.business_name || [inv.invoicer?.name?.given_name, inv.invoicer?.name?.surname].filter(Boolean).join(' ') || null,
    currency,
    dueDate: inv.detail?.payment_term?.due_date || inv.due_date?.date || inv.detail?.due_date || null,
    daysOverdue: days,
    chaseable: ['SENT','UNPAID','PARTIALLY_PAID'].includes(inv.status) && days !== null && days > 0 && Number(amount) > 0 && !!currency && !!payer?.email_address,
  };
}
