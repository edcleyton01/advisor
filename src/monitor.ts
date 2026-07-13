// ============================================================
//  Monitor de erros em produção — envia para /api/log-error
//  (aparece nos Logs do projeto na Vercel; filtre "[client-error]").
//  Silencioso e defensivo: nunca pode quebrar o app, deduplica
//  e limita o volume por sessão.
// ============================================================

const MAX_PER_SESSION = 5
let sent = 0
const seen = new Set<string>()

export function reportError(err: unknown, source: 'boundary' | 'window' | 'promise') {
  if (!import.meta.env.PROD) return
  if (sent >= MAX_PER_SESSION) return
  const e = err instanceof Error ? err : new Error(String(err ?? 'erro desconhecido'))
  const key = `${e.message}`.slice(0, 200)
  if (seen.has(key)) return
  seen.add(key)
  sent++
  try {
    const payload = JSON.stringify({
      message: e.message, stack: e.stack, source, url: location.href,
    })
    // sendBeacon sobrevive a unload; fetch como fallback
    if (!navigator.sendBeacon?.('/api/log-error', new Blob([payload], { type: 'application/json' }))) {
      fetch('/api/log-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    }
  } catch { /* nunca propaga */ }
}

// Erros fora do React (handlers, async, scripts)
export function installMonitor() {
  if (!import.meta.env.PROD) return
  window.addEventListener('error', ev => reportError(ev.error ?? ev.message, 'window'))
  window.addEventListener('unhandledrejection', ev => reportError(ev.reason, 'promise'))
}
