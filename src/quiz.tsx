import { useState } from 'react'
import {
  PILLARS, QUIZ, QUIZ_SCALE, quizScores, buildOnboardingBlock, pillarById, pcolor, todayIso,
  type Mentee, type Api,
} from './data'
import { AccessChip } from './week'

const uid = () => Math.random().toString(36).slice(2, 10)

// ---------- Teia (radar do resultado) ----------
function Teia({ scores, size = 240 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 30, n = PILLARS.length
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = PILLARS.map((p, i) => pt(i, R * (scores[p.id] / 10)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon key={i} points={PILLARS.map((_, idx) => pt(idx, R * r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" />
      ))}
      {PILLARS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" /> })}
      <polygon points={poly} fill="rgba(232,179,74,0.15)" stroke="var(--accent)" strokeWidth={1.8} />
      {PILLARS.map((p, i) => { const [x, y] = pt(i, R * (scores[p.id] / 10)); return <circle key={p.id} cx={x} cy={y} r={3.5} fill="var(--accent)" /> })}
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, R + 16)
        return <text key={p.id} x={x} y={y} fill="var(--text-3)" fontSize={10.5} textAnchor="middle" dominantBaseline="middle" style={{ fontWeight: 600 }}>{p.short}</text>
      })}
    </svg>
  )
}

