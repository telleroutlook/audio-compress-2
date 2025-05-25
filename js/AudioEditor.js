export default class AudioEditor {
    constructor() {
        this.audioContext = null;
        this.currentBuffer = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
    }

    async initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    async loadAudio(file) {
        try {
            await this.initAudioContext();
            const arrayBuffer = await file.arrayBuffer();
            this.currentBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return true;
        } catch (error) {
            console.error('Error loading audio:', error);
            return false;
        }
    }

    async trim(startTime, endTime) {
        if (!this.currentBuffer) return null;

        const duration = endTime - startTime;
        const sampleRate = this.currentBuffer.sampleRate;
        const numberOfChannels = this.currentBuffer.numberOfChannels;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const frameCount = endSample - startSample;

        const newBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            frameCount,
            sampleRate
        );

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = this.currentBuffer.getChannelData(channel);
            const newChannelData = newBuffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                newChannelData[i] = channelData[startSample + i];
            }
        }

        return newBuffer;
    }

    async normalize() {
        if (!this.currentBuffer) return null;

        const numberOfChannels = this.currentBuffer.numberOfChannels;
        const length = this.currentBuffer.length;
        let maxValue = 0;

        // Find the maximum value across all channels
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = this.currentBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                maxValue = Math.max(maxValue, Math.abs(channelData[i]));
            }
        }

        if (maxValue === 0) return this.currentBuffer;

        const scale = 0.99 / maxValue;
        const newBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            length,
            this.currentBuffer.sampleRate
        );

        // Apply normalization
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = this.currentBuffer.getChannelData(channel);
            const newChannelData = newBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                newChannelData[i] = channelData[i] * scale;
            }
        }

        return newBuffer;
    }

    async fadeIn(duration) {
        if (!this.currentBuffer) return null;

        const numberOfChannels = this.currentBuffer.numberOfChannels;
        const length = this.currentBuffer.length;
        const sampleRate = this.currentBuffer.sampleRate;
        const fadeInSamples = Math.floor(duration * sampleRate);

        const newBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            length,
            sampleRate
        );

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = this.currentBuffer.getChannelData(channel);
            const newChannelData = newBuffer.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                if (i < fadeInSamples) {
                    const fadeInFactor = i / fadeInSamples;
                    newChannelData[i] = channelData[i] * fadeInFactor;
                } else {
                    newChannelData[i] = channelData[i];
                }
            }
        }

        return newBuffer;
    }

    async fadeOut(duration) {
        if (!this.currentBuffer) return null;

        const numberOfChannels = this.currentBuffer.numberOfChannels;
        const length = this.currentBuffer.length;
        const sampleRate = this.currentBuffer.sampleRate;
        const fadeOutSamples = Math.floor(duration * sampleRate);

        const newBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            length,
            sampleRate
        );

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = this.currentBuffer.getChannelData(channel);
            const newChannelData = newBuffer.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                if (i > length - fadeOutSamples) {
                    const fadeOutFactor = (length - i) / fadeOutSamples;
                    newChannelData[i] = channelData[i] * fadeOutFactor;
                } else {
                    newChannelData[i] = channelData[i];
                }
            }
        }

        return newBuffer;
    }

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

        // Write WAV header
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

        // Write audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
} 