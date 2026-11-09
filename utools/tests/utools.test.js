import test from 'node:test'
import assert from 'node:assert/strict'
import { registerUtoolsLifecycle } from '../src/lib/utools.js'

test('uTools entry and exit activate and release the calendar', () => {
  const listeners = {}
  const states = []
  const utools = {
    onPluginEnter: callback => { listeners.enter = callback },
    onPluginOut: callback => { listeners.out = callback }
  }
  assert.equal(registerUtoolsLifecycle(utools, value => states.push(value)), true)
  listeners.enter({ code: 'other' })
  listeners.enter({ code: 'calendar' })
  listeners.out(false)
  listeners.enter({ code: 'calendar' })
  listeners.out(true)
  assert.deepEqual(states, [true, false, true, false])
})

test('browser preview does not require uTools', () => {
  assert.equal(registerUtoolsLifecycle(undefined, () => assert.fail('unexpected callback')), false)
})
