(function () {
'use strict';

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

  /* eslint no-sequences: 1 */
  return function () { return (copy(data), snap(data)); }
};

// # Sound
// Helps make baudio style monophonic musics

var createSignal = function (settings, callback) {
  if ( settings === void 0 ) settings = {};
  if ( callback === void 0 ) callback = function (v) { return v; };

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
var dummy = audio.createGain();
var input = audio.createBufferSource();

var bits = 16;
var lick = Math.pow(0.5, bits);
var freq = 0.1;

var fuzz = 0;
var last = 0;

var crush = createSignal({ context: audio }, function (t, i, g) {
  fuzz += freq;

  if (fuzz >= 1) {
    fuzz -= 1;
    last = lick * Math.floor((g / lick) + 0.5);
  }

  return last
});

fader.connect(audio.destination);
crush.connect(fader);

var canvas = document.querySelector('canvas');
var target = canvas.getContext('2d');
var buffer = canvas.cloneNode().getContext('2d');

buffer.lineWidth = 3;

var ref = target.canvas;
var w = ref.width;
var h = ref.height;

var sketch = function (offset) {
  if ( offset === void 0 ) offset = 0;

  var edge = 0.5 * h;
  var step = w / 128;
  var butt = 0.5 * step;

  return function (points) {
    buffer.beginPath();

    points.forEach(function (v, i) {
      var x = i * step;
      var y = Math.floor(v * edge) || 1;

      buffer.moveTo(butt + x, offset + y);
      buffer.lineTo(butt + x, offset - y);
    });

    buffer.strokeStyle = offset > h * 0.5 ? '#d00' : '#00d';
    buffer.stroke();
  }
};

var graph1 = sketch(h * 0.35);
var graph2 = sketch(h * 0.65);

// Dry
var scope1 = analyse(dummy, true, 0.25);

// Wet
var scope2 = analyse(fader, true, 0.25);

var update = function () {
  var a = scope1();
  var b = scope2();

  graph1(a);
  graph2(b);
};

var render = function () {
  target.clearRect(0, 0, w, h);
  target.drawImage(buffer.canvas, 0, 0);
  buffer.clearRect(0, 0, w, h);
};

/* eslint no-unused-vars: 1 */
var repeat = function () {
  update();
  render();

  window.requestAnimationFrame(repeat);
};

var launch = function (e, voice) {
  if ( voice === void 0 ) voice = input;

  if (e) {
    document.documentElement.classList.remove('is-frozen');
    document.removeEventListener('touchstart', launch);
  }

  voice.connect(crush);
  voice.connect(dummy);

  if (input.buffer && !input.playbackState) {
    input.start();
  }

  window.requestAnimationFrame(repeat);
};

var revert = function () {
  var request = new XMLHttpRequest();

  // The clip is from Stephen Fry's reading of `The Hitchhikers Guide to the Galaxy` by Douglas Adams
  // http://www.penguinrandomhouseaudio.com/book/670/the-hitchhikers-guide-to-the-galaxy/
  request.open('GET', 'clip.mp3', true);

  request.responseType = 'arraybuffer';
  request.onload = function (e) {
    audio.decodeAudioData(e.target.response, function (data) {
      input.buffer = data;
      input.loop = true;

      document.documentElement.classList.remove('is-mining');

      if ('ontouchstart' in window) {
        document.documentElement.classList.add('is-frozen');
        document.addEventListener('touchstart', launch);

        // Avoid spaces on mobile
        buffer.lineWidth = 5;
      } else {
        launch();
      }
    }, function () {
      document.documentElement.classList.add('is-broken');
    });
  };

  document.documentElement.classList.add('is-mining');

  request.send();
};

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    launch(false, audio.createMediaStreamSource(stream));
  }).catch(revert);
} else {
  revert();
}

}());

