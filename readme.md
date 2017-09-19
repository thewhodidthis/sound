## Sound
> Teeny tiny browser based baudio clone

### Setup
```sh
# Fetch latest from github repo
npm install thewhodidthis/sound
```

### Usage
```js
import createSignal from '@thewhodidthis/sound'

const TAU = Math.PI * 2

const shape = t => Math.sin(t * TAU * 440)
const sound = createSignal(shape)

let busy = false

document.addEventListener('click', () => {
  if (busy) {
    sound.disconnect()
  } else {
    sound.connect(sound.context.destination)
  }

  busy = !busy
}, false)
```
