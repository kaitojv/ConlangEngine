export const parseSVGToStrokes = (svgString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const paths = doc.querySelectorAll('path');
    
    const allStrokes = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    paths.forEach(path => {
        const d = path.getAttribute('d');
        if (!d) return;
        
        // Match command and arguments, e.g. "M 10 20", "L 30 40", "Z"
        const commands = d.match(/[A-Za-z][^A-Za-z]*/g);
        if (!commands) return;
        
        let currentStroke = [];
        const isFilled = d.toLowerCase().includes('z') || (path.getAttribute('fill') && path.getAttribute('fill') !== 'none');
        
        commands.forEach(cmd => {
            const type = cmd[0].toUpperCase();
            const args = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
            
            if (type === 'M' || type === 'L') {
                if (args.length >= 2) {
                    const x = args[0];
                    const y = args[1];
                    currentStroke.push({ x, y });
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        });
        
        if (currentStroke.length > 0) {
            currentStroke.isFilled = isFilled;
            currentStroke.lineCap = path.getAttribute('stroke-linecap') || 'round';
            allStrokes.push(currentStroke);
        }
    });
    
    if (allStrokes.length > 0 && minX !== Infinity) {
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Target canvas size is 300x300. We want a 20px padding, so max size 260.
        const scale = (width === 0 && height === 0) ? 1 : Math.min(260 / (width || 1), 260 / (height || 1));
        
        // Center the scaled bounding box inside the 300x300 canvas
        const offsetX = (300 - width * scale) / 2 - minX * scale;
        const offsetY = (300 - height * scale) / 2 - minY * scale;
        
        allStrokes.forEach(stroke => {
            stroke.forEach(pt => {
                pt.x = pt.x * scale + offsetX;
                pt.y = pt.y * scale + offsetY;
            });
        });
    }
    
    return allStrokes;
};
