import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTheme, contrastRatio, normalizeHex } from '../src/lib/theme.js'

test('custom theme colors remain readable on both backgrounds', () => {
  for (const input of ['#FFFFFF', '#000000', '#FFFF00', '#165DFF', '#7040BB', '#087964']) {
    for (const dark of [false, true]) {
      const result = buildTheme(input, dark)
      assert.ok(contrastRatio(result.accent, dark ? '#232324' : '#FFFFFF') >= 4.5, `${input} ${dark}`)
      assert.ok(contrastRatio(result.onAccent, result.accent) >= 4.5, `${input} foreground ${dark}`)
      assert.ok(contrastRatio('#FFFFFF', result.control) >= 3, `${input} switch ${dark}`)
      assert.equal(Object.keys(result.palette).length, 10)
    }
  }
})
test('invalid and shorthand colors are normalized safely', () => {
  assert.equal(normalizeHex('#f80'), '#FF8800')
  assert.equal(normalizeHex('url(evil)'), null)
  assert.equal(buildTheme('invalid').original, '#165DFF')
})
