<template>
  <div class="container">
    <header>
      <h1>Advanced Audio Compressor</h1>
      <p class="subtitle">Compress and optimize your audio files with advanced settings</p>
    </header>

    <section class="feature-info">
      <div class="feature-list">
        <div v-for="feature in features" :key="feature.title" class="feature-item">
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <template v-if="!showLoadingState">
      <section 
        ref="uploadArea"
        class="upload-area"
        :class="{ dragover: isDragOver }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <input 
          type="file" 
          ref="fileInput"
          id="fileInput"
          multiple 
          accept="audio/*" 
          style="display: none"
          @change="handleFileSelect"
        >
        <label for="fileInput" class="upload-content">
          <div class="upload-icon">🎵</div>
          <h2>Drop your audio files here</h2>
          <p>or click to select files</p>
        </label>
      </section>

      <file-list
        v-if="selectedFiles.length > 0 && FileList"
        :files="selectedFiles"
        @remove="removeFile"
      />

      <controls-panel
        v-if="selectedFiles.length > 0 && ControlsPanel"
        :model-value="settings"
        @update:model-value="(val: Partial<Settings>) => Object.assign(settings, val)"
        @compress="startCompression"
      />

      <progress-section
        v-if="isProcessing && ProgressSection"
        :progress="progress"
        :current-file="currentFile"
      />

      <summary-stats
        v-if="showSummary && SummaryStats"
        :stats="compressionStats"
      />

      <results-section
        v-if="showResults && ResultsSection"
        :results="compressedResults"
        @download-all="() => downloadAll(compressedResults)"
        @clear="clearAll"
      />

      <div :class="['status-message', `status-${statusType}`]" v-if="statusMessage">
        {{ statusMessage }}
      </div>
    </template>
    <template v-else>
      <div class="loading-placeholder">
        <div class="loading-spinner"></div>
        <p>{{ isAudioCompressorLoaded ? 'Loading components...' : 'Loading audio compressor...' }}</p>
        <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, shallowRef, computed } from 'vue';
import type { Settings, CompressionStats, CompressedResult } from './types';

const FileList = shallowRef();
const ControlsPanel = shallowRef();
const ProgressSection = shallowRef();
const SummaryStats = shallowRef();
const ResultsSection = shallowRef();
const useAudioCompressor = shallowRef();

const isSSR = typeof window === 'undefined';
const isClient = ref(!isSSR);
const isComponentsLoaded = ref(false);
const isAudioCompressorLoaded = ref(false);

const showLoadingState = computed(() => isSSR || !isComponentsLoaded.value || !isAudioCompressorLoaded.value);

const loadAudioCompressor = async () => {
  try {
    const module = await import('./composables/useAudioCompressor');
    useAudioCompressor.value = module.useAudioCompressor;
    isAudioCompressorLoaded.value = true;
    return true;
  } catch (error) {
    console.error('Failed to load audio compressor:', error);
    showStatus('Failed to load audio compressor module', 'error');
    return false;
  }
};

onMounted(async () => {
  if (isSSR) return;

  try {
    const [
      FileListModule,
      ControlsPanelModule,
      ProgressSectionModule,
      SummaryStatsModule,
      ResultsSectionModule
    ] = await Promise.all([
      import('./components/FileList.vue'),
      import('./components/ControlsPanel.vue'),
      import('./components/ProgressSection.vue'),
      import('./components/SummaryStats.vue'),
      import('./components/ResultsSection.vue')
    ]);

    FileList.value = FileListModule.default;
    ControlsPanel.value = ControlsPanelModule.default;
    ProgressSection.value = ProgressSectionModule.default;
    SummaryStats.value = SummaryStatsModule.default;
    ResultsSection.value = ResultsSectionModule.default;

    await loadAudioCompressor();
    isComponentsLoaded.value = true;
  } catch (error) {
    console.error('Failed to load components:', error);
    showStatus('Failed to load audio compressor components', 'error');
  }
});

