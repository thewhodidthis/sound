import 'cutaway'
import { stat, veto } from 'tapeless'
import createSignal from './index.es'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const ok = veto(a => !!a)

const sound = createSignal()
const { context, bufferSize, onaudioprocess } = sound

ok(context instanceof AudioContext, 'created audio context')
ok(bufferSize === 512, 'buffer size is set')
ok(sound instanceof ScriptProcessorNode, 'returns script processor')
ok(typeof onaudioprocess === 'function', 'onaudioprocess event listener attached')

stat()
