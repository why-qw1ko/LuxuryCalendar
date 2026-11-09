import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchHistory, fetchHolidays } from '../src/lib/remote.js'
import { parseDate } from '../src/lib/calendar.js'

test('external responses are reduced to the fields the calendar uses', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, 'omit')
      assert.equal(options.referrerPolicy, 'no-referrer')
      return { ok: true, json: async () => url.includes('wikipedia')
        ? { events: [{ year: 1989, text: '事件', extra: 'ignored' }, { year: 'bad', text: 'invalid' }] }
        : { year: 2026, published: true, days: [{ date: '2026-01-04', name: '补班', isOffDay: false, extra: 'ignored' }] } }
    }
    assert.deepEqual(await fetchHistory(parseDate('2026-11-09'), new AbortController().signal), [{ year: 1989, text: '事件' }])
    assert.deepEqual(await fetchHolidays(2026, new AbortController().signal), { '2026-01-04': { name: '补班', work: true } })
  } finally { globalThis.fetch = original }
})

test('invalid external data is rejected for offline fallback', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ code: -1 }) })
    await assert.rejects(fetchHolidays(2100, new AbortController().signal))
  } finally { globalThis.fetch = original }
})

test('an empty holiday response is not reported as updated', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ year: 2027, published: true, days: [] }) })
    await assert.rejects(fetchHolidays(2027, new AbortController().signal))
  } finally { globalThis.fetch = original }
})