export function OnboardingQuiz({ m, api, onLogout, onOpenPlan }: {
  m: Mentee; api: Api; onLogout: () => void; onOpenPlan: () => void
}) {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result' | 'done'>(m.onboardedAt ? 'intro' : 'intro')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const answered = Object.keys(answers).length
  const allDone = answered === QUIZ.length
  const set = (qid: string, v: number) => setAnswers(p => ({ ...p, [qid]: v }))

  const scores = quizScores(answers)
  const weakest = [...PILLARS].sort((a, b) => scores[a.id] - scores[b.id])[0]

  const generate = () => {
    const sc = quizScores(answers)
    const newScores = Object.fromEntries(PILLARS.map(p => [p.id, { baseline: sc[p.id], current: sc[p.id] }])) as Mentee['scores']
    const block = buildOnboardingBlock(sc, uid)
    const blocks = m.blocks.filter(b => b.title !== 'Plano de Onboarding')
    api.upMentee({ ...m, scores: newScores, onboardedAt: todayIso(), blocks: [...blocks, block] })
    setStep('done')
  }

  const Head = ({ chip }: { chip: string }) => (
    <div className="topbar"><h1>Diagnóstico de onboarding</h1>
      <div className="topbar-right">
        <AccessChip m={m} />
        <span className="chip">{chip}</span>
        <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{m.initials}</div>
        <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
      </div>
    </div>
  )

  // ---------- Intro ----------
  if (step === 'intro') return (
    <>
      <Head chip={m.onboardedAt ? 'já respondido' : '5 min'} />
      <div className="content page-enter">
        <div className="quiz-intro">
          <div className="eyebrow">Ponto de partida</div>
          <div className="display" style={{ marginTop: 8, fontSize: 28 }}>Onde seu negócio está hoje?</div>
          <div className="muted" style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.6, maxWidth: 560 }}>
            {QUIZ.length} perguntas rápidas sobre os 5 pilares — Branding, Marketing, Vendas, Produtos e IA.
            No fim, você vê sua <b>teia de maturidade</b> e recebe um <b>plano de ação inicial</b> com os primeiros passos,
            já priorizando onde você mais precisa evoluir.
          </div>
          {m.onboardedAt && (
            <div className="calc-preview" style={{ marginTop: 18, maxWidth: 560 }}>
              Você já respondeu antes. Refazer vai <b>atualizar seu diagnóstico</b> e recriar o plano de onboarding.
            </div>
          )}
          <button className="btn" style={{ marginTop: 26, fontSize: 14, padding: '11px 22px' }}
            onClick={() => { setAnswers({}); setStep('quiz') }}>
            {m.onboardedAt ? 'Refazer diagnóstico' : 'Começar diagnóstico →'}
          </button>
        </div>
      </div>
    </>
  )

  // ---------- Quiz ----------
  if (step === 'quiz') return (
    <>
      <Head chip={`${answered}/${QUIZ.length}`} />
      <div className="content page-enter">
        <div className="eyebrow">Responda com sinceridade</div>
        <div className="display" style={{ marginTop: 8, fontSize: 24 }}>Seu diagnóstico</div>
        <div className="quiz-progress"><i style={{ width: `${(answered / QUIZ.length) * 100}%` }} /></div>

        <div style={{ marginTop: 20 }}>
          {PILLARS.map(p => (
            <div key={p.id} className="quiz-group">
              <div className="quiz-group-head"><span className="pillar-dot" style={{ background: pcolor(p.hue) }} />{p.label}</div>
              {QUIZ.filter(q => q.pillar === p.id).map(q => (
                <div key={q.id} className="quiz-q">
                  <div className="quiz-q-text">{q.text}</div>
                  <div className="quiz-scale" role="group">
                    {QUIZ_SCALE.map((label, v) => (
                      <button key={v} title={label}
                        className={`quiz-opt ${answers[q.id] === v ? 'on' : ''}`}
                        onClick={() => set(q.id, v)}>
                        <span className="quiz-dot" />
                      </button>
                    ))}
                  </div>
                  <div className="quiz-scale-ends"><span>Discordo</span><span>Concordo</span></div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, position: 'sticky', bottom: 0 }}>
          <button className="btn ghost" onClick={() => setStep('intro')}>← Voltar</button>
          <button className="btn" disabled={!allDone} onClick={() => setStep('result')}>
            {allDone ? 'Ver minha teia →' : `Faltam ${QUIZ.length - answered}`}
          </button>
        </div>
      </div>
    </>
  )

  // ---------- Resultado ----------
  if (step === 'result') return (
    <>
      <Head chip="resultado" />
      <div className="content page-enter">
        <div className="eyebrow">Sua teia de maturidade</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Este é o seu ponto de partida</div>

        <div className="grid g-2" style={{ marginTop: 24 }}>
          <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
            <Teia scores={scores} />
          </div>
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 14 }}>Leitura por pilar</div>
            <div className="radar-legend">
              {PILLARS.map(p => {
                const v = scores[p.id]
                const forte = v >= 7
                return (
                  <div key={p.id} className="li">
                    <span className="pillar-dot" style={{ background: pcolor(p.hue) }} />
                    <span>{p.label}</span>
                    <span className="val">{v}/10 <span className={`tag ${forte ? 'good' : 'warn'}`} style={{ marginLeft: 8, padding: '2px 8px' }}>{forte ? 'forte' : 'desenvolver'}</span></span>
                  </div>
                )
              })}
            </div>
            <div className="divider" style={{ margin: '16px 0 12px' }} />
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
              Seu maior ponto de partida é <b style={{ color: pcolor(weakest.hue) }}>{weakest.label}</b> ({scores[weakest.id]}/10).
              É por aí que o plano de onboarding vai começar.
            </div>
          </div>
        </div>

        <div className="card section" style={{ borderColor: 'rgba(232,179,74,0.3)', background: 'var(--accent-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="h2" style={{ fontSize: 17 }}>Pronto para agir?</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Vou gravar este diagnóstico e criar seu <b>Plano de Onboarding</b> com as primeiras ações — priorizando seus pilares mais fracos.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={() => setStep('quiz')}>Revisar respostas</button>
              <button className="btn" onClick={generate}>Gerar meu plano de ação ✓</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  // ---------- Concluído ----------
  return (
    <>
      <Head chip="concluído" />
      <div className="content page-enter">
        <div className="quiz-intro" style={{ textAlign: 'center' }}>
          <div className="glyph" style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: 24 }}>◆</div>
          <div className="display" style={{ fontSize: 26 }}>Diagnóstico concluído!</div>
          <div className="muted" style={{ marginTop: 12, fontSize: 14.5, lineHeight: 1.6, maxWidth: 480, marginInline: 'auto' }}>
            Sua teia foi salva como ponto de partida e seu <b>Plano de Onboarding</b> já está no seu plano de ação.
            Bora executar o primeiro passo?
          </div>
          <button className="btn" style={{ marginTop: 24, fontSize: 14, padding: '11px 22px' }} onClick={onOpenPlan}>
            Ver meu plano de ação →
          </button>
        </div>
      </div>
    </>
  )
}
