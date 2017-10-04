'use strict'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const kpow = require('kpow')
const test = require('tape')
const createSignal = require('./')

kpow()

test('will default', (t) => {
  const sound = createSignal()
  const { context, bufferSize, onaudioprocess } = sound

  t.ok(context instanceof AudioContext, 'created audio context')
  t.equal(bufferSize, 512, 'buffer size is set')
  t.ok(sound instanceof ScriptProcessorNode, 'returns script processor')
  t.equal(typeof onaudioprocess, 'function', 'onaudioprocess event listener attached')
  t.end()
})