const features = [
  {
    title: 'Multiple Formats',
    description: 'Support for MP3, AAC, and WAV formats'
  },
  {
    title: 'Batch Processing',
    description: 'Compress multiple audio files at once'
  },
  {
    title: 'Advanced Settings',
    description: 'Customize quality, bitrate, and compression mode'
  }
];

const fileInput = ref<HTMLInputElement | null>(null);
const uploadArea = ref<HTMLElement | null>(null);
const isDragOver = ref(false);
const selectedFiles = ref<File[]>([]);
const isProcessing = ref(false);
const progress = ref(0);
const currentFile = ref('');
const statusMessage = ref('');
const statusType = ref('info');
const showSummary = ref(false);
const showResults = ref(false);

const settings = reactive<Settings>({
  format: 'mp3',
  quality: 0.8,
  bitRate: 128,
  sampleRate: 44100,
  bitDepth: 16,
  mode: 'maximum'
});

const compressionStats = reactive<CompressionStats>({
  totalSaved: 0,
  avgCompression: 0,
  processingTime: 0
});

const compressedResults = ref<CompressedResult[]>([]);

const audioCompressor = computed(() => {
  if (!useAudioCompressor.value || !isAudioCompressorLoaded.value) return null;
  return useAudioCompressor.value();
});

const compressAudio = async (file: File, settings: Settings, onProgress: (p: number) => void) => {
  if (!audioCompressor.value) throw new Error('Audio compressor is still loading. Please wait...');
  return audioCompressor.value.compressAudio(file, settings, onProgress);
};

const downloadAll = async (results: CompressedResult[]) => {
  if (!audioCompressor.value) throw new Error('Audio compressor is still loading. Please wait...');
  return audioCompressor.value.downloadAll(results);
};

const clearAll = () => {
  if (audioCompressor.value) audioCompressor.value.clearAll();
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
};

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = false;
  
  const files = e.dataTransfer?.files;
  if (files) {
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      addFiles(audioFiles);
    }
  }
};

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    const audioFiles = Array.from(input.files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      addFiles(audioFiles);
    }
  }
};

const addFiles = (files: File[]) => {
  selectedFiles.value = [...selectedFiles.value, ...files];
  showStatus(`Added ${files.length} file(s)`, 'success');
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
  showStatus('File removed', 'info');
};

const showStatus = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => {
    statusMessage.value = '';
  }, 3000);
};

const startCompression = async () => {
  if (!audioCompressor.value) {
    showStatus('Audio compressor is still loading. Please wait...', 'error');
    return;
  }

  isProcessing.value = true;
  showSummary.value = false;
  showResults.value = false;
  compressedResults.value = [];

  const startTime = Date.now();
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  try {
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i];
      currentFile.value = file.name;
      progress.value = 0;

      const result = await compressAudio(file, settings, (p) => {
        progress.value = p;
      });

      if (result) {
        totalOriginalSize += file.size;
        totalCompressedSize += result.size;
        compressedResults.value.push(result);
      }
    }

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    compressionStats.totalSaved = totalOriginalSize - totalCompressedSize;
    compressionStats.avgCompression = (totalCompressedSize / totalOriginalSize) * 100;
    compressionStats.processingTime = processingTime;

    showSummary.value = true;
    showResults.value = true;
    showStatus('Compression completed successfully!', 'success');
  } catch (error) {
    console.error('Compression failed:', error);
    showStatus('Compression failed. Please try again.', 'error');
  } finally {
    isProcessing.value = false;
  }
};
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

.subtitle {
  color: #666;
  margin-top: 0.5rem;
}

.feature-info {
  margin-bottom: 2rem;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  padding: 1.5rem;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area.dragover {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  font-size: 3rem;
}

.status-message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
}

.status-info {
  background: #e3f2fd;
  color: #1976d2;
}

.status-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-error {
  background: #ffebee;
  color: #c62828;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>