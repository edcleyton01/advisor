import { useEffect, useState } from 'react'

// ============================================================
//  Celebrações — micro-momentos de recompensa (XP, bloco, nível).
//  celebrate() pode ser chamado de qualquer lugar; a camada fixa
//  anima os chips subindo e some sozinha. Sem dependências.
// ============================================================

export type CelebrationTone = 'xp' | 'level' | 'ok'
interface Item { id: number; text: string; tone: CelebrationTone }

let counter = 0
let pushFn: ((it: Item) => void) | null = null

export function celebrate(text: string, tone: CelebrationTone = 'xp') {
  pushFn?.({ id: ++counter, text, tone })
}

export function CelebrationLayer() {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    pushFn = it => {
      setItems(prev => [...prev.slice(-2), it]) // no máximo 3 na tela
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== it.id)), 2400)
    }
    return () => { pushFn = null }
  }, [])
  if (!items.length) return null
  return (
    <div className="celebrate-layer">
      {items.map(it => <div key={it.id} className={`celebrate-chip ${it.tone}`}>{it.text}</div>)}
    </div>
  )
}
