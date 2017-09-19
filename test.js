'use strict'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const kpow = require('kpow')
const test = require('tape')
const createSignal = require('./')

kpow()

test('will default', (t) => {
  t.plan(1)

  try {
    const sound = createSignal()

    sound.connect(sound.context.destination)
    t.pass('Able to connect')
  } catch (e) {
    t.fail('Unable to create/connect')
  }
})
