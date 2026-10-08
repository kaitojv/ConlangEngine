import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import './dropdown.css';

/**
 * Reusable No-Slop Dropdown Menu component.
 *
 * @param {React.ReactNode} trigger        - Custom trigger node (e.g. <Button>...</Button>)
 * @param {string}          label          - Fallback label if no custom trigger is provided
 * @param {Array}           items          - Array of items: { id, label, icon: Component, onClick, disabled, danger, separator }
 * @param {React.ReactNode} children       - Optional custom menu body
 * @param {'click'|'hover'} triggerOn      - Activation method ('click' or 'hover', default 'click')
 * @param {'left'|'right'}  align          - Menu alignment relative to trigger ('left' or 'right', default 'right')
 * @param {string}          className      - Custom wrapper className
 * @param {string}          menuClassName  - Custom menu panel className
 * @param {boolean}         showChevron    - Whether to display the indicator chevron (default false)
 */
export default function Dropdown({
    trigger,
    label = 'Menu',
    items = [],
    children,
    triggerOn = 'click',
    align = 'right',
    className = '',
    menuClassName = '',
    showChevron = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Outside click & Escape key dismiss
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                handleClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleClose]);

    // Hover mode helpers
    const handleMouseEnter = () => {
        if (triggerOn !== 'hover') return;
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        if (triggerOn !== 'hover') return;
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 120);
    };

    const handleToggleClick = () => {
        if (triggerOn === 'click') {
            setIsOpen((prev) => !prev);
        }
    };

    return (
        <div
            className={`ns-dropdown-wrap ${triggerOn === 'hover' ? 'trigger-hover' : ''} ${className}`.trim()}
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="ns-dropdown-trigger"
                onClick={handleToggleClick}
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                {trigger ? (
                    trigger
                ) : (
                    <button type="button" className="ns-dropdown-btn-default">
                        <span>{label}</span>
                        {showChevron && (
                            <ChevronDown
                                size={14}
                                className={`ns-dropdown-chevron ${isOpen ? 'rotated' : ''}`}
                            />
                        )}
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    className={`ns-dropdown-panel align-${align} ${menuClassName}`.trim()}
                    role="menu"
                >
                    {children ? (
                        children
                    ) : (
                        items.map((item, idx) => {
                            if (item.separator) {
                                return <div key={item.id || idx} className="ns-dropdown-sep" role="separator" />;
                            }

                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id || item.label || idx}
                                    type="button"
                                    role="menuitem"
                                    disabled={item.disabled}
                                    className={`ns-dropdown-item ${item.danger ? 'danger' : ''}`.trim()}
                                    onClick={(e) => {
                                        if (item.disabled) return;
                                        item.onClick?.(e);
                                        handleClose();
                                    }}
                                >
                                    {Icon && <Icon size={14} className="ns-dropdown-item-icon" />}
                                    <span className="ns-dropdown-item-label">{item.label}</span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
