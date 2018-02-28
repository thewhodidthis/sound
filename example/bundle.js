(function () {
'use strict';

// # Binocular
// Helps inspect sounds

const analyse = (node, fft = false, k = 1, fftSize = 256) => {
  if (node === undefined || !(node instanceof AudioNode)) {
    throw TypeError('Missing valid source')
  }

  // Create scope
  const analyser = node.context.createAnalyser();

  // Adjust scope
  analyser.fftSize = fftSize;

  // Avoids having to polyfill `AnalyserNode.getFloatTimeDomainData`
  const data = new Uint8Array(analyser.frequencyBinCount);

  // Decide type of data
  const copy = a => (fft ? analyser.getByteFrequencyData(a) : analyser.getByteTimeDomainData(a));

  // Center values 1 / 128 for waveforms or 1 / 256 for spectra
  const norm = v => (fft ? v * 0.00390625 : (v * 0.0078125) - 1) * k;

  // Produce normalized copy of data
  const snap = a => Float32Array.from(a, norm);

  // Connect
  node.connect(analyser);

  /* eslint no-sequences: 1 */
  return () => (copy(data), snap(data))
};

// # Sound
// Helps make baudio style monophonic musics

const createSignal = (settings = {}, callback = v => v) => {
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

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const audio = new AudioContext();
const fader = audio.createGain();
const dummy = audio.createGain();
const input = audio.createBufferSource();

const bits = 16;
const lick = Math.pow(0.5, bits);
const freq = 0.1;

let fuzz = 0;
let last = 0;

const crush = createSignal({ context: audio }, (t, i, g) => {
  fuzz += freq;

  if (fuzz >= 1) {
    fuzz -= 1;
    last = lick * Math.floor((g / lick) + 0.5);
  }

  return last
});

fader.connect(audio.destination);
crush.connect(fader);

const canvas = document.querySelector('canvas');
const target = canvas.getContext('2d');
const buffer = canvas.cloneNode().getContext('2d');

buffer.lineWidth = 3;

const { width: w, height: h } = target.canvas;

const sketch = (offset = 0) => {
  const edge = 0.5 * h;
  const step = w / 128;
  const butt = 0.5 * step;

  return (points) => {
    buffer.beginPath();

    points.forEach((v, i) => {
      const x = i * step;
      const y = Math.floor(v * edge) || 1;

      buffer.moveTo(butt + x, offset + y);
      buffer.lineTo(butt + x, offset - y);
    });

    buffer.strokeStyle = offset > h * 0.5 ? '#d00' : '#00d';
    buffer.stroke();
  }
};

const graph1 = sketch(h * 0.35);
const graph2 = sketch(h * 0.65);

// Dry
const scope1 = analyse(dummy, true, 0.25);

// Wet
const scope2 = analyse(fader, true, 0.25);

const update = () => {
  const a = scope1();
  const b = scope2();

  graph1(a);
  graph2(b);
};

const render = () => {
  target.clearRect(0, 0, w, h);
  target.drawImage(buffer.canvas, 0, 0);
  buffer.clearRect(0, 0, w, h);
};

const repeat = () => {
  update();
  render();

  window.requestAnimationFrame(repeat);
};

const launch = (e, voice = input) => {
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

const revert = () => {
  const request = new XMLHttpRequest();

  // The clip is from Samuel L. Jackson's reading of `A Rage in Harlem` by Chester Himes
  // https://soundcloud.com/audible/a-rage-in-harlem/
  request.open('GET', 'clip.mp3', true);

  request.responseType = 'arraybuffer';
  request.onload = (e) => {
    audio.decodeAudioData(e.target.response, (data) => {
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
    }, () => {
      document.documentElement.classList.add('is-broken');
    });
  };

  document.documentElement.classList.add('is-mining');

  request.send();
};

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    launch(false, audio.createMediaStreamSource(stream));
  }).catch(revert);
} else {
  revert();
}

}());
