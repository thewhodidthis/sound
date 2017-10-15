'use strict';

// # Sound
// Helps make baudio style monophonic musics

const createSignal = (settings = {}, callback = (() => {})) => {
  const { bufferSize = 512, context = new AudioContext() } = settings;
  const crunch = typeof settings === 'function' ? settings : callback;

  const worker = context.createScriptProcessor(bufferSize, 1, 1);
  const stride = 1 / context.sampleRate;

  let tick = 0;

  worker.onaudioprocess = ({ outputBuffer: outgoing, inputBuffer: incoming }) => {
    const prev = incoming.getChannelData(0);
    const next = outgoing.getChannelData(0);
    const stop = prev.length;

    for (let i = 0; i < stop; i += 1) {
      next[i] = crunch(tick * stride, i, prev[i]);

      tick += 1;
    }
  };

  return worker
};

module.exports = createSignal;
