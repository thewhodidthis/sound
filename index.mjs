// # Sound
// Helps make baudio style monophonic musics

const createSignal = (...args) => {
  const reply = args.pop() || (() => 0)
  const audio = args.shift() || new AudioContext()

  const bufferSize = 2048
  const sampleRate = audio.sampleRate
  const scriptProcessor = audio.createScriptProcessor(bufferSize, 1, 1)

  const process = ({ outputBuffer: outgoing, inputBuffer: incoming }) => {
    const prev = incoming.getChannelData(0)
    const next = outgoing.getChannelData(0)
    const stop = prev.length

    for (let i = 0; i < stop; i += 1) {
      const time = audio.currentTime
      const nick = i / sampleRate

      next[i] = reply(time + nick, i, prev[i])
    }
  }

  scriptProcessor.addEventListener('audioprocess', process)

  return scriptProcessor
}

export default createSignal
