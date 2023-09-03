var sound = (function(exports) {
  "use strict"

  // Helps run sample level FX math.
  async function createProcessor(context = new AudioContext()) {
    try {
      // This needs to be a separate file for things to work.
      await context.audioWorklet.addModule("processor.js")
    } catch (e) {
      throw e
    }

    return function processor(formula = new Function()) {
      // Will only accept string formatted options.
      return new AudioWorkletNode(context, "generic", {
        processorOptions: { formula: `return ${formula.toString()}` },
      })
    }
  }

  // Simple IR reverb lifted from MDN.
  // developer.mozilla.org/en-US/docs/Web/API/ConvolverNode#convolvernode_example
  function createReverb(context = new AudioContext()) {
    return async function reverb(path = "") {
      try {
        const arraybuffer = await fetch(path).then(r => r.ok && r.arrayBuffer())
        const buffer = await context.decodeAudioData(arraybuffer)

        return new ConvolverNode(context, { buffer })
      } catch (e) {
        throw e
      }
    }
  }

  // Helps analyse audio signals.
  function inspector(target, fft = false, k = 1, fftSize = 256) {
    const node = new AnalyserNode(target?.context, { fftSize })

    target?.connect(node)

    // Avoid having to polyfill `AnalyserNode.getFloatTimeDomainData`.
    const data = new Uint8Array(node?.frequencyBinCount)

    // Decide type of data.
    const copy = a => (fft ? node?.getByteFrequencyData(a) : node?.getByteTimeDomainData(a))

    // Center values: 1 / 128 for waveforms or 1 / 256 for spectra.
    const norm = v => (fft ? v * 0.00390625 : (v * 0.0078125) - 1) * k

    // Produce normalized copy of data.
    const snap = a => Float32Array.from(a, norm)

    /* eslint no-sequences: 1 */
    return () => (copy(data), snap(data))
  }

  // Basic bandpass cascade based formant synthesis emulator.
  function formant(target) {
    const { context } = target
    const source = new OscillatorNode(context, { frequency: 220, type: "sawtooth" })
    const options = { type: "bandpass" }

    const n1 = new BiquadFilterNode(context, options)
    const n2 = new BiquadFilterNode(context, options)
    const n3 = new BiquadFilterNode(context, options)

    source.connect(n1).connect(n2).connect(n3).connect(target)

    return function voice(...params) {
      const [f1 = 0, f2 = 0, f3 = 0, q1 = 1, q2 = 1, q3 = 1, a1 = 0, a2 = 0, a3 = 0] = params
      const { currentTime } = context

      n1.frequency.setValueAtTime(f1, currentTime)
      n2.frequency.setValueAtTime(f2, currentTime)
      n3.frequency.setValueAtTime(f3, currentTime)

      n1.Q.setValueAtTime(q1, currentTime)
      n2.Q.setValueAtTime(q2, currentTime)
      n3.Q.setValueAtTime(q3, currentTime)

      n1.gain.setValueAtTime(a1, currentTime)
      n2.gain.setValueAtTime(a2, currentTime)
      n3.gain.setValueAtTime(a3, currentTime)

      return source
    }
  }

  // Encapsulates FM basics for a single voice.
  function fm(target) {
    const { context } = target
    const carrier = {
      vco: context.createOscillator(),
      vca: context.createGain(),
    }

    const modulator = {
      vco: context.createOscillator(),
      vca: context.createGain(),
    }

    return function voice(frequency = 440, ratio = 1, depth = 80) {
      const { currentTime } = context

      carrier.vco.frequency.setValueAtTime(frequency, currentTime)
      carrier.vco.connect(carrier.vca).connect(target)

      modulator.vco.frequency.setValueAtTime(frequency * ratio, currentTime)
      modulator.vco.connect(modulator.vca)

      modulator.vca.gain.setValueAtTime(depth, currentTime)
      modulator.vca.connect(carrier.vco.frequency)

      return { carrier, modulator }
    }
  }

  // Adapted from en.wikipedia.org/wiki/Pseudorandom_number_generator
  function simplerandom(s = Math.random()) {
    return (l, h) => (s += 1) && (((s * 15485863 ** 3 % 2038074743) / 2038074743) * (h - l)) + l
  }

  function clamp(v = 0, lo = 0, hi = 1) {
    return Math.max(lo, Math.min(v, hi))
  }

  // Helps granulate audio.
  function granular(target) {
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

          // Low delays result in high density clouds.
          const delay = i * this.duration * this.delay
          const when = cache.currentTime + delay

          // Should be center if no spread or seed disabled.
          const offset = when + rand(lo, hi)

          const r = this.duration * clamp(this.release)
          const a = this.duration * clamp(this.attack)

          const fader = cache.createGain()

          fader.gain.setValueAtTime(0, when)
          fader.gain.linearRampToValueAtTime(volume, when + a)
          fader.gain.linearRampToValueAtTime(0, when + a + r)

          source.connect(panner).connect(fader).connect(cache.destination)
          source.start(when, offset, this.duration)
        })

        return cache.startRendering()
      }

      return (options = {}) =>
        voice.bind({
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

  // Helps create and set off `AudioParam` ADSR envelopes.
  function createTrigger(context = new AudioContext()) {
    return function trigger(p) {
      // Will also accept a `GainNode` argument.
      const param = p instanceof AudioParam ? p : p?.gain

      function on(target = 1, attack = 0.1, decay = 0.1, sustain = 1) {
        const { currentTime } = p.context

        param.cancelScheduledValues(0)
        param.linearRampToValueAtTime(target, currentTime + attack)
        param.linearRampToValueAtTime(target * sustain, currentTime + attack + decay)

        return this
      }

      function off(target = 0, release = 0.5) {
        const { currentTime } = p.context

        param.cancelScheduledValues(0)
        param.setValueAtTime(param.value, currentTime)
        param.linearRampToValueAtTime(target, currentTime + release)

        return this
      }

      return { on, off }
    }
  }

  exports.createProcessor = createProcessor
  exports.createReverb = createReverb
  exports.createTrigger = createTrigger
  exports.fm = fm
  exports.formant = formant
  exports.granular = granular
  exports.inspector = inspector

  return exports
})({})
