## about

Simple as possible JS modules to help create, process, and inspect sounds using the Web Audio API.

## setup

Load via script tag:

```html
<!-- Just an IIFE namespaced `sound` -->
<script src="https://thewhodidthis.github.io/sound/sound.js"></script>
```

Download from GitHub directly, using _npm_ for example:

```sh
# Add to package.json
npm install thewhodidthis/sound
```

Source from an import map:

```json
{
  "imports": {
    "@thewhodidthis/sound": "https://thewhodidthis.github.io/sound/main.js"
  }
}
```

## usage, overview

Since an `AudioContext` is very much required when dealing with the Web Audio API, all exports expect an instance of it to begin with either directly or implicitly via `AudioNode.context` as is the case with the [synth](#synth) and [inspector](#inspector) modules. There are seven modules available each of which may be imported separately as required:

1. [**inspector**](#inspector)
2. [**synth**](#synth)
   1. [_fm_](#fm)
   2. [_formant_](#formant)
   3. [_granular_](#granular)
3. [**fx**](#fx)
4. [**trigger**](#trigger)

### inspector

Takes care of some of the boilerplate involved in creating an `AnalyserNode` for monitoring web audio signals, be it in the time or frequency domains. The default and only export expects an `AudioNode` and once initialized returns a closure meant to be called repeatedly for reading in new data. For example:

```html
<script type="module">
  import inspector from "https://thewhodidthis.github.io/sound/inspector.js"

  // Draw a sine wave bar chart.
  const drawing = document.createElement("canvas").getContext("2d")
  const { width, height } = drawing.canvas

  document.body.appendChild(drawing.canvas)
  document.addEventListener("click", () => {
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()

    oscillator.connect(audio.destination)
    oscillator.start()

    const scope = inspector(oscillator)

    self.requestAnimationFrame(function draw() {
      const data = scope()

      drawing.clearRect(0, 0, width, height)

      for (const [i, v] of data.entries()) {
        const x = 2 * i
        const y = 0.5 * height
        const w = 1
        const h = 0.5 * height * v

        drawing.fillRect(x, y, w, h)
      }

      self.requestAnimationFrame(draw)
    })
  }, { once: true })
</script>
<body></body>
```

### synth

A hollow container module that re-exports the following:

#### fm

Encapsulates FM basics for a single voice. Takes an `AudioNode` output target and returns a closure that can then be called with a base frequency, modulation index, and modulation depth as arguments to get back a pair of `carrier` and `modulator` objects featuring  `vco` and `vca` keys of `OscillatorNode` and `GainNode` types.

```html
<script type="module">
  import { fm } from "https://thewhodidthis.github.io/sound/synth.js"

  // Browsers require user interaction to initiate audio playback.
  b.addEventListener("click", function play() {
    const audio = new AudioContext()
    const fader = new GainNode(audio, { gain: 0 })

    const voice = fm(fader)

    // The arguments are: frequency, modulator-to-carrier frequency ratio, modulation depth.
    const { carrier, modulator } = voice(440, Math.random(), 120)

    fader.connect(audio.destination)
    carrier.vco.start()
    modulator.vco.start()

    fader.gain.linearRampToValueAtTime(0.5, audio.currentTime + 0.1)
    fader.gain.linearRampToValueAtTime(0, audio.currentTime + 2)

    // Cut off the oscillators once fade completes.
    setTimeout(() => {
      modulator.vco.stop()
      carrier.vco.stop()
      b.removeAttribute("disabled")
    }, 2250)

    b.setAttribute("disabled", "")
  })
</script>
<button id="b">Play</button>
```

#### formant

A simple formant synthesis emulator using three band-pass filters in series. Takes an `AudioNode` output target and returns a closure that accepts nine optional arguments: `f1`, `f2`, `f3`, `q1`, `q2`, `q3`, `a1`, `a2`, and `a3` representing the frequencies, Q factors, and gain values for each filter. For example:

```html
<script type="module">
  import { formant } from "https://thewhodidthis.github.io/sound/synth.js"

  const presets = {
    // Found in the Csound manual appendix D tables 16 - 20.
    // https://csound.com/docs/manual/MiscFormants.html
    a: {
      f: [800, 1150, 2900],
      a: [0, -6, -32],
      q: [80, 90, 120],
    },
    e: {
      f: [350, 2000, 2800],
      a: [0, -20, -15],
      q: [60, 100, 120],
    },
    i: {
      f: [270, 2140, 2950],
      a: [0, -12, -26],
      q: [60, 90, 100],
    },
    o: {
      f: [450, 800, 2830],
      a: [0, -11, -22],
      q: [40, 80, 100],
    },
    u: {
      f: [325, 700, 2700],
      a: [0, -16, -35],
      q: [50, 60, 170],
    },
  }

  form.addEventListener("submit", function play(e) {
    const audio = new AudioContext()
    const fader = new GainNode(audio, { gain: 0 })

    const formdata = new FormData(e.target)
    const key = formdata.get("s")

    if (key in presets) {
      const { f, q, a } = presets[key]
      const voice = formant(fader)
      const source = voice(...f, ...q, ...a)

      fader.connect(audio.destination)
      source.start()

      const { currentTime: t } = audio

      // Needs to be way up!
      fader.gain.linearRampToValueAtTime(10 ** 5, t + 0.1)
      fader.gain.linearRampToValueAtTime(0, t + 0.5)

      setTimeout(() => {
        source.stop()
        b.removeAttribute("disabled")
      }, 1000)

      b.setAttribute("disabled", "")
      e.preventDefault()
    }
  })
</script>
<form id="form">
  <input
    list="vowels"
    id="s"
    name="s"
    placeholder="Choose a vowel"
    pattern="[aeiou]{1}"
    required>
  <datalist id="vowels">
    <option value="a">a</option>
    <option value="e">e</option>
    <option value="i">i</option>
    <option value="o">o</option>
    <option value="u">u</option>
  </datalist>
  <input id="b" type="submit" value="Play">
</form>
```

#### granular

Tries to improve on other JS plugins of the kind by leveraging the `OfflineAudioContext` interface for dicing the grains, by not requiring the input sample be sourced from file, and by including a standard PRNG for more predictable results.

First pass in an `AudioNode` out which the `AudioContext` and number of channels are inferred. Then give it an `AudioBuffer` source and get back a closure. Then it's time to configure playback. The default settings are:

| Key  | Value | Description |
| :--- | :---  | :---    |
| `attack` | `0.1` | As a fraction of grain duration. |
| `delay` | `1` | Per grain playback onset delay. |
| `duration` | `0.1` | Grain duration in seconds. |
| `pan` | `0` | Between -1 (left) and 1 (right). |
| `release` | `0.5` | As a fraction of grain duration. |
| `seed` | `2` | For predictably randomising offset around position. |
| `spread` | `0.9` | As a fraction of total duration, ignored if seed not a number. |
| `transpose` | `0` | Pitch shift in octaves. |

For example:

```html
<script type="module">
  import { granular } from "https://thewhodidthis.github.io/sound/synth.js"

  // Source: https://archive.org/details/KmudshortwaveMojavePhoneBoothBroadcast
  const radio = {
    base: "https://ia803000.us.archive.org/22/items/KmudshortwaveMojavePhoneBoothBroadcast",
    broadcast: "22_HAARP_6792_kHz_moonbounce_reception_18_Jan_08_0509_utc.mp3",
    toString() {
      return this.base.concat("/", this.broadcast)
    }
  }

  const clip = await fetch(radio).then(r => r.ok && r.arrayBuffer())

  b.addEventListener("click", play, { once: true })
  b.replaceChildren("Play")
  b.removeAttribute("disabled")

  async function play(e) {
    const audio = new AudioContext()
    const fader = new GainNode(audio, { gain: 0.5 })

    fader.connect(audio.destination)

    const granulate = granular(fader)
    const data = await audio.decodeAudioData(clip)
    const voice = granulate(data)
    const cloud = voice({ seed: Math.random(), transpose: 2, attack: 0.2 })
    const buffer = await cloud(0.5, 80)

    const source = new AudioBufferSourceNode(audio, {
      buffer,
      loop: true,
      loopStart: 4,
      loopEnd: 8
    })

    source.connect(fader)
    source.start()

    this.replaceChildren("Pause")
    this.addEventListener("click", function pause() {
      this.addEventListener("click", play, { once: true })
      this.replaceChildren("Play")

      source.stop()
    }, { once: true })
  }
</script>
<button id="b" disabled>Loading&hellip;</button>
```

### fx

The [example script](example.js) illustrates how to prep and combine these:

| Export | Description |
| :---   | :---        |
| `createProcessor` | Sample level code golf style effects unit that takes an `AudioContext`, installs an `AudioWorklet`, and returns a closure that expects a callback representing the desired processing formula and which is forwarded arguments for: _time_, _index_, current and previous samples, or `t`, `i`, `n`, `a`. |
| `createReverb` | An IR based reverb using the `ConvolverNode` interface. Pass it the URL to an impulse response audio file after initializing with an `AudioContext`, no configuration required. |
| `default` | Convenience wrapper for initializing the effects units with a base context. |

### trigger

Makes it easier to create and set off ADSR envelopes. Pass in an `AudioContext` on first call and give the resulting closure an `AudioParam` or `GainNode` instance to get an object with `on` and `off` methods attached in return. These are chainable and both accept a target gain value as the first argument followed by the timings in seconds for each stage. For example:

```html
<script type="module">
  import { createTrigger } from "https://thewhodidthis.github.io/sound/trigger.js"

  b.addEventListener("click", function play() {
    const audio = new AudioContext()
    const oscillator = new OscillatorNode(audio, { type: "square", frequency: "110" })
    const fader = new GainNode(audio, { gain: 0 })

    const trigger = createTrigger(audio)(fader)

    oscillator.connect(fader).connect(audio.destination)
    oscillator.start()
    // Target gain, attack, decay, sustain
    trigger.on(0.2, 0.1, 0.1, 0.2)

    setTimeout(() => {
      // End gain, release
      trigger.off(0, 0.4)
    }, 800)
  }, { once: true })
</script>
<button id="b">Bang</button>
```

## see also

- [@thewhodidthis/picture](https://github.com/thewhodidthis/picture/)
- [@thewhodidthis/glx](https://github.com/thewhodidthis/glx/)
