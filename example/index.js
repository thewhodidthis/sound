(function () {
'use strict';

var draw = function (from, plot, base) {
  if ( base === void 0 ) base = 1;

  var ref = plot.canvas;
  var w = ref.width;
  var h = ref.height;

  var x = w * 0.5;
  var y = h * 0.5;

  var max = Math.max(w, h);
  var min = Math.min(w, h);
  var map = from(max, min, base);

  return function (feed) {
    plot.clearRect(0, 0, w, h);
    plot.save();
    plot.translate(x, y);
    plot.beginPath();

    Array.from(feed).map(map).forEach(function (ref) {
      var a = ref[0];
      var b = ref[1];

      plot.moveTo(a.x, a.y);
      plot.lineTo(b.x, b.y);
    });

    plot.stroke();
    plot.restore();
  }
};

var flat = function (span, room, base) { return function (v, i, ref) {
  var length = ref.length;

  var step = span / length;

  var q = step * i;
  var r = room * 0.5;
  var k = step * 0.5 * (length - 1);

  var x = q - k;
  var y = r * v || base;

  return [{ x: x, y: y }, { x: x, y: -1 * y }]
}; };


var across = function () {
  var args = [], len = arguments.length;
  while ( len-- ) args[ len ] = arguments[ len ];

  return draw.apply(void 0, [ flat ].concat( args ));
};

var analyse = function (node, fft, k, fftSize) {
  if ( fft === void 0 ) fft = false;
  if ( k === void 0 ) k = 1;
  if ( fftSize === void 0 ) fftSize = 256;

  if (node === undefined || !(node instanceof AudioNode)) {
    throw TypeError('Missing valid source')
  }

  // Create scope
  var analyser = node.context.createAnalyser();

  // Adjust scope
  analyser.fftSize = fftSize;

  // Avoids having to polyfill `AnalyserNode.getFloatTimeDomainData`
  var data = new Uint8Array(analyser.frequencyBinCount);

  // Decide type of data
  var copy = function (a) { return (fft ? analyser.getByteFrequencyData(a) : analyser.getByteTimeDomainData(a)); };

  // Center values 1 / 128 for waveforms or 1 / 256 for spectra
  var norm = function (v) { return (fft ? v * 0.00390625 : (v * 0.0078125) - 1) * k; };

  // Produce normalized copy of data
  var snap = function (a) { return Float32Array.from(a, norm); };

  // Connect
  node.connect(analyser);

  return function (draw) {
    if ( draw === void 0 ) draw = function (v) { return v; };

    copy(data);
    draw(snap(data));

    return analyser
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
board1.lineWidth = board2.lineWidth = 2;
board2.strokeStyle = '#fff';

var graph1 = across(board1);
var graph2 = across(board2);

var scope1;
var scope2;

var render = function () {
  scope1(graph1);
  scope2(graph2);

  master.clearRect(0, 0, width, height);
  master.fillRect(0, middle, width, middle);

  master.drawImage(board1.canvas, border, margin);
  master.drawImage(board2.canvas, border, margin + middle);

  window.requestAnimationFrame(render);
};

navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
  var voice = audio.createMediaStreamSource(stream);

  // Feed the beast
  voice.connect(crush);

  // Before
  scope1 = analyse(voice, true);

  // After
  scope2 = analyse(fader, true);

  window.requestAnimationFrame(render);
}).catch(function (ref) {
  var name = ref.name;
  var message = ref.message;

  console.log((name + ": " + message));
});

}());

