import React, { useEffect, useRef, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLocation } from 'react-router-dom';
import './floatingBackground.css';
import { 
    Cloud, CloudLightning, CloudRain, Heart, Star, Sparkles, Hexagon, Circle, Triangle, Square,
    Leaf, Sun, Moon, Droplet, Flame, Snowflake,
    Wand, Gem, Eye, Compass, Zap,
    Music, Headphones, Radio, Mic, Bell, Speaker
} from 'lucide-react';

const TYPE_MAP = {
    greetings: [
        'Olá', 'Hello', 'Hola', 'Bonjour', 'Ciao', 'Hallo',
        'こんにちは', '你好', 'مرحبا', '안녕하세요', 'नमस्ते', 'Привет',
    ],
    clouds: [<Cloud />, <CloudLightning />, <Cloud />, <CloudRain />, <Cloud />, <CloudLightning />, <Cloud />, <CloudRain />, <Cloud />, <CloudLightning />, <Cloud />, <CloudRain />],
    hearts: [<Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />, <Heart />],
    stars: [<Star />, <Sparkles />, <Star />, <Star />, <Sparkles />, <Star />, <Star />, <Sparkles />, <Star />, <Star />, <Sparkles />, <Star />],
    geometry: [<Hexagon />, <Circle />, <Triangle />, <Square />, <Hexagon />, <Circle />, <Triangle />, <Square />, <Hexagon />, <Circle />, <Triangle />, <Square />],
    nature: [<Leaf />, <Sun />, <Moon />, <Droplet />, <Flame />, <Snowflake />, <Leaf />, <Sun />, <Moon />, <Droplet />, <Flame />, <Snowflake />],
    magic: [<Wand />, <Sparkles />, <Gem />, <Eye />, <Compass />, <Zap />, <Wand />, <Sparkles />, <Gem />, <Eye />, <Compass />, <Zap />],
    music: [<Music />, <Headphones />, <Radio />, <Mic />, <Bell />, <Speaker />, <Music />, <Headphones />, <Radio />, <Mic />, <Bell />, <Speaker />]
};

export default function FloatingBackground() {
    const containerRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
    const requestRef = useRef();

    const location = useLocation();
    const config = useConfigStore(state => state.floatingBackground) || { enabled: true, global: false, type: 'greetings' };

    const bgElements = useMemo(() => {
        return TYPE_MAP[config.type] || TYPE_MAP['greetings'];
    }, [config.type]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elements = container.children;

        // Generate random starting configurations for each background word
        const wordConfigs = bgElements.map((_, index) => {
            let ox = Math.random();
            // If we're not on the home page, keep icons towards the screen edges
            if (location.pathname !== '/') {
                if (Math.random() > 0.5) {
                    ox = Math.random() * 0.2; // Left side
                } else {
                    ox = 0.8 + Math.random() * 0.2; // Right side
                }
            }

            const isText = config.type === 'greetings';
            const minSize = isText ? 1.0 : 1.5;
            const sizeVariance = isText ? 1.5 : 2.5;

            const conf = {
                ox: ox,
                oy: Math.random(),
                depth: 0.15 + Math.random() * 0.85,
                rotBase: (Math.random() - 0.5) * 30,
                speed: 0.5 + Math.random(),
                phase: Math.random() * Math.PI * 2,
                floatAmp: 5 + Math.random() * 15,
                opacity: (0.05 + Math.random() * 0.15).toFixed(2),
                fontSize: (minSize + Math.random() * sizeVariance) + 'rem'
            };

            // Apply the static styles natively to avoid inline CSS in our JSX
            if (elements[index]) {
                elements[index].style.opacity = conf.opacity;
                elements[index].style.fontSize = conf.fontSize;
                
                // Set initial position to avoid elements starting at 0,0 and popping in
                const px = mouseRef.current.smoothX * conf.depth * 38;
                const py = mouseRef.current.smoothY * conf.depth * 25 + (Math.sin(conf.phase) * conf.floatAmp);
                const rot = conf.rotBase + mouseRef.current.smoothX * conf.depth * 2;
                elements[index].style.transform = `translate(${conf.ox * windowWidth + px}px, ${conf.oy * windowHeight + py}px) rotate(${rot}deg)`;
            }

            return conf;
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

            wordConfigs.forEach((conf, i) => {
                if (!elements[i]) return;
                
                // Calculate the gentle floating bob animation
                const floatY = Math.sin(now * conf.speed + conf.phase) * conf.floatAmp;
                
                // Apply parallax displacement based on the eased mouse position and the word's depth
                const px = mouse.smoothX * conf.depth * 38;
                const py = mouse.smoothY * conf.depth * 25 + floatY;
                const rot = conf.rotBase + mouse.smoothX * conf.depth * 2;
                
                elements[i].style.transform = `translate(${conf.ox * windowWidth + px}px, ${conf.oy * windowHeight + py}px) rotate(${rot}deg)`;
            });

            requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);

        // Clean up our listeners and animation frame when the component unmounts
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(requestRef.current);
        };
    }, [bgElements, location.pathname]);

    if (!config.enabled) return null;
    if (!config.global && location.pathname !== '/') return null;

    return (
        <div ref={containerRef} className="floating-bg-container" style={{ position: config.global ? 'fixed' : 'absolute', zIndex: 0 }}>
            {bgElements.map((item, i) => (
                <div key={i} className="floating-bg-word">
                    {item}
                </div>
            ))}
        </div>
    );
}