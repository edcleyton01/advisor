import { useRef, useState } from 'react'
import {
  CHECKPOINT_KINDS, checkpointKind, fmtDate, todayIso,
  type Api, type Checkpoint, type CheckpointFile, type CheckpointKind, type Mentee,
} from './data'
import { cloudEnabled } from './supabase'
import { uploadCheckpointFile, evidenceUrl, removeEvidence } from './storage'

const uid = () => Math.random().toString(36).slice(2, 10)
const short = (s: string) => (s.length > 26 ? s.slice(0, 24) + '…' : s)

// tom visual por tipo de registro
const kindTag = (k: CheckpointKind) => {
  const meta = checkpointKind(k)
  const base: React.CSSProperties = { fontSize: 10.5 }
  if (meta.tone === 'bad') return { className: 'tag', style: { ...base, color: '#f27979', borderColor: 'rgba(242,121,121,0.35)', background: 'rgba(242,121,121,0.08)' } }
  return { className: `tag ${meta.tone}`, style: base }
}

// ---------- Anexos de um checkpoint ----------
function CpFiles({ m, cp, api }: { m: Mentee; cp: Checkpoint; api: Api }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const files = cp.files ?? []

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setBusy(true); setErr(null)
    const { path, error } = await uploadCheckpointFile(m.id, file)
    setBusy(false)
    if (error || !path) { setErr(error || 'Falha no upload.'); return }
    const f: CheckpointFile = { id: uid(), path, name: file.name, size: file.size }
    api.upCheckpoint(m.id, { ...cp, files: [...files, f] })
  }
  const open = async (f: CheckpointFile) => {
    const url = await evidenceUrl(f.path)
    if (url) window.open(url, '_blank', 'noopener')
    else setErr('Não foi possível abrir o arquivo.')
  }
  const del = async (f: CheckpointFile) => {
    if (!confirm(`Remover o anexo "${f.name}"?`)) return
    await removeEvidence(f.path)
    api.upCheckpoint(m.id, { ...cp, files: files.filter(x => x.id !== f.id) })
  }

  if (!cloudEnabled && files.length === 0) return null
  return (
    <div className="attach" style={{ marginTop: 8 }}>
      {files.map(f => (
        <span key={f.id} className="attach-chip">
          <button className="attach-open" onClick={() => open(f)} title={f.name}>📎 {short(f.name)}</button>
          <button className="attach-del" title="Remover" onClick={() => del(f)}>✕</button>
        </span>
      ))}
      {cloudEnabled && (
        <>
          <button className="attach-add" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'enviando…' : '＋ anexar arquivo'}
          </button>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={onPick} />
        </>
      )}
      {err && <span className="attach-err">{err}</span>}
    </div>
  )
}

// ---------- Seção Checkpoints (Detail do advisor) ----------
export function CheckpointsSection({ m, api, author }: { m: Mentee; api: Api; author: string }) {
  const [kind, setKind] = useState<CheckpointKind>('scheduled')
  const [date, setDate] = useState(todayIso())
  const [text, setText] = useState('')
  const ok = text.trim().length > 2

  const submit = () => {
    const cp: Checkpoint = { id: uid(), date, kind, text: text.trim(), author, createdAt: todayIso() }
    api.upCheckpoint(m.id, cp)
    setText(''); setKind('scheduled'); setDate(todayIso())
  }

  const items = [...(m.checkpoints ?? [])].sort((a, b) =>
    (b.date + b.createdAt).localeCompare(a.date + a.createdAt))

  return (
    <div className="section">
      <div className="section-head">
        <div className="h2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Checkpoints
          <span className="tag" style={{ fontSize: 10 }}>🔒 uso interno · o mentorado não vê</span>
        </div>
        <span className="muted-3" style={{ fontSize: 12 }}>{items.length} registro{items.length === 1 ? '' : 's'}</span>
      </div>

      {/* registrar */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="pill-tabs" style={{ marginBottom: 12 }}>
          {CHECKPOINT_KINDS.map(k => (
            <button key={k.id} className={`pill-tab ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input className="in" type="date" style={{ width: 150 }} value={date} onChange={e => setDate(e.target.value)} />
          <textarea className="in" rows={2} style={{ flex: 1, minWidth: 240 }} value={text}
            placeholder={kind === 'scheduled' ? 'Ex.: Checkpoint agendado — pauta: revisão do funil…'
              : kind === 'rescheduled' ? 'Ex.: Remarcado de 01/07 → 08/07 a pedido do mentorado…'
              : kind === 'canceled' ? 'Ex.: Cancelado — aguardando retorno do empresário…'
              : kind === 'done' ? 'Ex.: Realizado — principais definições e próximos passos…'
              : 'Observação relevante para o acompanhamento…'}
            onChange={e => setText(e.target.value)} />
          <button className="btn" disabled={!ok} onClick={submit}>Registrar</button>
        </div>
      </div>

      {/* histórico */}
      <div className="card" style={{ padding: items.length ? 18 : undefined }}>
        {items.length ? (
          <div className="timeline">
            {items.map(cp => {
              const meta = checkpointKind(cp.kind)
              const tag = kindTag(cp.kind)
              return (
                <div key={cp.id} className="tl-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div className="tl-date">{fmtDate(cp.date)}</div>
                    <span className={tag.className} style={tag.style}>{meta.icon} {meta.label}</span>
                    <span className="mono muted-3" style={{ fontSize: 10.5, marginLeft: 'auto' }}>
                      {cp.author ? `por ${cp.author} · ` : ''}registrado {fmtDate(cp.createdAt)}
                    </span>
                    <button className="icon-btn danger" title="Excluir registro"
                      onClick={() => {
                        if (!confirm('Excluir este registro de checkpoint?')) return
                        for (const f of cp.files ?? []) removeEvidence(f.path)
                        api.delCheckpoint(m.id, cp.id)
                      }}>✕</button>
                  </div>
                  <div className="tl-notes" style={{ color: 'var(--text)', marginTop: 6 }}>{cp.text}</div>
                  <CpFiles m={m} cp={cp} api={api} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            Nenhum checkpoint registrado. Use o formulário acima para manter o histórico — agendamentos,
            remarcações e observações ficam centralizados aqui, visíveis só para a equipe.
          </div>
        )}
      </div>
    </div>
  )
}
