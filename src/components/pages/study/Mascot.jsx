import React, { useEffect, useState } from 'react';
import './mascot.css';

/**
 * Mascot / Course Companion Pet (Tamagotchi / Digital Bot Familiar)
 * A clean, retro-modern digital pet with an expressive OLED screen face
 * that dynamically inherits the active theme color (--acc, --acc2, etc.).
 *
 * @param {('idle'|'correct'|'incorrect'|'celebrate'|'thinking')} [props.state='idle']
 * @param {boolean} [props.isSpeaking=false]
 * @param {('small'|'medium'|'large')} [props.size='medium']
 * @param {string} [props.className='']
 */
export default function Mascot({
    state = 'idle',
    isSpeaking = false,
    size = 'medium',
    className = ''
}) {
    const [displayState, setDisplayState] = useState(state);

    useEffect(() => {
        setDisplayState(state);

        if (state === 'correct' || state === 'celebrate' || state === 'incorrect') {
            const timer = setTimeout(() => {
                setDisplayState((curr) => {
                    if (curr === 'correct' || curr === 'celebrate') return 'happy-idle';
                    if (curr === 'incorrect') return 'encourage-idle';
                    return curr;
                });
            }, 1800);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const isHappy = displayState === 'correct' || displayState === 'celebrate' || displayState === 'happy-idle';
    const isSad = displayState === 'incorrect' || displayState === 'encourage-idle';
    const isJumping = displayState === 'correct' || displayState === 'celebrate';
    const isWobbling = displayState === 'incorrect';

    const sizeClass = size === 'small' ? 'size-small' : size === 'large' ? 'size-large' : 'size-medium';

    return (
        <div
            className={`mascot-container ${sizeClass} state-${displayState} ${className}`}
            role="img"
            aria-label={`Digital Pet Companion (${displayState})`}
        >
            <svg
                viewBox="0 0 100 100"
                className={`mascot-svg ${isJumping ? 'anim-jump' : isWobbling ? 'anim-wobble' : 'anim-bob'}`}
            >
                {/* Soft ground contact shadow */}
                <ellipse
                    cx="50"
                    cy="93"
                    rx={isJumping ? 16 : 22}
                    ry={isJumping ? 3 : 5}
                    className="mascot-ground-shadow"
                />

                {/* Animated Character Body Group */}
                <g className="mascot-character-group">
                    {/* Top Antenna */}
                    <g className="bot-antenna-group">
                        <line x1="50" y1="23" x2="50" y2="13" className="bot-antenna-stalk" />
                        <circle cx="50" cy="11" r="4.2" className={`bot-antenna-orb ${isHappy ? 'glowing' : ''}`} />
                    </g>

                    {/* Side Sensor Dials */}
                    <rect x="17" y="44" width="5.5" height="15" rx="2.7" className="bot-ear-dial left" />
                    <rect x="77.5" y="44" width="5.5" height="15" rx="2.7" className="bot-ear-dial right" />

                    {/* Cute Hover Pads / Feet */}
                    <rect x="33" y="78" width="13" height="7" rx="3.5" className="bot-foot left" />
                    <rect x="54" y="78" width="13" height="7" rx="3.5" className="bot-foot right" />

                    {/* Main Chassis Body (Rounded retro-modern capsule in theme color) */}
                    <rect
                        x="22"
                        y="23"
                        width="56"
                        height="58"
                        rx="24"
                        className="bot-chassis"
                    />

                    {/* Dark Glass OLED Screen */}
                    <rect
                        x="28"
                        y="30"
                        width="44"
                        height="39"
                        rx="14"
                        className="bot-screen"
                    />

                    {/* Subtle Glass Screen Glare */}
                    <path
                        d="M 33 34 Q 50 32 67 35 Q 50 34 33 34 Z"
                        fill="rgba(255, 255, 255, 0.16)"
                    />

                    {/* Digital LED Face on the Screen */}
                    {isHappy ? (
                        /* Joyful Chevron / Happy Arc Eyes (^ ^) */
                        <g className="bot-face-happy">
                            <path
                                d="M 36 48 L 41 42 L 46 48"
                                className="bot-led-happy-eye left"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M 54 48 L 59 42 L 64 48"
                                className="bot-led-happy-eye right"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Happy Open LED Smile */}
                            <path
                                d="M 45 54 Q 50 63 55 54 Z"
                                className="bot-led-happy-mouth"
                            />

                            {/* Cheerful Pixel Blush */}
                            <rect x="31" y="52" width="4.5" height="2" rx="1" className="bot-led-blush" />
                            <rect x="64.5" y="52" width="4.5" height="2" rx="1" className="bot-led-blush" />
                        </g>
                    ) : isSad ? (
                        /* Caring Sympathetic LED Eyes & Brows */
                        <g className="bot-face-sad">
                            {/* Soft Tilted Brows */}
                            <line x1="36" y1="40" x2="44" y2="43" className="bot-led-brow" />
                            <circle cx="41" cy="48" r="3.6" className="bot-led-eye" />

                            <line x1="64" y1="40" x2="56" y2="43" className="bot-led-brow" />
                            <circle cx="59" cy="48" r="3.6" className="bot-led-eye" />

                            {/* Soft Flat / Comforting Mouth */}
                            <line x1="47" y1="58" x2="53" y2="58" className="bot-led-mouth" />

                            {/* Soft Blue Digital Tear */}
                            <circle cx="66" cy="49" r="1.6" fill="#38bdf8" className="bot-led-tear" />
                        </g>
                    ) : isSpeaking ? (
                        /* Audio Waveform Equalizer Mouth when Speaking */
                        <g className="bot-face-speaking">
                            <rect x="37" y="44" width="7" height="9" rx="3.5" className="bot-led-eye left" />
                            <circle cx="39" cy="46" r="1.3" fill="#ffffff" />

                            <rect x="56" y="44" width="7" height="9" rx="3.5" className="bot-led-eye right" />
                            <circle cx="58" cy="46" r="1.3" fill="#ffffff" />

                            {/* Audio Equalizer Bars */}
                            <g className="bot-led-waveform">
                                <line x1="42" y1="57" x2="42" y2="59" className="wave-bar w1" />
                                <line x1="46" y1="55" x2="46" y2="61" className="wave-bar w2" />
                                <line x1="50" y1="54" x2="50" y2="62" className="wave-bar w3" />
                                <line x1="54" y1="55" x2="54" y2="61" className="wave-bar w4" />
                                <line x1="58" y1="57" x2="58" y2="59" className="wave-bar w5" />
                            </g>
                        </g>
                    ) : (
                        /* Normal Friendly LED Eyes & Smile */
                        <g className="bot-face-idle">
                            <g className="bot-eye-group left">
                                <rect x="37" y="44" width="7" height="9" rx="3.5" className="bot-led-eye" />
                                <circle cx="39" cy="46" r="1.4" fill="#ffffff" />
                            </g>
                            <g className="bot-eye-group right">
                                <rect x="56" y="44" width="7" height="9" rx="3.5" className="bot-led-eye" />
                                <circle cx="58" cy="46" r="1.4" fill="#ffffff" />
                            </g>

                            {/* Cute Curved LED Smile */}
                            <path
                                d="M 46 57 Q 50 61 54 57"
                                className="bot-led-mouth"
                            />

                            {/* Gentle Pixel Blush Marks */}
                            <rect x="32" y="53" width="3.5" height="1.6" rx="0.8" className="bot-led-blush" />
                            <rect x="64.5" y="53" width="3.5" height="1.6" rx="0.8" className="bot-led-blush" />
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
}
