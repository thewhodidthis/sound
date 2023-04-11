// Helps analyse audio signals.
export default function inspector(target, fft = false, k = 1, fftSize = 256) {
  const node = new AnalyserNode(target?.context, { fftSize })

  target?.connect(node)

  // Avoid having to polyfill `AnalyserNode.getFloatTimeDomainData`.
  const data = new Uint8Array(node?.frequencyBinCount)

  // Decide type of data.
  const copy = a => (fft ? node?.getByteFrequencyData(a) : node?.getByteTimeDomainData(a))

  // Center values: 1 / 128 for waveforms or 1 / 256 for spectra.
  const norm = v => (fft ? v * 0.00390625 : (v * 0.0078125) - 1) * k

  // Produce normalized copy of data.
  const snap = a => Float32Array.from(a, norm)

  /* eslint no-sequences: 1 */
  return () => (copy(data), snap(data))
}
