export const parseSVGToStrokes = (svgString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const paths = doc.querySelectorAll('path');
    
    const allStrokes = [];
    
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
                    currentStroke.push({ x: args[0], y: args[1] });
                }
            }
        });
        
        if (currentStroke.length > 0) {
            currentStroke.isFilled = isFilled;
            currentStroke.lineCap = path.getAttribute('stroke-linecap') || 'round';
            allStrokes.push(currentStroke);
        }
    });
    
    return allStrokes;
};
