import { buildOpenTypeFont, fixOpenTypeChecksums } from '../utils/fontCompiler.js';

self.onmessage = async (event) => {
    const { id, customGlyphs, traceWidth, fontScale, options } = event.data || {};
    try {
        const { font } = await buildOpenTypeFont(customGlyphs, traceWidth, fontScale, {
            ...(options || {}),
            yieldEvery: 0,
        });
        const buffer = fixOpenTypeChecksums(font.toArrayBuffer());
        self.postMessage({ id, buffer }, [buffer]);
    } catch (error) {
        self.postMessage({
            id,
            error: error?.message || String(error || 'Font worker compilation failed'),
        });
    }
};

