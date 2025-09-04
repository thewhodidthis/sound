export default async function fx(context = new AudioContext()) {
  return {
    createProcessor: await createProcessor(context),
    createReverb: createReverb(context),
  }
}

// Helps run sample level FX math.
export async function createProcessor(context = new AudioContext()) {
  try {
    // This needs to be a separate file for things to work.
    await context.audioWorklet.addModule("processor.js")
  } catch (e) {
    throw e
  }

  return function processor(formula = new Function()) {
    // Will only accept string formatted options.
    return new AudioWorkletNode(context, "generic", {
      processorOptions: { formula: `return ${formula.toString()}` },
    })
  }
}

// Simple IR reverb lifted from MDN.
// developer.mozilla.org/en-US/docs/Web/API/ConvolverNode#convolvernode_example
export function createReverb(context = new AudioContext()) {
  return async function reverb(path = "") {
    try {
      const arraybuffer = await fetch(path).then(r => r.ok && r.arrayBuffer())
      const buffer = await context.decodeAudioData(arraybuffer)

      return new ConvolverNode(context, { buffer })
    } catch (e) {
      throw e
    }
  }
}
