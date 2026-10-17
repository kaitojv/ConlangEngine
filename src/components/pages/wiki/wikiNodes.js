import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

let _imageComponent = null;
let _diagramComponent = null;

export function configureWikiNodeViews(imageComponent, diagramComponent) {
    _imageComponent = imageComponent;
    _diagramComponent = diagramComponent;
}

/**
 * Custom Tiptap Node for rich images and illustrations with caption, sizing, and alignment.
 */
export const WikiImageNode = Node.create({
    name: 'wikiImage',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: element => {
                    if (element.tagName === 'IMG') return element.getAttribute('src');
                    const img = element.querySelector('img');
                    return img ? img.getAttribute('src') : null;
                }
            },
            alt: {
                default: '',
                parseHTML: element => {
                    if (element.tagName === 'IMG') return element.getAttribute('alt') || '';
                    const img = element.querySelector('img');
                    return img ? (img.getAttribute('alt') || '') : '';
                }
            },
            caption: {
                default: '',
                parseHTML: element => {
                    const figcaption = element.querySelector('figcaption');
                    return figcaption ? figcaption.textContent : (element.getAttribute('data-caption') || '');
                }
            },
            align: {
                default: 'center',
                parseHTML: element => element.getAttribute('data-align') || 'center'
            },
            width: {
                default: '100%',
                parseHTML: element => element.getAttribute('data-width') || element.style.maxWidth || '100%'
            }
        };
    },

    parseHTML() {
        return [
            { tag: 'figure[data-type="wiki-image"]' },
            { tag: 'figure.wiki-figure' },
            { tag: 'img[src]' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { src, alt, caption, align = 'center', width = '100%' } = HTMLAttributes;
        const style = width && width !== '100%' ? `max-width: ${width}; width: ${width};` : '';
        const figureAttrs = {
            'data-type': 'wiki-image',
            'data-align': align,
            'data-width': width,
            'data-caption': caption || '',
            class: `wiki-figure wiki-align-${align}`,
            ...(style ? { style } : {})
        };

        const imgAttrs = {
            src: src || '',
            alt: alt || caption || 'Conlang illustration',
            class: 'wiki-image-element'
        };

        if (caption) {
            return [
                'figure',
                figureAttrs,
                ['img', imgAttrs],
                ['figcaption', { class: 'wiki-figcaption' }, caption]
            ];
        }

        return ['figure', figureAttrs, ['img', imgAttrs]];
    },

    addNodeView() {
        if (_imageComponent && typeof ReactNodeViewRenderer === 'function') {
            return ReactNodeViewRenderer(_imageComponent);
        }
        return null;
    }
});

/**
 * Custom Tiptap Node for embeddable SVG diagrams and fluograms.
 */
export const WikiDiagramNode = Node.create({
    name: 'wikiDiagram',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addAttributes() {
        return {
            diagramType: {
                default: 'morphology',
                parseHTML: element => element.getAttribute('data-diagram-type') || 'morphology'
            },
            title: {
                default: 'Diagram',
                parseHTML: element => element.getAttribute('data-diagram-title') || 'Diagram'
            },
            sourceData: {
                default: '',
                parseHTML: element => element.getAttribute('data-diagram-source') || ''
            },
            svg: {
                default: '',
                parseHTML: element => {
                    const svgEl = element.querySelector('svg');
                    return svgEl ? svgEl.outerHTML : (element.getAttribute('data-svg') || '');
                }
            },
            align: {
                default: 'center',
                parseHTML: element => element.getAttribute('data-align') || 'center'
            },
            width: {
                default: '100%',
                parseHTML: element => element.getAttribute('data-width') || element.style.maxWidth || '100%'
            }
        };
    },

    parseHTML() {
        return [
            { tag: 'div.wiki-diagram-block' },
            { tag: 'figure[data-type="wiki-diagram"]' },
            { tag: 'figure.wiki-diagram-figure' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { diagramType = 'diagram', title = 'Diagram', sourceData = '', svg = '', align = 'center', width = '100%' } = HTMLAttributes;
        
        // Encode SVG as clean data-uri for foolproof cross-platform persistence and HTML sanitization
        const svgDataUri = svg ? (svg.startsWith('data:') ? svg : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`) : '';
        const style = width && width !== '100%' ? `max-width: ${width}; width: ${width};` : '';

        return [
            'figure',
            {
                class: `wiki-diagram-figure wiki-align-${align}`,
                'data-type': 'wiki-diagram',
                'data-diagram-type': diagramType,
                'data-diagram-title': title,
                'data-diagram-source': sourceData,
                'data-svg': svg,
                'data-align': align,
                'data-width': width,
                ...(style ? { style } : {})
            },
            [
                'div',
                { class: 'wiki-diagram-header', contenteditable: 'false' },
                ['span', { class: 'wiki-diagram-type-pill' }, diagramType.toUpperCase()],
                ['span', { class: 'wiki-diagram-title-text' }, title]
            ],
            [
                'div',
                { class: 'wiki-diagram-preview' },
                svgDataUri 
                    ? ['img', { src: svgDataUri, alt: title, class: 'wiki-diagram-img' }]
                    : ['div', { class: 'wiki-diagram-empty' }, 'Diagram']
            ],
            ['figcaption', { class: 'wiki-diagram-caption' }, title]
        ];
    },

    addNodeView() {
        if (_diagramComponent && typeof ReactNodeViewRenderer === 'function') {
            return ReactNodeViewRenderer(_diagramComponent);
        }
        return null;
    }
});
