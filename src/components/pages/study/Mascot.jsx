import React, { useEffect, useState } from 'react';
import './mascot.css';

/**
 * Mascot / Course Companion (Scholar Owl Familiar)
 * A clean, expressive chibi-owl companion that dynamically adapts to the active
 * theme color (--acc) while keeping high contrast on both light and dark themes.
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
    const [settled, setSettled] = useState({ forState: null, value: null });
    const displayState = settled.forState === state && settled.value ? settled.value : state;

    useEffect(() => {
        if (state === 'correct' || state === 'celebrate' || state === 'incorrect') {
            const timer = setTimeout(() => {
                const next = (state === 'correct' || state === 'celebrate') ? 'happy-idle' : 'encourage-idle';
                setSettled({ forState: state, value: next });
            }, 1800);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const isHappy = displayState === 'correct' || displayState === 'celebrate' || displayState === 'happy-idle';
    const isSad = displayState === 'incorrect' || displayState === 'encourage-idle';
    const isThinking = displayState === 'thinking';
    const isJumping = displayState === 'correct' || displayState === 'celebrate';
    const isWobbling = displayState === 'incorrect';

    const sizeClass = size === 'small' ? 'size-small' : size === 'large' ? 'size-large' : 'size-medium';
    const animClass = isJumping ? 'anim-jump' : isWobbling ? 'anim-wobble' : 'anim-bob';

    return (
        <div
            className={`mascot-container ${sizeClass} state-${displayState} ${isSpeaking ? 'is-speaking' : ''} ${className}`}
            role="img"
            aria-label={`Course Companion (${displayState})`}
        >
            <svg
                viewBox="0 0 100 100"
                className={`mascot-svg ${animClass}`}
            >
                {/* Ground shadow anchored at bottom */}
                <ellipse
                    cx="50"
                    cy="91"
                    rx="21"
                    ry="4.2"
                    className="mascot-ground-shadow"
                />

                {/* Animated Character Group */}
                <g className="mascot-character-group">
                    {/* Celebratory Sparkles */}
                    {isJumping && (
                        <g className="owl-sparkles">
                            <path d="M 16 24 L 18 19 L 20 24 L 25 26 L 20 28 L 18 33 L 16 28 L 11 26 Z" className="owl-sparkle s1" />
                            <path d="M 82 20 L 83.5 16.5 L 85 20 L 88.5 21.5 L 85 23 L 83.5 26.5 L 82 23 L 78.5 21.5 Z" className="owl-sparkle s2" />
                        </g>
                    )}

                    {/* Cute Feet */}
                    <g className="owl-feet">
                        <path d="M 35 82 Q 34 87 38 87.5 Q 41 87.5 42 84 Q 44 87.5 46 86.5 Q 47 84 44 81 Z" className="owl-foot" />
                        <path d="M 56 81 Q 53 84 54 86.5 Q 56 87.5 58 84 Q 59 87.5 62 87.5 Q 66 87 65 82 Z" className="owl-foot" />
                    </g>

                    {/* Left & Right Wings */}
                    <path
                        d="M 24 47 C 13 51 12 69 22 74 C 26 76 28 69 27 60 Z"
                        className="owl-wing left"
                    />
                    <path
                        d="M 76 47 C 87 51 88 69 78 74 C 74 76 72 69 73 60 Z"
                        className="owl-wing right"
                    />

                    {/* Main Plump Owl Body + Ear Tufts */}
                    <path
                        d="M 29 29
                           C 24 22 23 18 28 21
                           C 33 23 36 25 40 24
                           C 46 22 54 22 60 24
                           C 64 25 67 23 72 21
                           C 77 18 76 22 71 29
                           C 77 37 79 47 78 58
                           C 77 75 66 84 50 84
                           C 34 84 23 75 22 58
                           C 21 47 23 37 29 29 Z"
                        className="owl-body"
                    />

                    {/* Subtle Top Crown Highlight */}
                    <path
                        d="M 36 27 Q 50 23 64 27 Q 50 26 36 27 Z"
                        className="owl-crown-highlight"
                    />

                    {/* Soft Cream Belly */}
                    <ellipse cx="50" cy="67" rx="18" ry="14" className="owl-belly" />
                    {/* Subtle Chest Feather Scallops */}
                    <path d="M 41 64 Q 44 67.5 47 64 M 53 64 Q 56 67.5 59 64 M 47 70 Q 50 73.5 53 70" className="owl-feather-mark" />

                    {/* Owl Facial Discs (Heart-shaped /双-circle mask) */}
                    <circle cx="39" cy="45" r="13.5" className="owl-face-disc" />
                    <circle cx="61" cy="45" r="13.5" className="owl-face-disc" />

                    {/* Rosy Cheeks */}
                    <ellipse cx="29" cy="52.5" rx="3.4" ry="2" className={`owl-blush ${isHappy ? 'bright' : ''}`} />
                    <ellipse cx="71" cy="52.5" rx="3.4" ry="2" className={`owl-blush ${isHappy ? 'bright' : ''}`} />

                    {/* Eyes by State */}
                    {isHappy ? (
                        <g className="owl-eyes-happy">
                            <path d="M 33.5 46 Q 39 39 44.5 46" className="owl-eye-arc" />
                            <path d="M 55.5 46 Q 61 39 66.5 46" className="owl-eye-arc" />
                        </g>
                    ) : isSad ? (
                        <g className="owl-eyes-sad">
                            {/* Sympathetic eyes */}
                            <circle cx="39" cy="46" r="5.6" className="owl-eye-iris" />
                            <circle cx="37.2" cy="44" r="2" className="owl-eye-shine" />
                            <circle cx="40.8" cy="48" r="0.9" className="owl-eye-shine" />

                            <circle cx="61" cy="46" r="5.6" className="owl-eye-iris" />
                            <circle cx="59.2" cy="44" r="2" className="owl-eye-shine" />
                            <circle cx="62.8" cy="48" r="0.9" className="owl-eye-shine" />

                            {/* Worried eyebrows */}
                            <path d="M 32.5 39.5 Q 37.5 38 43 41" className="owl-brow" />
                            <path d="M 67.5 39.5 Q 62.5 38 57 41" className="owl-brow" />

                            {/* Soft sweatdrop / tear */}
                            <path d="M 70 42 C 70 42 73 46 73 48 A 3 3 0 1 1 67 48 C 67 46 70 42 70 42 Z" className="owl-tear" />
                        </g>
                    ) : (
                        <g className="owl-eyes-idle">
                            <g className="owl-eye-group">
                                <circle cx={isThinking ? 40.5 : 39} cy={isThinking ? 43.5 : 45} r="6.1" className="owl-eye-iris" />
                                <circle cx={isThinking ? 38.8 : 37} cy={isThinking ? 41.5 : 42.8} r="2.2" className="owl-eye-shine" />
                                <circle cx={isThinking ? 42.2 : 41} cy={isThinking ? 45.5 : 47.2} r="1" className="owl-eye-shine" />
                            </g>
                            <g className="owl-eye-group">
                                <circle cx={isThinking ? 62.5 : 61} cy={isThinking ? 43.5 : 45} r="6.1" className="owl-eye-iris" />
                                <circle cx={isThinking ? 60.8 : 59} cy={isThinking ? 41.5 : 42.8} r="2.2" className="owl-eye-shine" />
                                <circle cx={isThinking ? 64.2 : 63} cy={isThinking ? 45.5 : 47.2} r="1" className="owl-eye-shine" />
                            </g>
                        </g>
                    )}

                    {/* Cute Beak */}
                    <g className="owl-beak-group">
                        <path
                            d="M 46.5 49.5 Q 50 47.5 53.5 49.5 L 50 55.5 Z"
                            className="owl-beak"
                        />
                        {isSpeaking && !isHappy && !isSad && (
                            <ellipse cx="50" cy="54.2" rx="2.3" ry="2.1" className="owl-beak-open" />
                        )}
                    </g>
                </g>
            </svg>
        </div>
    );
}
