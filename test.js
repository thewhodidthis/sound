import "cutaway"
import { assert, report } from "tapeless"
import createSignal from "./main.js"

window.AudioContext = window.AudioContext || window.webkitAudioContext

const { ok } = assert

const sound = createSignal()
const { context, bufferSize, onaudioprocess } = sound

ok
  .describe("created audio context")
  .test(context instanceof AudioContext)
  .describe("buffer size is set")
  .test(bufferSize === 512)
  .describe("returns script processor")
  .test(sound instanceof ScriptProcessorNode)
  .describe("onaudioprocess event listener attached")
  .test(typeof onaudioprocess === "function")

report()
