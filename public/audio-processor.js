class AudioInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Process only the first channel
      
      // We need to send the data as Int16Array up to the main thread
      // We can do this efficiently by converting float to int16 here
      if (channelData && channelData.length > 0) {
        const pcm16 = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Post the Int16Array buffer
        this.port.postMessage(pcm16, [pcm16.buffer]);
      }
    }
    
    // Keep processor alive
    return true;
  }
}

registerProcessor('audio-input-processor', AudioInputProcessor);
