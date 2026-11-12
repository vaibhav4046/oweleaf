// "Ask Oweleaf": a plain-language question box over the invoices on screen.
// Fixed rules from assistant-core.js, not a language model. It can read and explain.
// It cannot send, approve, dismiss or change anything.
import { answer } from './assistant-core.js';

const SUGGESTIONS = ['Who should I chase today?', 'What did clients promise?', 'Why Marcus?', 'Show the draft for Marcus'];

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

async function ask(text) {
  const [desk, state] = await Promise.all([readJson('/api/desk'), readJson('/api/state')]);
  return answer(text, desk.invoices || [], state.proposals || []);
}

function mount() {
  const log = el('div', { class: 'ask-log', 'aria-live': 'polite' });
  const input = el('input', { id: 'askInput', type: 'text', maxlength: '300', autocomplete: 'off', placeholder: 'Ask about your invoices' });
  const chips = el('div', { class: 'ask-chips' });
  const panel = el('section', { class: 'ask-panel', id: 'askPanel', role: 'dialog', 'aria-label': 'Ask Oweleaf', hidden: '' });
  const toggle = el('button', { class: 'ask-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'askPanel' }, 'Ask Oweleaf');

  const say = (who, title, lines) => {
    const bubble = el('div', { class: `ask-msg ${who}` });
    if (title) bubble.append(el('strong', {}, title));
    for (const line of lines) bubble.append(el('p', {}, line));
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
  };

  const run = async (text) => {
    const question = text.trim();
    if (!question) return;
    say('you', '', [question]);
    input.value = '';
    try {
      const reply = await ask(question);
      say('bot', reply.title, reply.lines);
    } catch {
      say('bot', 'Could not read your invoices', ['Press "Check invoices" and try again.']);
    }
  };

  for (const text of SUGGESTIONS) chips.append(el('button', { type: 'button', class: 'ask-chip', onclick: () => run(text) }, text));

  const form = el('form', { class: 'ask-form', onsubmit: (event) => { event.preventDefault(); run(input.value); } },
    input, el('button', { type: 'submit' }, 'Ask'));
  panel.append(
    el('header', {}, el('strong', {}, 'Ask Oweleaf'), el('button', { type: 'button', class: 'ask-close', 'aria-label': 'Close', onclick: () => setOpen(false) }, '×')),
    el('p', { class: 'ask-note' }, 'Answers come from the invoices on this screen, using fixed rules. I cannot send or approve anything.'),
    log, chips, form,
  );

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus(); else toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });

  say('bot', 'Hello', ['Ask me who to chase today, what a client promised, or why an invoice is waiting.']);
  document.body.append(toggle, panel);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
