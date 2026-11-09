import { Temporal } from '@js-temporal/polyfill'
import { Solar, HolidayUtil } from 'lunar-javascript'

export const weekdays = ['日', '一', '二', '三', '四', '五', '六']
export const parseDate = value => Temporal.PlainDate.from(value)
export const dateKey = date => date.toString()
export const todayIn = zone => Temporal.Now.zonedDateTimeISO(zone).toPlainDate()
export const addDays = (date, days) => date.add({ days })
export const addMonths = (date, months) => date.add({ months }, { overflow: 'constrain' })
export const daysFromToday = (date, today) => today.until(date, { largestUnit: 'day' }).days
export function weekStart(date, firstDay) {
  const day = date.dayOfWeek % 7
  return date.subtract({ days: (day - firstDay + 7) % 7 })
}
export function monthGrid(date, firstDay) {
  const first = date.with({ day: 1 })
  const start = weekStart(first, firstDay)
  const count = Math.ceil((first.day + (first.dayOfWeek % 7 - firstDay + 7) % 7 + first.daysInMonth - 1) / 7) * 7
  return Array.from({ length: count }, (_, i) => start.add({ days: i }))
}
const chineseCache = new Map()
export function chineseInfo(date) {
  const key = date.toString()
  if (chineseCache.has(key)) return chineseCache.get(key)
  // The library's published almanac data covers 1900–2100.
  if (date.year < 1900 || date.year > 2100) return { lunar: '超出农历范围', term: '', holiday: null }
  try {
    const solar = Solar.fromYmd(date.year, date.month, date.day)
    const lunar = solar.getLunar()
    const term = lunar.getJieQi()
    const primaryFestivals = [...lunar.getFestivals(), ...lunar.getOtherFestivals(), ...solar.getFestivals()]
    const festivals = [...new Set([...primaryFestivals, ...solar.getOtherFestivals()])]
    const holiday = HolidayUtil.getHoliday(date.year, date.month, date.day)
    const result = { lunar: lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese(), term, festival: primaryFestivals[0] || '', festivals, holiday: holiday ? { name: holiday.getName(), work: holiday.isWork() } : null, full: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` }
    if (chineseCache.size > 1000) chineseCache.clear()
    chineseCache.set(key, result)
    return result
  } catch { return { lunar: '农历暂不可用', term: '', holiday: null } }
}
export function instantFromLocal(value, zone) {
  return Temporal.PlainDateTime.from(value).toZonedDateTime(zone, { disambiguation: 'reject' }).toInstant().toString()
}
export function eventDate(event, zone) {
  return event.allDay ? event.date : Temporal.Instant.from(event.instant).toZonedDateTimeISO(zone).toPlainDate().toString()
}
export function eventTime(event, zone) {
  if (event.allDay) return '全天'
  return Temporal.Instant.from(event.instant).toZonedDateTimeISO(zone).toPlainTime().toString({ smallestUnit: 'minute' })
}
export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', ...options }).format(new Date(`${date.toString()}T12:00:00Z`))
}
