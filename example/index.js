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

var linear = function (source, target) {
  var count = source.frequencyBinCount;
  var ref = target.canvas;
  var w = ref.width;
  var h = ref.height;

  var halfH = h * 0.5;
  var f = (h / 256) * 0.75;
  var g = Math.round(w / count);

  return function (values) {
    target.save();
    target.clearRect(0, 0, w, h);
    target.translate(0, halfH);

    target.beginPath();

    for (var i = 0; i < count; i += 1) {
      var x = i * g;
      var v = f * values[i];

      target.moveTo(x, v * 0.5);
      target.lineTo(x, v * 0.5 * -1);
      target.stroke();
    }

    target.restore();
  }
};

var radial = function (source, target) {
  var count = source.frequencyBinCount;
  var ref = target.canvas;
  var w = ref.width;
  var h = ref.height;

  var steps = 360 / count;
  var halfH = h * 0.5;
  var halfW = w * 0.5;

  var r = h * 0.325;
  var f = (h - r) / 256;

  return function (values) {
    target.save();
    target.clearRect(0, 0, w, h);
    target.translate(halfW, halfH);
    target.rotate(-0.25 * TAU);

    for (var i = 0; i < count; i += 1) {
      var angle = i * steps * deg;
      var v = f * values[i];

      var r1 = r - (v * 0.25);
      var r2 = r + (v * 0.25);
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

  var input = param[0];
  var board = param[1];
  var pitch = param[2]; if ( pitch === void 0 ) pitch = false;
  var fftSize = param[3]; if ( fftSize === void 0 ) fftSize = 256;

  var audio = input.context;
  var scope = audio.createAnalyser();

  scope.fftSize = fftSize;

  var bins = scope.frequencyBinCount;
  var data = new Uint8Array(bins);

  var copy = function (d) { return (pitch ? scope.getByteFrequencyData(d) : scope.getByteTimeDomainData(d)); };
  var draw = graph(scope, board);

  input.connect(scope);

  return function (extra) {
    copy(data);
    draw(data, extra);

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
var halfHeight = height * 0.5;

board1.canvas.height = board2.canvas.height = height * 0.5;
board2.strokeStyle = '#fff';

// Partials
var scope1;

// Time domain
var scope2;

var frame = animate(function () {
  scope1();
  scope2();

  master.clearRect(0, 0, width, height);
  master.fillRect(0, halfHeight, width, halfHeight);

  master.drawImage(board2.canvas, 0, halfHeight);
  master.drawImage(board1.canvas, 0, 0);
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

