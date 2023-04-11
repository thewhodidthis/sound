class GenericProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()

    // Time, index, current sample, last sample.
    this.filter = new Function("t", "i", "n", "a", options.processorOptions.formula)()
  }
  process(inputs, outputs) {
    inputs.forEach((input) => {
      input.forEach((inputchannel) => {
        outputs.forEach((output) => {
          output.forEach((outputchannel) => {
            inputchannel.reduce((a, n, i) => {
              outputchannel[i] = this.filter(globalThis.currentTime, i, n, a)

              return outputchannel[i]
            })
          })
        })
      })
    })

    return true
  }
}

registerProcessor("generic", GenericProcessor)
