import ImageEditor from './ImageEditor.js';
import BatchRenamer from './BatchRenamer.js';

// Web Worker for image compression
const compressionWorker = new Worker(URL.createObjectURL(new Blob([`
    self.onmessage = async function(e) {
        const { imageData, settings } = e.data;
        try {
            const response = await fetch(imageData);
            if (!response.ok) throw new Error('Failed to fetch image data');
            
            const bitmap = await createImageBitmap(await response.blob());
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            
            if (!ctx) throw new Error('Failed to get canvas context');
            
            ctx.drawImage(bitmap, 0, 0);
            
            let width = bitmap.width;
            let height = bitmap.height;
            
            if (width > settings.maxWidth) {
                height = (settings.maxWidth * height) / width;
                width = settings.maxWidth;
            }
            if (height > settings.maxHeight) {
                width = (settings.maxHeight * width) / height;
                height = settings.maxHeight;
            }
            
            width = Math.max(1, Math.round(width * settings.scale));
            height = Math.max(1, Math.round(height * settings.scale));
            
            const resizedCanvas = new OffscreenCanvas(width, height);
            const resizedCtx = resizedCanvas.getContext('2d');
            
            if (!resizedCtx) throw new Error('Failed to get resized canvas context');
            
            resizedCtx.drawImage(bitmap, 0, 0, width, height);
            
            let quality = Math.max(0.1, Math.min(1, settings.quality));
            if (settings.mode === 'aggressive') {
                quality *= 0.8;
            } else if (settings.mode === 'maximum') {
                quality *= 0.6;
            }
            
            const blob = await resizedCanvas.convertToBlob({ 
                type: 'image/' + settings.format, 
                quality: quality 
            });
            
            bitmap.close();
            
            self.postMessage({
                blob: blob,
                width: width,
                height: height
            });
        } catch (error) {
            self.postMessage({ error: error.message });
        }
    };
`], { type: 'text/javascript' })));

