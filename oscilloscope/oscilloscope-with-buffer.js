let audioCtx;
let isStarted = false;
let waveL = new Float32Array(0);
let waveR = new Float32Array(0);
let smoothedPeakL = 0.05;
let smoothedPeakR = 0.05;

const processorCode = `
class OscilloscopeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.leftBuffer = new Float32Array(this.bufferSize);
    this.rightBuffer = new Float32Array(this.bufferSize);
    this.pointer = 0;
  }
  process(inputs) {
    const input = inputs[0]; 
    if (!input || input.length === 0) return true;
    const left = input[0];
    const right = input[1] || input[0]; 
    for (let i = 0; i < left.length; i++) {
      this.leftBuffer[this.pointer] = left[i];
      this.rightBuffer[this.pointer] = right[i];
      this.pointer++;
      if (this.pointer >= this.bufferSize) {
        this.port.postMessage({
          left: this.leftBuffer.slice(),
          right: this.rightBuffer.slice()
        });
        this.pointer = 0;
      }
    }
    return true;
  }
}
registerProcessor('osc-processor', OscilloscopeProcessor);
`;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  initAudio();
}

async function initAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: false, 
        noiseSuppression: false, 
        autoGainControl: false 
      } 
    });

    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(moduleUrl);
    
    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, 'osc-processor');

    workletNode.port.onmessage = (e) => {
      waveL = e.data.left;
      waveR = e.data.right;
    };

    source.connect(workletNode);
    isStarted = true;
    console.log("Audio Context and Worklet started.");
  } catch (err) {
    console.warn("Audio initialization failed.", err);
  }
}

function draw() {
  background(0, 80); 

  smoothedPeakL = drawWave(waveL, color(0, 255, 150), height * 0.25, smoothedPeakL); 
  smoothedPeakR = drawWave(waveR, color(255, 100, 0), height * 0.75, smoothedPeakR); 
  
  stroke(60);
  line(0, height / 2, width, height / 2);
}

function drawWave(data, strokeCol, centerY, prevSmoothedPeak) {
  if (!data || data.length === 0) 
    return prevSmoothedPeak;

  let currentPeak = 0.001; 
  for (let i = 0; i < data.length; i++) {
    let absVal = Math.abs(data[i]);
    if (absVal > currentPeak) 
      currentPeak = absVal;
  }
  
  let newSmoothedPeak = (currentPeak > prevSmoothedPeak) ? currentPeak : lerp(prevSmoothedPeak, currentPeak, 0.05);
  let effectivePeak = Math.max(newSmoothedPeak, 0.08); 
  let gainMultiplier = 120 / effectivePeak; 

  push();
  noFill();
  stroke(strokeCol);
  strokeWeight(2);
  
  let triggerIndex = 0;
  if (effectivePeak > 0.09) {
    for (let i = 1; i < data.length / 2; i++) {
      if (data[i] > 0 && data[i-1] <= 0) {
        triggerIndex = i;
        break;
      }
    }
  }

  beginShape();
  for (let i = 0; i < data.length - triggerIndex; i++) {
    let x = map(i, 0, 1024, 0, width); 
    let y = centerY - (data[i + triggerIndex] * gainMultiplier);
    vertex(x, y);
    if (x > width) 
      break;
  }
  endShape();
  pop();

  return newSmoothedPeak;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}