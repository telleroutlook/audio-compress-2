import * as JSZip from 'jszip';
import type { Settings, CompressedResult } from '../types';

export function useAudioCompressor() {
  const isBrowser = typeof window !== 'undefined';
  console.log('useAudioCompressor initialized, isBrowser:', isBrowser);

  const compressAudio = async (
    file: File, 
    settings: Settings,
    onProgress: (progress: number) => void
  ): Promise<CompressedResult> => {
    console.group('Audio Compression');
    console.log('Starting compression for file:', file.name);
    console.log('Settings:', settings);

    if (!isBrowser) {
      console.error('Audio compression attempted in non-browser environment');
      throw new Error('Audio compression is only available in browser environment');
    }

    return new Promise(async (resolve, reject) => {
      try {
        onProgress(0);
        console.log('Initial progress set to 0%');
        
        let worker: Worker;
        try {
          console.log('Initializing audio compression worker');
          const workerUrl = new URL('../workers/audioCompressionWorker.js', import.meta.url);
          worker = new Worker(workerUrl);
          console.log('Worker initialized successfully');
        } catch (err) {
          console.error('Failed to initialize worker:', err);
          reject(new Error('Failed to initialize audio compression worker'));
          return;
        }
        
        worker.onmessage = (e) => {
          const data = e.data;
          console.log('Worker message received:', data.type);
          
          switch (data.type) {
            case 'progress':
              console.log('Progress update:', data.progress + '%');
              onProgress(data.progress);
              break;
              
            case 'complete':
              console.log('Compression complete, finalizing result');
              onProgress(100);
              resolve({
                name: file.name,
                size: data.result.blob.size,
                blob: data.result.blob,
                type: 'audio/mp3',
                originalSize: file.size,
                duration: data.result.duration,
                sampleRate: data.result.sampleRate,
                channels: data.result.channels,
                outputFormat: data.result.outputFormat,
                compressionRatio: ((file.size - data.result.blob.size) / file.size * 100).toFixed(1)
              });
              worker.terminate();
              break;
              
            case 'error':
              console.error('Worker reported error:', data.error);
              reject(new Error(data.error));
              worker.terminate();
              break;
              
            default:
              console.warn('Unknown message type from worker:', data);
              break;
          }
        };
        
        worker.onerror = (error) => {
          console.error('Worker error occurred:', error);
          reject(new Error(`Worker error: ${error.message}`));
          worker.terminate();
        };
        
        console.log('Initializing AudioContext');
        const audioContext = new AudioContext();
        console.log('Reading file as ArrayBuffer');
        const arrayBuffer = await file.arrayBuffer();
        console.log('Decoding audio data');
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        onProgress(25);
        console.log('Audio data decoded, progress at 25%');
        
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.numberOfChannels > 1 ? 
          audioBuffer.getChannelData(1) : 
          leftChannel;
        
        console.log('Audio channels processed:', {
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration
        });
        
        worker.postMessage({
          leftChannel,
          rightChannel,
          settings: {
            ...settings,
            originalSize: file.size,
            channels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
            duration: audioBuffer.duration
          }
        });
        
        console.groupEnd();
      } catch (error) {
        console.error('Compression process failed:', error);
        console.groupEnd();
        reject(error);
      }
    });
  };
  
  const downloadAll = async (results: CompressedResult[]) => {
    if (!isBrowser) {
      throw new Error('Download is only available in browser environment');
    }

    const zip = new JSZip();
    
    results.forEach(result => {
      zip.file(
        `${result.name.split('.')[0]}_compressed.mp3`,
        result.blob
      );
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'compressed_audio.zip';
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const clearAll = () => {};

  return {
    compressAudio,
    downloadAll,
    clearAll
  };
}