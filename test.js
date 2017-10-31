import 'cutaway'
import { assert, report } from 'tapeless'
import createSignal from './index.es'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const { ok } = assert

const sound = createSignal()
const { context, bufferSize, onaudioprocess } = sound

ok(context instanceof AudioContext, 'created audio context')
ok(bufferSize === 512, 'buffer size is set')
ok(sound instanceof ScriptProcessorNode, 'returns script processor')
ok(typeof onaudioprocess === 'function', 'onaudioprocess event listener attached')

report()
