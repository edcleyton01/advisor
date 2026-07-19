import { useRef, useState } from 'react'
import {
  categoriesInUse, materialsVisibleTo, fmtDate,
  type Api, type Material, type Mentee, type Store,
} from './data'
import { cloudEnabled } from './supabase'
import { uploadMaterialFile, materialUrl, removeMaterialFile } from './storage'
import { AccessChip } from './week'
import { Avatar } from './avatar'
import { Ic } from './icons'

// ============================================================
//  Materiais complementares — a equipe publica (PDF/RAR/ZIP),
//  o mentorado baixa. Direcionável por programa (vazio = todos).
// ============================================================

const uid = () => Math.random().toString(36).slice(2, 10)
const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const extOf = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'ARQ'
const ALLOWED = /\.(pdf|rar|zip)$/i

// ---------- Linha de material ----------
function MaterialRow({ mt, canManage, onDelete }: { mt: Material; canManage: boolean; onDelete: () => void }) {
  const [err, setErr] = useState<string | null>(null)
  const download = async () => {
    const url = await materialUrl(mt.path)
    if (url) window.open(url, '_blank', 'noopener')
    else setErr(cloudEnabled ? 'Não foi possível gerar o link.' : 'Download disponível apenas na versão online.')
  }
  return (
    <div className="material-row">
      <div className="material-ext mono">{extOf(mt.fileName)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 14 }}>{mt.title}</div>
        {mt.description && <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{mt.description}</div>}
        <div className="muted-3" style={{ fontSize: 11, marginTop: 5 }}>
          {mt.category?.trim()
            ? <span style={{ color: 'var(--accent)' }}>◆ {mt.category} · </span>
            : <span>todos os programas · </span>}
          {mt.fileName} · {fmtSize(mt.size)} · {fmtDate(mt.uploadedAt)}{mt.author ? ` · por ${mt.author}` : ''}
        </div>
        {err && <div className="attach-err" style={{ marginTop: 4 }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn ghost" style={{ padding: '8px 14px', fontSize: 12 }} onClick={download}>
          <Ic n="download" size={13} /> Baixar
        </button>
        {canManage && (
          <button className="icon-btn danger" title="Excluir material"
            onClick={() => confirm(`Excluir "${mt.title}"? Os mentorados deixam de ver.`) && onDelete()}>✕</button>
        )}
      </div>
    </div>
  )
}

// ---------- Publicar (staff) ----------
function UploadCard({ store, api, author }: { store: Store; api: Api; author: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cats = categoriesInUse(store.mentees)
  const ok = !!file && title.trim().length > 1

  const pick = (f?: File) => {
    setErr(null)
    if (!f) return
    if (!ALLOWED.test(f.name)) { setErr('Formato não suportado — envie .pdf, .rar ou .zip.'); return }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.(pdf|rar|zip)$/i, '').replace(/[_-]+/g, ' '))
  }

  const publish = async () => {
    if (!file) return
    setBusy(true); setErr(null)
    const { path, error } = await uploadMaterialFile(file)
    setBusy(false)
    if (error || !path) { setErr(error || 'Falha no upload.'); return }
    api.upMaterial({
      id: uid(), title: title.trim(), description: description.trim() || undefined,
      category: category.trim() || undefined, fileName: file.name, path, size: file.size,
      uploadedAt: new Date().toISOString().slice(0, 10), author,
    })
    setTitle(''); setDescription(''); setCategory(''); setFile(null)
  }

  if (!cloudEnabled) {
    return <div className="empty" style={{ marginBottom: 16 }}>No modo demonstração o upload fica desativado — na versão online a equipe publica os arquivos aqui.</div>
  }
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="form-grid">
        <label className="field"><span>Título</span>
          <input className="in" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Planilha de Escada de Valor" />
        </label>
        <label className="field"><span>Programa (vazio = todos)</span>
          <input className="in" list="material-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Todos os mentorados" />
          <datalist id="material-categories">{cats.map(c => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="field span2"><span>Descrição (opcional)</span>
          <input className="in" value={description} maxLength={160} onChange={e => setDescription(e.target.value)} placeholder="Pra que serve, quando usar…" />
        </label>
        <div className="span2" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={() => inputRef.current?.click()}>
            <Ic n="clip" size={12} /> {file ? file.name : 'Escolher arquivo (.pdf, .rar, .zip · até 50MB)'}
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.rar,.zip,application/pdf" style={{ display: 'none' }}
            onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn" disabled={!ok || busy} onClick={publish}>
            {busy ? 'Enviando…' : 'Publicar material'}
          </button>
          {err && <span className="attach-err">{err}</span>}
        </div>
      </div>
    </div>
  )
}

// ---------- View do advisor/equipe ----------
export function MaterialsAdminView({ store, api, author }: { store: Store; api: Api; author: string }) {
  const cats = ['all', ...new Set(store.materials.map(m => m.category?.trim()).filter((c): c is string => !!c))]
  const [cat, setCat] = useState('all')
  const shown = cat === 'all' ? store.materials : store.materials.filter(m => m.category?.trim() === cat)
  const del = (mt: Material) => { removeMaterialFile(mt.path); api.delMaterial(mt.id) }
  return (
    <>
      <div className="topbar"><h1>Materiais</h1>
        <div className="topbar-right"><span className="chip">{store.materials.length} publicado{store.materials.length === 1 ? '' : 's'}</span></div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Biblioteca do programa</div>
        <div className="display" style={{ marginTop: 8 }}>Materiais complementares</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          PDFs, planilhas compactadas e templates que os mentorados baixam na aba Materiais deles.
        </div>

        <div className="section">
          <UploadCard store={store} api={api} author={author} />
          {cats.length > 2 && (
            <div className="pill-tabs" style={{ marginBottom: 14 }}>
              {cats.map(c => (
                <button key={c} className={`pill-tab ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
                  {c === 'all' ? 'Todos' : c}
                </button>
              ))}
            </div>
          )}
          <div className="card" style={{ padding: shown.length ? 10 : undefined }}>
            {shown.length
              ? shown.map(mt => <MaterialRow key={mt.id} mt={mt} canManage onDelete={() => del(mt)} />)
              : <div className="empty">Nenhum material publicado ainda. Suba o primeiro PDF acima.</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- View do mentorado ----------
export function MyMaterials({ m, store, onLogout }: { m: Mentee; store: Store; onLogout: () => void }) {
  const mine = materialsVisibleTo(store.materials, m.category)
  return (
    <>
      <div className="topbar"><h1>Materiais</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <Avatar m={m} size={34} fontSize={12} />
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Biblioteca do programa</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Seus materiais complementares</div>
        <div className="section">
          <div className="card" style={{ padding: mine.length ? 10 : undefined }}>
            {mine.length
              ? mine.map(mt => <MaterialRow key={mt.id} mt={mt} canManage={false} onDelete={() => {}} />)
              : <div className="empty">Nenhum material disponível ainda — seu mentor publica os arquivos aqui.</div>}
          </div>
        </div>
      </div>
    </>
  )
}
