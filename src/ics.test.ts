import { describe, it, expect } from 'vitest'
import { parseIcs } from './ics'

const wrap = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events}END:VCALENDAR\r\n`
const ev = (body: string) => `BEGIN:VEVENT\r\n${body}END:VEVENT\r\n`

// janela fixa: julho–outubro de 2026
const win = {
  windowStart: Date.UTC(2026, 6, 1),
  windowEnd: Date.UTC(2026, 9, 31),
}

describe('parseIcs', () => {
  it('evento único em UTC vira horário de São Paulo', () => {
    const [e] = parseIcs(wrap(ev('UID:a\r\nDTSTART:20260716T140000Z\r\nSUMMARY:Call\r\n')), win)
    expect(e).toMatchObject({ date: '2026-07-16', time: '11:00', title: 'Call', allDay: false }) // SP = UTC-3
  })

  it('TZID=America/Sao_Paulo passa literal; dia inteiro fica sem hora', () => {
    const out = parseIcs(wrap(
      ev('UID:b\r\nDTSTART;TZID=America/Sao_Paulo:20260720T100000\r\nSUMMARY:Mentoria\r\n')
      + ev('UID:c\r\nDTSTART;VALUE=DATE:20260721\r\nSUMMARY:Evento\r\n')
    ), win)
    expect(out[0]).toMatchObject({ date: '2026-07-20', time: '10:00' })
    expect(out[1]).toMatchObject({ date: '2026-07-21', time: null, allDay: true })
  })

  it('linha dobrada (folding) e escapes no título', () => {
    const [e] = parseIcs(wrap(ev('UID:d\r\nDTSTART:20260716T140000Z\r\nSUMMARY:Call com\r\n  continuação\\, ok\r\n')), win)
    expect(e.title).toBe('Call com continuação, ok')
  })

  it('RRULE semanal expande dentro da janela e honra EXDATE', () => {
    const out = parseIcs(wrap(ev(
      'UID:w\r\nDTSTART;TZID=America/Sao_Paulo:20260701T090000\r\n'
      + 'RRULE:FREQ=WEEKLY;UNTIL=20260731T120000Z\r\n'
      + 'EXDATE;TZID=America/Sao_Paulo:20260715T090000\r\n'
      + 'SUMMARY:Checkpoint semanal\r\n'
    )), win)
    // quartas de julho: 01, 08, [15 removida], 22, 29
    expect(out.map(e => e.date)).toEqual(['2026-07-01', '2026-07-08', '2026-07-22', '2026-07-29'])
    expect(out.every(e => e.time === '09:00')).toBe(true)
  })

  it('RRULE mensal BYDAY=2TH cai na 2ª quinta de cada mês', () => {
    const out = parseIcs(wrap(ev(
      'UID:m\r\nDTSTART;TZID=America/Sao_Paulo:20260709T150000\r\n'
      + 'RRULE:FREQ=MONTHLY;BYDAY=2TH\r\nSUMMARY:Mensal\r\n'
    )), win)
    // 2ª quinta: jul=09, ago=13, set=10, out=08
    expect(out.map(e => e.date)).toEqual(['2026-07-09', '2026-08-13', '2026-09-10', '2026-10-08'])
  })

  it('STATUS:CANCELLED some; fora da janela some', () => {
    const out = parseIcs(wrap(
      ev('UID:x\r\nDTSTART:20260716T140000Z\r\nSTATUS:CANCELLED\r\nSUMMARY:Cancelada\r\n')
      + ev('UID:y\r\nDTSTART:20250101T140000Z\r\nSUMMARY:Antiga\r\n')
    ), win)
    expect(out).toEqual([])
  })
})
