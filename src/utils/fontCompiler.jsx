// src/utils/fontCompiler.jsx
// Re-export pure font compilation helpers from fontCompiler.js so both Vite (.jsx callers)
// and Node test environments (.js callers) share one canonical implementation.
export {
    compileFont,
    compileFontBufferInWorker,
    fixOpenTypeChecksums,
    buildOpenTypeFont,
    buildGlyphPathAndMetrics,
    extractStrokeMetaAndPoints,
} from './fontCompiler.js';
