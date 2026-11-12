// Connect PayPal screen. The secret goes to this app's own server once and is never read back.
const $ = (id) => document.getElementById(id);
const ENV_NAME = { sandbox: 'Sandbox', live: 'Live', fixture: 'Sample data' };

function notice(text) {
  $('notice').textContent = text;
  $('notice').classList.add('show');
  setTimeout(() => $('notice').classList.remove('show'), 4500);
}

async function call(path, body) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const day = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function show(status) {
  const panel = $('statusPanel');
  panel.dataset.state = !status.connected ? 'none' : status.env;
  $('openDesk').hidden = !status.connected;
  $('disconnect').hidden = !(status.canChange && status.source === 'vault');
  $('formPanel').hidden = !status.canChange;
  if (!status.connected) {
    $('statusTitle').textContent = 'Not connected';
    $('statusDetail').textContent = status.canChange ? 'Add your PayPal keys below to load your invoices.' : 'Ask the owner of this workspace to connect PayPal.';
    return;
  }
  $('statusTitle').textContent = status.source === 'fixture' ? 'Sample data' : `Connected to PayPal ${ENV_NAME[status.env] || status.env}`;
  $('statusDetail').textContent = {
    fixture: 'This is the sample with invented invoices. Run the app without sample mode to connect a PayPal account.',
    env: 'Using keys from the server .env file. Connect below to replace them with keys stored encrypted in the app.',
    vault: `Client ID ending ${status.clientIdHint}. Connected ${status.connectedAt ? day(status.connectedAt) : ''}. Keys are stored encrypted on this machine.`,
  }[status.source] || '';
}

async function refresh() {
  try { show(await call('/api/paypal/connection')); } catch (error) { $('statusTitle').textContent = 'Could not check the connection'; $('statusDetail').textContent = error.message; }
}

const chosenEnv = () => document.querySelector('input[name=env]:checked').value;
for (const radio of document.querySelectorAll('input[name=env]')) {
  radio.addEventListener('change', () => { $('liveBox').hidden = chosenEnv() !== 'live'; $('confirmLive').required = chosenEnv() === 'live'; });
}

$('connectForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('connectBtn');
  $('formError').textContent = '';
  button.disabled = true; button.textContent = 'Checking with PayPal...';
  try {
    const result = await call('/api/paypal/connect', { env: chosenEnv(), clientId: $('clientId').value, clientSecret: $('clientSecret').value, confirmLive: $('confirmLive').value.trim() });
    $('connectForm').reset(); $('liveBox').hidden = true;
    notice(`Connected to PayPal ${ENV_NAME[result.env]}.${result.retired ? ` ${result.retired} old draft${result.retired === 1 ? '' : 's'} retired.` : ''}`);
    await refresh();
  } catch (error) {
    $('clientSecret').value = '';
    $('formError').textContent = error.message;
  } finally {
    button.disabled = false; button.textContent = 'Check keys and connect';
  }
});

$('disconnect').addEventListener('click', async () => {
  if (!confirm('Disconnect PayPal? The saved keys are deleted from this machine and pending drafts are retired.')) return;
  try { await call('/api/paypal/disconnect', {}); notice('PayPal disconnected. Saved keys deleted.'); await refresh(); } catch (error) { notice(error.message); }
});

window.farthingSession.then((session) => { $('who').textContent = session.fixtureOpen ? 'Sample mode / not signed in' : `${session.username} / ${session.role}`; });
refresh();
