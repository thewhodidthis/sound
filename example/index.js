(function () {
'use strict';

var animate = function (callback, count) {
  if ( count === void 0 ) count = 1;

  var frameId;

  var play = function (fn) { return window.requestAnimationFrame(fn); };
  var stop = function () { return window.cancelAnimationFrame(frameId); };
  var loop = function () {
    if (frameId % count === 0) {
      callback(frameId);
    }

    if (frameId) {
      frameId = play(loop);
    }
  };

  // Toggle
  return function () {
    frameId = (frameId === undefined) ? play(loop) : stop();

    return frameId
  }
};

var TAU = Math.PI * 2;
var deg = TAU / 360;

var linear = function (source, target, adjust) {
  var count = source.frequencyBinCount;
  var ref = target.canvas;
  var w = ref.width;
  var h = ref.height;

  // Vertical center
  var halfH = h * 0.5;

  // Diameter, available space
  var d = Math.min(w, h);

  // Radius
  var r = d * 0.5;

  // Horizontal step multiplier
  var s = Math.round(w / count);

  return function (values) {
    target.clearRect(0, 0, w, h);

    target.save();
    target.translate(0, halfH);
    target.beginPath();

    for (var i = 0; i < count; i += 1) {
      var v = values[i];

      // Make sure a pixel is drawn when zero, doesn't look very nice otherwise
      var y = (r * adjust(v)) + 1;
      var x = i * s;

      target.moveTo(x, y);
      target.lineTo(x, y * -1);
      target.stroke();
    }

    target.restore();
  }
};

var radial = function (source, target, adjust) {
  var count = source.frequencyBinCount;
  var ref = target.canvas;
  var w = ref.width;
  var h = ref.height;

  var steps = 360 / count;
  var halfH = h * 0.5;
  var halfW = w * 0.5;

  // Figure out available space
  var d = Math.min(w, h);

  // Base radius
  var r = d * 0.325;

  // Precalculate multiplier
  var f = r * 0.5;

  return function (values) {
    target.clearRect(0, 0, w, h);

    target.save();
    target.translate(halfW, halfH);
    target.rotate(-0.25 * TAU);

    for (var i = 0; i < count; i += 1) {
      var angle = i * steps * deg;
      var v = values[i];
      var k = adjust(v) * f;

      var r1 = r - k;
      var r2 = r + k;
      var x1 = r1 * Math.cos(angle);
      var y1 = r1 * Math.sin(angle);
      var x2 = r2 * Math.cos(angle);
      var y2 = r2 * Math.sin(angle);

      target.beginPath();
      target.moveTo(x1, y1);
      target.lineTo(x2, y2);
      target.stroke();
    }

    target.restore();
  }
};

var monocle = function () {
  var param = [], len = arguments.length;
  while ( len-- ) param[ len ] = arguments[ len ];

  var graph = radial;

  param.forEach(function (v, i) {
    if (typeof v === 'function') {
      param.splice(i, 1);
      graph = v;
    }
  });

  // No matter where the callback in found in the arguments, at least specify these in order
  var input = param[0];
  var board = param[1];
  var pitch = param[2]; if ( pitch === void 0 ) pitch = false;
  var fftSize = param[3]; if ( fftSize === void 0 ) fftSize = 256;

  var audio = input.context;
  var scope = audio.createAnalyser();

  // Center values based on whether in the time or frequency domain (1 / 128 or 1 / 256)
  var scale = function (v) { return (pitch ? v * 0.00390625 : (v * 0.0078125) - 1); };

  scope.fftSize = fftSize;

  var bins = scope.frequencyBinCount;
  var data = new Uint8Array(bins);

  var copy = function (d) { return (pitch ? scope.getByteFrequencyData(d) : scope.getByteTimeDomainData(d)); };
  var draw = graph(scope, board, scale);

  input.connect(scope);

  return function (xtra) {
    copy(data);
    draw(data, xtra);

    return scope
  }
};

// # Sound
// Helps make baudio style monophonic musics

var createSignal = function () {
  var args = [], len = arguments.length;
  while ( len-- ) args[ len ] = arguments[ len ];

  var reply = args.pop() || (function () { return 0; });
  var audio = args.shift() || new AudioContext();

  var bufferSize = 2048;
  var sampleRate = audio.sampleRate;
  var scriptProcessor = audio.createScriptProcessor(bufferSize, 1, 1);

  var process = function (ref) {
    var outgoing = ref.outputBuffer;
    var incoming = ref.inputBuffer;

    var prev = incoming.getChannelData(0);
    var next = outgoing.getChannelData(0);
    var stop = prev.length;

    for (var i = 0; i < stop; i += 1) {
      var time = audio.currentTime;
      var nick = i / sampleRate;

      next[i] = reply(time + nick, i, prev[i]);
    }
  };

  scriptProcessor.addEventListener('audioprocess', process);

  return scriptProcessor
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audio = new AudioContext();
var fader = audio.createGain();

fader.connect(audio.destination);

var bits = 16;
var step = Math.pow(0.5, bits);
var freq = 0.1;

var fuzz = 0;
var last = 0;

var crush = createSignal(audio, function (t, i, g) {
  fuzz += freq;

  if (fuzz >= 1) {
    fuzz -= 1;
    last = step * Math.floor((g / step) + 0.5);
  }

  return last
});

crush.connect(fader);

var master = document.querySelector('canvas').getContext('2d');
var board1 = master.canvas.cloneNode().getContext('2d');
var board2 = master.canvas.cloneNode().getContext('2d');

var ref = master.canvas;
var width = ref.width;
var height = ref.height;
var middle = height * 0.5;
var margin = 10;

board1.canvas.height = board2.canvas.height = middle - (margin * 2);
board2.strokeStyle = '#fff';

// Partials
var scope1;

// Time domain
var scope2;

var frame = animate(function () {
  scope1();
  scope2();

  master.clearRect(0, 0, width, height);
  master.fillRect(0, middle, width, middle);

  master.drawImage(board1.canvas, 0, margin);
  master.drawImage(board2.canvas, 0, margin + middle);
});

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function (stream) {
    var voice = audio.createMediaStreamSource(stream);

    scope1 = monocle(voice, board1, linear, true);
    scope2 = monocle(fader, board2, linear, true);

    voice.connect(crush);

    frame();
  })
  .catch(function (ref) {
    var name = ref.name;
    var message = ref.message;

    console.log((name + ": " + message));
  });

}());

