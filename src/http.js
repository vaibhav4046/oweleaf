// Bound both connection and JSON-body reads. No retries: an uncertain write
// must be reconciled by the caller, never replayed automatically.
export async function requestJson(fetchImpl, url, options = {}, timeoutMs = 15000) {
  const ms = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Math.min(Number(timeoutMs),120000) : 15000;
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, { ...options, signal: controller.signal });
        const data = response.status === 204 ? null : await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`Dependency timeout after ${ms}ms`)); }, ms); })
    ]);
  } finally { clearTimeout(timer); }
}
