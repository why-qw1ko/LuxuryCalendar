// A deliberately small, curated offline collection. No entry means no claim about the day.
const records = {
  '02-11': [{ year: 1990, text: '纳尔逊·曼德拉结束了长达 27 年的监禁。' }],
  '04-22': [{ year: 1970, text: '首个世界地球日在美国举行。' }],
  '05-01': [{ year: 1886, text: '美国芝加哥工人举行罢工，争取八小时工作制。' }],
  '07-20': [{ year: 1969, text: '阿波罗 11 号登月舱在月球着陆。' }],
  '09-02': [{ year: 1945, text: '日本签署投降书，第二次世界大战结束。' }],
  '10-01': [{ year: 1949, text: '中华人民共和国成立。' }],
  '11-09': [{ year: 1989, text: '柏林墙开放，东西柏林民众得以自由往来。' }],
  '12-17': [{ year: 1903, text: '莱特兄弟完成首次有动力、可操纵的飞机飞行。' }]
}
export function historyFor(date) { return records[date.toString().slice(5)] || [] }
