import inspect from "@thewhodidthis/binocular"
import createSignal from "../main.js"

window.AudioContext = window.AudioContext || window.webkitAudioContext

const html = document.documentElement

document.addEventListener("click", () => {
  const canvas = document.querySelector("canvas")
  const { width, height } = canvas

  const finalContext = canvas.getContext("2d")
  const dummyContext = canvas.cloneNode().getContext("2d")

  // Avoid spaces on mobile
  dummyContext.lineWidth = "ontouchstart" in window ? 5 : 3

  const sketch = (offset = 0) => {
    const verticalMax = 0.5 * height
    const step = width / 128
    const halfStep = 0.5 * step

    return (points) => {
      dummyContext.beginPath()

      points.forEach((v, i) => {
        const x = i * step
        const y = Math.floor(v * verticalMax) || 1

        dummyContext.moveTo(halfStep + x, offset + y)
        dummyContext.lineTo(halfStep + x, offset - y)
      })

      dummyContext.strokeStyle = offset > height * 0.5 ? "#00d" : "#d00"
      dummyContext.stroke()
    }
  }

  const graphTop = sketch(height * 0.35)
  const graphBottom = sketch(height * 0.65)

  const audioContext = new AudioContext()
  const fader = audioContext.createGain()
  const dummy = audioContext.createGain()
  const input = audioContext.createBufferSource()

  const bits = 16
  const lick = Math.pow(0.5, bits)
  const freq = 0.1

  let fuzz = 0
  let last = 0

  const crush = createSignal({ context: audioContext }, (_t, _i, g) => {
    fuzz += freq

    if (fuzz >= 1) {
      fuzz -= 1
      last = lick * Math.floor((g / lick) + 0.5)
    }

    return last
  })

  fader.connect(audioContext.destination)
  crush.connect(fader)

  const inputInspector = inspect(dummy, true, 0.25)
  const outputInspector = inspect(fader, true, 0.25)

  const update = () => {
    const inputData = inputInspector()

    graphTop(inputData)

    const outputData = outputInspector()

    graphBottom(outputData)
  }

  const render = () => {
    finalContext.clearRect(0, 0, width, height)
    finalContext.drawImage(dummyContext.canvas, 0, 0)
    dummyContext.clearRect(0, 0, width, height)
  }

  const repeat = () => {
    update()
    render()

    window.requestAnimationFrame(repeat)
  }

  const start = () => {
    try {
      input.start()

      window.requestAnimationFrame(repeat)
    } catch (x) {
      console.log(x)
    }
  }

  const revert = () => {
    const request = new XMLHttpRequest()

    request.responseType = "arraybuffer"
    request.onload = (e) => {
      audioContext.decodeAudioData(e.target.response, (data) => {
        input.buffer = data
        input.loop = true

        input.connect(dummy)
        input.connect(crush)
        start()

        html.classList.remove("is-mining")
      }, () => {
        html.classList.add("is-broken")
      })
    }

    // The clip is from Samuel L. Jackson's reading of `A Rage in Harlem` by Chester Himes
    // https://soundcloud.com/audible/a-rage-in-harlem/
    request.open("GET", "clip.mp3", true)
    request.send()

    // Signal loading started
    html.classList.add("is-mining")
  }

  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaStreamSource = audioContext.createMediaStreamSource(stream)

        mediaStreamSource.connect(crush)
        mediaStreamSource.connect(dummy)
        start()
      })
      .catch(revert)
  } else {
    revert()
  }

  html.classList.remove("is-frozen")
}, { once: true })

// Prompt for user interaction to bypass autoplay restrictions
html.classList.add("is-frozen")
