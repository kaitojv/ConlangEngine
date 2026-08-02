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

        let lastCoord = { x: 0, y: 0 }; 
        commands.forEach(cmd => {
            const type = cmd[0].toUpperCase();
            const isRelative = type != cmd[0]; // cmd[0] is lowercase so coordinates are relative 
            const args = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
            let x = 0, y = 0;
            // deltaX and deltaY are damed such because they have different meanings to dx and dy in the SVG standard
            let deltaX = useRelative ? lastCoord.x : 0;
            let deltaY = useRelative ? lastCoord.y : 0;
            if (type === 'M' || type === 'L')
                if (args.length < 2) { return; }
                x = args[0] + deltaX;
                y = args[1] + deltaY;
            }
            else if (type === 'H' || type === 'V') {
                if (args.length < 1) { return; }
                if (type == 'H') {
                    x = args[0] + deltaX;
                    y = lastCoord.y;
                }
                else { // type === 'V'
                    x = lastCoord.x;
                    y = args[0] + deltaX;
                }
            }
            lastCoord = { x, y };
            currentStroke.push({ x, y });
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
        
        if (currentStroke.length > 0) {
            currentStroke.isFilled = isFilled;
            currentStroke.lineCap = path.getAttribute('stroke-linecap') || 'round';
            allStrokes.push(currentStroke);
        }
    });
    
    if (allStrokes.length > 0) {
        let useViewBoxMapping = false;
        let scaleX = 1;
        let scaleY = 1;
        let offsetX = 0;
        let offsetY = 0;

        const svgTag = doc.querySelector('svg');
        if (svgTag) {
            const viewBox = svgTag.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/).map(parseFloat);
                if (parts.length === 4) {
                    const [vx, vy, vw, vh] = parts;
                    if (vw > 0 && vh > 0) {
                        scaleX = 300 / vw;
                        scaleY = 300 / vh;
                        offsetX = -vx * scaleX;
                        offsetY = -vy * scaleY;
                        useViewBoxMapping = true;
                    }
                }
            } else {
                const w = parseFloat(svgTag.getAttribute('width'));
                const h = parseFloat(svgTag.getAttribute('height'));
                if (w > 0 && h > 0) {
                    scaleX = 300 / w;
                    scaleY = 300 / h;
                    useViewBoxMapping = true;
                }
            }
        }

        if (useViewBoxMapping) {
            // Map coordinates precisely from the SVG viewBox to our 300x300 canvas
            allStrokes.forEach(stroke => {
                stroke.forEach(pt => {
                    pt.x = pt.x * scaleX + offsetX;
                    pt.y = pt.y * scaleY + offsetY;
                });
            });
        } else if (minX !== Infinity) {
            // Fallback: auto-scale and center if no viewBox or dimensions are present
            const width = maxX - minX;
            const height = maxY - minY;
            
            const scale = (width === 0 && height === 0) ? 1 : Math.min(260 / (width || 1), 260 / (height || 1));
            const centerOffsetX = (300 - width * scale) / 2 - minX * scale;
            const centerOffsetY = (300 - height * scale) / 2 - minY * scale;
            
            allStrokes.forEach(stroke => {
                stroke.forEach(pt => {
                    pt.x = pt.x * scale + centerOffsetX;
                    pt.y = pt.y * scale + centerOffsetY;
                });
            });
        }
    }
    
    return allStrokes;
};
