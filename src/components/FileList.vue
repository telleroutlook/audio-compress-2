<template>
  <section class="file-list">
    <div class="file-list-header">
      <h3>Selected Files</h3>
      <div class="file-stats">
        <span>{{ files.length }}</span> files
        <span class="separator">|</span>
        Total: <span>{{ formatTotalSize }}</span>
      </div>
    </div>
    <div class="file-list-content">
      <div v-for="(file, index) in files" :key="file.name" class="file-item">
        <div class="file-info">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>
        <button class="remove-file" @click="emit('remove', index)">×</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  files: File[]
}>();

const emit = defineEmits<{
  (e: 'remove', index: number): void
}>();

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTotalSize = computed(() => {
  const total = props.files.reduce((sum, file) => sum + file.size, 0);
  return formatFileSize(total);
});
</script>

<style scoped>
.file-list {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.file-list-header h3 {
  color: #333;
  font-size: 1.2em;
}

.file-stats {
  color: #666;
  font-size: 0.9em;
}

.file-stats .separator {
  margin: 0 8px;
  color: #ccc;
}

.file-list-content {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 10px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin: 5px 0;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.file-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  min-width: 0;
}

.file-name {
  color: #333;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  color: #666;
  font-size: 0.85em;
  white-space: nowrap;
}

.remove-file {
  background: none;
  border: none;
  color: #999;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 5px;
  transition: color 0.3s ease;
}

.remove-file:hover {
  color: #ff4444;
}
</style>