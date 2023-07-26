import { simplerandom, clamp } from "./helper.js"

// Helps granulate audio.
export function granular(target) {
  const { context, channelCount } = target

  return (buffer) => {
    function voice(position = 0, count = 20, volume = 0.75) {
      const cache = new OfflineAudioContext(channelCount, buffer.length, context.sampleRate)

      const spread = typeof this.seed === "number" ? this.spread : 0
      const rand = simplerandom(this.seed)
      const center = position * buffer.duration
      const range = spread * (buffer.duration - center)

      const lo = clamp(center - range, 0, buffer.duration)
      const hi = clamp(center + range, 0, buffer.duration)

      Array.from({ length: count }).forEach((_, i) => {
        const source = new AudioBufferSourceNode(cache, { buffer, detune: this.transpose * 1200 })
        const panner = new StereoPannerNode(cache, { pan: this.pan })

        const { currentTime } = cache

        // Low delays result in high density clouds.
        const delay = i * this.duration * this.delay
        const when = currentTime + delay

        // Should be center if no spread or seed disabled.
        const offset = when + rand(lo, hi)

        const r = this.duration * clamp(this.release)
        const a = this.duration * clamp(this.attack)

        const fader = cache.createGain()

        fader.gain.setValueAtTime(0, when)
        fader.gain.linearRampToValueAtTime(volume, when + a)
        fader.gain.linearRampToValueAtTime(0, when + r)

        source.connect(panner).connect(fader).connect(cache.destination)
        source.start(when, offset, this.duration)
      })

      return cache.startRendering()
    }

    return (options = {}) => voice.bind({
      // As a fraction of grain duration.
      attack: 0.1,
      // Per grain playback onset delay.
      delay: 1,
      // Grain duration in seconds.
      duration: 0.1,
      // Between -1 (left) and 1 (right).
      pan: 0,
      // As a fraction of grain duration.
      release: 0.5,
      // For predictably randomising offset around position.
      seed: 2,
      // As a fraction of total duration, ignored if seed not a number.
      spread: 0.9,
      // In octaves.
      transpose: 0,
      // Let user settings override defaults.
      ...options,
    })
  }
}
