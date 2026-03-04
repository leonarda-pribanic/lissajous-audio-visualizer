const processorCode = `
class LissajousProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkSize = 1024; // accumulate samples before sending to main thread
    this.leftChunk = new Float32Array(this.chunkSize);
    this.rightChunk = new Float32Array(this.chunkSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    // ensure we have a valid stereo input
    if (!input || input.length < 2) 
      return true;

    const left = input[0];
    const right = input[1];

    for (let i = 0; i < left.length; i++) {
      this.leftChunk[this.index] = left[i];
      this.rightChunk[this.index] = right[i];
      this.index++;

      // when our chunk is full, send it to the main thread
      if (this.index >= this.chunkSize) {
        this.port.postMessage({
          left: this.leftChunk.slice(),
          right: this.rightChunk.slice()
        });
        this.index = 0;
      }
    }
    return true; // keep the processor alive
  }
}
registerProcessor('lissajous-processor', LissajousProcessor); // let the main thread now this exists
`;

let audioCtx; // use Web Audio API directly
let workletNode;
let buffer = [];
const durationSec = 2; // show last 2 seconds

let isDarkMode = true;
let showGrid = true;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);

  try {
    // request stereo input
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 2,
        sampleRate: 44100,
        echoCancellation: false,
        noiseSuppression: false, // noise suppression distors signals
        autoGainControl: false,
      }
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // load the AudioWorklet from a blob URL
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(url);

    const source = audioCtx.createMediaStreamSource(stream);
    
    // instantiate the WorkletNode
    workletNode = new AudioWorkletNode(audioCtx, 'lissajous-processor');

    // listen for messages from the audio thread
    workletNode.port.onmessage = (event) => {
      const { left, right } = event.data;
      const now = millis();

      // calculate RMS
      let sumL = 0, sumR = 0;
      for (let i = 0; i < left.length; i++) {
        sumL += left[i] * left[i];
        sumR += right[i] * right[i];
      }
      const rmsL = Math.sqrt(sumL / left.length) || 1;
      const rmsR = Math.sqrt(sumR / right.length) || 1;

      // normalize and push to drawing buffer
      for (let i = 0; i < left.length; i++) {
        buffer.push({ 
            x: left[i] / rmsL, 
            y: right[i] / rmsR, 
            t: now 
        });
      }
    };

    // connect media stream  source to worklet node
    source.connect(workletNode);

    console.log("AudioWorklet initialized. Left/right channels streaming.");
  } catch (err) {
    console.error("Could not access stereo input:", err);
    alert("Could not access stereo input.");
  }
}

function draw() {
  // toggle background based on isDarkMode
  background(isDarkMode ? 0 : 255, 30);

  if (showGrid) drawGrid();

  const cutoff = millis() - durationSec * 1000;
  buffer = buffer.filter(p => p.t > cutoff);

  translate(width/2, height/2);
  strokeWeight(1);

  for (const p of buffer) {
    const age = millis() - p.t;
    const alpha = map(age, 0, durationSec*1000, 255, 0); // points fade
    
    // trace color changes based on mode
    stroke(isDarkMode ? 0 : 0, 255, 0, alpha); 
    point(p.x * 200, p.y * 200);
  }
}

function drawGrid() {
  push();
  stroke(isDarkMode ? 50 : 200);
  line(0, 0, width, 0);
  line(width/2, 0, width/2, height);
  line(0, height/2, width, height/2);
  pop();
}

// Handle key interactions
function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = fullscreen();
    fullscreen(!fs);
  }
  else if (key === 'm' || key === 'M') {
    isDarkMode = !isDarkMode;
    background(isDarkMode ? 0 : 255);
  }
  else if (key === 'g' || key === 'G') {
    showGrid = !showGrid;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (isDarkMode) {
    background(0);
  } else {
    background(255);
  }
}