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
            mode: 'aggressive'
        };
        
        this.previewAudios = new Map();
        this.compressionHistory = [];
        this.audioEditor = new AudioEditor();
        this.batchRenamer = new BatchRenamer();
        this.lamejs = null; // 初始化 lamejs 为 null
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.initLamejs(); // 添加初始化 lamejs 的调用
        
        // 确保默认选择正确的按钮
        document.querySelector('.format-btn[data-format="mp3"]').classList.add('active');
        document.querySelector('.format-btn[data-mode="aggressive"]').classList.add('active');
    }
    
    async initLamejs() {
        try {
            // 优先使用全局 lamejs
            if (typeof window !== 'undefined' && window.lamejs) {
                this.lamejs = window.lamejs;
                console.log('Using global lamejs');
                return;
            }

            // 如果全局没有，尝试动态导入
            try {
                const lamejsModule = await import('lamejs');
                this.lamejs = lamejsModule.default || lamejsModule;
                console.log('Using imported lamejs');
            } catch (error) {
                console.warn('Failed to import lamejs module:', error);
                
                // 最后尝试从 CDN 加载的全局变量
                if (typeof lamejs !== 'undefined') {
                    this.lamejs = lamejs;
                    console.log('Using CDN lamejs');
                } else {
                    throw new Error('lamejs library not available');
                }
            }
            
            // 验证 lamejs 是否正确加载
            if (!this.lamejs || typeof this.lamejs.Mp3Encoder !== 'function') {
                throw new Error('lamejs Mp3Encoder not available');
            }
            
            console.log('lamejs loaded successfully');
        } catch (error) {
            console.error('Failed to load lamejs:', error);
            this.showStatus('Audio compression library failed to load. Using alternative method.', 'warning');
            this.lamejs = null;
        }
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
        this.isProcessing = true;
        
        // 重置进度条
        this.progressFill.style.width = '0%';
        this.progressFill.style.transition = 'none';
        
        const startTime = Date.now();
        let totalSaved = 0;
        let totalOriginalSize = 0;
        let successCount = 0;
        
        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                
                // 初始进度显示
                this.updateProgress(i, 0, file.name);
                this.showStatus(`Starting to process ${file.name}...`, 'info');
                
                try {
                    console.log(`Starting compression for file ${i + 1}/${this.selectedFiles.length}:`, file.name);
                    
                    // 检查文件类型
                    if (!file.type.startsWith('audio/')) {
                        throw new Error('Invalid file type. Only audio files are supported.');
                    }
                    
                    // 检查文件大小
                    if (file.size > 100 * 1024 * 1024) { // 100MB limit
                        throw new Error('File too large. Maximum size is 100MB.');
                    }
                    
                    // 传递进度回调函数
                    const result = await this.compressAudio(file, (progress) => {
                        this.updateProgress(i, progress, file.name);
                    });
                    
                    console.log('Compression completed for:', file.name, result);
                    
                    // 完成当前文件的进度
                    this.updateProgress(i, 100, file.name);
                    
                    this.compressedResults.push(result);
                    this.updatePreview(file, result);
                    totalSaved += (file.size - result.size);
                    totalOriginalSize += file.size;
                    successCount++;
                    
                    // 保存到历史记录
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
                    // 继续处理下一个文件
                    continue;
                }
            }
            
            // 最终进度设置为100%
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
            console.error('Compression process failed:', error);
            this.showStatus('Compression process failed: ' + error.message, 'error');
        } finally {
            this.progressSection.style.display = 'none';
            this.convertBtn.disabled = false;
            this.isProcessing = false;
        }
    }
    
    async compressAudio(file, progressCallback) {
        if (this.lamejs) {
            return this.compressAudioWithLamejs(file, progressCallback);
        } else {
            return this.compressAudioAlternative(file, progressCallback);
        }
    }
    
    async compressAudioWithLamejs(file, progressCallback) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // 初始化阶段
                    if (progressCallback) progressCallback(5);
                    await new Promise(resolve => setTimeout(resolve, 100)); // 添加小延迟使进度更平滑
                    
                    const arrayBuffer = e.target.result;
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    if (progressCallback) progressCallback(10);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // 确保 audioContext 处于运行状态
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }
                    
                    if (progressCallback) progressCallback(15);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

                    if (progressCallback) progressCallback(25);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 获取音频数据
                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    const length = audioBuffer.length;

                    // 验证 lamejs 是否可用
                    if (!this.lamejs || typeof this.lamejs.Mp3Encoder !== 'function') {
                        throw new Error('lamejs Mp3Encoder not available');
                    }

                    if (progressCallback) progressCallback(35);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 创建 MP3 编码器
                    const mp3encoder = new this.lamejs.Mp3Encoder(
                        channels, 
                        sampleRate, 
                        this.settings.bitRate
                    );
                    
                    if (!mp3encoder) {
                        throw new Error('Failed to create MP3 encoder');
                    }

                    const mp3Data = [];
                    const sampleBlockSize = 1152; // LAME 要求的块大小

                    if (progressCallback) progressCallback(45);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 处理每个声道
                    if (channels === 1) {
                        // 单声道处理
                        const samples = audioBuffer.getChannelData(0);
                        const int16Array = new Int16Array(samples.length);
                        
                        // 转换为 16-bit PCM
                        for (let i = 0; i < samples.length; i++) {
                            const sample = Math.max(-1, Math.min(1, samples[i]));
                            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                        }

                        if (progressCallback) progressCallback(55);
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // 分块编码，并在过程中更新进度
                        const totalBlocks = Math.ceil(int16Array.length / sampleBlockSize);
                        let processedBlocks = 0;
                        
                        for (let i = 0; i < int16Array.length; i += sampleBlockSize) {
                            const chunk = int16Array.slice(i, i + sampleBlockSize);
                            const mp3buf = mp3encoder.encodeBuffer(chunk);
                            if (mp3buf.length > 0) {
                                mp3Data.push(mp3buf);
                            }
                            
                            processedBlocks++;
                            // 更新进度 (55% 到 85%)
                            if (progressCallback && totalBlocks > 0) {
                                const blockProgress = processedBlocks / totalBlocks;
                                const currentProgress = 55 + (blockProgress * 30);
                                progressCallback(Math.min(currentProgress, 85));
                                
                                // 每处理一定数量的块后添加小延迟，使进度更新更平滑
                                if (processedBlocks % 10 === 0) {
                                    await new Promise(resolve => setTimeout(resolve, 10));
                                }
                            }
                        }
                    } else {
                        // 立体声处理
                        const leftChannel = audioBuffer.getChannelData(0);
                        const rightChannel = audioBuffer.getChannelData(1);
                        const leftInt16 = new Int16Array(leftChannel.length);
                        const rightInt16 = new Int16Array(rightChannel.length);
                        
                        // 转换为 16-bit PCM
                        for (let i = 0; i < leftChannel.length; i++) {
                            const leftSample = Math.max(-1, Math.min(1, leftChannel[i]));
                            const rightSample = Math.max(-1, Math.min(1, rightChannel[i]));
                            leftInt16[i] = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7FFF;
                            rightInt16[i] = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7FFF;
                        }

                        if (progressCallback) progressCallback(55);
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // 分块编码
                        const totalBlocks = Math.ceil(leftInt16.length / sampleBlockSize);
                        let processedBlocks = 0;
                        
                        for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
                            const leftChunk = leftInt16.slice(i, i + sampleBlockSize);
                            const rightChunk = rightInt16.slice(i, i + sampleBlockSize);
                            const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                            if (mp3buf.length > 0) {
                                mp3Data.push(mp3buf);
                            }
                            
                            processedBlocks++;
                            // 更新进度 (55% 到 85%)
                            if (progressCallback && totalBlocks > 0) {
                                const blockProgress = processedBlocks / totalBlocks;
                                const currentProgress = 55 + (blockProgress * 30);
                                progressCallback(Math.min(currentProgress, 85));
                                
                                // 每处理一定数量的块后添加小延迟，使进度更新更平滑
                                if (processedBlocks % 10 === 0) {
                                    await new Promise(resolve => setTimeout(resolve, 10));
                                }
                            }
                        }
                    }

                    if (progressCallback) progressCallback(90);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 完成编码
                    const finalMp3buf = mp3encoder.flush();
                    if (finalMp3buf.length > 0) {
                        mp3Data.push(finalMp3buf);
                    }

                    if (mp3Data.length === 0) {
                        throw new Error('No MP3 data generated');
                    }

                    if (progressCallback) progressCallback(95);
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 创建 MP3 blob
                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });

                    if (progressCallback) progressCallback(100);

                    resolve({
                        blob: mp3Blob,
                        size: mp3Blob.size,
                        type: 'audio/mp3',
                        name: file.name.replace(/\.[^/.]+$/, '.mp3'),
                        originalSize: file.size,
                        duration: audioBuffer.duration,
                        sampleRate: sampleRate,
                        channels: channels
                    });

                } catch (error) {
                    console.error('Error in compressAudioWithLamejs:', error);
                    reject(new Error(`Audio compression failed: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Alternative compression method without lamejs
    async compressAudioAlternative(file, progressCallback) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    if (progressCallback) progressCallback(10);
                    
                    const arrayBuffer = e.target.result;
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // 确保 audioContext 处于运行状态
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }
                    
                    if (progressCallback) progressCallback(25);
                    
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
                    
                    if (progressCallback) progressCallback(40);
                    
                    // 计算压缩参数
                    let targetSampleRate = audioBuffer.sampleRate;
                    let targetChannels = audioBuffer.numberOfChannels;
                    let targetBitDepth = 16;
                    
                    // 根据压缩模式调整参数
                    switch (this.settings.mode) {
                        case 'aggressive':
                            targetSampleRate = Math.min(22050, targetSampleRate);
                            targetChannels = 1;
                            targetBitDepth = 8;
                            break;
                        case 'maximum':
                            targetSampleRate = Math.min(16000, targetSampleRate);
                            targetChannels = 1;
                            targetBitDepth = 8;
                            break;
                        default: // balanced
                            targetSampleRate = Math.min(32000, targetSampleRate);
                            break;
                    }
                    
                    if (progressCallback) progressCallback(50);
                    
                    // 创建压缩后的缓冲区
                    const compressedLength = Math.floor(audioBuffer.duration * targetSampleRate);
                    const compressedBuffer = audioContext.createBuffer(
                        targetChannels,
                        compressedLength,
                        targetSampleRate
                    );
                    
                    if (progressCallback) progressCallback(60);
                    
                    // 重采样和压缩
                    for (let channel = 0; channel < targetChannels; channel++) {
                        const sourceChannel = Math.min(channel, audioBuffer.numberOfChannels - 1);
                        const inputData = audioBuffer.getChannelData(sourceChannel);
                        const outputData = compressedBuffer.getChannelData(channel);
                        const ratio = audioBuffer.sampleRate / targetSampleRate;
                        
                        for (let i = 0; i < compressedLength; i++) {
                            const sourceIndex = Math.floor(i * ratio);
                            let sample = inputData[sourceIndex] || 0;
                            
                            // 应用位深度压缩
                            if (targetBitDepth === 8) {
                                sample = Math.round(sample * 127) / 127;
                            } else {
                                sample = Math.round(sample * 32767) / 32767;
                            }
                            
                            // 限制范围
                            sample = Math.max(-1, Math.min(1, sample));
                            outputData[i] = sample;
                            
                            // 更新进度 (60% 到 85%)
                            if (progressCallback && i % 1000 === 0) {
                                const sampleProgress = i / compressedLength;
                                const channelProgress = (channel + sampleProgress) / targetChannels;
                                const currentProgress = 60 + (channelProgress * 25);
                                progressCallback(Math.min(currentProgress, 85));
                            }
                        }
                    }
                    
                    if (progressCallback) progressCallback(90);
                    
                    // 导出为 WAV
                    const wavBlob = await this.exportToWav(compressedBuffer);
                    
                    if (progressCallback) progressCallback(100);
                    
                    resolve({
                        blob: wavBlob,
                        size: wavBlob.size,
                        type: 'audio/wav',
                        name: file.name.replace(/\.[^/.]+$/, '.wav'),
                        originalSize: file.size,
                        duration: audioBuffer.duration,
                        sampleRate: targetSampleRate,
                        channels: targetChannels
                    });
                    
                } catch (error) {
                    console.error('Error in compressAudioAlternative:', error);
                    reject(new Error(`Alternative compression failed: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    // WAV export method
    async exportToWav(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numberOfChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const headerSize = 44;
        const totalSize = headerSize + dataSize;

        const arrayBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(arrayBuffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, totalSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, Math.max(-32768, Math.min(32767, value)), true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
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
        // 计算当前文件的权重（基于文件大小）
        const currentFile = this.selectedFiles[fileIndex];
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const fileWeight = currentFile.size / totalSize;
        
        // 计算已完成文件的进度
        const completedProgress = this.selectedFiles
            .slice(0, fileIndex)
            .reduce((sum, file) => sum + (file.size / totalSize) * 100, 0);
        
        // 计算当前文件的进度贡献
        const currentFileProgress = fileProgress * fileWeight;
        
        // 总进度 = 已完成文件的进度 + 当前文件的进度
        const totalProgress = completedProgress + currentFileProgress;
        
        // 添加平滑过渡效果
        this.progressFill.style.transition = 'width 0.3s ease-in-out';
        this.progressFill.style.width = `${Math.min(totalProgress, 100)}%`;
        
        // 更新进度文本，添加更多详细信息
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