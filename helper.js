// Adapted from en.wikipedia.org/wiki/Pseudorandom_number_generator
export function simplerandom(s = Math.random()) {
  return (l, h) => (s += 1) && (((s * 15485863 ** 3 % 2038074743) / 2038074743) * (h - l)) + l
}

export function soundloader(path = "") {
  return fetch(path).then(r => r.ok && r.arraybuffer())
}

export function clamp(v = 0, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(v, hi))
}
