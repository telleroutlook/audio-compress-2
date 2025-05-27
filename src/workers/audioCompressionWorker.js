importScripts('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js');

self.addEventListener('error', function(e) {
  self.postMessage({ error: `Worker error: ${e.message}` });
});

self.onmessage = async function(e) {
  const { leftChannel, rightChannel, settings } = e.data;
  try {
    if (typeof lamejs === 'undefined' || !lamejs.Mp3Encoder) {
      throw new Error('MP3 encoder library not loaded properly');
    }
    
    const channels = settings.mode === 'maximum' ? 1 : 
                    settings.mode === 'aggressive' ? Math.min(settings.channels, 2) : 
                    settings.channels;
    const sampleRate = settings.sampleRate;
    
    const originalBitRate = Math.ceil((settings.originalSize * 8) / (settings.duration * 1024));
    let adaptiveBitRate = settings.bitRate;
    const originalSizeMB = settings.originalSize / (1024 * 1024);
    
    if (settings.mode === 'maximum') {
        adaptiveBitRate = Math.min(64, originalBitRate);
        if (originalSizeMB < 1) {
            adaptiveBitRate = Math.min(48, originalBitRate);
        }
    } else if (settings.mode === 'aggressive') {
        adaptiveBitRate = Math.min(96, originalBitRate);
        if (originalSizeMB < 1) {
            adaptiveBitRate = Math.min(64, originalBitRate);
        }
    } else {
        adaptiveBitRate = Math.min(128, originalBitRate);
    }
    
    const mp3encoder = new lamejs.Mp3Encoder(
      channels,
      sampleRate,
      adaptiveBitRate
    );
    
    const mp3Data = [];
    const sampleBlockSize = 1152;
    
    const leftInt16 = new Int16Array(leftChannel.length);
    const rightInt16 = new Int16Array(rightChannel.length);
    
    for (let i = 0; i < leftChannel.length; i++) {
      leftInt16[i] = leftChannel[i] < 0 ? leftChannel[i] * 0x8000 : leftChannel[i] * 0x7FFF;
      if (channels > 1) {
        rightInt16[i] = rightChannel[i] < 0 ? rightChannel[i] * 0x8000 : rightChannel[i] * 0x7FFF;
      }
    }
    
    const totalBlocks = Math.ceil(leftInt16.length / sampleBlockSize);
    let processedBlocks = 0;

    if (channels === 1) {
      for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const chunk = leftInt16.slice(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
        processedBlocks++;
        if (processedBlocks % 10 === 0) {
          const blockProgress = processedBlocks / totalBlocks;
          const currentProgress = 25 + (blockProgress * 70);
          self.postMessage({ type: 'progress', progress: Math.min(currentProgress, 95) });
          await new Promise(res => setTimeout(res, 0));
        }
      }
    } else {
      for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.slice(i, i + sampleBlockSize);
        const rightChunk = rightInt16.slice(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
        processedBlocks++;
        if (processedBlocks % 10 === 0) {
          const blockProgress = processedBlocks / totalBlocks;
          const currentProgress = 25 + (blockProgress * 70);
          self.postMessage({ type: 'progress', progress: Math.min(currentProgress, 95) });
          await new Promise(res => setTimeout(res, 0));
        }
      }
    }
    
    const end = mp3encoder.flush();
    if (end.length > 0) {
      mp3Data.push(end);
    }
    
    self.postMessage({ type: 'progress', progress: 100 });

    const resultBlob = new Blob(mp3Data, { type: 'audio/mp3' });
    
    self.postMessage({
      type: 'complete',
      result: {
        blob: resultBlob,
        duration: settings.duration,
        sampleRate: sampleRate,
        channels: channels,
        originalSize: settings.originalSize,
        outputFormat: settings.format
      }
    });
  } catch (error) {
    self.postMessage({ 
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in audio processing'
    });
  }
};