# Lissajous Audio Visualizer

Implements real-time visualization of stereo audio signals as Lissajous curves. This code is written to be run with [p5.js](https://p5js.org/).

##  What it does

When two sinusoidal signals are fed into the left and right channels of the audio input, their instantaneous amplitudes form coordinates `(x, y)`.  
These points are plotted against each other continuously to get Lissajous curves.

## Set up instructions

1. Connect two sensors to the left and right input channels of your computer. 
2. Ensure the recording device is set to “2 channels (stereo)” in your OS sound settings.  
   - Windows: Control Panel -> Hardware and Sound Sound -> Sound -> Recording -> Properties -> Advanced → “2 channel...”
3. Browser must support stereo input (Chrome works).
4. Run the code in [p5.js](https://p5js.org/).
