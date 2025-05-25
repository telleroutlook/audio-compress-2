import AudioEditor from './AudioEditor.js';
import BatchRenamer from './BatchRenamer.js';
import lamejs from 'lamejs';

class AdvancedAudioCompressor {
    constructor() {
        this.selectedFiles = [];
        this.compressedResults = [];
        this.settings = {
            format: 'mp3',
            quality: 0.8,
            bitRate: 128,
            sampleRate: 44100,
            bitDepth: 16,
            mode: 'aggressive'
        };
        
        this.previewAudios = new Map();
        this.compressionHistory = [];
        this.audioEditor = new AudioEditor();
        this.batchRenamer = new BatchRenamer();
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        // 确保默认选择正确的按钮
        document.querySelector('.format-btn[data-format="mp3"]').classList.add('active');
        document.querySelector('.format-btn[data-mode="aggressive"]').classList.add('active');
    }
    
    initializeElements() {
        this.container = document.querySelector('.container');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.controlsPanel = document.getElementById('controlsPanel');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.statusMessage = document.getElementById('statusMessage');
        this.summaryStats = document.getElementById('summaryStats');
        
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.bitRateInput = document.getElementById('bitRate');
        this.sampleRateSelect = document.getElementById('sampleRate');
        this.bitDepthSelect = document.getElementById('bitDepth');
        
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.resultsContainer = document.getElementById('resultsContainer');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'preview-container';
        this.previewContainer.style.display = 'none';
        this.container.insertBefore(this.previewContainer, this.controlsPanel);
    }
    
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('audioCompressorSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                this.updateUIFromSettings();
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('audioCompressorSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    updateUIFromSettings() {
        const formatBtn = document.querySelector(`.format-btn[data-format="${this.settings.format}"]`);
        if (formatBtn) formatBtn.classList.add('active');
        
        const modeBtn = document.querySelector(`.format-btn[data-mode="${this.settings.mode}"]`);
        if (modeBtn) modeBtn.classList.add('active');
        
        if (this.qualitySlider) {
            this.qualitySlider.value = this.settings.quality;
        }
        if (this.qualityValue) {
            this.qualityValue.textContent = this.settings.quality;
        }
        if (this.bitRateInput) {
            this.bitRateInput.value = this.settings.bitRate;
        }
        if (this.sampleRateSelect) {
            this.sampleRateSelect.value = this.settings.sampleRate;
        }
        if (this.bitDepthSelect) {
            this.bitDepthSelect.value = this.settings.bitDepth;
        }
    }
    
    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        document.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn[data-format]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.format = btn.dataset.format;
                
                // Update format description
                const formatDesc = document.getElementById('formatDescription');
                switch(btn.dataset.format) {
                    case 'mp3':
                        formatDesc.innerHTML = '<strong>MP3</strong>: Most popular format with good compression. Compatible with all devices.';
                        break;
                    case 'aac':
                        formatDesc.innerHTML = '<strong>AAC</strong>: Better quality than MP3 at same bitrate. Used by Apple and YouTube.';
                        break;
                    case 'wav':
                        formatDesc.innerHTML = '<strong>WAV</strong>: Uncompressed format with best quality but larger file size.';
                        break;
                }
            });
        });
        
        document.querySelectorAll('.format-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.mode = btn.dataset.mode;
                
                // Update mode description
                const modeDesc = document.getElementById('modeDescription');
                switch(btn.dataset.mode) {
                    case 'balanced':
                        modeDesc.innerHTML = '<strong>Balanced Mode</strong>: Good balance between quality and file size.';
                        break;
                    case 'aggressive':
                        modeDesc.innerHTML = '<strong>Aggressive Mode</strong>: High compression for smaller files, some quality loss.';
                        break;
                    case 'maximum':
                        modeDesc.innerHTML = '<strong>Maximum Mode</strong>: Maximum compression, prioritize file size over quality.';
                        break;
                }
            });
        });
        
        this.qualitySlider.addEventListener('input', (e) => {
            this.settings.quality = parseFloat(e.target.value);
            this.qualityValue.textContent = this.settings.quality;
        });
        
        this.bitRateInput.addEventListener('input', (e) => {
            this.settings.bitRate = parseInt(e.target.value) || 128;
        });
        
        this.sampleRateSelect.addEventListener('change', (e) => {
            this.settings.sampleRate = parseInt(e.target.value) || 44100;
        });
        
        this.bitDepthSelect.addEventListener('change', (e) => {
            this.settings.bitDepth = parseInt(e.target.value) || 16;
        });
        
        this.convertBtn.addEventListener('click', this.startCompression.bind(this));
        this.downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));
        this.clearBtn.addEventListener('click', this.clearAll.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('audio/'));
        if (files.length > 0) {
            this.addFiles(files);
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
        if (files.length > 0) {
            this.addFiles(files);
        }
    }
    
    addFiles(files) {
        files.forEach(file => {
            if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                this.selectedFiles.push(file);
                this.showPreview(file);
            }
        });
        this.updateFileList();
        this.showStatus(`${this.selectedFiles.length} files selected`, 'success');
        
        // 使用 setTimeout 确保在 DOM 更新后滚动到控制面板
        setTimeout(() => {
            this.smoothScrollTo(this.controlsPanel);
        }, 0);
    }
    
    updateFileList() {
        if (this.selectedFiles.length === 0) {
            this.fileList.style.display = 'none';
            this.controlsPanel.style.display = 'none';
            this.convertBtn.style.display = 'none';
            return;
        }

        this.fileList.style.display = 'block';
        this.controlsPanel.style.display = 'block';
        this.convertBtn.style.display = 'block';
        
        const container = document.getElementById('filesContainer');
        container.innerHTML = '';

        const fileList = document.createElement('div');
        fileList.className = 'file-list-content';

        this.selectedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => {
                const index = this.selectedFiles.indexOf(file);
                if (index > -1) {
                    this.selectedFiles.splice(index, 1);
                    this.updateFileList();
                }
            };
            
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            fileList.appendChild(fileItem);
        });

        container.appendChild(fileList);
        document.getElementById('fileCount').textContent = this.selectedFiles.length;
        
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showStatus(message, type = 'info') {
        this.statusMessage.className = `status-message status-${type}`;
        this.statusMessage.textContent = message;
    }
    
    smoothScrollTo(element, duration = 1000) {
        if (!element) return;
        
        try {
            // 计算目标位置，考虑页面顶部偏移
            const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100; // 增加顶部偏移
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            let startTime = null;

            const easeInOutCubic = (t) => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };

            const animation = (currentTime) => {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const progress = Math.min(timeElapsed / duration, 1);
                const easeProgress = easeInOutCubic(progress);
                
                window.scrollTo(0, startPosition + distance * easeProgress);
                
                if (timeElapsed < duration) {
                    requestAnimationFrame(animation);
                }
            };

            requestAnimationFrame(animation);
        } catch (error) {
            console.error('Smooth scroll failed:', error);
            // 回退到简单滚动
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    async startCompression() {
        if (this.selectedFiles.length === 0) {
            this.showStatus('Please select audio files to compress', 'error');
            return;
        }
        
        this.progressSection.style.display = 'block';
        this.convertBtn.disabled = true;
        this.compressedResults = [];
        
        const startTime = Date.now();
        let totalSaved = 0;
        let totalOriginalSize = 0;
        
        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                const progress = ((i + 1) / this.selectedFiles.length) * 100;
                
                this.progressFill.style.width = `${progress}%`;
                this.progressText.textContent = `Processing: ${file.name} (${i + 1}/${this.selectedFiles.length})`;
                this.showStatus(`Processing ${file.name}...`, 'info');
                
                try {
                    console.log(`Starting compression for file ${i + 1}/${this.selectedFiles.length}:`, file.name);
                    const result = await this.compressAudio(file);
                    console.log('Compression completed for:', file.name, result);
                    
                    this.compressedResults.push(result);
                    this.updatePreview(file, result);
                    totalSaved += (file.size - result.size);
                    totalOriginalSize += file.size;
                    
                    // Save to history
                    this.compressionHistory.push({
                        timestamp: new Date().toISOString(),
                        originalFile: file.name,
                        originalSize: file.size,
                        compressedSize: result.size,
                        settings: { ...this.settings }
                    });
                    
                    this.showStatus(`Successfully compressed ${file.name}`, 'success');
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    this.showStatus(`Error processing ${file.name}: ${error.message}`, 'error');
                    // Continue with next file instead of stopping completely
                    continue;
                }
            }
            
            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(1);
            
            if (this.compressedResults.length > 0) {
                this.showCompressionSummary(this.compressedResults.length, totalSaved, totalOriginalSize, processingTime);
                this.showResults();
                this.showStatus(`Successfully compressed ${this.compressedResults.length} files`, 'success');
            } else {
                this.showStatus('No files were successfully compressed', 'error');
            }
        } catch (error) {
            console.error('Compression process failed:', error);
            this.showStatus('Compression process failed: ' + error.message, 'error');
        } finally {
            this.progressSection.style.display = 'none';
            this.convertBtn.disabled = false;
        }
    }
    
    async compressAudio(file) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Compression timeout after 60 seconds'));
            }, 60000);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    console.log('Starting audio compression for:', file.name);
                    const arrayBuffer = e.target.result;
                    console.log('File read complete, size:', arrayBuffer.byteLength);
                    
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext created');
                    
                    try {
                        console.log('Starting audio decoding...');
                        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
                        console.log('Audio decoded successfully:', {
                            duration: audioBuffer.duration,
                            sampleRate: audioBuffer.sampleRate,
                            channels: audioBuffer.numberOfChannels
                        });
                        
                        // Calculate new sample rate and bit depth based on settings
                        let targetSampleRate = audioBuffer.sampleRate;
                        let targetChannels = audioBuffer.numberOfChannels;
                        
                        console.log('Applying compression settings...');
                        // Apply quality settings
                        if (this.settings.quality <= 0.3) {
                            targetSampleRate = Math.min(22050, targetSampleRate);
                        } else if (this.settings.quality <= 0.6) {
                            targetSampleRate = Math.min(44100, targetSampleRate);
                        }
                        
                        // Apply mode settings
                        if (this.settings.mode === 'aggressive') {
                            targetChannels = Math.min(1, targetChannels); // Force mono
                            targetSampleRate = Math.min(22050, targetSampleRate);
                        } else if (this.settings.mode === 'maximum') {
                            targetChannels = 1; // Force mono
                            targetSampleRate = Math.min(16000, targetSampleRate);
                        }
                        
                        console.log('Creating offline context with parameters:', {
                            channels: targetChannels,
                            sampleRate: targetSampleRate
                        });
                        
                        // Create offline context for processing
                        const offlineContext = new OfflineAudioContext(
                            targetChannels,
                            Math.floor(audioBuffer.duration * targetSampleRate),
                            targetSampleRate
                        );
                        
                        // Create buffer with new parameters
                        const targetBuffer = offlineContext.createBuffer(
                            targetChannels,
                            Math.floor(audioBuffer.duration * targetSampleRate),
                            targetSampleRate
                        );
                        
                        console.log('Starting audio resampling...');
                        // Copy and resample audio data
                        for (let channel = 0; channel < targetChannels; channel++) {
                            const sourceChannel = Math.min(channel, audioBuffer.numberOfChannels - 1);
                            const sourceData = audioBuffer.getChannelData(sourceChannel);
                            const targetData = targetBuffer.getChannelData(channel);
                            
                            // Simple resampling
                            const ratio = sourceData.length / targetData.length;
                            for (let i = 0; i < targetData.length; i++) {
                                const sourceIndex = Math.floor(i * ratio);
                                targetData[i] = sourceData[sourceIndex] || 0;
                            }
                        }
                        
                        console.log('Converting to MP3 format...');
                        // Convert to MP3 using lamejs
                        const mp3encoder = new lamejs.Mp3Encoder(targetChannels, targetSampleRate, this.settings.bitRate);
                        const mp3Data = [];
                        
                        // Process audio data in chunks
                        const chunkSize = 1152; // Standard MP3 frame size
                        const samples = new Int16Array(chunkSize * targetChannels);
                        
                        for (let i = 0; i < targetBuffer.length; i += chunkSize) {
                            const chunk = targetBuffer.getChannelData(0).slice(i, i + chunkSize);
                            for (let j = 0; j < chunk.length; j++) {
                                samples[j] = chunk[j] * 0x7FFF;
                            }
                            
                            const mp3buf = mp3encoder.encodeBuffer(samples);
                            if (mp3buf.length > 0) {
                                mp3Data.push(mp3buf);
                            }
                        }
                        
                        // Flush the encoder
                        const end = mp3encoder.flush();
                        if (end.length > 0) {
                            mp3Data.push(end);
                        }
                        
                        // Create blob from MP3 data
                        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                        
                        console.log('Cleaning up audio contexts...');
                        // Close contexts
                        await audioContext.close();
                        
                        clearTimeout(timeout);
                        resolve({
                            name: file.name,
                            size: blob.size,
                            blob: blob,
                            originalSize: file.size,
                            duration: audioBuffer.duration,
                            sampleRate: targetSampleRate,
                            channels: targetChannels
                        });
                    } catch (decodeError) {
                        console.error('Error decoding audio data:', decodeError);
                        throw new Error(`Failed to decode audio: ${decodeError.message}`);
                    }
                } catch (error) {
                    console.error('Compression error:', error);
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                clearTimeout(timeout);
                reject(new Error('Failed to read file: ' + error.message));
            };
            reader.readAsArrayBuffer(file);
        });
    }
    
    showResults() {
        if (!this.resultsSection || !this.resultsContainer) return;
        
        this.resultsSection.style.display = 'block';
        this.resultsContainer.innerHTML = '';
        
        this.compressedResults.forEach((result, index) => {
            const resultItem = this.createResultItem(result, index);
            this.resultsContainer.appendChild(resultItem);
        });

        // 确保在DOM更新后滚动到结果区域
        requestAnimationFrame(() => {
            if (this.resultsSection) {
                this.smoothScrollTo(this.resultsSection);
            }
        });
    }
    
    showCompressionSummary(successCount, totalSaved, totalOriginalSize, processingTime) {
        if (!this.summaryStats) return;
        
        // 确保摘要部分可见
        this.summaryStats.style.display = 'block';
        this.summaryStats.classList.add('large-summary');
        
        const elements = {
            totalFiles: document.getElementById('totalFiles'),
            totalSaved: document.getElementById('totalSaved'),
            avgCompression: document.getElementById('avgCompression'),
            processingTime: document.getElementById('processingTime')
        };
        
        if (elements.totalFiles) {
            elements.totalFiles.textContent = successCount;
        }
        
        if (elements.totalSaved) {
            const sizeChangeText = totalSaved >= 0 
                ? this.formatFileSize(totalSaved)
                : `+${this.formatFileSize(Math.abs(totalSaved))}`;
            elements.totalSaved.textContent = sizeChangeText;
        }
        
        if (elements.avgCompression) {
            const compressionRatio = totalOriginalSize > 0 
                ? Math.round((totalSaved / totalOriginalSize) * 100)
                : 0;
            elements.avgCompression.textContent = `${compressionRatio >= 0 ? '-' : '+'}${Math.abs(compressionRatio)}%`;
        }
        
        if (elements.processingTime) {
            elements.processingTime.textContent = processingTime + 's';
        }

        // 延迟滚动以确保DOM更新完成
        setTimeout(() => {
            if (this.summaryStats) {
                this.smoothScrollTo(this.summaryStats);
            }
        }, 100);
    }
    
    createResultItem(result, index) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.dataset.index = index;
        
        const compressionRatio = ((result.originalSize - result.size) / result.originalSize * 100).toFixed(1);
        
        resultItem.innerHTML = `
            <div class="result-audio">
                <div class="result-audio-container">
                    <h5>Compressed Audio</h5>
                    <audio controls>
                        <source src="${URL.createObjectURL(result.blob)}" type="audio/mp3">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
            <div class="result-info">
                <div class="result-filename">${result.name}</div>
                <div class="result-stats">
                    <div class="stat-item">
                        Original Size: <span class="stat-value">${this.formatFileSize(result.originalSize)}</span>
                    </div>
                    <div class="stat-item">
                        Compressed: <span class="stat-value">${this.formatFileSize(result.size)}</span>
                    </div>
                    <div class="stat-item">
                        Duration: <span class="stat-value">${result.duration.toFixed(1)}s</span>
                    </div>
                    <div class="stat-item">
                        Sample Rate: <span class="stat-value">${result.sampleRate} Hz</span>
                    </div>
                    <div class="stat-item">
                        Channels: <span class="stat-value">${result.channels}</span>
                    </div>
                    <div class="stat-item">
                        Compression: <span class="compression-ratio">-${compressionRatio}%</span>
                    </div>
                </div>
            </div>
            <div class="result-actions">
                <a href="${URL.createObjectURL(result.blob)}" 
                   download="${result.name.split('.')[0]}_compressed.${this.settings.format}"
                   class="result-download">Download</a>
            </div>
        `;
        
        return resultItem;
    }
    
    async downloadAll() {
        if (this.compressedResults.length === 0) {
            this.showStatus('No files to download', 'error');
            return;
        }
        
        try {
            const zip = new JSZip();
            
            this.compressedResults.forEach(result => {
                zip.file(
                    `${result.name.split('.')[0]}_compressed.${this.settings.format}`,
                    result.blob
                );
            });
            
            const content = await zip.generateAsync({type: 'blob'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'compressed_audio.zip';
            link.click();
            
            // 清理URL对象
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        } catch (error) {
            console.error('Download failed:', error);
            this.showStatus('Failed to download: ' + error.message, 'error');
        }
    }
    
    clearAll() {
        if (this.isProcessing) {
            this.showStatus('Cannot clear while processing', 'error');
            return;
        }
        
        // 清理所有URL对象
        this.compressedResults.forEach(result => {
            if (result.blob) {
                URL.revokeObjectURL(URL.createObjectURL(result.blob));
            }
        });
        
        this.selectedFiles = [];
        this.compressedResults = [];
        this.previewAudios.clear();
        
        if (this.fileList) this.fileList.style.display = 'none';
        if (this.controlsPanel) this.controlsPanel.style.display = 'none';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
        if (this.summaryStats) this.summaryStats.style.display = 'none';
        
        this.showStatus('All files cleared', 'info');
    }
    
    showPreview(file) {
        const preview = document.createElement('div');
        preview.className = 'preview-item';
        preview.innerHTML = `
            <div class="preview-audio">
                <audio controls>
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    Your browser does not support the audio element.
                </audio>
            </div>
            <div class="preview-info">
                <div class="preview-name">${file.name}</div>
                <div class="preview-size">${this.formatFileSize(file.size)}</div>
            </div>
        `;
        
        if (this.previewContainer) {
            this.previewContainer.appendChild(preview);
            this.previewAudios.set(file.name, preview);
        }
    }
    
    updatePreview(file, result) {
        const preview = this.previewAudios.get(file.name);
        if (preview) {
            const comparison = document.createElement('div');
            comparison.className = 'preview-comparison';
            comparison.innerHTML = `
                <div class="comparison-item">
                    <h5>Original</h5>
                    <audio controls>
                        <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    </audio>
                    <div class="comparison-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="comparison-item">
                    <h5>Compressed</h5>
                    <audio controls>
                        <source src="${URL.createObjectURL(result.blob)}" type="audio/mp3">
                    </audio>
                    <div class="comparison-size">${this.formatFileSize(result.size)}</div>
                </div>
            `;
            preview.appendChild(comparison);
        }
    }
}

export default AdvancedAudioCompressor;