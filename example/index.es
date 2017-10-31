import { across } from '@thewhodidthis/lines'
import inspect from '@thewhodidthis/binocular'

import createSignal from '../index.es'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const audio = new AudioContext()
const fader = audio.createGain()

fader.connect(audio.destination)

const bits = 16
const step = Math.pow(0.5, bits)
const freq = 0.1

let fuzz = 0
let last = 0

const crush = createSignal({ context: audio }, (t, i, g) => {
  fuzz += freq

  if (fuzz >= 1) {
    fuzz -= 1
    last = step * Math.floor((g / step) + 0.5)
  }

  return last
})

crush.connect(fader)

const canvas = document.querySelector('canvas')
const master = canvas.getContext('2d')
const board1 = canvas.cloneNode().getContext('2d')
const board2 = canvas.cloneNode().getContext('2d')

const { width, height } = canvas

const middle = height * 0.5
const border = (width - 512) * 0.5
const margin = 10

board1.canvas.height = board2.canvas.height = middle - (margin * 2)
board1.canvas.width = board2.canvas.width = width + (border * -2)
board1.lineWidth = board2.lineWidth = 2
board2.strokeStyle = '#fff'

const graph1 = across(board1, 1)
const graph2 = across(board2, 1)

let scope1
let scope2

const tick = fn => window.requestAnimationFrame(fn)
const draw = () => {
  scope1(graph1)
  scope2(graph2)

  master.clearRect(0, 0, width, height)
  master.fillRect(0, middle, width, middle)

  master.drawImage(board1.canvas, border, margin)
  master.drawImage(board2.canvas, border, margin + middle)

  tick(draw)
}

navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  const voice = audio.createMediaStreamSource(stream)

  voice.connect(crush)

  // Before
  scope1 = inspect(voice, true)

  // After
  scope2 = inspect(fader, true)

  tick(draw)
}).catch(({ name, message}) => {
  console.log(`${name}: ${message}`)
})
