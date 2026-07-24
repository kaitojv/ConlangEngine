const generateCurvePoints = (p0, p1, p2) => {
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        if (!isNaN(x) && !isNaN(y)) {
            points.push({ x, y });
        }
    }
    return points;
};

const generateSerifStroke = (p1, p2, bSize, lCap) => {
    if (!p1 || !p2) return null;
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.001) return null; 
    
    const nx = -dy / len; 
    const ny = dx / len;  
    const vx = dx / len;  
    const vy = dy / len;  
    
    const w = bSize * 1.6; 
    const d = bSize * 1.5; 
    const r = bSize * 0.5; 
    const t = bSize * 0.3; 
    
    const capOffset = (lCap === 'butt' ? 0 : bSize * 0.5);
    const bx = p1.x - vx * capOffset;
    const by = p1.y - vy * capOffset;
    
    const pts = [];
    pts.push({ x: bx + nx * w, y: by + ny * w });
    pts.push({ x: bx - nx * w, y: by - ny * w });
    
    const trTip = { x: bx - nx * w + vx * t, y: by - ny * w + vy * t };
    pts.push(trTip);
    
    const curve1 = generateCurvePoints(
        trTip, 
        { x: bx - nx * r + vx * t, y: by - ny * r + vy * t },
        { x: bx - nx * r + vx * d, y: by - ny * r + vy * d } 
    );
    pts.push(...curve1.slice(1));
    
    const stemLeft = { x: bx + nx * r + vx * d, y: by + ny * r + vy * d };
    pts.push(stemLeft);
    
    const tlTip = { x: bx + nx * w + vx * t, y: by + ny * w + vy * t };
    const curve2 = generateCurvePoints(
        stemLeft,
        { x: bx + nx * r + vx * t, y: by + ny * r + vy * t },
        tlTip
    );
    pts.push(...curve2.slice(1));
    
    pts.push(pts[0]);
    
    const stroke = pts;
    stroke.isFilled = true;
    stroke.lineCap = lCap;
    return stroke;
};

const curvePoints = generateCurvePoints({x: 100, y: 100}, {x: 150, y: 150}, {x: 200, y: 100});
const s1 = generateSerifStroke(curvePoints[0], curvePoints[1], 10, 'round');
console.log(s1);
console.log(s1.isFilled);
