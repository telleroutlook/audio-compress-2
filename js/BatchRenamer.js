export default class BatchRenamer {
    constructor() {
        this.renamer = document.createElement('div');
        this.renamer.className = 'batch-rename';
        this.renamer.innerHTML = `
            <div class="rename-header">
                <div class="rename-title">Batch Rename Files</div>
                <button class="rename-close">&times;</button>
            </div>
            <div class="rename-form">
                <input type="text" class="rename-input" id="renamePattern" 
                       placeholder="Enter name pattern (e.g., image_{n})" />
                <div class="rename-preview" id="renamePreview"></div>
                <div class="rename-actions">
                    <button class="editor-btn primary" id="applyRename">Apply</button>
                    <button class="editor-btn secondary" id="cancelRename">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.renamer);
        this.bindEvents();
        this.template = '{original}';
        this.prefix = '';
        this.suffix = '';
        this.startNumber = 1;
        this.padding = 3;
    }

    bindEvents() {
        const closeBtn = this.renamer.querySelector('.rename-close');
        closeBtn.addEventListener('click', () => this.hide());

        const cancelBtn = this.renamer.querySelector('#cancelRename');
        cancelBtn.addEventListener('click', () => this.hide());

        const patternInput = this.renamer.querySelector('#renamePattern');
        patternInput.addEventListener('input', () => this.updatePreview());

        const applyBtn = this.renamer.querySelector('#applyRename');
        applyBtn.addEventListener('click', () => this.applyRename());
    }

    show(files) {
        this.files = files;
        this.renamer.style.display = 'block';
        this.updatePreview();
    }

    hide() {
        this.renamer.style.display = 'none';
    }

    updatePreview() {
        const pattern = this.renamer.querySelector('#renamePattern').value || 'image_{n}';
        const preview = this.renamer.querySelector('#renamePreview');
        preview.innerHTML = '';

        this.files.forEach((file, fileIndex) => {
            const extension = file.name.split('.').pop();
            const newName = pattern.replace('{n}', (fileIndex + 1).toString().padStart(2, '0'));
            const previewItem = document.createElement('div');
            previewItem.textContent = `${file.name} → ${newName}.${extension}`;
            preview.appendChild(previewItem);
        });
    }

    applyRename() {
        try {
            const pattern = this.renamer.querySelector('#renamePattern').value || 'image_{n}';
            
            if (!window.compressor) {
                throw new Error('Compressor not available');
            }
            
            this.files.forEach((file, fileIndex) => {
                const extension = file.name.split('.').pop();
                const newName = pattern.replace('{n}', (fileIndex + 1).toString().padStart(2, '0'));
                
                try {
                    const newFile = new File([file], `${newName}.${extension}`, {
                        type: file.type,
                        lastModified: new Date().getTime()
                    });

                    const index = window.compressor.selectedFiles.indexOf(file);
                    if (index !== -1) {
                        window.compressor.selectedFiles[index] = newFile;
                    }
                } catch (error) {
                    console.error(`Failed to rename ${file.name}:`, error);
                }
            });

            window.compressor.updateFileList();
            window.compressor.showStatus('Files renamed successfully', 'success');
            this.hide();
        } catch (error) {
            console.error('Batch rename failed:', error);
            if (window.compressor && window.compressor.showStatus) {
                window.compressor.showStatus('Rename failed: ' + error.message, 'error');
            }
        }
    }

    setTemplate(template) {
        this.template = template;
    }

    setPrefix(prefix) {
        this.prefix = prefix;
    }

    setSuffix(suffix) {
        this.suffix = suffix;
    }

    setStartNumber(number) {
        this.startNumber = parseInt(number) || 1;
    }

    setPadding(padding) {
        this.padding = parseInt(padding) || 3;
    }

    generateName(originalName, index) {
        let newName = this.template;
        const extension = originalName.split('.').pop();
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));

        // Replace placeholders
        newName = newName.replace('{original}', baseName);
        newName = newName.replace('{number}', String(this.startNumber + index).padStart(this.padding, '0'));
        newName = newName.replace('{date}', new Date().toISOString().split('T')[0]);
        newName = newName.replace('{time}', new Date().toTimeString().split(' ')[0].replace(/:/g, '-'));

        // Add prefix and suffix
        newName = this.prefix + newName + this.suffix;

        // Ensure valid filename
        newName = newName.replace(/[<>:"/\\|?*]/g, '_');

        return `${newName}.${extension}`;
    }

    generatePreview(files) {
        return files.map((file, index) => {
            const newName = this.generateName(file.name, index);
            return {
                original: file.name,
                new: newName
            };
        });
    }

    renameFiles(files) {
        return files.map((file, index) => {
            const newName = this.generateName(file.name, index);
            return {
                file: file,
                newName: newName
            };
        });
    }
} 