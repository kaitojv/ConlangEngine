import React, { useState, useRef } from 'react';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { Upload, Link as LinkIcon, Image as ImageIcon, AlertCircle, CheckCircle2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { compressAndValidateImage, formatBytes, DEFAULT_MAX_IMAGE_MB } from './imageCompressor.js';

export default function WikiImageModal({ isOpen, onClose, onInsert, t }) {
    const [tab, setTab] = useState('upload'); // 'upload' | 'url'
    const [url, setUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [altText, setAltText] = useState('');
    const [alignment, setAlignment] = useState('center');
    const [width, setWidth] = useState('100%');
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const fileInputRef = useRef(null);

    const tr = (key, fallback) => (t ? t(key) || fallback : fallback);

    const resetState = () => {
        setUrl('');
        setCaption('');
        setAltText('');
        setAlignment('center');
        setWidth('100%');
        setPreviewData(null);
        setErrorMsg(null);
        setIsProcessing(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setErrorMsg(null);
        setIsProcessing(true);

        const result = await compressAndValidateImage(file, { maxMB: DEFAULT_MAX_IMAGE_MB });
        setIsProcessing(false);

        if (!result.ok) {
            setErrorMsg(result.error);
            setPreviewData(null);
            return;
        }

        setPreviewData({
            src: result.dataUrl,
            sizeBytes: result.sizeBytes,
            width: result.width,
            height: result.height,
            name: file.name
        });
        if (!caption) {
            setCaption(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (!file.type.startsWith('image/')) {
                setErrorMsg(tr('wiki.richText.dropImageError', 'Please drop an image file (PNG, JPEG, WebP, SVG).'));
                return;
            }
            setErrorMsg(null);
            setIsProcessing(true);
            const result = await compressAndValidateImage(file, { maxMB: DEFAULT_MAX_IMAGE_MB });
            setIsProcessing(false);

            if (!result.ok) {
                setErrorMsg(result.error);
                setPreviewData(null);
                return;
            }

            setPreviewData({
                src: result.dataUrl,
                sizeBytes: result.sizeBytes,
                width: result.width,
                height: result.height,
                name: file.name
            });
            if (!caption) {
                setCaption(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleInsert = () => {
        const imageSrc = tab === 'upload' ? (previewData && previewData.src) : url.trim();
        if (!imageSrc) {
            setErrorMsg(tr('wiki.richText.selectImageError', 'Please select an image or provide a valid URL.'));
            return;
        }

        onInsert({
            src: imageSrc,
            caption: caption.trim(),
            alt: altText.trim() || caption.trim(),
            align: alignment,
            width
        });

        handleClose();
    };

    const isInsertDisabled = tab === 'upload' ? (!previewData || isProcessing) : (!url.trim());

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={tr('wiki.richText.insertImage', 'Insert Image / Illustration')}
        >
            <div className="wiki-modal-container">
                {/* Mode Tabs */}
                <div className="wiki-tab-buttons-row">
                    <button 
                        type="button" 
                        className={`wiki-tab-btn ${tab === 'upload' ? 'active' : ''}`}
                        onClick={() => { setTab('upload'); setErrorMsg(null); }}
                    >
                        <Upload size={14} />
                        <span>{tr('wiki.richText.uploadFile', 'Upload File')} ({tr('wiki.richText.maxSize', `Max ${DEFAULT_MAX_IMAGE_MB} MB`).replace('{size}', DEFAULT_MAX_IMAGE_MB)})</span>
                    </button>
                    <button 
                        type="button" 
                        className={`wiki-tab-btn ${tab === 'url' ? 'active' : ''}`}
                        onClick={() => { setTab('url'); setErrorMsg(null); }}
                    >
                        <LinkIcon size={14} />
                        <span>{tr('wiki.richText.imageUrl', 'Image Web URL')}</span>
                    </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="wiki-alert-banner wiki-alert-error">
                        <AlertCircle size={16} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {tab === 'upload' && (
                    <div>
                        <div 
                            className="wiki-dropzone"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                                style={{ display: 'none' }} 
                            />
                            {isProcessing ? (
                                <div className="wiki-dropzone-loading">
                                    <span>{tr('wiki.richText.compressing', 'Compressing and optimizing image...')}</span>
                                </div>
                            ) : previewData ? (
                                <div className="wiki-dropzone-preview">
                                    <img src={previewData.src} alt="Preview" className="wiki-preview-thumb" />
                                    <div className="wiki-preview-info">
                                        <div className="wiki-preview-badge">
                                            <CheckCircle2 size={13} color="#10b981" />
                                            <span>{tr('wiki.richText.readyBadge', 'Ready')} &middot; {formatBytes(previewData.sizeBytes)}</span>
                                        </div>
                                        <span className="wiki-preview-filename">{previewData.name}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="wiki-dropzone-empty">
                                    <ImageIcon size={32} />
                                    <div className="wiki-dropzone-text">
                                        {tr('wiki.richText.clickToBrowse', 'Click to browse or drag & drop image here')}
                                    </div>
                                    <span className="wiki-dropzone-sub">
                                        {tr('wiki.richText.supportedFormats', `PNG, JPG, WebP, SVG · Auto-compressed to under ${DEFAULT_MAX_IMAGE_MB} MB`).replace('{size}', DEFAULT_MAX_IMAGE_MB)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'url' && (
                    <div className="wiki-field-group">
                        <Input 
                            label={tr('wiki.richText.imageUrl', 'Image URL')} 
                            placeholder="https://example.com/map_of_valoria.png" 
                            value={url} 
                            onChange={(e) => { setUrl(e.target.value); setErrorMsg(null); }}
                            autoFocus
                        />
                        {url && (
                            <div className="wiki-url-preview-box">
                                <img 
                                    src={url} 
                                    alt="URL Preview" 
                                    className="wiki-preview-thumb" 
                                    onError={() => setErrorMsg(tr('wiki.richText.urlLoadError', 'Failed to load image from URL. Check if link is valid and public.'))} 
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Caption & Alignment options */}
                <div className="wiki-field-group">
                    <Input 
                        label={tr('wiki.richText.captionLabel', 'Caption (Optional)')} 
                        placeholder={tr('wiki.richText.captionPlaceholder', 'e.g. Map of ancient dialects, Royal Syllabary...')} 
                        value={caption} 
                        onChange={(e) => setCaption(e.target.value)} 
                    />
                </div>

                <div className="wiki-options-grid">
                    <div className="wiki-field-col">
                        <label className="wiki-field-label">{tr('wiki.richText.alignmentLabel', 'Alignment')}</label>
                        <div className="wiki-align-buttons">
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'left' ? 'active' : ''}`}
                                onClick={() => setAlignment('left')}
                                title={tr('wiki.richText.alignLeft', 'Left align')}
                            >
                                <AlignLeft size={16} />
                            </button>
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'center' ? 'active' : ''}`}
                                onClick={() => setAlignment('center')}
                                title={tr('wiki.richText.alignCenter', 'Center align')}
                            >
                                <AlignCenter size={16} />
                            </button>
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'right' ? 'active' : ''}`}
                                onClick={() => setAlignment('right')}
                                title={tr('wiki.richText.alignRight', 'Right align')}
                            >
                                <AlignRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="wiki-field-col">
                        <label className="wiki-field-label">{tr('wiki.richText.widthLabel', 'Width')}</label>
                        <select 
                            className="wiki-select" 
                            value={width} 
                            onChange={(e) => setWidth(e.target.value)}
                        >
                            <option value="100%">{tr('wiki.richText.fullWidth', '100% (Full Width)')}</option>
                            <option value="75%">{tr('wiki.richText.largeWidth', '75% (Large)')}</option>
                            <option value="50%">{tr('wiki.richText.mediumWidth', '50% (Medium)')}</option>
                            <option value="35%">{tr('wiki.richText.compactWidth', '35% (Compact)')}</option>
                            <option value="25%">{tr('wiki.richText.thumbWidth', '25% (Thumbnail)')}</option>
                        </select>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="wiki-modal-footer">
                    <Button variant="sec" onClick={handleClose}>{tr('wiki.richText.cancel', 'Cancel')}</Button>
                    <Button variant="imp" onClick={handleInsert} disabled={isInsertDisabled}>
                        {tr('wiki.richText.insertImageBtn', 'Insert Image')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
