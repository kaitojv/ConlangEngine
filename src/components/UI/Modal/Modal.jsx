// src/components/UI/Modal/Modal.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, className }) {
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = React.useState(false);

    if (!isOpen) return null;

    // We only close if the user STARTS and ENDS the click on the backdrop.
    // This prevents accidental closure when highlighting text inside and releasing outside.
    const handleMouseDown = (e) => {
        setMouseDownOnBackdrop(e.target === e.currentTarget);
    };

    const handleMouseUp = (e) => {
        if (mouseDownOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
        setMouseDownOnBackdrop(false);
    };

    // Render into <body> so the modal escapes any ancestor stacking context
    // (e.g. .tab-pane-container sets position:relative + z-index:1). Without this the
    // backdrop's z-index is resolved *within* that context and page content (notably
    // the alphabet/char-card grids) paints straight over the dialog.
    return ReactDOM.createPortal(
        <div 
            className="modal-backdrop" 
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div className={`modal-container animate-in zoom-in duration-200 ${className || ''}`} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}