import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import './multiSelectDropdown.css';

/**
 * A multi-select dropdown with pills for selected items and a searchable list.
 *
 * @param {string}   label        - Section label shown above the dropdown
 * @param {string[]} options      - All available options
 * @param {string[]} selected     - Currently selected options
 * @param {function} onToggle     - Called with (option) when toggled
 * @param {string}   placeholder  - Placeholder text when nothing is selected
 * @param {string}   emptyMessage - Message when options array is empty
 */
export default function MultiSelectDropdown({
    label,
    options = [],
    selected = [],
    onToggle,
    placeholder = 'Select...',
    emptyMessage = 'No options available.'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const filtered = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter(o => o.toLowerCase().includes(q));
    }, [options, search]);

    const handleToggle = (opt) => {
        onToggle(opt);
    };

    const handleRemovePill = (e, opt) => {
        e.stopPropagation();
        onToggle(opt);
    };

    if (options.length === 0) {
        return (
            <div className="msd-wrapper">
                {label && <label className="form-label">{label}</label>}
                <p className="msd-empty">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="msd-wrapper" ref={containerRef}>
            {label && <label className="form-label">{label}</label>}

            {/* Trigger */}
            <div
                className={`msd-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="msd-pills-area">
                    {selected.length === 0 && (
                        <span className="msd-placeholder">{placeholder}</span>
                    )}
                    {selected.map(item => (
                        <span key={item} className="msd-pill">
                            {item}
                            <button
                                className="msd-pill-remove"
                                onClick={(e) => handleRemovePill(e, item)}
                                tabIndex={-1}
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                </div>
                <ChevronDown size={16} className={`msd-chevron ${isOpen ? 'rotated' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="msd-dropdown">
                    {options.length > 6 && (
                        <div className="msd-search-wrap">
                            <input
                                type="text"
                                className="msd-search"
                                placeholder="Filter..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <div className="msd-options-list">
                        {filtered.length === 0 && (
                            <div className="msd-no-results">No matches</div>
                        )}
                        {filtered.map(opt => {
                            const isChecked = selected.includes(opt);
                            return (
                                <label
                                    key={opt}
                                    className={`msd-option ${isChecked ? 'checked' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggle(opt)}
                                    />
                                    <span className="msd-option-text">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
