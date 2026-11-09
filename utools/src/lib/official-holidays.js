// 国务院办公厅关于2027年部分节假日安排的通知（国办发明电〔2026〕10号）
// https://www.gov.cn/zhengce/content/202611/content_7085101.htm
const periods2027 = [
  ['2027-01-01', '2027-01-03', '元旦'],
  ['2027-02-05', '2027-02-13', '春节'],
  ['2027-04-03', '2027-04-05', '清明节'],
  ['2027-05-01', '2027-05-05', '劳动节'],
  ['2027-06-09', '2027-06-09', '端午节'],
  ['2027-09-15', '2027-09-15', '中秋节'],
  ['2027-10-01', '2027-10-07', '国庆节']
]
const workdays2027 = [
  ['2027-01-31', '春节'], ['2027-02-14', '春节'], ['2027-05-08', '劳动节'],
  ['2027-09-26', '国庆节'], ['2027-10-09', '国庆节']
]
function build2027() {
  const result = {}
  for (const [start, end, name] of periods2027) {
    const date = new Date(`${start}T00:00:00Z`)
    while (date.toISOString().slice(0, 10) <= end) {
      result[date.toISOString().slice(0, 10)] = { name, work: false }
      date.setUTCDate(date.getUTCDate() + 1)
    }
  }
  for (const [date, name] of workdays2027) result[date] = { name, work: true }
  return result
}
export const officialHolidays = { 2027: build2027() }
export const officialSources = { 2027: 'https://www.gov.cn/zhengce/content/202611/content_7085101.htm' }
