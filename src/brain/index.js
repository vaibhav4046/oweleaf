import {draftIssue} from './draft-guard.js';
import { requestJson } from '../http.js';
// Brain providers. Three interchangeable backends:
//   heuristic - zero-setup deterministic ladder (reference behaviour)
//   ollama    - local SLM (default for real use; qwen3:1.7b or a fine-tuned adapter)
//   openai    - any OpenAI-compatible endpoint (used for the cloud cost baseline)
// The SLM failing closed is a feature: unparseable output falls back to heuristic.

import { decideHeuristic } from './heuristic.js';
import { buildDecisionPrompt, parseDecision } from './prompts.js';

export function createBrain(config = {}) {
  const provider = config.provider || 'heuristic';
  if (provider === 'ollama') return new OllamaBrain(config);
  if (provider === 'openai') return new OpenAIBrain(config);
  return new HeuristicBrain(config);
}

class HeuristicBrain {
  constructor(config) { this.name = 'heuristic'; this.model = 'rules-ladder'; this.config = config; }
  async decide(summary, history = []) {
    const started = performance.now();
    const d = decideHeuristic(summary, this.config);
    return { ...d, provider: this.name, model: this.model, latencyMs: performance.now() - started, tokensIn: 0, tokensOut: 0, fallback: false };
  }
}

class OllamaBrain {
  constructor(config) {
    this.name = 'ollama';
    this.host = (config.ollamaHost || 'http://127.0.0.1:11434').replace(/\/$/, '');
    this.model = config.ollamaModel || 'qwen3:1.7b';
    this.config = config;
    this.fetch = config.fetchImpl || globalThis.fetch;
  }
  async decide(summary, history = []) {
    const prompt = buildDecisionPrompt(summary, history);
    const started = performance.now();
    let parsed = null;
    let raw = '';
    let tokensIn = 0;
    let tokensOut = 0;
    let fallbackReason = null;
    try {
      const res = await requestJson(this.fetch, `${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          think: false, // qwen3 thinking burns the token budget before the JSON answer
          options: { temperature: 0.1, num_predict: 800, ...(this.config.ollamaNumGpu == null ? {} : { num_gpu: Number(this.config.ollamaNumGpu) }) },
        }),
      }, this.config.timeoutMs || 30000);
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const body = res.data;
      raw = body.response || '';
      tokensIn = body.prompt_eval_count || Math.ceil(prompt.length / 4);
      tokensOut = body.eval_count || Math.ceil(raw.length / 4);
      parsed = parseDecision(raw);
      if (!parsed) fallbackReason = 'Unparseable model output';
      if(parsed){const issue=draftIssue(parsed,summary);if(issue){parsed=null;fallbackReason=issue}}
    } catch (e) {
      fallbackReason = e.message;
    }
    const latencyMs = performance.now() - started;
    if (!parsed) {
      const d = decideHeuristic(summary, this.config);
      return { ...d, provider: this.name, model: this.model, latencyMs, tokensIn, tokensOut, fallback: true, fallbackReason };
    }
    return { ...parsed, provider: this.name, model: this.model, latencyMs, tokensIn, tokensOut, fallback: false };
  }
}

class OpenAIBrain {
  constructor(config) {
    this.name = 'openai-compatible';
    this.baseUrl = (config.openaiBaseUrl || '').replace(/\/$/, '');
    this.apiKey = config.openaiApiKey || '';
    this.model = config.openaiModel || 'unknown';
    this.config = config;
    this.fetch = config.fetchImpl || globalThis.fetch;
  }
  async decide(summary, history = []) {
    const prompt = buildDecisionPrompt(summary, history);
    const started = performance.now();
    let parsed = null;
    let tokensIn = 0;
    let tokensOut = 0;
    let fallbackReason = null;
    try {
      const res = await requestJson(this.fetch, `${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
      }, this.config.timeoutMs || 30000);
      if (!res.ok) throw new Error(`openai-compatible ${res.status}`);
      const body = res.data;
      tokensIn = body.usage?.prompt_tokens || 0;
      tokensOut = body.usage?.completion_tokens || 0;
      parsed = parseDecision(body.choices?.[0]?.message?.content || '');
      if(parsed){const issue=draftIssue(parsed,summary);if(issue){parsed=null;fallbackReason=issue}}else fallbackReason='Unparseable model output';
    } catch (e) {
      fallbackReason=e.message;parsed = null;
    }
    const latencyMs = performance.now() - started;
    if (!parsed) {
      const d = decideHeuristic(summary, this.config);
      return { ...d, provider: this.name, model: this.model, latencyMs, tokensIn, tokensOut, fallback: true, fallbackReason };
    }
    return { ...parsed, provider: this.name, model: this.model, latencyMs, tokensIn, tokensOut, fallback: false };
  }
}
