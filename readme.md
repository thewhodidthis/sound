## Sound
> Ultra thin baudio style wrapper around `ScriptProcessorNode`

### Setup
```sh
# Fetch latest from github repo
npm install thewhodidthis/sound
```

### Usage
```js
import createSignal from '@thewhodidthis/sound'

const TAU = Math.PI * 2

const audio = new AudioContext()
const fader = audio.createGain()

const shape = t => Math.sin(t * TAU * 440)
const sound = createSignal(shape)

fader.gain.value = 0

sound.connect(fader)
fader.connect(audio.destination)

let busy = false

document.addEventListener('click', () => {
  const time = audio.currentTime

  if (busy) {
    fader.gain.setTargetAtTime(0, time, 0.25)
  } else {
    fader.gain.setTargetAtTime(1, time, 1)
  }

  busy = !busy
}, false)
```
