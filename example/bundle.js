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
  // Helps create baudio style monophonic musics

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

  const html = document.documentElement;

  document.addEventListener('click', () => {
    const canvas = document.querySelector('canvas');
    const { width, height } = canvas;

    const finalContext = canvas.getContext('2d');
    const dummyContext = canvas.cloneNode().getContext('2d');

    // Avoid spaces on mobile
    dummyContext.lineWidth = 'ontouchstart' in window ? 5 : 3;

    const sketch = (offset = 0) => {
      const verticalMax = 0.5 * height;
      const step = width / 128;
      const halfStep = 0.5 * step;

      return (points) => {
        dummyContext.beginPath();

        points.forEach((v, i) => {
          const x = i * step;
          const y = Math.floor(v * verticalMax) || 1;

          dummyContext.moveTo(halfStep + x, offset + y);
          dummyContext.lineTo(halfStep + x, offset - y);
        });

        dummyContext.strokeStyle = offset > height * 0.5 ? '#00d' : '#d00';
        dummyContext.stroke();
      }
    };

    const graphTop = sketch(height * 0.35);
    const graphBottom = sketch(height * 0.65);

    const audioContext = new AudioContext();
    const fader = audioContext.createGain();
    const dummy = audioContext.createGain();
    const input = audioContext.createBufferSource();

    const bits = 16;
    const lick = Math.pow(0.5, bits);
    const freq = 0.1;

    let fuzz = 0;
    let last = 0;

    const crush = createSignal({ context: audioContext }, (t, i, g) => {
      fuzz += freq;

      if (fuzz >= 1) {
        fuzz -= 1;
        last = lick * Math.floor((g / lick) + 0.5);
      }

      return last
    });

    fader.connect(audioContext.destination);
    crush.connect(fader);

    const inputInspector = analyse(dummy, true, 0.25);
    const outputInspector = analyse(fader, true, 0.25);

    const update = () => {
      const inputData = inputInspector();

      graphTop(inputData);

      const outputData = outputInspector();

      graphBottom(outputData);
    };

    const render = () => {
      finalContext.clearRect(0, 0, width, height);
      finalContext.drawImage(dummyContext.canvas, 0, 0);
      dummyContext.clearRect(0, 0, width, height);
    };

    const repeat = () => {
      update();
      render();

      window.requestAnimationFrame(repeat);
    };

    const start = () => {
      try {
        input.start();

        window.requestAnimationFrame(repeat);
      } catch (x) {
        console.log(x);
      }
    };

    const revert = () => {
      const request = new XMLHttpRequest();

      request.responseType = 'arraybuffer';
      request.onload = (e) => {
        audioContext.decodeAudioData(e.target.response, (data) => {
          input.buffer = data;
          input.loop = true;

          input.connect(dummy);
          input.connect(crush);
          start();

          html.classList.remove('is-mining');
        }, () => {
          html.classList.add('is-broken');
        });
      };

      // The clip is from Samuel L. Jackson's reading of `A Rage in Harlem` by Chester Himes
      // https://soundcloud.com/audible/a-rage-in-harlem/
      request.open('GET', 'clip.mp3', true);
      request.send();

      // Signal loading started
      html.classList.add('is-mining');
    };

    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const mediaStreamSource = audioContext.createMediaStreamSource(stream);

          mediaStreamSource.connect(crush);
          mediaStreamSource.connect(dummy);
          start();
        })
        .catch(revert);
    } else {
      revert();
    }

    html.classList.remove('is-frozen');
  }, { once: true });

  // Prompt for user interaction to bypass autoplay restrictions
  html.classList.add('is-frozen');

}());
