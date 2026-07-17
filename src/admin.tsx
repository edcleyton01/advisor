import { useRef, useState } from 'react'
import { Ic } from './icons'
import { ACCENTS, defaultSettings, type Api, type AppSettings, type Store } from './data'
import { resizePhoto } from './avatar'

// ============================================================
//  Administração do sistema — visível só para a conta advisor.
//  Tudo salva automaticamente (mesmo fluxo de persistência do app)
//  e vale para toda a equipe e mentorados.
// ============================================================

function ImagePicker({ label, hint, value, size, mime, fit = 'cover', onChange }: {
  label: string; hint: string; value?: string; size: number
  mime: 'image/jpeg' | 'image/png'
  fit?: 'cover' | 'contain'
  onChange: (dataUrl?: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const pick = async (file?: File) => {
    if (!file) return
    setErr(null)
    try { onChange(await resizePhoto(file, size, mime, fit)) }
    catch (e: any) { setErr(e?.message ?? 'Falha ao processar a imagem.') }
  }
  return (
    <div>
      <div className="stat-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="photo-edit">
        {value
          ? <img src={value} alt={label} style={{ width: 52, height: 52, borderRadius: 12, objectFit: fit, border: '1px solid var(--line-2)' }} />
          : <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>—</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 12 }}
            onClick={() => inputRef.current?.click()}><Ic n="upload" size={12} /> {value ? 'Trocar' : 'Enviar'}</button>
          {value && (
            <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => onChange(undefined)}>Remover</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <div className="muted-3" style={{ fontSize: 11.5, marginTop: 8 }}>{hint}</div>
      {err && <div className="attach-err" style={{ marginTop: 6 }}>{err}</div>}
    </div>
  )
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check-row" style={{ alignItems: 'flex-start', gap: 10 }}>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</span>
        <span className="muted-3" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{hint}</span>
      </span>
    </label>
  )
}

export function AdminView({ store, api, adminEmail }: { store: Store; api: Api; adminEmail?: string }) {
  const s = store.settings
  const set = (patch: Partial<AppSettings>) => api.setSettings(patch)
  const setNotif = (k: keyof AppSettings['notifications'], v: boolean) =>
    api.setSettings({ notifications: { ...s.notifications, [k]: v } })

  return (
    <>
      <div className="topbar"><h1>Administração</h1>
        <div className="topbar-right">
          <span className="chip"><Ic n="key" size={11} /> {adminEmail ?? 'acesso do advisor'}</span>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Configurações do sistema</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>A ferramenta com a sua cara.</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          Só a sua conta vê esta aba. As mudanças salvam automaticamente e valem para toda a equipe e mentorados.
        </div>

        {/* Identidade */}
        <div className="card section">
          <div className="h2" style={{ fontSize: 17, marginBottom: 18 }}>Identidade</div>
          <div className="form-grid">
            <label className="field span2" style={{ maxWidth: 420 }}>
              <span>Nome do sistema</span>
              <input className="in" value={s.appName} maxLength={40}
                onChange={e => set({ appName: e.target.value })}
                onBlur={e => set({ appName: e.target.value.trim() || defaultSettings().appName })} />
            </label>
            <label className="field span2" style={{ maxWidth: 420 }}>
              <span>Slogan (aparece sob o nome, na barra lateral)</span>
              <input className="in" value={s.tagline} maxLength={60}
                onChange={e => set({ tagline: e.target.value })}
                onBlur={e => set({ tagline: e.target.value.trim() || defaultSettings().tagline })} />
            </label>
            <ImagePicker label="Logo" hint="Aparece na barra lateral. PNG com fundo transparente cai perfeito — a imagem entra inteira, sem corte nem fundo."
              value={s.logo} size={128} mime="image/png" fit="contain" onChange={logo => set({ logo })} />
            <ImagePicker label="Favicon" hint="Ícone da aba do navegador. Redimensionado para 64px, transparência preservada."
              value={s.favicon} size={64} mime="image/png" fit="contain" onChange={favicon => set({ favicon })} />
          </div>
        </div>

        {/* Tema */}
        <div className="card section">
          <div className="section-head" style={{ marginBottom: 16 }}>
            <div className="h2" style={{ fontSize: 17 }}>Tema</div>
            <span className="muted-3" style={{ fontSize: 12 }}>cor de destaque (XP, conquistas, gráficos)</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ACCENTS.map(a => (
              <button key={a.id} onClick={() => set({ accent: a.id })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  borderRadius: 12, border: `1px solid ${s.accent === a.id ? a.color : 'var(--line-2)'}`,
                  background: s.accent === a.id ? a.dim : 'transparent', fontSize: 13, fontWeight: 600,
                }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                {a.label}{s.accent === a.id ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Notificações */}
        <div className="card section">
          <div className="h2" style={{ fontSize: 17, marginBottom: 16 }}>Notificações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
            <Toggle label="Lembretes de call" hint="Calls de hoje/amanhã aparecem na Central de Alertas."
              on={s.notifications.calls} onChange={v => setNotif('calls', v)} />
            <Toggle label="Alertas de check-in" hint="Avisa quando um mentorado está sem check-in semanal."
              on={s.notifications.checkins} onChange={v => setNotif('checkins', v)} />
            <Toggle label="Contador no menu" hint="Mostra o número de alertas pendentes ao lado de “Alertas”."
              on={s.notifications.badge} onChange={v => setNotif('badge', v)} />
          </div>
        </div>
      </div>
    </>
  )
}
