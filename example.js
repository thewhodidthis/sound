import inspector from "./inspector.js"
import fx from "./fx.js"

const drawing = document.createElement("canvas").getContext("2d")
const video = document.querySelector("video")
const { width, height } = video

// These effectively reset the drawing context, so they need to come first.
drawing.canvas.height = height
drawing.canvas.width = width

// Avoid spaces on mobile.
drawing.lineWidth = "ontouchstart" in self ? 5 : 3

const { backgroundColor } = self.getComputedStyle(video)

drawing.fillStyle = backgroundColor

// Chrome needs this to jump out of loading spinner mode.
drawing.fillRect(0, 0, width, height)

// User action required for audio playback to work without problems.
video.addEventListener("click", async function start() {
  const audio = new AudioContext()

  const destination = audio.createMediaStreamDestination()
  const [track] = destination.stream.getAudioTracks()

  video?.srcObject?.addTrack(track)

  const fader = audio.createGain()
  const dummy = audio.createGain()

  fader.gain.setValueAtTime(0.5, audio.currentTime)
  fader.connect(destination)

  const { createReverb, createProcessor } = await fx(audio)
  const crusher = createProcessor((_, i, n, a) => {
    // Needs to be inside the closure to be recognized when stringifying the callback.
    const k = Math.pow(0.5, 16)

    // Corrupt signal every ten samples.
    return i % 10 === 0 ? k * Math.floor((n / k) + 0.5) : a
  })

  // www.openair.hosted.york.ac.uk/?page_id=483
  const reverb = await createReverb("ir.wav")

  crusher.connect(reverb).connect(fader)

  const graphs = [inspector(dummy, 1, 0.25), inspector(fader, 1, 0.25)]
  const step = width / 128
  const halfstep = 0.5 * step
  const mid = 0.5 * height

  const loop = () => {
    drawing.fillRect(0, 0, width, height)
    graphs.forEach((graph, j) => {
      const points = graph()
      const sign = j % 2 === 0 ? 1 : -1
      const offset = height * (0.25 + (j * 0.5) + (sign * 0.1))

      drawing.beginPath()
      points.forEach((v, i) => {
        const x = i * step
        const y = Math.floor(v * mid) || 1

        drawing.moveTo(halfstep + x, offset + y)
        drawing.lineTo(halfstep + x, offset - y)
      })

      drawing.strokeStyle = offset > mid ? "yellow" : "white"
      drawing.stroke()
    })

    this.dataset.frame = self.requestAnimationFrame(loop)
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audio.createMediaStreamSource(stream)

    source.connect(crusher)
    source.connect(dummy)
  } catch {
    // The clip is from Stephen Fry's reading of "The Hitchhiker's Guide to the Galaxy" by Douglas Adams.
    // www.penguinrandomhouseaudio.com/book/670/the-hitchhikers-guide-to-the-galaxy
    const data = await fetch("clip.mp3").then(r => r.ok && r.arrayBuffer())
    const buffer = await audio.decodeAudioData(data)

    const source = new AudioBufferSourceNode(audio, { buffer, loop: true })

    source.connect(crusher)
    source.connect(dummy)
    source.start()
  }

  this.onpause = () => audio.suspend().then(() => {
    this.dataset.frame = self.cancelAnimationFrame(this.dataset.frame) ?? -1
  })

  this.onplay = () => audio.resume().then(() => {
    this.dataset.frame = self.requestAnimationFrame(loop)
  })

  // Protect against starting multiple rAF loops on Chrome in particular.
  if (!this.paused && !this.dataset.frame) {
    this.dataset.frame = self.requestAnimationFrame(loop)
  }
}, { once: true })

video.srcObject = drawing.canvas.captureStream(50)
video.onplay = function onplay() {
  // Because Chrome seems to be eating up control bar click events.
  if (this.audioTracks === undefined) {
    // Skip on Safari.
    this.click()
  }
}
