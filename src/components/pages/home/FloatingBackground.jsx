import React, { useEffect, useRef } from 'react';

const GREETINGS = [
    'Olá', 'Hello', 'Hola', 'Bonjour', 'Ciao', 'Hallo',
    'こんにちは', '你好', 'مرحبا', '안녕하세요', 'नमस्ते', 'Привет',
];

export default function FloatingBackground() {
    const containerRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
    const requestRef = useRef();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elements = container.children;

        // Generate random starting configurations for each background word
        const wordConfigs = GREETINGS.map((_, index) => {
            const config = {
                ox: Math.random(),
                oy: Math.random(),
                depth: 0.15 + Math.random() * 0.85,
                rotBase: (Math.random() - 0.5) * 30,
                speed: 0.5 + Math.random(),
                phase: Math.random() * Math.PI * 2,
                floatAmp: 5 + Math.random() * 15,
                opacity: (0.05 + Math.random() * 0.15).toFixed(2),
                fontSize: (0.9 + Math.random() * 1.5) + 'rem'
            };

            // Apply the static styles natively to avoid inline CSS in our JSX
            if (elements[index]) {
                elements[index].style.opacity = config.opacity;
                elements[index].style.fontSize = config.fontSize;
            }

            return config;
        });

        // Track mouse movement to create that sweet parallax effect
        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            
            // Normalize mouse position between -1 and 1
            mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // The main, high-performance animation loop
        const tick = () => {
            const mouse = mouseRef.current;
            
            // Add easing to the mouse movement so the parallax feels buttery smooth
            mouse.smoothX += (mouse.x - mouse.smoothX) * 0.042;
            mouse.smoothY += (mouse.y - mouse.smoothY) * 0.042;
            
            const now = performance.now() * 0.001;

            wordConfigs.forEach((config, i) => {
                if (!elements[i]) return;
                
                // Calculate the gentle floating bob animation
                const floatY = Math.sin(now * config.speed + config.phase) * config.floatAmp;
                
                // Apply parallax displacement based on the eased mouse position and the word's depth
                const px = mouse.smoothX * config.depth * 38;
                const py = mouse.smoothY * config.depth * 25 + floatY;
                const rot = config.rotBase + mouse.smoothX * config.depth * 2;
                
                elements[i].style.transform = `translate(${config.ox * windowWidth + px}px, ${config.oy * windowHeight + py}px) rotate(${rot}deg)`;
            });

            requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);

        // Clean up our listeners and animation frame when the component unmounts
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div ref={containerRef} className="floating-bg-container">
            {GREETINGS.map((word, i) => (
                <div key={i} className="floating-bg-word">
                    {word}
                </div>
            ))}
        </div>
    );
}