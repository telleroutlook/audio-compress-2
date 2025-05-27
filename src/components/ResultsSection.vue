<template>
  <section class="results-section">
    <div class="results-header">
      <h3>Compression Results</h3>
      <div class="results-actions">
        <button class="btn btn-primary" @click="$emit('download-all')">
          Download All
        </button>
        <button class="btn btn-secondary" @click="$emit('clear')">
          Clear All
        </button>
      </div>
    </div>
    
    <div class="results-container">
      <div v-for="(result, index) in results" :key="index" class="result-item">
        <div class="result-audio">
          <div class="result-audio-container">
            <h5>Compressed Audio</h5>
            <audio controls>
              <source :src="getAudioUrl(result.blob)" :type="result.type">
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
        
        <div class="result-info">
          <div class="result-filename">{{ result.name }}</div>
          <div class="result-stats">
            <div class="stat-item">
              Original Size: <span class="stat-value">{{ formatFileSize(result.originalSize) }}</span>
            </div>
            <div class="stat-item">
              Compressed: <span class="stat-value">{{ formatFileSize(result.size) }}</span>
            </div>
            <div class="stat-item">
              Duration: <span class="stat-value">{{ result.duration.toFixed(1) }}s</span>
            </div>
          </div>
        </div>
        
        <div class="result-actions">
          <a 
            :href="getAudioUrl(result.blob)"
            :download="getDownloadName(result.name)"
            class="btn btn-primary"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue';
import type { CompressedResult } from '../types';

defineProps<{
  results: CompressedResult[];
}>();

defineEmits<{
  (e: 'download-all'): void;
  (e: 'clear'): void;
}>();

const audioUrls = new Map<Blob, string>();

const getAudioUrl = (blob: Blob): string => {
  if (!audioUrls.has(blob)) {
    audioUrls.set(blob, URL.createObjectURL(blob));
  }
  return audioUrls.get(blob)!;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const calculateCompressionRatio = (result: CompressedResult): number => {
  return Math.round(((result.originalSize - result.size) / result.originalSize) * 100);
};

const getDownloadName = (name: string): string => {
  const baseName = name.split('.')[0];
  return `${baseName}_compressed.mp3`;
};

onUnmounted(() => {
  // Clean up object URLs
  audioUrls.forEach(url => URL.revokeObjectURL(url));
  audioUrls.clear();
});
</script>

<style scoped>
.results-section {
  margin-top: 30px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-header h3 {
  font-size: 1.5em;
  color: #333;
  font-weight: bold;
}

.results-actions {
  display: flex;
  gap: 15px;
}

.result-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 20px;
  margin: 15px 0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.result-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.result-audio-container {
  padding: 15px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 10px;
}

.result-audio-container h5 {
  color: #333;
  margin-bottom: 10px;
}

.result-audio-container audio {
  width: 100%;
  height: 40px;
}

.result-info {
  padding: 0 20px;
}

.result-filename {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 1.1em;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.stat-item {
  font-size: 0.85em;
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.compression-ratio {
  background: linear-gradient(45deg, #28a745, #20c997);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
}
</style>