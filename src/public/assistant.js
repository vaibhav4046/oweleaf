// "Ask Oweleaf": a plain-language question box over the invoices on screen.
// Fixed rules from assistant-core.js, not a language model. It can read and explain.
// It cannot send, approve, dismiss or change anything.
import { answer, findRow } from './assistant-core.js';
import { canonicalQuestion, FALLBACK_TITLE } from './assistant-intent.js';

const PROMPTS = [
  ['Who should I chase today?', 'A short plan from the invoices on screen'],
  ['What did clients promise?', 'Dates your clients gave you'],
  ['Why Marcus?', 'The reason behind one decision'],
  ['Show the draft for Marcus', 'The wording, not sent'],
];
const STREAM_MS = 700;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

// A language model is consulted only for questions the fixed rules did not recognise, and
// only to sort them into one of five intents. Rules write every word of the answer.
async function readIntent(text) {
  try {
    const response = await fetch('/api/assistant/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.intent ? data : null;
  } catch {
    return null;
  }
}

async function ask(text) {
  const [desk, state] = await Promise.all([readJson('/api/desk'), readJson('/api/state')]);
  const rows = desk.invoices || [];
  const proposals = state.proposals || [];
  const reply = answer(text, rows, proposals);
  if (reply.title !== FALLBACK_TITLE) return { reply, count: rows.length, via: null };
  const read = await readIntent(text);
  const question = read ? canonicalQuestion(read.intent, findRow(rows, text)) : null;
  if (!question) return { reply, count: rows.length, via: null };
  return { reply: answer(question, rows, proposals), count: rows.length, via: read };
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Reveal text word by word. Resolves when finished. Instant under reduced motion.
function reveal(node, text, onTick) {
  if (reducedMotion()) { node.textContent = text; return Promise.resolve(); }
  const words = text.split(/(\s+)/);
  const step = Math.max(1, Math.ceil(words.length / (STREAM_MS / 24)));
  return new Promise((resolve) => {
    let shown = 0;
    const timer = setInterval(() => {
      shown = Math.min(words.length, shown + step);
      node.textContent = words.slice(0, shown).join('');
      onTick();
      if (shown >= words.length) { clearInterval(timer); resolve(); }
    }, 24);
  });
}

function mount() {
  let busy = false;
  const log = el('div', { class: 'ask-log', 'aria-live': 'polite' });
  const empty = el('div', { class: 'ask-empty' },
    el('h2', {}, 'What should I look at?'),
    el('p', {}, 'Ask about the invoices on this screen. I read and explain. I never send anything.'));
  const cards = el('div', { class: 'ask-cards' });
  const follow = el('div', { class: 'ask-chips' });
  const input = el('input', { id: 'askInput', type: 'text', maxlength: '300', autocomplete: 'off', placeholder: 'Ask about your invoices' });
  const send = el('button', { type: 'submit', class: 'ask-send', 'aria-label': 'Ask' }, '↑');
  const panel = el('section', { class: 'ask-panel', id: 'askPanel', role: 'dialog', 'aria-label': 'Ask Oweleaf', hidden: '' });
  const toggle = el('button', { class: 'ask-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'askPanel' }, 'Ask Oweleaf');

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const setBusy = (value) => { busy = value; input.disabled = value; send.disabled = value; panel.classList.toggle('busy', value); };

  const userBubble = (text) => {
    log.append(el('div', { class: 'ask-msg you' }, el('p', {}, text)));
    scroll();
  };

  async function botBubble(reply, count, via = null) {
    const bubble = el('div', { class: 'ask-msg bot' });
    const title = el('strong', {});
    bubble.append(title);
    log.append(bubble);
    await reveal(title, reply.title, scroll);
    for (const line of reply.lines) {
      const p = el('p', {});
      bubble.append(p);
      await reveal(p, line, scroll);
    }
    const plain = [reply.title, ...reply.lines].join('\n');
    const copy = el('button', { type: 'button', class: 'ask-copy', onclick: async () => {
      try { await navigator.clipboard.writeText(plain); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copy blocked'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
    } }, 'Copy');
    bubble.append(el('div', { class: 'ask-meta' },
      el('span', {}, via
        ? `Question understood by ${via.provider === 'browser-ai' ? "your browser's on-device AI" : `${via.model} (local)`} · answered by fixed rules · nothing sent`
        : `Fixed rules · ${count} invoice${count === 1 ? '' : 's'} on screen · nothing sent`), copy));
    scroll();
  }

  function setFollowUps(asked) {
    follow.replaceChildren();
    for (const [text] of PROMPTS) {
      if (text.toLowerCase() === asked.toLowerCase()) continue;
      follow.append(el('button', { type: 'button', class: 'ask-chip', onclick: () => run(text) }, text));
    }
  }

  const run = async (text) => {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    empty.hidden = true;
    cards.hidden = true;
    follow.replaceChildren();
    userBubble(question);
    input.value = '';
    try {
      const { reply, count, via } = await ask(question);
      await botBubble(reply, count, via);
    } catch {
      await botBubble({ title: 'Could not read your invoices', lines: ['Press "Check invoices" and try again.'] }, 0);
    }
    setFollowUps(question);
    setBusy(false);
    requestAnimationFrame(scroll);
    if (!panel.hidden) input.focus();
  };

  for (const [text, hint] of PROMPTS) {
    cards.append(el('button', { type: 'button', class: 'ask-card', onclick: () => run(text) }, el('strong', {}, text), el('span', {}, hint)));
  }

  const reset = () => {
    if (busy) return;
    log.querySelectorAll('.ask-msg').forEach((node) => node.remove());
    follow.replaceChildren();
    empty.hidden = false;
    cards.hidden = false;
    input.focus();
  };

  const form = el('form', { class: 'ask-form', onsubmit: (event) => { event.preventDefault(); run(input.value); } }, input, send);
  panel.append(
    el('header', {},
      el('strong', {}, 'Ask Oweleaf'),
      el('span', { class: 'ask-head-actions' },
        el('button', { type: 'button', class: 'ask-new', onclick: reset }, 'New chat'),
        el('button', { type: 'button', class: 'ask-close', 'aria-label': 'Close', onclick: () => setOpen(false) }, '×'))),
    log, follow, form,
    el('p', { class: 'ask-note' }, 'Fixed rules write every answer. If a local language model is available it only helps me understand your wording, and it cannot send or approve anything.'),
  );
  log.append(empty, cards);

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus(); else toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !event.target?.isContentEditable) {
      event.preventDefault();
      setOpen(true);
    }
  });

  document.body.append(toggle, panel);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
