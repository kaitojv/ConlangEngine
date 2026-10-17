import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    Trash2, 
    Edit2,
    Check
} from 'lucide-react';

const WIDTH_OPTIONS = ['25%', '50%', '75%', '100%'];

export function WikiImageComponent({ node, updateAttributes, deleteNode, selected }) {
    const { src, alt, caption, align = 'center', width = '100%' } = node.attrs;
    const [isHovered, setIsHovered] = useState(false);

    const showControls = selected || isHovered;

    return (
        <NodeViewWrapper 
            className={`wiki-nodeview-wrapper wiki-align-${align}`} 
            style={{ 
                maxWidth: width || '100%', 
                width: width || '100%',
                margin: align === 'center' ? '18px auto' : undefined,
                float: align === 'left' ? 'left' : align === 'right' ? 'right' : 'none',
                clear: align === 'center' ? 'both' : undefined,
                marginRight: align === 'left' ? '20px' : undefined,
                marginLeft: align === 'right' ? '20px' : undefined,
                marginBottom: align !== 'center' ? '16px' : undefined
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <figure className={`wiki-figure wiki-align-${align}`} style={{ width: '100%', margin: 0 }}>
                {/* Floating Size & Alignment Toolbar */}
                {showControls && (
                    <div className="wiki-nodeview-controls" contentEditable={false}>
                        {/* Width Pills */}
                        <div className="wiki-nodeview-btn-group">
                            {WIDTH_OPTIONS.map(w => (
                                <button
                                    key={w}
                                    type="button"
                                    className={`wiki-nodeview-pill ${width === w ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updateAttributes({ width: w });
                                    }}
                                    title={`Resize to ${w}`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <div className="wiki-nodeview-divider"></div>

                        {/* Alignment Pills */}
                        <div className="wiki-nodeview-btn-group">
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'left' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'left' });
                                }}
                                title="Align Left"
                            >
                                <AlignLeft size={13} />
                            </button>
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'center' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'center' });
                                }}
                                title="Align Center"
                            >
                                <AlignCenter size={13} />
                            </button>
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'right' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'right' });
                                }}
                                title="Align Right"
                            >
                                <AlignRight size={13} />
                            </button>
                        </div>

                        <div className="wiki-nodeview-divider"></div>

                        {/* Delete Button */}
                        <button
                            type="button"
                            className="wiki-nodeview-pill delete-pill"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNode();
                            }}
                            title="Remove Image"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}

                <img 
                    src={src} 
                    alt={alt || caption || 'Conlang illustration'} 
                    className="wiki-image-element" 
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                />

                {caption && (
                    <figcaption className="wiki-figcaption">{caption}</figcaption>
                )}
            </figure>
        </NodeViewWrapper>
    );
}

export function WikiDiagramComponent({ node, updateAttributes, deleteNode, selected, getPos }) {
    const { diagramType = 'diagram', title = 'Diagram', sourceData = '', svg = '', align = 'center', width = '100%' } = node.attrs;
    const [isHovered, setIsHovered] = useState(false);

    const showControls = selected || isHovered;

    const svgDataUri = svg ? (svg.startsWith('data:') ? svg : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`) : '';

    const handleEditClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('edit-wiki-diagram', {
            detail: {
                diagramType,
                title,
                sourceData,
                width,
                align,
                pos: typeof getPos === 'function' ? getPos() : null
            }
        }));
    };

    return (
        <NodeViewWrapper 
            className={`wiki-nodeview-wrapper wiki-align-${align}`} 
            style={{ 
                maxWidth: width || '100%', 
                width: width || '100%',
                margin: align === 'center' ? '20px auto' : undefined,
                float: align === 'left' ? 'left' : align === 'right' ? 'right' : 'none',
                clear: align === 'center' ? 'both' : undefined,
                marginRight: align === 'left' ? '20px' : undefined,
                marginLeft: align === 'right' ? '20px' : undefined,
                marginBottom: align !== 'center' ? '16px' : undefined
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <figure className={`wiki-diagram-figure wiki-align-${align}`} style={{ width: '100%', margin: 0 }}>
                {/* Floating Size & Alignment & Edit Toolbar */}
                {showControls && (
                    <div className="wiki-nodeview-controls" contentEditable={false}>
                        {/* Width Pills */}
                        <div className="wiki-nodeview-btn-group">
                            {WIDTH_OPTIONS.map(w => (
                                <button
                                    key={w}
                                    type="button"
                                    className={`wiki-nodeview-pill ${width === w ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updateAttributes({ width: w });
                                    }}
                                    title={`Resize diagram to ${w}`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <div className="wiki-nodeview-divider"></div>

                        {/* Alignment Pills */}
                        <div className="wiki-nodeview-btn-group">
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'left' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'left' });
                                }}
                                title="Align Left"
                            >
                                <AlignLeft size={13} />
                            </button>
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'center' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'center' });
                                }}
                                title="Align Center"
                            >
                                <AlignCenter size={13} />
                            </button>
                            <button
                                type="button"
                                className={`wiki-nodeview-pill ${align === 'right' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateAttributes({ align: 'right' });
                                }}
                                title="Align Right"
                            >
                                <AlignRight size={13} />
                            </button>
                        </div>

                        <div className="wiki-nodeview-divider"></div>

                        {/* Edit Diagram Button */}
                        <button
                            type="button"
                            className="wiki-nodeview-pill edit-pill"
                            onClick={handleEditClick}
                            title="Edit this diagram"
                        >
                            <Edit2 size={12} />
                            <span style={{ fontSize: '0.72rem', marginLeft: '3px' }}>Edit</span>
                        </button>

                        <div className="wiki-nodeview-divider"></div>

                        {/* Delete Button */}
                        <button
                            type="button"
                            className="wiki-nodeview-pill delete-pill"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNode();
                            }}
                            title="Remove Diagram"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}

                <div className="wiki-diagram-header" contentEditable={false}>
                    <span className="wiki-diagram-type-pill">{diagramType.toUpperCase()}</span>
                    <span className="wiki-diagram-title-text">{title}</span>
                </div>

                <div className="wiki-diagram-preview" contentEditable={false}>
                    {svgDataUri ? (
                        <img src={svgDataUri} alt={title} className="wiki-diagram-img" />
                    ) : (
                        <div className="wiki-diagram-empty">{title}</div>
                    )}
                </div>

                <figcaption className="wiki-diagram-caption">{title}</figcaption>
            </figure>
        </NodeViewWrapper>
    );
}
