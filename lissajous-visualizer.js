let audioCtx; // use Web Audio API directly
let splitter, leftAnalyser, rightAnalyser;
let leftData, rightData;
let buffer = [];
const durationSec = 2; // show last 2 seconds

async function setup() {
  createCanvas(600, 600);
  background(0);
  strokeWeight(2);

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
    const source = audioCtx.createMediaStreamSource(stream);

    splitter = audioCtx.createChannelSplitter(2);
    source.connect(splitter);

    // separate analysers for left/right channels
    leftAnalyser = audioCtx.createAnalyser();
    rightAnalyser = audioCtx.createAnalyser();
    leftAnalyser.fftSize = rightAnalyser.fftSize = 1024;

    splitter.connect(leftAnalyser, 0);
    splitter.connect(rightAnalyser, 1);

    leftData = new Float32Array(leftAnalyser.fftSize);
    rightData = new Float32Array(rightAnalyser.fftSize);

    console.log("Stereo input initialized. Left/right channels ready.");
  } catch (err) {
    console.error("Could not access stereo input:", err);
    alert("Could not access stereo input.");
  }
}

function draw() {
  background(0, 30);
  if (!leftAnalyser || !rightAnalyser) 
    return;

  // time-domain samples
  leftAnalyser.getFloatTimeDomainData(leftData);
  rightAnalyser.getFloatTimeDomainData(rightData);

  // RMS for normalization
  const rmsL = sqrt(leftData.reduce((a,v)=>a+v*v,0)/leftData.length);
  const rmsR = sqrt(rightData.reduce((a,v)=>a+v*v,0)/rightData.length);

  // normalize
  const normL = leftData.map(v => v / (rmsL || 1));
  const normR = rightData.map(v => v / (rmsR || 1));

  for (let i = 0; i < normL.length; i++) {
    buffer.push({x: normL[i], y: normR[i], t: millis()});
  }

  const cutoff = millis() - durationSec * 1000;
  buffer = buffer.filter(p => p.t > cutoff);

  translate(width/2, height/2);
  for (const p of buffer) {
    const age = millis() - p.t;
    const alpha = map(age, 0, durationSec*1000, 255, 0); // points fade
    stroke(0, 255, 0, alpha);
    point(p.x * 200, p.y * 200);
  }

  // debug: check channel difference
  if (frameCount % 120 === 0) {
    const avgL = normL.reduce((a,b)=>a+b,0)/normL.length;
    const avgR = normR.reduce((a,b)=>a+b,0)/normR.length;
    console.log("Frame", frameCount, "avg L:", avgL.toFixed(3), "R:", avgR.toFixed(3));
  }
}
