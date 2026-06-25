import React, { useState, useRef, useEffect } from 'react';

export default function PanZoomContainer({ children, className = '' }) {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
        if (!containerRef.current) return;
        e.preventDefault();
        
        const scaleAdjust = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(0.1, transform.scale + scaleAdjust), 4);
        
        // Adjust translation to zoom towards mouse position (simplified)
        setTransform(prev => ({ ...prev, scale: newScale }));
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [transform.scale]);

    return (
        <div 
            ref={containerRef}
            className={`pan-zoom-container ${className}`}
            style={{ 
                width: '100%', 
                height: '600px', 
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                position: 'relative',
                background: 'var(--s4)',
                borderRadius: 'var(--rad)',
                border: '1px solid var(--bd)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid background for visual feedback while panning */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundPosition: `${transform.x}px ${transform.y}px`,
                pointerEvents: 'none'
            }} />
            
            <div 
                ref={contentRef}
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                {children}
            </div>

            <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                    onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 4) }))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)', width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer' }}
                >
                    +
                </button>
                <button 
                    onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.1) }))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)', width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer' }}
                >
                    -
                </button>
                <button 
                    onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
