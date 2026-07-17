import { useRef, useState } from 'react'
import { Ic } from './icons'
import { cloudEnabled } from './supabase'
import { uploadEvidence, evidenceUrl, removeEvidence } from './storage'
import type { Action, Api, Attachment } from './data'

const uid = () => Math.random().toString(36).slice(2, 10)
const fmtSize = (b: number) => b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
const short = (s: string) => s.length > 24 ? s.slice(0, 22) + '…' : s

export function Attachments({ menteeId, blockId, action, api, canEdit }: {
  menteeId: string; blockId: string; action: Action; api: Api; canEdit: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const atts = action.attachments ?? []

  // Sem nuvem e sem anexos → não mostra nada (modo local/demo)
  if (!cloudEnabled && atts.length === 0) return null

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setBusy(true); setErr(null)
    const { path, error } = await uploadEvidence(menteeId, action.id, file)
    setBusy(false)
    if (error || !path) { setErr(error || 'Falha no upload.'); return }
    const att: Attachment = { id: uid(), path, name: file.name, size: file.size, uploadedAt: new Date().toISOString() }
    api.upAction(menteeId, blockId, { ...action, attachments: [...atts, att] })
  }

  const open = async (a: Attachment) => {
    const url = await evidenceUrl(a.path)
    if (url) window.open(url, '_blank', 'noopener')
    else setErr('Não foi possível abrir o arquivo.')
  }

  const del = async (a: Attachment) => {
    if (!confirm(`Remover o anexo "${a.name}"?`)) return
    await removeEvidence(a.path)
    api.upAction(menteeId, blockId, { ...action, attachments: atts.filter(x => x.id !== a.id) })
  }

  return (
    <div className="attach">
      {atts.map(a => (
        <span key={a.id} className="attach-chip">
          <button className="attach-open" onClick={() => open(a)} title={`${a.name} · ${fmtSize(a.size)}`}><Ic n="clip" size={11} /> {short(a.name)}</button>
          {canEdit && <button className="attach-del" title="Remover" onClick={() => del(a)}>✕</button>}
        </span>
      ))}
      {canEdit && cloudEnabled && (
        <>
          <button className="attach-add" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'enviando…' : '＋ anexar evidência'}
          </button>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={onPick} />
        </>
      )}
      {err && <span className="attach-err">{err}</span>}
    </div>
  )
}
