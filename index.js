'use strict';

// # Sound
// Helps make baudio style monophonic musics

var createSignal = function (audio, reply, size) {
  if ( audio === void 0 ) audio = new AudioContext();
  if ( reply === void 0 ) reply = function () {};
  if ( size === void 0 ) size = 2048;

  var worker = audio.createScriptProcessor(size, 1, 1);
  var stride = 1 / audio.sampleRate;

  var tick = 0;

  var crunch = function (ref) {
    var outgoing = ref.outputBuffer;
    var incoming = ref.inputBuffer;

    var prev = incoming.getChannelData(0);
    var next = outgoing.getChannelData(0);
    var stop = prev.length;

    for (var i = 0; i < stop; i += 1) {
      next[i] = reply(tick * stride, i, prev[i]);

      tick += 1;
    }
  };

  worker.addEventListener('audioprocess', crunch);

  return worker
};

module.exports = createSignal;

