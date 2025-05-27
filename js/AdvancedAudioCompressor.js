import AudioEditor from './AudioEditor.js';
import BatchRenamer from './BatchRenamer.js';

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
            mode: 'maximum'
        };
        
        this.previewAudios = new Map();
        this.compressionHistory = [];
        this.audioEditor = new AudioEditor();
        this.batchRenamer = new BatchRenamer();
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        const formatBtn = document.querySelector('.format-btn[data-format="mp3"]');
        const modeBtn = document.querySelector('.format-btn[data-mode="maximum"]');
        
        if (formatBtn) formatBtn.classList.add('active');
        if (modeBtn) modeBtn.classList.add('active');
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
        if (!this.uploadArea || !this.fileInput) return;

        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        document.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn[data-format]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.format = btn.dataset.format;
                
                const formatDesc = document.getElementById('formatDescription');
                if (formatDesc) {
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
                }
            });
        });
        
        document.querySelectorAll('.format-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.mode = btn.dataset.mode;
                
                const modeDesc = document.getElementById('modeDescription');
                if (modeDesc) {
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
                }
            });
        });
        
        if (this.qualitySlider) {
            this.qualitySlider.addEventListener('input', (e) => {
                this.settings.quality = parseFloat(e.target.value);
                if (this.qualityValue) {
                    this.qualityValue.textContent = this.settings.quality;
                }
            });
        }
        
        if (this.bitRateInput) {
            this.bitRateInput.addEventListener('input', (e) => {
                this.settings.bitRate = parseInt(e.target.value) || 128;
            });
        }
        
        if (this.sampleRateSelect) {
            this.sampleRateSelect.addEventListener('change', (e) => {
                this.settings.sampleRate = parseInt(e.target.value) || 44100;
            });
        }
        
        if (this.bitDepthSelect) {
            this.bitDepthSelect.addEventListener('change', (e) => {
                this.settings.bitDepth = parseInt(e.target.value) || 16;
            });
        }
        
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', this.startCompression.bind(this));
        }
        
        if (this.downloadAllBtn) {
            this.downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));
        }
        
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', this.clearAll.bind(this));
        }
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
        
        if (this.controlsPanel) {
            this.controlsPanel.style.display = 'block';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.smoothScrollTo(this.controlsPanel);
                });
            });
        }
    }
    
    updateFileList() {
        if (this.selectedFiles.length === 0) {
            this.fileList.style.display = 'none';
            return;
        }
        
        this.fileList.innerHTML = '';
        this.fileList.style.display = 'block';
        
        const header = document.createElement('div');
        header.className = 'file-list-header';
        header.innerHTML = `
            <h3>Selected Files</h3>
            <div class="file-stats">${this.selectedFiles.length} files selected</div>
        `;
        this.fileList.appendChild(header);
        
        const listContainer = document.createElement('div');
        listContainer.className = 'file-items';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file" data-index="${index}">×</button>
            `;
            listContainer.appendChild(fileItem);
        });
        
        this.fileList.appendChild(listContainer);
        
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeFile(index);
            });
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    showStatus(message, type = 'info') {
        this.statusMessage.className = `status-message status-${type}`;
        this.statusMessage.textContent = message;
    }
    
    smoothScrollTo(element) {
        if (!element) return;

        const scroll = () => {
            const supportsSmoothScroll = 'scrollBehavior' in document.documentElement.style;
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            if (prefersReducedMotion) {
                element.scrollIntoView();
                return;
            }

            try {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                 rect.bottom <= window.innerHeight && 
                                 rect.right <= window.innerWidth;
                
                if (!isVisible) {
                    if (supportsSmoothScroll) {
                        element.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                    } else {
                        const targetPosition = rect.top + window.pageYOffset - 100;
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            } catch (error) {
                element.scrollIntoView();
            }
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(scroll);
        });
    }
    
    async startCompression() {
        if (this.selectedFiles.length === 0) {
            this.showStatus('Please select audio files to compress', 'error');
            return;
        }
        
        this.progressSection.style.display = 'block';
        this.convertBtn.disabled = true;
        this.compressedResults = [];
        this.isProcessing = true;
        
        this.progressFill.style.width = '0%';
        this.progressFill.style.transition = 'none';
        
        const startTime = Date.now();
        let totalSaved = 0;
        let totalOriginalSize = 0;
        let successCount = 0;
        
        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress(i, 0, file.name);
                this.showStatus(`Starting to process ${file.name}...`, 'info');
                
                try {
                    if (!file.type.startsWith('audio/')) {
                        throw new Error('Invalid file type. Only audio files are supported.');
                    }
                    
                    if (file.size > 100 * 1024 * 1024) {
                        throw new Error('File too large. Maximum size is 100MB.');
                    }
                    
                    const result = await this.compressAudio(file, (progress) => {
                        this.updateProgress(i, progress, file.name);
                    });
                    
                    this.updateProgress(i, 100, file.name);
                    
                    this.compressedResults.push(result);
                    this.updatePreview(file, result);
                    totalSaved += (file.size - result.size);
                    totalOriginalSize += file.size;
                    successCount++;
                    
                    this.compressionHistory.push({
                        timestamp: new Date().toISOString(),
                        originalFile: file.name,
                        originalSize: file.size,
                        compressedSize: result.size,
                        settings: { ...this.settings }
                    });
                    
                    this.showStatus(`Successfully compressed ${file.name}`, 'success');
                } catch (error) {
                    this.showStatus(`Error processing ${file.name}: ${error.message}`, 'error');
                    continue;
                }
            }
            
            this.progressFill.style.width = '100%';
            this.progressText.textContent = 'Processing complete!';
            
            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(1);
            
            if (successCount > 0) {
                this.showCompressionSummary(successCount, totalSaved, totalOriginalSize, processingTime);
                this.showResults();
                this.showStatus(`Successfully compressed ${successCount} out of ${this.selectedFiles.length} files`, 'success');
            } else {
                this.showStatus('No files were successfully compressed', 'error');
            }
        } catch (error) {
            this.showStatus('Compression process failed: ' + error.message, 'error');
        } finally {
            this.progressSection.style.display = 'none';
            this.convertBtn.disabled = false;
            this.isProcessing = false;
        }
    }
    
    async compressAudio(file, progressCallback) {
        try {
            const worker = new Worker(new URL('../src/workers/audioCompressionWorker.js', import.meta.url));
            
            return new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    if (e.data.type === 'progress') {
                        progressCallback(e.data.progress);
                    } else if (e.data.type === 'complete') {
                        resolve(e.data.result);
                        worker.terminate();
                    } else if (e.data.type === 'error') {
                        reject(new Error(e.data.error));
                        worker.terminate();
                    }
                };

                worker.onerror = (error) => {
                    reject(error);
                    worker.terminate();
                };

                worker.postMessage({
                    file,
                    settings: this.settings
                });
            });
        } catch (error) {
            throw error;
        }
    }
    
    showResults() {
        if (!this.resultsSection || this.compressedResults.length === 0) return;
        
        this.resultsSection.style.display = 'block';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.smoothScrollTo(this.resultsSection);
            });
        });
    }
    
    showCompressionSummary(successCount, totalSaved, totalOriginalSize, processingTime) {
        if (!this.summaryStats) return;
        
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
                ? ((totalSaved / totalOriginalSize) * 100).toFixed(1)
                : 0;
            elements.avgCompression.textContent = `${compressionRatio >= 0 ? '-' : '+'}${Math.abs(compressionRatio)}%`;
        }
        
        if (elements.processingTime) {
            elements.processingTime.textContent = parseFloat(processingTime).toFixed(1) + 's';
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.smoothScrollTo(this.summaryStats);
            });
        });
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
                        <source src="${URL.createObjectURL(result.blob)}" type="audio/wav">
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
            
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        } catch (error) {
            this.showStatus('Failed to download: ' + error.message, 'error');
        }
    }
    
    clearAll() {
        if (this.isProcessing) {
            this.showStatus('Cannot clear while processing', 'error');
            return;
        }
        
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
                        <source src="${URL.createObjectURL(result.blob)}" type="audio/wav">
                    </audio>
                    <div class="comparison-size">${this.formatFileSize(result.size)}</div>
                </div>
            `;
            preview.appendChild(comparison);
        }
    }

    updateProgress(fileIndex, fileProgress, fileName) {
        const totalFiles = this.selectedFiles.length;
        const currentFile = this.selectedFiles[fileIndex];
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const fileWeight = currentFile.size / totalSize;
        
        const completedProgress = this.selectedFiles
            .slice(0, fileIndex)
            .reduce((sum, file) => sum + (file.size / totalSize) * 100, 0);
        
        let currentFileProgress;
        
        if (fileProgress <= 25) {
            currentFileProgress = fileProgress * fileWeight;
        } else if (fileProgress <= 95) {
            const encodingProgress = (fileProgress - 25) * (70 / 70);
            currentFileProgress = (25 + encodingProgress) * fileWeight;
        } else {
            currentFileProgress = 95 * fileWeight + (fileProgress - 95) * fileWeight;
        }
        
        const totalProgress = completedProgress + currentFileProgress;
        
        this.progressFill.style.transition = 'width 0.5s ease-out';
        this.progressFill.style.width = `${Math.min(totalProgress, 100)}%`;
        
        let statusText = `Processing: ${fileName} (${fileIndex + 1}/${totalFiles})`;
        if (fileProgress < 100) {
            statusText += ` - ${Math.round(fileProgress)}%`;
            if (fileProgress < 20) {
                statusText += ' (Initializing...)';
            } else if (fileProgress < 40) {
                statusText += ' (Decoding audio...)';
            } else if (fileProgress < 60) {
                statusText += ' (Preparing encoder...)';
            } else if (fileProgress < 85) {
                statusText += ' (Encoding audio...)';
            } else {
                statusText += ' (Finalizing...)';
            }
        }
        this.progressText.textContent = statusText;
    }
}

export default AdvancedAudioCompressor;