class AdvancedImageCompressor {
    constructor() {
        this.selectedFiles = [];
        this.compressedResults = [];
        this.settings = {
            format: 'jpeg',
            quality: 0.8,
            maxWidth: 1600,
            maxHeight: 1200,
            scale: 1,
            mode: 'aggressive'
        };
        
        this.previewImages = new Map();
        this.compressionHistory = [];
        this.imageEditor = new ImageEditor();
        this.batchRenamer = new BatchRenamer();
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        // 确保默认选择正确的按钮
        document.querySelector('.format-btn[data-format="jpeg"]').classList.add('active');
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
        this.scaleSlider = document.getElementById('scaleSlider');
        this.scaleValue = document.getElementById('scaleValue');
        this.maxWidthInput = document.getElementById('maxWidth');
        this.maxHeightInput = document.getElementById('maxHeight');
        
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
            const savedSettings = localStorage.getItem('compressorSettings');
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
            localStorage.setItem('compressorSettings', JSON.stringify(this.settings));
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
        if (this.scaleSlider) {
            this.scaleSlider.value = this.settings.scale;
        }
        if (this.scaleValue) {
            this.scaleValue.textContent = Math.round(this.settings.scale * 100) + '%';
        }
        if (this.maxWidthInput) {
            this.maxWidthInput.value = this.settings.maxWidth;
        }
        if (this.maxHeightInput) {
            this.maxHeightInput.value = this.settings.maxHeight;
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
                    case 'jpeg':
                        formatDesc.innerHTML = '<strong>JPEG</strong>: Best for photographs and complex images. Good compression with some quality loss.';
                        break;
                    case 'png':
                        formatDesc.innerHTML = '<strong>PNG</strong>: Best for images with text, sharp edges, and transparency. Higher quality but larger file size.';
                        break;
                    case 'webp':
                        formatDesc.innerHTML = '<strong>WebP</strong>: Modern format with superior compression. Best balance of quality and file size.';
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
                        modeDesc.innerHTML = '<strong>Balanced Mode</strong>: Moderate compression, maintains good quality while reducing file size.';
                        break;
                    case 'aggressive':
                        modeDesc.innerHTML = '<strong>Aggressive Mode</strong>: High compression rate, suitable for web transfer.';
                        break;
                    case 'maximum':
                        modeDesc.innerHTML = '<strong>Maximum Mode</strong>: Extreme compression, prioritize file size over quality.';
                        break;
                }
            });
        });
        
        this.qualitySlider.addEventListener('input', (e) => {
            this.settings.quality = parseFloat(e.target.value);
            this.qualityValue.textContent = this.settings.quality;
        });
        
        this.scaleSlider.addEventListener('input', (e) => {
            this.settings.scale = parseFloat(e.target.value);
            this.scaleValue.textContent = Math.round(this.settings.scale * 100) + '%';
        });
        
        this.maxWidthInput.addEventListener('input', (e) => {
            this.settings.maxWidth = parseInt(e.target.value) || 1600;
        });
        
        this.maxHeightInput.addEventListener('input', (e) => {
            this.settings.maxHeight = parseInt(e.target.value) || 1200;
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
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            this.addFiles(files);
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
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
            this.showStatus('Please select images to compress', 'error');
            return;
        }
        
        this.progressSection.style.display = 'block';
        this.convertBtn.disabled = true;
        this.compressedResults = [];
        
        const startTime = Date.now();
        let totalSaved = 0;
        let totalOriginalSize = 0;
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = ((i + 1) / this.selectedFiles.length) * 100;
            
            this.progressFill.style.width = `${progress}%`;
            this.progressText.textContent = `Processing: ${file.name} (${i + 1}/${this.selectedFiles.length})`;
            
            try {
                const result = await this.compressImage(file);
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
            } catch (error) {
                console.error('Compression failed:', error);
                this.showStatus(`Error processing ${file.name}: ${error.message}`, 'error');
            }
        }
        
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(1);
        
        this.showCompressionSummary(this.compressedResults.length, totalSaved, totalOriginalSize, processingTime);
        
        this.showResults();
        this.progressSection.style.display = 'none';
        this.convertBtn.disabled = false;
    }
    
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Compression timeout'));
            }, 30000);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    compressionWorker.postMessage({
                        imageData: e.target.result,
                        settings: this.settings
                    });
                    
                    const handleMessage = (event) => {
                        clearTimeout(timeout);
                        compressionWorker.removeEventListener('message', handleMessage);
                        
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            const { blob, width, height } = event.data;
                            if (!blob) {
                                reject(new Error('No blob received from worker'));
                                return;
                            }
                            resolve({
                                name: file.name,
                                size: blob.size,
                                blob: blob,
                                originalSize: file.size,
                                width: width,
                                height: height
                            });
                        }
                    };
                    
                    compressionWorker.addEventListener('message', handleMessage);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            reader.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
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
            <div class="result-images">
                <div class="result-image-container">
                    <h5>Compressed Result</h5>
                    <img src="${URL.createObjectURL(result.blob)}" alt="Compressed">
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
                        Dimensions: <span class="stat-value">${Math.round(result.width)} × ${Math.round(result.height)}</span>
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
            link.download = 'compressed_images.zip';
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
        this.previewImages.clear();
        
        if (this.fileList) this.fileList.style.display = 'none';
        if (this.controlsPanel) this.controlsPanel.style.display = 'none';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
        if (this.summaryStats) this.summaryStats.style.display = 'none';
        
        this.showStatus('All files cleared', 'info');
    }
    
    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.createElement('div');
            preview.className = 'preview-item';
            preview.innerHTML = `
                <div class="preview-image">
                    <img src="${e.target.result}" alt="Preview">
                </div>
                <div class="preview-info">
                    <div class="preview-name">${file.name}</div>
                    <div class="preview-size">${this.formatFileSize(file.size)}</div>
                </div>
            `;
            
            if (this.previewContainer) {
                this.previewContainer.appendChild(preview);
                this.previewImages.set(file.name, preview);
            }
        };
        reader.readAsDataURL(file);
    }
    
    updatePreview(file, result) {
        const preview = this.previewImages.get(file.name);
        if (preview) {
            const comparison = document.createElement('div');
            comparison.className = 'preview-comparison';
            comparison.innerHTML = `
                <div class="comparison-item">
                    <h5>Original</h5>
                    <img src="${URL.createObjectURL(file)}" alt="Original">
                    <div class="comparison-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="comparison-item">
                    <h5>Compressed</h5>
                    <img src="${URL.createObjectURL(result.blob)}" alt="Compressed">
                    <div class="comparison-size">${this.formatFileSize(result.size)}</div>
                </div>
            `;
            preview.appendChild(comparison);
        }
    }
    
    editImage(file) {
        if (this.isProcessing) {
            this.showStatus('Cannot edit while processing', 'error');
            return;
        }
        this.imageEditor.show(file);
    }
    
    renameFiles() {
        if (this.isProcessing) {
            this.showStatus('Cannot rename while processing', 'error');
            return;
        }
        if (this.selectedFiles.length === 0) {
            this.showStatus('Please select files to rename', 'error');
            return;
        }
        this.batchRenamer.show(this.selectedFiles);
    }
    
    // 清理资源
    destroy() {
        if (this.compressionWorker) {
            this.compressionWorker.terminate();
            this.compressionWorker = null;
        }
        
        // 清理所有URL对象
        this.compressedResults.forEach(result => {
            if (result.blob) {
                URL.revokeObjectURL(URL.createObjectURL(result.blob));
            }
        });
        
        // 清理所有事件监听器
        if (this.uploadArea) {
            this.uploadArea.removeEventListener('click', () => this.fileInput.click());
            this.uploadArea.removeEventListener('dragover', this.handleDragOver);
            this.uploadArea.removeEventListener('dragleave', this.handleDragLeave);
            this.uploadArea.removeEventListener('drop', this.handleDrop);
        }
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileSelect);
        }
        
        // 清理其他资源
        this.selectedFiles = [];
        this.compressedResults = [];
        this.previewImages.clear();
        this.compressionHistory = [];
    }
}

export default AdvancedImageCompressor; 