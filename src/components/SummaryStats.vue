<template>
  <section class="summary-stats">
    <h3>Compression Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-value" id="totalSaved">
          {{ formatFileSize(stats.totalSaved) }}
        </span>
        <div class="summary-label">Space Saved</div>
      </div>
      <div class="summary-item">
        <span class="summary-value" id="avgCompression">
          {{ stats.avgCompression }}%
        </span>
        <div class="summary-label">Avg. Compression</div>
      </div>
      <div class="summary-item">
        <span class="summary-value" id="processingTime">
          {{ stats.processingTime }}s
        </span>
        <div class="summary-label">Processing Time</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CompressionStats } from '../types';

defineProps<{
  stats: CompressionStats;
}>();

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.summary-stats {
  margin: 30px 0;
  padding: 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.summary-stats h3 {
  font-size: 1.8em;
  color: #333;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
  text-align: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.summary-item {
  text-align: center;
  padding: 20px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.summary-item:hover {
  transform: translateY(-5px);
  background: rgba(102, 126, 234, 0.1);
}

.summary-value {
  display: block;
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

#totalSaved { color: #28a745; }
#avgCompression { color: #dc3545; }
#processingTime { color: #17a2b8; }

.summary-label {
  font-size: 1.1em;
  color: #666;
  font-weight: 500;
}
</style>