(function () {
'use strict';

var linearly = function (context) {
  var ref = context.canvas;
  var w = ref.width;
  var h = ref.height;

  // Vertical center
  var halfH = h * 0.5;

  // Available space
  var d = Math.min(w, h);

  // Base radius
  var r = d * 0.5;

  return function (values, weight) {
    var bins = values.length;
    var step = Math.round(w / bins);

    context.clearRect(0, 0, w, h);

    context.save();
    context.translate(0, halfH);
    context.beginPath();

    for (var i = 0; i < bins; i += 1) {
      var v = values[i];

      // Make sure a pixel is drawn when zero, doesn't look very nice otherwise
      var y = r * weight(v) || 1;
      var x = i * step;

      context.moveTo(x, y);
      context.lineTo(x, y * -1);
      context.stroke();
    }

    context.restore();
  }
};

var inspect = function (input, fft, fftSize) {
  if ( fft === void 0 ) fft = false;
  if ( fftSize === void 0 ) fftSize = 256;

  if (input === undefined || !(input instanceof AudioNode)) {
    throw TypeError('Missing valid source')
  }

  // Setup scope
  var inspector = input.context.createAnalyser();

  inspector.fftSize = fftSize;

  var bins = inspector.frequencyBinCount;
  var data = new Uint8Array(bins);

  // Center values 1 / 128 for waveforms or 1 / 256 for spectra
  var norm = function (v) { return (fft ? v * 0.00390625 : (v * 0.0078125) - 1); };

  // Decide type of data
  var copy = function (a) { return (fft ? inspector.getByteFrequencyData(a) : inspector.getByteTimeDomainData(a)); };

  // Connect
  input.connect(inspector);

  return function (draw) {
    if ( draw === void 0 ) draw = (function () {});

    copy(data);
    draw(data, norm);

    return inspector
  }
};

// # Sound
// Helps make baudio style monophonic musics

var createSignal = function (settings, callback) {
  if ( settings === void 0 ) settings = {};
  if ( callback === void 0 ) callback = (function () {});

  var bufferSize = settings.bufferSize; if ( bufferSize === void 0 ) bufferSize = 512;
  var context = settings.context; if ( context === void 0 ) context = new AudioContext();
  var crunch = typeof settings === 'function' ? settings : callback;

  var worker = context.createScriptProcessor(bufferSize, 1, 1);
  var stride = 1 / context.sampleRate;

  var tick = 0;

  worker.onaudioprocess = function (ref) {
    var outgoing = ref.outputBuffer;
    var incoming = ref.inputBuffer;

    var prev = incoming.getChannelData(0);
    var next = outgoing.getChannelData(0);
    var stop = prev.length;

    for (var i = 0; i < stop; i += 1) {
      next[i] = crunch(tick * stride, i, prev[i]);

      tick += 1;
    }
  };

  return worker
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

var crush = createSignal({ context: audio }, function (t, i, g) {
  fuzz += freq;

  if (fuzz >= 1) {
    fuzz -= 1;
    last = step * Math.floor((g / step) + 0.5);
  }

  return last
});

crush.connect(fader);

var canvas = document.querySelector('canvas');
var master = canvas.getContext('2d');
var board1 = canvas.cloneNode().getContext('2d');
var board2 = canvas.cloneNode().getContext('2d');

var width = canvas.width;
var height = canvas.height;

var middle = height * 0.5;
var border = (width - 512) * 0.5;
var margin = 10;

board1.canvas.height = board2.canvas.height = middle - (margin * 2);
board1.canvas.width = board2.canvas.width = width + (border * -2);
board2.strokeStyle = '#fff';

var graph1 = linearly(board1);
var graph2 = linearly(board2);

var scope1;
var scope2;

var tick = function (fn) { return window.requestAnimationFrame(fn); };
var draw = function () {
  scope1(graph1);
  scope2(graph2);

  master.clearRect(0, 0, width, height);
  master.fillRect(0, middle, width, middle);

  master.drawImage(board1.canvas, border, margin);
  master.drawImage(board2.canvas, border, margin + middle);

  tick(draw);
};

navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
  var voice = audio.createMediaStreamSource(stream);

  voice.connect(crush);

  // Before
  scope1 = inspect(voice, true);

  // After
  scope2 = inspect(fader, true);

  tick(draw);
}).catch(function (ref) {
  var name = ref.name;
  var message = ref.message;

  console.log((name + ": " + message));
});

}());

