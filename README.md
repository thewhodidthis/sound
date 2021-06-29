## about

Ultra thin [baudio](https://github.com/substack/baudio) style wrapper around `ScriptProcessorNode` good for lo-fi math music.

## setup

Fetch latest from GitHub directly:

```sh
# Includes ESM and CJS versions
npm install thewhodidthis/sound
```

## usage

Give it a callback accepting a time argument and returning an amplitude for each sample, and connect the returning node to the rest of your Web Audio patch. For example,

```js
import createSignal from '@thewhodidthis/sound'

const audio = new AudioContext()
const fader = audio.createGain()

const sound = createSignal(t => Math.sin(t * Math.PI * 880))

fader.gain.value = 0

sound.connect(fader)
fader.connect(audio.destination)

let isBusy = false

document.addEventListener('click', () => {
  const time = audio.currentTime

  if (isBusy) {
    fader.gain.setTargetAtTime(0, time, 0.25)
  } else {
    fader.gain.setTargetAtTime(1, time, 1)
  }

  isBusy = !isBusy
}, false)
```
