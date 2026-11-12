// Mock PayPal client for demo and tests. Serves a fixture invoice book and
// records mutations in memory so the whole scan -> propose -> approve -> remind
// loop runs with no credentials. The UI labels this mode clearly.

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function fixtureInvoices() {
  return [
    {
      id: 'INV2-MOCK-0001',
      invoicer: { name: { given_name: 'Alex', surname: 'Morgan' } },
      status: 'SENT',
      detail: { invoice_number: 'F-1042', invoice_date: daysAgo(40), currency_code: 'GBP', payment_term: { due_date: daysAgo(3) } },
      due_date: { date: daysAgo(3) },
      amount: { currency_code: 'GBP', value: '450.00' },
      due_amount: { currency_code: 'GBP', value: '450.00' },
      primary_recipients: [{ billing_info: { name: { given_name: 'Amelia', surname: 'Bryant' }, email_address: 'amelia@northwind.example' } }],
    },
    {
      id: 'INV2-MOCK-0002',
      invoicer: { name: { given_name: 'Alex', surname: 'Morgan' } },
      status: 'SENT',
      detail: { invoice_number: 'F-1038', invoice_date: daysAgo(60), currency_code: 'GBP' },
      due_date: { date: daysAgo(12) },
      amount: { currency_code: 'GBP', value: '1280.00' },
      due_amount: { currency_code: 'GBP', value: '1280.00' },
      primary_recipients: [{ billing_info: { name: { given_name: 'Marcus', surname: 'Osei' }, email_address: 'marcus@lumenworks.example' } }],
    },
    {
      id: 'INV2-MOCK-0003',
      invoicer: { name: { given_name: 'Alex', surname: 'Morgan' } },
      status: 'SENT',
      detail: { invoice_number: 'F-1029', invoice_date: daysAgo(80), currency_code: 'GBP' },
      due_date: { date: daysAgo(27) },
      amount: { currency_code: 'GBP', value: '320.00' },
      due_amount: { currency_code: 'GBP', value: '320.00' },
      primary_recipients: [{ billing_info: { name: { given_name: 'Priya', surname: 'Nair' }, email_address: 'priya@kilnbakery.example' } }],
    },
    {
      id: 'INV2-MOCK-0004',
      invoicer: { name: { given_name: 'Alex', surname: 'Morgan' } },
      status: 'PAID',
      detail: { invoice_number: 'F-1045', invoice_date: daysAgo(10), currency_code: 'GBP' },
      due_date: { date: daysAgo(2) },
      amount: { currency_code: 'GBP', value: '600.00' },
      due_amount: { currency_code: 'GBP', value: '0.00' },
      primary_recipients: [{ billing_info: { name: { given_name: 'Amelia', surname: 'Bryant' }, email_address: 'amelia@northwind.example' } }],
    },
    {
      id: 'INV2-MOCK-0005',
      invoicer: { name: { given_name: 'Alex', surname: 'Morgan' } },
      status: 'SENT',
      detail: { invoice_number: 'F-1046', invoice_date: daysAgo(5), currency_code: 'GBP' },
      due_date: { date: daysAgo(-6) }, // not yet due
      amount: { currency_code: 'GBP', value: '890.00' },
      due_amount: { currency_code: 'GBP', value: '890.00' },
      primary_recipients: [{ billing_info: { name: { given_name: 'Tom', surname: 'Herrera' }, email_address: 'tom@forgeandco.example' } }],
    },
  ];
}

export class MockPayPalClient {
  constructor() {
    this.invoices = fixtureInvoices();
    this.calls = []; // audit log of every mutation the agent caused
  }
  async listInvoices() { return this.invoices; }
  async getInvoice(id) { return this.invoices.find((i) => i.id === id) || null; }
  async remind(id, { subject, note } = {}) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error(`mock: no invoice ${id}`);
    this.calls.push({ type: 'remind', id, subject, note, at: new Date().toISOString() });
    return { reminder_id: `REM-${this.calls.length}` };
  }
  async recordPayment(id, payment) {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error(`mock: no invoice ${id}`);
    inv.status = 'PAID';
    inv.due_amount.value = '0.00';
    this.calls.push({ type: 'payment', id, payment, at: new Date().toISOString() });
    return { payment_id: `PAY-${this.calls.length}` };
  }
}
