import DOMPurify from 'dompurify';

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const WIKI_DOMPURIFY_CONFIG = {
    ADD_TAGS: ['figure', 'figcaption'],
    ADD_ATTR: [
        'data-type',
        'data-diagram-type',
        'data-diagram-title',
        'data-diagram-source',
        'data-svg',
        'data-align',
        'data-width',
        'data-caption',
        'data-script-id',
        'data-writing-direction',
        'target',
        'rel',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'meta', 'base'],
    FORBID_ATTR: ['formaction', 'xlink:href'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/(?![/\\])|data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,])/i,
};

export const SVG_DOMPURIFY_CONFIG = {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    ALLOWED_URI_REGEXP: /^(?:#|data:image\/(?:png|jpe?g|gif|webp)[;,])/i,
};

let domPurifyHookRegistered = false;
function ensureDomPurifyHooks() {
    if (domPurifyHookRegistered || typeof DOMPurify?.addHook !== 'function') return;
    domPurifyHookRegistered = true;

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
            const existingRel = (node.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
            if (!existingRel.includes('noopener')) existingRel.push('noopener');
            if (!existingRel.includes('noreferrer')) existingRel.push('noreferrer');
            node.setAttribute('rel', existingRel.join(' '));
        }

        if (node.hasAttribute && node.hasAttribute('style')) {
            const rawStyle = node.getAttribute('style') || '';
            if (/url\s*\(|expression\s*\(|@import|behavior\s*:/i.test(rawStyle)) {
                node.removeAttribute('style');
            }
        }
    });
}

/**
 * Escapes HTML/XML special characters for safe interpolation inside templates.
 */
export function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Validates and normalizes user-supplied URLs to safe protocols.
 * Returns null if the URL uses an unsafe scheme (e.g. javascript:, vbscript:, data:text/html).
 */
export function sanitizeUrl(rawUrl, { allowDataImage = false, allowMailto = true, allowRelative = true } = {}) {
    if (typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // Strip ASCII control characters and whitespace often used for protocol obfuscation
    // eslint-disable-next-line no-control-regex
    const normalized = trimmed.replace(/[\u0000-\u0020\u007F]+/g, '');

    if (allowRelative && (normalized.startsWith('#') || (normalized.startsWith('/') && !normalized.startsWith('//')))) {
        return trimmed;
    }

    if (allowDataImage && /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i.test(normalized)) {
        return trimmed;
    }

    try {
        const parsed = new URL(trimmed, 'https://example.invalid');
        // Reject protocol-relative //host when base is applied unless original had explicit protocol
        if (trimmed.startsWith('//')) return null;

        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:') return trimmed;
        if (allowMailto && protocol === 'mailto:') return trimmed;
    } catch {
        return null;
    }

    return null;
}

/**
 * Sanitizes rich Wiki HTML using DOMPurify (or strips HTML in non-DOM test environments).
 */
export function sanitizeWikiHtml(html) {
    if (!html || typeof html !== 'string') return '';
    if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
        ensureDomPurifyHooks();
        return DOMPurify.sanitize(html, WIKI_DOMPURIFY_CONFIG);
    }
    return escapeHtml(html);
}

/**
 * Sanitizes inline SVG markup (diagrams, previews) before dangerouslySetInnerHTML.
 */
export function sanitizeSvgMarkup(svg) {
    if (!svg || typeof svg !== 'string') return '';
    if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
        ensureDomPurifyHooks();
        return DOMPurify.sanitize(svg, SVG_DOMPURIFY_CONFIG);
    }
    return svg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

/**
 * Validates custom @font-face / FontFace URLs and strips CSS breakout characters.
 */
export function sanitizeCssFontUrl(rawUrl) {
    if (typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    const normalized = trimmed.startsWith('data:')
        ? trimmed.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,')
        : trimmed;

    const isSafeDataFont = /^data:(?:font\/(?:ttf|otf|woff|woff2|truetype|opentype)|application\/(?:x-font-ttf|font-woff|font-woff2|vnd\.ms-fontobject));base64,[A-Za-z0-9+/=\s]+$/i.test(normalized);
    const isSafeHttps = /^https:\/\/[^'"`()\\<>;\s]+$/i.test(normalized);

    if (!isSafeDataFont && !isSafeHttps) return '';
    return normalized.replace(/['"`()\\<>\r\n]/g, '');
}

/**
 * Strips potentially dangerous CSS constructs (e.g. url(), expression()) from CSS custom properties.
 */
export function sanitizeCssValue(val) {
    if (typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (/url\s*\(|expression\s*\(|@import|<\/?style|[;{}<>]/i.test(trimmed)) {
        return '';
    }
    return trimmed;
}

/**
 * Sanitizes download filenames against path traversal or separator characters.
 */
export function sanitizeFilename(name, fallback = 'export') {
    const cleaned = String(name || fallback)
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .replace(/\.{2,}/g, '_')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '');
    return cleaned || fallback;
}

/**
 * Neutralizes spreadsheet formula injection in HTML/CSV cells without altering normal
 * linguistic affixes (like "-en" or "+stress") unless structured as a formula call.
 */
export function sanitizeSpreadsheetCell(value) {
    if (value == null) return '';
    const str = String(value);
    if (/^[\t\r\n]*[=@]/.test(str) || /^[\t\r\n]*[+-]\s*[A-Za-z0-9_]+\s*\(/.test(str)) {
        return `'${str}`;
    }
    return str;
}

/**
 * Recursively clones plain objects/arrays while dropping __proto__, constructor, and prototype keys
 * to prevent prototype pollution and DOM-attribute smuggling across JSON imports.
 */
export function stripDangerousKeys(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return undefined;
    seen.add(value);

    try {
        if (Array.isArray(value)) {
            return value.map(item => stripDangerousKeys(item, seen));
        }

        const out = {};
        for (const key of Object.keys(value)) {
            if (DANGEROUS_OBJECT_KEYS.has(key)) continue;
            out[key] = stripDangerousKeys(value[key], seen);
        }
        return out;
    } finally {
        seen.delete(value);
    }
}
