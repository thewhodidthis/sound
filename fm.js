// Encapsulates FM basics for a single voice.
export function fm(target) {
  const { context } = target
  const carrier = {
    vco: new OscillatorNode(context),
    vca: new GainNode(context),
  }

  const modulator = {
    vco: new OscillatorNode(context),
    vca: new GainNode(context),
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
