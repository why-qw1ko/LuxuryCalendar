async function getJson(url, signal) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = setTimeout(abort, 8000)
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}
export async function fetchHistory(date, signal) {
  const [, month, day] = date.toString().split('-')
  const data = await getJson(`https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`, signal)
  if (!Array.isArray(data.events)) throw new Error('Invalid history response')
  return data.events.filter(item => Number.isInteger(item.year) && typeof item.text === 'string').slice(0, 5).map(item => ({ year: item.year, text: item.text }))
}
export async function fetchHolidays(year, signal) {
  const data = await getJson(`https://hi8.com/api/holiday/${year}.json`, signal)
  if (data.year !== year || data.published !== true || !Array.isArray(data.days)) throw new Error('Holiday data unavailable')
  const result = {}
  for (const item of data.days) {
    if (typeof item.date === 'string' && new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(item.date) && typeof item.name === 'string' && typeof item.isOffDay === 'boolean') result[item.date] = { name: item.name, work: !item.isOffDay }
  }
  if (Object.keys(result).length === 0) throw new Error('Holiday data unavailable')
  return result
}
