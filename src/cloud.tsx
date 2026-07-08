import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from './App'
import { supabase, cloudInitError, cloudHost, loadCloudStore, saveCloudStore, signInWithPassword, signOut } from './supabase'

const HostTag = () => cloudHost
  ? <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-3)' }}>🔗 {cloudHost}</div>
  : null
import { seedStore, migrateStore, type Store } from './data'
import {
  getIdentity, isStaff, loadForStaff, loadForMentee, saveForStaff, saveForMentee,
  migrateFromWorkspace, type Identity,
} from './cloud2'

const EMPTY_STORE: Store = {
  mentees: [], team: [], playbooks: [], sales: [], campaigns: [], goals: [],
  checkins: [], redemptions: [], deals: [], funnels: [],
}

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

// ---------- Orquestrador: sessão → papel → carregar → App ----------
export default function CloudRoot() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined) // null = fallback Fase 1
  const [store, setStore] = useState<Store | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // destino da gravação (muda conforme o papel)
  const persistRef = useRef<(s: Store) => void>(() => {})
  const skipPersist = useRef(false)   // não regrava mudanças vindas do Realtime/carga inicial
  const hasPending = useRef(false)    // há edição local ainda não salva?
  const lastSaveAt = useRef(0)        // p/ ignorar o eco das próprias gravações
  const [stale, setStale] = useState(false) // outro usuário alterou enquanto você editava

  // Sessão de autenticação
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Descobre o papel e carrega os dados correspondentes
  useEffect(() => {
    if (!session) { setStore(null); setIdentity(undefined); return }
    let cancel = false
    ;(async () => {
      try {
        // Fase 2 disponível? (se as tabelas não existirem, getIdentity lança → fallback)
        let id: Identity | null = null
        try { id = await getIdentity() } catch { id = null }
        if (cancel) return

        // ----- Fallback: Fase 1 (blob workspace) -----
        if (!id) {
          setIdentity(null)
          persistRef.current = s => saveCloudStore(s)
          const raw = await loadCloudStore()
          const s = raw ? (migrateStore(raw) ?? seedStore()) : seedStore()
          if (!raw) await saveCloudStore(s)
          if (!cancel) { skipPersist.current = true; setStore(s) }
          return
        }

        setIdentity(id)
        if (!id.configured) { if (!cancel) setStore(null); return } // tela "não configurado"

        // ----- Advisor / equipe: vê tudo (migra da Fase 1 na 1ª vez) -----
        if (isStaff(id.role)) {
          persistRef.current = s => saveForStaff(s)
          let s = await loadForStaff()
          if (!s || s.mentees.length === 0) {
            const blob = await loadCloudStore() // dados da Fase 1
            if (blob && blob.mentees.length) {
              await migrateFromWorkspace(blob)
              s = await loadForStaff()
              if (!s || s.mentees.length === 0) s = blob // segurança: nunca vazio se havia dados
            }
          }
          if (!cancel) { skipPersist.current = true; setStore(s ?? seedStore()) }
        }
        // ----- Mentorado: só a própria linha -----
        else {
          persistRef.current = s => saveForMentee(s, id!.menteeId!)
          const s = await loadForMentee(id.menteeId!)
          if (!cancel) { skipPersist.current = true; setStore(s ?? EMPTY_STORE) }
        }
      } catch (e: any) {
        if (!cancel) setLoadError(e?.message ?? 'Falha ao carregar dados da nuvem.')
      }
    })()
    return () => { cancel = true }
  }, [session])

  // Persistência (debounce) — na nuvem o CloudRoot é dono do estado
  useEffect(() => {
    if (!store) return
    if (skipPersist.current) { skipPersist.current = false; return }
    hasPending.current = true
    const t = setTimeout(async () => {
      await persistRef.current(store)
      lastSaveAt.current = Date.now()
      hasPending.current = false
    }, 800)
    return () => clearTimeout(t)
  }, [store])

  // Re-busca os dados do servidor e aplica sem regravar
  const refetch = useCallback(async () => {
    if (!identity || !identity.configured) return
    const s = isStaff(identity.role) ? await loadForStaff() : await loadForMentee(identity.menteeId!)
    if (s) { skipPersist.current = true; setStore(s); setStale(false) }
  }, [identity])

  // Realtime: mudanças de outros usuários (Fase 2; a RLS garante que cada um só recebe o que pode ver)
  useEffect(() => {
    if (!supabase || !identity || !identity.configured) return
    const onRemote = () => {
      if (Date.now() - lastSaveAt.current < 3000) return // eco da própria gravação → ignora
      if (hasPending.current) setStale(true)             // você editando → só avisa
      else refetch()                                     // ocioso → aplica ao vivo
    }
    const ch = supabase.channel('rt-advisor-os')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentees' }, onRemote)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared' }, onRemote)
      .subscribe()
    return () => { supabase!.removeChannel(ch) }
  }, [identity, refetch])

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
  // Login válido mas sem vínculo (mentorado ainda não provisionado)
  if (identity && !identity.configured) {
    return (
      <Shell>
        <div className="display" style={{ fontSize: 20, marginTop: 18, textAlign: 'center' }}>Conta não vinculada</div>
        <div className="muted" style={{ textAlign: 'center', marginTop: 12, fontSize: 13.5, lineHeight: 1.55 }}>
          Seu acesso ainda não está ligado a um mentorado. Fale com seu advisor para concluir o cadastro.
        </div>
        <button className="reset-link" style={{ textAlign: 'center', width: '100%', marginTop: 18 }} onClick={() => signOut()}>Sair da conta</button>
        <HostTag />
      </Shell>
    )
  }
  if (identity === undefined || !store) return <Spinner label="Carregando seus dados…" />

  return (
    <>
      <App
        store={store}
        setStore={setStore as Dispatch<SetStateAction<Store>>}
        cloudEmail={session.user.email ?? undefined}
        onCloudSignOut={() => signOut()}
        cloudRole={identity && !isStaff(identity.role) ? 'mentee' : undefined}
      />
      {stale && (
        <button className="rt-banner" onClick={() => refetch()}>
          🔄 Outra pessoa atualizou os dados — clique para atualizar
        </button>
      )}
    </>
  )
}
