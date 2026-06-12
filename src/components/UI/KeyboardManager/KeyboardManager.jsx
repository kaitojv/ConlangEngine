import React, { useState } from 'react';
import { exportKLC, exportMac, exportLinux } from '../../../utils/keyboardExporter.js';
import Modal from '../Modal/Modal.jsx';
import Button from '../Buttons/Buttons.jsx';
import { Download, Layout } from 'lucide-react';
import './keyboardManager.css';

const QWERTY_ROWS = [
    [
        { vk: 'OEM_3', label: '`' }, { vk: '1', label: '1' }, { vk: '2', label: '2' }, { vk: '3', label: '3' },
        { vk: '4', label: '4' }, { vk: '5', label: '5' }, { vk: '6', label: '6' }, { vk: '7', label: '7' },
        { vk: '8', label: '8' }, { vk: '9', label: '9' }, { vk: '0', label: '0' }, { vk: 'OEM_MINUS', label: '-' },
        { vk: 'OEM_PLUS', label: '=' }, { vk: 'BACK', label: 'Backspace', special: true, cls: 'wide-3' }
    ],
    [
        { vk: 'TAB', label: 'Tab', special: true, cls: 'wide-1' }, { vk: 'Q', label: 'Q' }, { vk: 'W', label: 'W' },
        { vk: 'E', label: 'E' }, { vk: 'R', label: 'R' }, { vk: 'T', label: 'T' }, { vk: 'Y', label: 'Y' },
        { vk: 'U', label: 'U' }, { vk: 'I', label: 'I' }, { vk: 'O', label: 'O' }, { vk: 'P', label: 'P' },
        { vk: 'OEM_4', label: '[' }, { vk: 'OEM_6', label: ']' }, { vk: 'OEM_5', label: '\\', cls: 'wide-1' }
    ],
    [
        { vk: 'CAPS', label: 'Caps', special: true, cls: 'wide-2' }, { vk: 'A', label: 'A' }, { vk: 'S', label: 'S' },
        { vk: 'D', label: 'D' }, { vk: 'F', label: 'F' }, { vk: 'G', label: 'G' }, { vk: 'H', label: 'H' },
        { vk: 'J', label: 'J' }, { vk: 'K', label: 'K' }, { vk: 'L', label: 'L' }, { vk: 'OEM_1', label: ';' },
        { vk: 'OEM_7', label: "'" }, { vk: 'ENTER', label: 'Enter', special: true, cls: 'wide-2' }
    ],
    [
        { vk: 'SHIFT_L', label: 'Shift', special: true, toggle: true, cls: 'wide-3' }, { vk: 'Z', label: 'Z' },
        { vk: 'X', label: 'X' }, { vk: 'C', label: 'C' }, { vk: 'V', label: 'V' }, { vk: 'B', label: 'B' },
        { vk: 'N', label: 'N' }, { vk: 'M', label: 'M' }, { vk: 'OEM_COMMA', label: ',' },
        { vk: 'OEM_PERIOD', label: '.' }, { vk: 'OEM_2', label: '/' }, { vk: 'SHIFT_R', label: 'Shift', special: true, toggle: true, cls: 'wide-3' }
    ]
];

export default function KeyboardManager({ allChars, alphabetGlyphs }) {
    const [mappings, setMappings] = useState({}); // { VK_Q: { base: 'a', shift: 'A' } }
    const [isShift, setIsShift] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);

    // Build the list of selectable glyphs/phonemes
    // Including standard letters, generated glyph unicode characters, numbers, and standard punctuation
    const STD_PUNCT = "0123456789[]{}|;:'\",.<>/?-=_+`~!@#$%^&*()".split("");
    const availableItems = [
        ...allChars.map(char => {
            const glyphCode = alphabetGlyphs[char];
            return {
                char: char,
                unicode: glyphCode ? glyphCode : char,
                hasGlyph: !!glyphCode
            };
        }),
        ...STD_PUNCT.map(p => ({ char: p, unicode: p, hasGlyph: false }))
    ];

    const handleKeyClick = (keyDef) => {
        if (keyDef.toggle) {
            setIsShift(!isShift);
            return;
        }
        if (keyDef.special) return;
        
        setSelectedKey(keyDef);
    };

    const handleSelectChar = (item) => {
        if (!selectedKey) return;
        
        const vk = selectedKey.vk;
        const currentMapping = mappings[vk] || { base: "-1", shift: "-1" };
        
        const newMapping = {
            ...currentMapping,
            [isShift ? 'shift' : 'base']: item ? item.unicode : "-1"
        };

        setMappings({
            ...mappings,
            [vk]: newMapping
        });

        setSelectedKey(null);
    };

    const handleExportWindows = () => exportKLC("Conlang", mappings);
    const handleExportMac = () => exportMac("Conlang", mappings);
    const handleExportLinux = () => exportLinux("Conlang", mappings);

    return (
        <div className="km-container">
            <p style={{ color: 'var(--tx2)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '600px' }}>
                Map your phonemes and custom glyphs to physical keys. Click a key to assign a character to it. Toggle Shift to map uppercase variants.
            </p>

            <div className="km-keyboard">
                {QWERTY_ROWS.map((row, i) => (
                    <div key={i} className="km-row">
                        {row.map(k => {
                            const mapping = mappings[k.vk] || { base: "-1", shift: "-1" };
                            const val = isShift ? mapping.shift : mapping.base;
                            const isMapped = val !== "-1";

                            return (
                                <div 
                                    key={k.vk} 
                                    className={`km-key ${k.cls || ''} ${k.special ? 'special' : ''} ${k.toggle ? 'toggleable' : ''} ${isMapped ? 'mapped' : ''} ${k.toggle && isShift ? 'active' : ''}`}
                                    onClick={() => handleKeyClick(k)}
                                >
                                    <span className="km-key-hint">{k.label}</span>
                                    {isMapped && !k.special && (
                                        <span className="km-key-val custom-font-text notranslate">{val}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div className="km-row">
                    <div className="km-key space special">Space</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="imp" onClick={handleExportWindows}>
                    <Download size={16} /> Windows (.klc)
                </Button>
                <Button variant="sec" onClick={handleExportMac}>
                    <Download size={16} /> macOS (.keylayout)
                </Button>
                <Button variant="sec" onClick={handleExportLinux}>
                    <Download size={16} /> Linux (XKB)
                </Button>
            </div>

            <Modal 
                isOpen={!!selectedKey} 
                onClose={() => setSelectedKey(null)}
                title={`Map Key: ${isShift ? 'Shift + ' : ''}${selectedKey?.label}`}
            >
                <div className="km-modal-grid">
                    {availableItems.map((item, idx) => (
                        <button 
                            key={idx} 
                            className="km-char-btn custom-font-text notranslate"
                            onClick={() => handleSelectChar(item)}
                            title={item.char}
                        >
                            {item.unicode}
                        </button>
                    ))}
                    <button className="km-char-btn clear" onClick={() => handleSelectChar(null)}>
                        Clear Mapping
                    </button>
                </div>
            </Modal>
        </div>
    );
}
