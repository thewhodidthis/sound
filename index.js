'use strict';

// # Sound
// Helps make baudio style monophonic musics

var createAudioSignal = function () {
  var args = [], len = arguments.length;
  while ( len-- ) args[ len ] = arguments[ len ];

  var callback = args.pop() || (function () { return 0; });
  var audioContext = args.shift() || new AudioContext();

  var sampleRate = audioContext.sampleRate;
  var scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

  var tick = 0;

  var process = function (ref) {
    var outgoing = ref.outputBuffer;
    var incoming = ref.inputBuffer;

    var prev = incoming.getChannelData(0);
    var next = outgoing.getChannelData(0);
    var stop = prev.length;

    for (var i = 0; i < stop; i += 1) {
      next[i] = callback(tick / sampleRate, i, prev[i]);

      tick += 1;
    }
  };

  scriptProcessor.addEventListener('audioprocess', process);

  return scriptProcessor
};

module.exports = createAudioSignal;

