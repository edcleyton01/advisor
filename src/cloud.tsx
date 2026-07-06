import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from './App'
import { supabase, cloudInitError, cloudHost, loadCloudStore, saveCloudStore, signInWithPassword, signOut } from './supabase'

const HostTag = () => cloudHost
  ? <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-3)' }}>🔗 {cloudHost}</div>
  : null
import { seedStore, migrateStore, type Store } from './data'

// ---------- Tela cheia genérica (login / carregando) ----------
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-wrap page-enter">
      <div className="login-card">
        <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, margin: '0 auto' }}>A</div>
        {children}
      </div>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <Shell>
      <div className="display" style={{ fontSize: 22, marginTop: 18, textAlign: 'center' }}>ADVISOR OS</div>
      <div className="cloud-spinner" />
      <div className="muted" style={{ textAlign: 'center', fontSize: 13 }}>{label}</div>
    </Shell>
  )
}

// ---------- Login por e-mail + senha ----------
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 6

  const submit = async () => {
    setBusy(true); setErr(null)
    const { error } = await signInWithPassword(email.trim(), password)
    setBusy(false)
    if (error) setErr(error)
    // sucesso: onAuthStateChange assume e carrega o app
  }

  return (
    <Shell>
      <div className="display" style={{ fontSize: 22, marginTop: 18, textAlign: 'center' }}>Acesso da equipe</div>
      <div className="muted" style={{ textAlign: 'center', marginTop: 8, fontSize: 13.5 }}>
        Entre com seu e-mail e senha.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
        <input className="in" type="email" inputMode="email" placeholder="voce@empresa.com.br" value={email} autoFocus
          onChange={e => { setEmail(e.target.value); setErr(null) }}
          onKeyDown={e => e.key === 'Enter' && ok && !busy && submit()} />
        <input className="in" type="password" placeholder="Senha" value={password}
          onChange={e => { setPassword(e.target.value); setErr(null) }}
          onKeyDown={e => e.key === 'Enter' && ok && !busy && submit()} />
        <button className="btn" disabled={!ok || busy} onClick={submit}>
          {busy ? 'Entrando…' : 'Entrar →'}
        </button>
      </div>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <HostTag />
    </Shell>
  )
}

// ---------- Orquestrador: sessão → carregar workspace → App ----------
export default function CloudRoot() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [store, setStore] = useState<Store | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Sessão de autenticação
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Carrega o workspace compartilhado quando há sessão
  useEffect(() => {
    if (!session) { setStore(null); return }
    let cancel = false
    ;(async () => {
      try {
        const raw = await loadCloudStore()
        if (cancel) return
        if (raw) {
          setStore(migrateStore(raw) ?? seedStore())
        } else {
          // primeiro acesso: cria o workspace com os dados-semente
          const seeded = seedStore()
          await saveCloudStore(seeded)
          if (!cancel) setStore(seeded)
        }
      } catch (e: any) {
        if (!cancel) setLoadError(e?.message ?? 'Falha ao carregar dados da nuvem.')
      }
    })()
    return () => { cancel = true }
  }, [session])

  // Persistência com debounce (evita gravar a cada tecla)
  const persist = useMemo(() => {
    let t: ReturnType<typeof setTimeout>
    return (s: Store) => {
      clearTimeout(t)
      t = setTimeout(() => { saveCloudStore(s) }, 800)
    }
  }, [])

  if (cloudInitError) {
    return (
      <Shell>
        <div className="display" style={{ fontSize: 20, marginTop: 18, textAlign: 'center' }}>Configuração da nuvem</div>
        <div className="login-err" style={{ marginTop: 12, textAlign: 'left', lineHeight: 1.55 }}>{cloudInitError}</div>
        <div className="muted" style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5 }}>
          Corrija a variável no Vercel (Settings → Environment Variables) e republique.
        </div>
        <HostTag />
      </Shell>
    )
  }
  if (session === undefined) return <Spinner label="Conectando…" />
  if (session === null) return <LoginScreen />
  if (loadError) {
    return (
      <Shell>
        <div className="display" style={{ fontSize: 20, marginTop: 18, textAlign: 'center' }}>Não foi possível carregar</div>
        <div className="login-err" style={{ marginTop: 12 }}>{loadError}</div>
        <button className="btn ghost" style={{ margin: '18px auto 0', display: 'block' }} onClick={() => location.reload()}>Tentar de novo</button>
        <button className="reset-link" style={{ textAlign: 'center', width: '100%' }} onClick={() => signOut()}>Sair da conta</button>
      </Shell>
    )
  }
  if (!store) return <Spinner label="Carregando seus dados…" />

  return (
    <App
      initialStore={store}
      persist={persist}
      cloudEmail={session.user.email ?? undefined}
      onCloudSignOut={() => signOut()}
    />
  )
}
