import { generateBlockFontData } from './blockFontGenerator.jsx';

self.onmessage = async (e) => {
    const { config } = e.data;
    
    try {
        const newData = await generateBlockFontData(config);
        self.postMessage({ success: true, result: newData });
    } catch (error) {
        self.postMessage({ success: false, error: error.message || String(error) });
    }
};
