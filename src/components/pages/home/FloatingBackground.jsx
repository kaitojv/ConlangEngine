// src/components/pages/home/FloatingBackground.jsx
import { useEffect, useRef } from 'react';

const WORDS = [
    'Olá', 'Hello', 'Hola', 'Bonjour', 'Ciao', 'Hallo',
    'こんにちは', '你好', 'مرحبا', '안녕하세요', 'नमस्ते', 'Привет',
];

export default function FloatingBackground() {
    const containerRef = useRef(null);
    const wordsRef = useRef([]);
    const mouseRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
    const requestRef = useRef();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const W = window.innerWidth;
        const H = window.innerHeight;

        wordsRef.current = WORDS.map(() => ({
            ox: Math.random(),
            oy: Math.random(),
            depth: 0.15 + Math.random() * 0.85,
            rotBase: (Math.random() - 0.5) * 30,
            speed: 0.5 + Math.random(),
            phase: Math.random() * Math.PI * 2,
            floatAmp: 5 + Math.random() * 15,
            opacity: (0.05 + Math.random() * 0.15).toFixed(2),
            fontSize: (0.9 + Math.random() * 1.5) + 'rem'
        }));

        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const tick = () => {
            const m = mouseRef.current;
            m.smoothX += (m.x - m.smoothX) * 0.042;
            m.smoothY += (m.y - m.smoothY) * 0.042;
            const now = performance.now() * 0.001;

            const elements = container.children;
            wordsRef.current.forEach((it, i) => {
                if (!elements[i]) return;
                const floatY = Math.sin(now * it.speed + it.phase) * it.floatAmp;
                const px = m.smoothX * it.depth * 38;
                const py = m.smoothY * it.depth * 25 + floatY;
                const rot = it.rotBase + m.smoothX * it.depth * 2;
                
                elements[i].style.transform = `translate(${it.ox * W + px}px, ${it.oy * H + py}px) rotate(${rot}deg)`;
            });

            requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {WORDS.map((wd, i) => {
                const init = wordsRef.current[i];
                return (
                    <div 
                        key={i} 
                        className="absolute text-[var(--tx2)] font-bold whitespace-nowrap"
                        style={{
                            opacity: init?.opacity || 0.1,
                            fontSize: init?.fontSize || '1rem',
                            left: 0, top: 0,
                            transform: init ? `translate(${init.ox * window.innerWidth}px, ${init.oy * window.innerHeight}px)` : 'none'
                        }}
                    >
                        {wd}
                    </div>
                );
            })}
        </div>
    );
}