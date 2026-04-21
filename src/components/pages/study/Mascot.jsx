import React, { useEffect, useState } from 'react';
import './mascot.css';

export default function Mascot({ state = 'idle', isSpeaking = false }) {
    // state can be: 'idle', 'correct', 'incorrect'
    
    // We auto-revert state to idle after an animation plays
    const [internalState, setInternalState] = useState(state);

    useEffect(() => {
        setInternalState(state);
        
        if (state === 'correct' || state === 'incorrect') {
            const timer = setTimeout(() => {
                setInternalState('idle');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <div className="mascot-container">
            <div className={`mascot-blob state-${internalState}`} />
            
            <div className="mascot-face">
                <div className="mascot-eyes">
                    <div className="mascot-eye" />
                    <div className="mascot-eye" />
                </div>
                <div className={`mascot-mouth state-${internalState} ${isSpeaking ? 'state-speaking' : ''}`} />
            </div>
        </div>
    );
}
