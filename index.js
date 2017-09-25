'use strict';

// # Sound
// Helps make baudio style monophonic musics

var createSignal = function () {
  var args = [], len = arguments.length;
  while ( len-- ) args[ len ] = arguments[ len ];

  var reply = args.pop() || (function () { return 0; });
  var audio = args.shift() || new AudioContext();

  var bufferSize = 1024;
  var sampleRate = audio.sampleRate;
  var scriptProcessor = audio.createScriptProcessor(bufferSize, 1, 1);

  var process = function (ref) {
    var outgoing = ref.outputBuffer;
    var incoming = ref.inputBuffer;

    var prev = incoming.getChannelData(0);
    var next = outgoing.getChannelData(0);
    var stop = prev.length;

    for (var i = 0; i < stop; i += 1) {
      var now = audio.currentTime;
      var fix = i / sampleRate;

      next[i] = reply(now + fix, i, prev[i]);
    }
  };

  scriptProcessor.addEventListener('audioprocess', process);

  return scriptProcessor
};

module.exports = createSignal;

