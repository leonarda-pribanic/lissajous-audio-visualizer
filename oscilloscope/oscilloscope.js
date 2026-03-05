let audioCtx; 
let splitter, leftAnalyser, rightAnalyser;
let leftData, rightData;

let smoothedPeakL = 0.05;
let smoothedPeakR = 0.05;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  initAudio(); 
}

async function initAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 2,
        echoCancellation: false,
        noiseSuppression: false, 
        autoGainControl: false,
      }
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const source = audioCtx.createMediaStreamSource(stream);
    splitter = audioCtx.createChannelSplitter(2);
    source.connect(splitter);

    leftAnalyser = audioCtx.createAnalyser();
    rightAnalyser = audioCtx.createAnalyser();
    
    leftAnalyser.fftSize = 2048; 
    rightAnalyser.fftSize = 2048;

    splitter.connect(leftAnalyser, 0);
    splitter.connect(rightAnalyser, 1);

    leftData = new Float32Array(leftAnalyser.fftSize);
    rightData = new Float32Array(rightAnalyser.fftSize);

    console.log("Stereo Analysers initialized and streaming.");
  } catch (err) {
    console.warn("Initialization failed.", err);
  }
}

function draw() {
  background(0, 80); 
  
  if (!leftAnalyser || !rightAnalyser) {
    return;
  }

  leftAnalyser.getFloatTimeDomainData(leftData);
  rightAnalyser.getFloatTimeDomainData(rightData);

  // draw waves and update their respective smoothed peaks
  smoothedPeakL = drawWave(leftData, color(0, 255, 150), height * 0.25, smoothedPeakL); 
  smoothedPeakR = drawWave(rightData, color(255, 100, 0), height * 0.75, smoothedPeakR); 
  
  stroke(60);
  line(0, height / 2, width, height / 2);
}

function drawWave(data, strokeCol, centerY, prevSmoothedPeak) {
  let currentPeak = 0.001; 
  for (let i = 0; i < data.length; i++) {
    let absVal = Math.abs(data[i]);
    if (absVal > currentPeak) 
      currentPeak = absVal;
  }
  
  let newSmoothedPeak = (currentPeak > prevSmoothedPeak) ? currentPeak : lerp(prevSmoothedPeak, currentPeak, 0.05);
  let effectivePeak = Math.max(newSmoothedPeak, 0.08); // noise gate
  let gainMultiplier = 120 / effectivePeak; 

  push();
  noFill();
  stroke(strokeCol);
  strokeWeight(2);
  
  // trigger logic
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
    if (x > width) break;
  }
  endShape();
  pop();

  return newSmoothedPeak;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}