export interface Settings {
  format: 'mp3' | 'aac' | 'wav';
  quality: number;
  bitRate: number;
  sampleRate: number;
  bitDepth: number;
  mode: 'balanced' | 'aggressive' | 'maximum';
}

export interface CompressionStats {
  totalSaved: number;
  avgCompression: number;
  processingTime: number;
}

export interface CompressedResult {
  blob: Blob;
  size: number;
  type: string;
  name: string;
  originalSize: number;
  duration: number;
  sampleRate: number;
  channels: number;
  outputFormat: string;
  compressionRatio: string;
}