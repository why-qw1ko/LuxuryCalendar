import test from 'node:test'
import assert from 'node:assert/strict'
import { Temporal } from '@js-temporal/polyfill'
import { addMonths, chineseInfo, daysFromToday, eventDate, instantFromLocal, monthGrid, parseDate, weekStart } from '../src/lib/calendar.js'

test('month arithmetic constrains the day across leap years and centuries', () => {
  assert.equal(addMonths(parseDate('2024-01-31'), 1).toString(), '2024-02-29')
  assert.equal(addMonths(parseDate('2100-01-31'), 1).toString(), '2100-02-28')
  assert.equal(addMonths(parseDate('2000-12-31'), 2).toString(), '2001-02-28')
})
test('month grid honors week start and crosses years', () => {
  const date = parseDate('2023-01-15')
  assert.equal(weekStart(date, 1).toString(), '2023-01-09')
  assert.equal(monthGrid(date, 1)[0].toString(), '2022-12-26')
  assert.equal(monthGrid(date, 0)[0].toString(), '2023-01-01')
  assert.equal(monthGrid(parseDate('2021-02-01'), 1).length, 28)
})
test('date differences count calendar days across leap years and daylight saving time', () => {
  assert.equal(daysFromToday(parseDate('2024-03-11'), parseDate('2024-03-09')), 2)
  assert.equal(daysFromToday(parseDate('2024-02-28'), parseDate('2024-03-01')), -2)
  assert.equal(daysFromToday(parseDate('2100-01-01'), parseDate('2099-12-31')), 1)
  assert.equal(daysFromToday(parseDate('2026-11-09'), parseDate('2026-11-09')), 0)
})
test('nonexistent and ambiguous wall times are rejected', () => {
  assert.throws(() => instantFromLocal('2024-03-10T02:30', 'America/New_York'))
  assert.throws(() => instantFromLocal('2024-11-03T01:30', 'America/New_York'))
  assert.equal(instantFromLocal('2024-03-10T03:30', 'America/New_York'), '2024-03-10T07:30:00Z')
})
test('timed events follow the chosen zone; all-day events keep their date', () => {
  const timed = { allDay: false, instant: '2024-01-01T00:30:00Z' }
  assert.equal(eventDate(timed, 'America/Los_Angeles'), '2023-12-31')
  assert.equal(eventDate(timed, 'Asia/Shanghai'), '2024-01-01')
  assert.equal(eventDate({ allDay: true, date: '2024-01-01' }, 'America/Los_Angeles'), '2024-01-01')
})
test('lunar and built-in holiday data are available for known dates', () => {
  assert.match(chineseInfo(Temporal.PlainDate.from('2026-02-17')).full, /正月初一/)
  assert.equal(chineseInfo(Temporal.PlainDate.from('2026-10-10')).holiday.work, true)
  assert.equal(chineseInfo(Temporal.PlainDate.from('2101-01-01')).lunar, '超出农历范围')
})
test('traditional and coinciding observances remain available together', () => {
  const date = chineseInfo(parseDate('2026-04-04'))
  assert.equal(date.festival, '寒食节')
  assert.ok(date.festivals.includes('寒食节'))
  assert.ok(date.festivals.includes('国际地雷行动日'))
  assert.equal(chineseInfo(parseDate('2025-04-03')).festival, '寒食节')
  assert.equal(chineseInfo(parseDate('2027-04-04')).festival, '寒食节')
  assert.equal(chineseInfo(parseDate('2026-04-05')).term, '清明')
  assert.equal(chineseInfo(parseDate('2026-11-09')).festival, '寒衣节')
  assert.ok(chineseInfo(parseDate('2026-11-09')).festivals.includes('全国消防日'))
  assert.equal(chineseInfo(parseDate('2026-11-19')).festival, '')
  assert.ok(chineseInfo(parseDate('2026-11-19')).festivals.includes('世界厕所日'))
})
