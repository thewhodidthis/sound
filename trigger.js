// Helps create and set off `AudioParam` ADSR envelopes.
export function createTrigger(context = new AudioContext()) {
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
