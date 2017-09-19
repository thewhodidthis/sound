// # Sound
// Helps make baudio style monophonic musics

const createAudioSignal = (...args) => {
  const callback = args.pop() || (() => 0)
  const audioContext = args.shift() || new AudioContext()

  const sampleRate = audioContext.sampleRate
  const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1)

  let tick = 0

  const process = ({ outputBuffer: outgoing, inputBuffer: incoming }) => {
    const prev = incoming.getChannelData(0)
    const next = outgoing.getChannelData(0)
    const stop = prev.length

    for (let i = 0; i < stop; i += 1) {
      next[i] = callback(tick / sampleRate, i, prev[i])

      tick += 1
    }
  }

  scriptProcessor.addEventListener('audioprocess', process)

  return scriptProcessor
}

export default createAudioSignal
