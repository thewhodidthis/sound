import { monocle, linear, animate } from '@thewhodidthis/binocular'
import createSignal from '../index.mjs'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const audio = new AudioContext()
const fader = audio.createGain()

fader.connect(audio.destination)

const bits = 16
const step = Math.pow(0.5, bits)
const freq = 0.1

let fuzz = 0
let last = 0

const crush = createSignal(audio, (t, i, g) => {
  fuzz += freq

  if (fuzz >= 1) {
    fuzz -= 1
    last = step * Math.floor((g / step) + 0.5)
  }

  return last
})

crush.connect(fader)

const master = document.querySelector('canvas').getContext('2d')
const board1 = master.canvas.cloneNode().getContext('2d')
const board2 = master.canvas.cloneNode().getContext('2d')

const { width, height } = master.canvas
const halfH = height * 0.5

board1.canvas.height = board2.canvas.height = halfH - 10
board2.strokeStyle = '#fff'

// Partials
let scope1

// Time domain
let scope2

const frame = animate(() => {
  scope1()
  scope2()

  master.clearRect(0, 0, width, height)
  master.fillRect(0, halfH, width, halfH)

  master.drawImage(board2.canvas, 0, halfH + 5)
  master.drawImage(board1.canvas, 0, 5)
})

navigator.mediaDevices.getUserMedia({ audio: true })
  .then((stream) => {
    const voice = audio.createMediaStreamSource(stream)

    scope1 = monocle(voice, board1, linear, true)
    scope2 = monocle(fader, board2, linear, true)

    voice.connect(crush)

    frame()
  })
  .catch(({ name, message}) => {
    console.log(`${name}: ${message}`)
  })
