(() => {
  // ../node_modules/.pnpm/github.com+thewhodidthis+binocular@1ac46b5c0396b3d52de932ff92b0dac1b3efe5cf/node_modules/@thewhodidthis/binocular/main.js
  var analyse = (node, fft = false, k = 1, fftSize = 256) => {
    if (node === void 0 || !(node instanceof AudioNode)) {
      throw TypeError("Missing valid source");
    }
    const analyser = node.context.createAnalyser();
    analyser.fftSize = fftSize;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const copy = (a) => fft ? analyser.getByteFrequencyData(a) : analyser.getByteTimeDomainData(a);
    const norm = (v) => (fft ? v * 390625e-8 : v * 78125e-7 - 1) * k;
    const snap = (a) => Float32Array.from(a, norm);
    node.connect(analyser);
    return () => (copy(data), snap(data));
  };
  var main_default = analyse;

  // ../main.js
  var createSignal = (settings = {}, callback = (v) => v) => {
    const { bufferSize = 512, context = new AudioContext() } = settings;
    const crunch = typeof settings === "function" ? settings : callback;
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
    return worker;
  };
  var main_default2 = createSignal;

  // index.js
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var html = document.documentElement;
  document.addEventListener("click", () => {
    const canvas = document.querySelector("canvas");
    const { width, height } = canvas;
    const finalContext = canvas.getContext("2d");
    const dummyContext = canvas.cloneNode().getContext("2d");
    dummyContext.lineWidth = "ontouchstart" in window ? 5 : 3;
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
        dummyContext.strokeStyle = offset > height * 0.5 ? "#00d" : "#d00";
        dummyContext.stroke();
      };
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
    const crush = main_default2({ context: audioContext }, (_t, _i, g) => {
      fuzz += freq;
      if (fuzz >= 1) {
        fuzz -= 1;
        last = lick * Math.floor(g / lick + 0.5);
      }
      return last;
    });
    fader.connect(audioContext.destination);
    crush.connect(fader);
    const inputInspector = main_default(dummy, true, 0.25);
    const outputInspector = main_default(fader, true, 0.25);
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
      request.responseType = "arraybuffer";
      request.onload = (e) => {
        audioContext.decodeAudioData(e.target.response, (data) => {
          input.buffer = data;
          input.loop = true;
          input.connect(dummy);
          input.connect(crush);
          start();
          html.classList.remove("is-mining");
        }, () => {
          html.classList.add("is-broken");
        });
      };
      request.open("GET", "clip.mp3", true);
      request.send();
      html.classList.add("is-mining");
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(crush);
        mediaStreamSource.connect(dummy);
        start();
      }).catch(revert);
    } else {
      revert();
    }
    html.classList.remove("is-frozen");
  }, { once: true });
  html.classList.add("is-frozen");
})();
