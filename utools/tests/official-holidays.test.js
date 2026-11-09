import test from 'node:test'
import assert from 'node:assert/strict'
import { officialHolidays } from '../src/lib/official-holidays.js'

test('2027 holiday dates match the State Council notice', () => {
  const holidays = officialHolidays[2027]
  assert.equal(Object.keys(holidays).length, 34)
  for (const date of ['2027-01-01', '2027-01-03', '2027-02-05', '2027-02-13', '2027-04-03', '2027-04-05', '2027-05-01', '2027-05-05', '2027-06-09', '2027-09-15', '2027-10-01', '2027-10-07']) assert.equal(holidays[date].work, false, date)
  for (const date of ['2027-01-31', '2027-02-14', '2027-05-08', '2027-09-26', '2027-10-09']) assert.equal(holidays[date].work, true, date)
  for (const date of ['2027-02-04', '2027-02-15', '2027-06-08', '2027-06-10', '2027-10-08']) assert.equal(holidays[date], undefined, date)
})
