import inspect from '@thewhodidthis/binocular'
import createSignal from '../index.es'

window.AudioContext = window.AudioContext || window.webkitAudioContext

const audio = new AudioContext()
const fader = audio.createGain()
const dummy = audio.createGain()
const input = audio.createBufferSource()

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

fader.connect(audio.destination)
crush.connect(fader)

const canvas = document.querySelector('canvas')
const target = canvas.getContext('2d')
const buffer = canvas.cloneNode().getContext('2d')

buffer.lineWidth = 4

const { width: w, height: h } = target.canvas
const middle = h * 0.5

const sketch = (offset = 0) => {
  const grid = { x: w / 128, y: h * 0.25 }

  const spot = grid.y + offset
  const edge = middle + offset

  return (points) => {
    buffer.clearRect(0, offset, w, edge)
    buffer.beginPath()

    points.forEach((v, i) => {
      const x = i * grid.x
      const y = Math.floor(v * middle) || 1

      buffer.moveTo(2 + x, spot + y)
      buffer.lineTo(2 + x, spot - y)
    })

    buffer.stroke()
  }
}

const graph1 = sketch()
const graph2 = sketch(middle)

// Dry
const scope1 = inspect(dummy, true, 0.25)

// Wet
const scope2 = inspect(fader, true, 0.25)

const update = () => {
  const a = scope1()
  const b = scope2()

  graph1(a)
  graph2(b)
}

const render = () => {
  target.clearRect(0, 0, w, h)
  target.drawImage(buffer.canvas, 0, 0)
}

/* eslint no-unused-vars: 1 */
const repeat = () => {
  update()
  render()

  window.requestAnimationFrame(repeat)
}

const launch = (e, voice = input) => {
  if (e) {
    document.documentElement.classList.remove('is-frozen')
    document.removeEventListener('touchstart', launch)
  }

  voice.connect(crush)
  voice.connect(dummy)

  if (input.buffer && !input.playbackState) {
    input.start()
  }

  window.requestAnimationFrame(repeat)
}

const revert = () => {
  const request = new XMLHttpRequest()

  // The clip is from Stephen Fry's reading of `The Hitchhikers Guide to the Galaxy` by Douglas Adams
  // http://www.penguinrandomhouseaudio.com/book/670/the-hitchhikers-guide-to-the-galaxy/
  request.open('GET', 'clip.mp3', true)

  request.responseType = 'arraybuffer'
  request.onload = (e) => {
    audio.decodeAudioData(e.target.response, (data) => {
      input.buffer = data
      input.loop = true

      document.documentElement.classList.remove('is-mining')

      if ('ontouchstart' in window) {
        document.documentElement.classList.add('is-frozen')
        document.addEventListener('touchstart', launch)
      } else {
        launch()
      }
    }, () => {
      document.documentElement.classList.add('is-broken')
    })
  }

  document.documentElement.classList.add('is-mining')

  request.send()
}

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    launch(false, audio.createMediaStreamSource(stream))
  }).catch(revert)
} else {
  revert()
}
