// # Sound
// Helps make baudio style monophonic musics

const createSignal = (audio = new AudioContext(), reply = () => {}, size = 2048) => {
  const worker = audio.createScriptProcessor(size, 1, 1)
  const stride = 1 / audio.sampleRate

  let tick = 0

  const crunch = ({ outputBuffer: outgoing, inputBuffer: incoming }) => {
    const prev = incoming.getChannelData(0)
    const next = outgoing.getChannelData(0)
    const stop = prev.length

    for (let i = 0; i < stop; i += 1) {
      next[i] = reply(tick * stride, i, prev[i])

      tick += 1
    }
  }

  worker.addEventListener('audioprocess', crunch)

  return worker
}

export default createSignal
