// Basic bandpass cascade based formant synthesis emulator.
export function formant(target) {
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
