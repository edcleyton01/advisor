// ============================================================
//  Função serverless (Vercel) — cria um login (equipe ou mentorado).
//  Usa a service_role (chave admin) que fica SÓ no servidor
//  (env sem prefixo VITE_ → nunca vai para o navegador).
//  Só advisor/equipe podem chamar.
// ============================================================
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return res.status(500).json({ error: 'Serviço não configurado: falta SUPABASE_SERVICE_ROLE_KEY na Vercel.' })
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sem autenticação.' })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) quem chama precisa ser advisor/equipe
  const { data: caller, error: cErr } = await admin.auth.getUser(token)
  if (cErr || !caller?.user) return res.status(401).json({ error: 'Sessão inválida.' })
  const { data: callerProf } = await admin.from('profiles').select('role').eq('user_id', caller.user.id).maybeSingle()
  if (!callerProf || !['advisor', 'team'].includes(callerProf.role)) {
    return res.status(403).json({ error: 'Apenas advisor/equipe podem criar acessos.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const kind: 'team' | 'mentee' = body.role === 'mentee' ? 'mentee' : 'team'
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const menteeId = String(body.menteeId || '')
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' })
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa de ao menos 6 caracteres.' })
  if (kind === 'mentee' && !menteeId) return res.status(400).json({ error: 'Mentorado não informado.' })

  // 2) para mentorado: valida o registro e evita duplicar vínculo
  if (kind === 'mentee') {
    const { data: mentee } = await admin.from('mentees').select('id, owner_user_id').eq('id', menteeId).maybeSingle()
    if (!mentee) return res.status(404).json({ error: 'Mentorado não encontrado.' })
    if (mentee.owner_user_id) return res.status(409).json({ error: 'Este mentorado já tem um acesso vinculado.' })
  }

  // 3) cria o usuário de login (confirmado, sem e-mail)
  const { data: created, error: uErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (uErr || !created?.user) {
    const msg = /already been registered|already exists/i.test(uErr?.message || '')
      ? 'Já existe um usuário com esse e-mail.'
      : (uErr?.message || 'Falha ao criar o usuário de login.')
    return res.status(400).json({ error: msg })
  }
  const uid = created.user.id

  // 4) vincula por papel
  if (kind === 'mentee') {
    const { error: pErr } = await admin.from('profiles').upsert({ user_id: uid, role: 'mentee', mentee_id: menteeId })
    if (pErr) return res.status(500).json({ error: 'Login criado, mas falhou o vínculo (perfil): ' + pErr.message })
    const { error: mErr } = await admin.from('mentees').update({ owner_user_id: uid }).eq('id', menteeId)
    if (mErr) return res.status(500).json({ error: 'Login criado, mas falhou o vínculo (mentorado): ' + mErr.message })
  } else {
    const { error: pErr } = await admin.from('profiles').upsert({ user_id: uid, role: 'team' })
    if (pErr) return res.status(500).json({ error: 'Login criado, mas falhou o vínculo (perfil): ' + pErr.message })
  }

  return res.status(200).json({ ok: true, email, role: kind })
}
