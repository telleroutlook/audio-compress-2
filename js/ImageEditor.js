class ImageEditor {
    constructor() {
        this.editor = document.createElement('div');
        this.editor.className = 'image-editor';
        this.editor.innerHTML = `
            <div class="editor-container">
                <div class="editor-header">
                    <div class="editor-title">Image Editor</div>
                    <button class="editor-close">&times;</button>
                </div>
                <div class="editor-content">
                    <div class="editor-preview">
                        <img src="" alt="Preview">
                    </div>
                    <div class="editor-controls">
                        <div class="control-section">
                            <h4>Basic Adjustments</h4>
                            <div class="slider-control">
                                <label>Brightness</label>
                                <input type="range" min="0" max="200" value="100" id="brightness">
                                <span>100%</span>
                            </div>
                            <div class="slider-control">
                                <label>Contrast</label>
                                <input type="range" min="0" max="200" value="100" id="contrast">
                                <span>100%</span>
                            </div>
                            <div class="slider-control">
                                <label>Saturation</label>
                                <input type="range" min="0" max="200" value="100" id="saturation">
                                <span>100%</span>
                            </div>
                        </div>
                        <div class="control-section">
                            <h4>Transform</h4>
                            <div class="slider-control">
                                <label>Rotation</label>
                                <input type="range" min="0" max="360" value="0" id="rotation">
                                <span>0°</span>
                            </div>
                            <div class="slider-control">
                                <label>Scale</label>
                                <input type="range" min="50" max="150" value="100" id="scale">
                                <span>100%</span>
                            </div>
                        </div>
                        <div class="control-section">
                            <h4>Filters</h4>
                            <div class="filter-buttons">
                                <button class="editor-btn" data-filter="none">None</button>
                                <button class="editor-btn" data-filter="grayscale">Grayscale</button>
                                <button class="editor-btn" data-filter="sepia">Sepia</button>
                                <button class="editor-btn" data-filter="blur">Blur</button>
                            </div>
                        </div>
                        <div class="editor-actions">
                            <button class="editor-btn primary" id="applyChanges">Apply Changes</button>
                            <button class="editor-btn secondary" id="resetChanges">Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.editor);
        this.bindEvents();
    }

    bindEvents() {
        const closeBtn = this.editor.querySelector('.editor-close');
        closeBtn.addEventListener('click', () => this.hide());

        const sliders = this.editor.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                e.target.nextElementSibling.textContent = value + (e.target.id === 'rotation' ? '°' : '%');
                this.updatePreview();
            });
        });

        const filterButtons = this.editor.querySelectorAll('.filter-buttons .editor-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updatePreview();
            });
        });

        const applyBtn = this.editor.querySelector('#applyChanges');
        applyBtn.addEventListener('click', () => this.applyChanges());

        const resetBtn = this.editor.querySelector('#resetChanges');
        resetBtn.addEventListener('click', () => this.resetChanges());
    }

    show(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = this.editor.querySelector('.editor-preview img');
            img.src = e.target.result;
            this.originalImage = e.target.result;
            this.currentFile = file;
            this.editor.style.display = 'block';
            this.resetChanges();
        };
        reader.readAsDataURL(file);
    }

    hide() {
        this.editor.style.display = 'none';
    }

    updatePreview() {
        const img = this.editor.querySelector('.editor-preview img');
        const brightness = this.editor.querySelector('#brightness').value;
        const contrast = this.editor.querySelector('#contrast').value;
        const saturation = this.editor.querySelector('#saturation').value;
        const rotation = this.editor.querySelector('#rotation').value;
        const scale = this.editor.querySelector('#scale').value;
        const activeFilter = this.editor.querySelector('.filter-buttons .active')?.dataset.filter || 'none';

        img.style.filter = `
            brightness(${brightness}%)
            contrast(${contrast}%)
            saturate(${saturation}%)
            ${activeFilter === 'grayscale' ? 'grayscale(100%)' : ''}
            ${activeFilter === 'sepia' ? 'sepia(100%)' : ''}
            ${activeFilter === 'blur' ? 'blur(2px)' : ''}
        `;
        img.style.transform = `rotate(${rotation}deg) scale(${scale / 100})`;
    }

    resetChanges() {
        const sliders = this.editor.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.value = slider.defaultValue;
            slider.nextElementSibling.textContent = slider.defaultValue + (slider.id === 'rotation' ? '°' : '%');
        });

        const filterButtons = this.editor.querySelectorAll('.filter-buttons .editor-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        filterButtons[0].classList.add('active');

        this.updatePreview();
    }

    applyChanges() {
        if (!this.currentFile) return;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Canvas not supported');
            }
            
            const img = this.editor.querySelector('.editor-preview img');
            if (!img || !img.naturalWidth || !img.naturalHeight) {
                throw new Error('Invalid image');
            }

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            ctx.filter = img.style.filter || '';
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            const rotation = parseInt(this.editor.querySelector('#rotation').value) || 0;
            const scale = parseInt(this.editor.querySelector('#scale').value) || 100;
            
            ctx.rotate(rotation * Math.PI / 180);
            ctx.scale(scale / 100, scale / 100);
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Failed to create blob');
                    return;
                }
                
                try {
                    const editedFile = new File([blob], this.currentFile.name, {
                        type: this.currentFile.type,
                        lastModified: new Date().getTime()
                    });

                    if (window.compressor && window.compressor.selectedFiles) {
                        const index = window.compressor.selectedFiles.indexOf(this.currentFile);
                        if (index !== -1) {
                            window.compressor.selectedFiles[index] = editedFile;
                            window.compressor.updateFileList();
                            window.compressor.showStatus('Image edited successfully', 'success');
                        }
                    }

                    this.hide();
                } catch (error) {
                    console.error('Failed to create edited file:', error);
                }
            }, this.currentFile.type);
        } catch (error) {
            console.error('Apply changes failed:', error);
            if (window.compressor && window.compressor.showStatus) {
                window.compressor.showStatus('Edit failed: ' + error.message, 'error');
            }
        }
    }
}

export default ImageEditor; 