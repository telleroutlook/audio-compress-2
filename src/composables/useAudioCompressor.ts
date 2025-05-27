import * as JSZip from 'jszip';
import type { Settings, CompressedResult } from '../types';

export function useAudioCompressor() {
  const isBrowser = typeof window !== 'undefined';

  const compressAudio = async (
    file: File, 
    settings: Settings,
    onProgress: (progress: number) => void
  ): Promise<CompressedResult> => {
    if (!isBrowser) {
      throw new Error('Audio compression is only available in browser environment');
    }

    return new Promise(async (resolve, reject) => {
      try {
        onProgress(0);
        
        let worker: Worker;
        try {
          const workerUrl = new URL('../workers/audioCompressionWorker.js', import.meta.url);
          worker = new Worker(workerUrl);
        } catch (err) {
          reject(new Error('Failed to initialize audio compression worker'));
          return;
        }
        
        worker.onmessage = (e) => {
          const data = e.data;
          
          switch (data.type) {
            case 'progress':
              onProgress(data.progress);
              break;
              
            case 'complete':
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
              reject(new Error(data.error));
              worker.terminate();
              break;
              
            default:
              console.warn('Unknown message type from worker:', data);
              break;
          }
        };
        
        worker.onerror = (error) => {
          reject(new Error(`Worker error: ${error.message}`));
          worker.terminate();
        };
        
        const audioContext = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        onProgress(25);
        
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.numberOfChannels > 1 ? 
          audioBuffer.getChannelData(1) : 
          leftChannel;
        
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
        
      } catch (error) {
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