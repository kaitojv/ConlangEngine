import React, { useState, useRef, useMemo } from 'react';
import SimpleKeyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { Keyboard as KeyboardIcon, Plus, X, Book, BookPlus, Languages } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import './floatingKeyboard.css';

const Keyboard = SimpleKeyboard.default || SimpleKeyboard;

export default function FloatingKeyboard() {
    const [isFabOpen, setIsFabOpen] = useState(false);
    
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [isLexiconOpen, setIsLexiconOpen] = useState(false);
    const [isAddWordOpen, setIsAddWordOpen] = useState(false);
    const [isIpaOpen, setIsIpaOpen] = useState(false);

    const [layoutName, setLayoutName] = useState("default");
    const [searchQuery, setSearchQuery] = useState("");
    const [newWord, setNewWord] = useState({ word: "", wordClass: "", translation: "" });
    const keyboardRef = useRef(null);

    // Stores
    const vowels = useConfigStore(state => state.vowels) || "";
    const consonants = useConfigStore(state => state.consonants) || "";
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const setLexicon = useLexiconStore(state => state.setLexicon);

    // Standard IPA character grid
    const ipaCharacters = ['p','b','t','d','k','g','f','v','θ','ð','s','z','ʃ','ʒ','x','ɣ','h','m','n','ŋ','l','r','j','w','i','ɪ','e','ɛ','æ','a','ə','ʌ','u','ʊ','o','ɔ','ɑ'];

    // Dynamically build the keyboard layout
    const customLayout = useMemo(() => {
        // Extract letters (removing mapping rules like '=a')
        const extract = (str) => {
            if (!str) return [];
            return str.split(',').map(s => {
                const parts = s.trim().split('=');
                return parts.length > 1 ? parts[1].trim() : parts[0].trim();
            }).filter(Boolean);
        };
        
        const allLetters = [...extract(vowels), ...extract(consonants)];

        // Fallback to QWERTY if no letters are configured
        if (allLetters.length === 0) {
           return {
              default: [
                'q w e r t y u i o p {bksp}', 'a s d f g h j k l {enter}', '{shift} z x c v b n m {shift}', '{space}'
              ],
              shift: [
                'Q W E R T Y U I O P {bksp}', 'A S D F G H J K L {enter}', '{shift} Z X C V B N M {shift}', '{space}'
              ]
           };
        }

        // Chunk letters into rows of up to 10 keys
        const rows = [];
        for (let i = 0; i < allLetters.length; i += 10) {
            rows.push(allLetters.slice(i, i + 10));
        }

        const defaultLayout = [];
        const shiftLayout = [];

        // Guarantee at least 3 rows to fit standard modifiers
        for (let i = 0; i < Math.max(rows.length, 3); i++) {
            let r = rows[i] || [];
            let rStr = r.join(' ');
            let sStr = r.map(c => c.toUpperCase()).join(' ');

            // Append functional keys logically across the right side
            if (i === 0) {
                rStr += ' {bksp}'; sStr += ' {bksp}';
            } else if (i === 1) {
                rStr += ' {enter}'; sStr += ' {enter}';
            } else if (i === 2) {
                rStr = '{shift} ' + rStr + ' {shift}';
                sStr = '{shift} ' + sStr + ' {shift}';
            }
            defaultLayout.push(rStr.trim());
            shiftLayout.push(sStr.trim());
        }

        // Final row is always the spacebar
        defaultLayout.push('{space}');
        shiftLayout.push('{space}');

        return { default: defaultLayout, shift: shiftLayout };
    }, [vowels, consonants]);

    const handleShift = () => {
        setLayoutName(layoutName === "default" ? "shift" : "default");
    };

    const closeAllPanels = () => {
        setIsKeyboardOpen(false);
        setIsLexiconOpen(false);
        setIsAddWordOpen(false);
        setIsIpaOpen(false);
    };

    const togglePanel = (panelSetter, currentState) => {
        closeAllPanels();
        if (!currentState) panelSetter(true);
        setIsFabOpen(false);
    };

    const handleOpenAddWord = () => {
        // Auto-grab selected text if the user highlights a word they just typed
        const selectedText = window.getSelection().toString().trim();
        setNewWord({ word: selectedText, wordClass: "", translation: "" });
        togglePanel(setIsAddWordOpen, isAddWordOpen);
    };

    const handleQuickSaveWord = () => {
        if (!newWord.word) return;
        const newEntry = {
            id: Date.now(),
            word: newWord.word,
            ipa: '',
            wordClass: newWord.wordClass,
            translation: newWord.translation,
            tags: [],
            ideogram: '',
            inflectionOverrides: {},
            createdAt: Date.now()
        };
        if (setLexicon) setLexicon([...lexicon, newEntry]);
        setIsAddWordOpen(false);
        setNewWord({ word: "", wordClass: "", translation: "" });
    };

    const insertTextAtCursor = (insertStr, isBackspace = false) => {
        const activeEl = document.activeElement;

        // Handle contentEditable elements (like the Grammar Wiki)
        if (activeEl && activeEl.isContentEditable) {
            activeEl.focus();
            if (isBackspace) {
                document.execCommand('delete', false, null);
            } else if (insertStr === '\n') {
                document.execCommand('insertParagraph', false, null);
            } else {
                document.execCommand('insertText', false, insertStr);
            }
            return;
        }

        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            let val = activeEl.value;
            let start = activeEl.selectionStart;
            let end = activeEl.selectionEnd;

            if (isBackspace) {
                if (start === end && start > 0) {
                    val = val.slice(0, start - 1) + val.slice(end);
                    start--; end--;
                } else {
                    val = val.slice(0, start) + val.slice(end);
                    end = start;
                }
                insertStr = "";
            }

            if (insertStr) {
                val = val.slice(0, start) + insertStr + val.slice(end);
                start += insertStr.length;
                end = start;
            }

            // Use native setter to bypass React's value tracker hijacking
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            ).set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            ).set;

            const setter = activeEl.tagName === 'TEXTAREA' ? nativeTextAreaValueSetter : nativeInputValueSetter;
            if (setter) {
                setter.call(activeEl, val);
            } else {
                activeEl.value = val;
            }

            // Dispatch an InputEvent to simulate user typing, which React's controlled components respond to.
            // Use InputEvent for better compatibility with frameworks, falling back to generic Event.
            const event = typeof InputEvent === 'function' ?
                new InputEvent('input', { bubbles: true, cancelable: true, data: insertStr, inputType: isBackspace ? 'deleteContentBackward' : 'insertText' }) :
                new Event('input', { bubbles: true, cancelable: true });
            activeEl.dispatchEvent(event);

            // Defer setting selection range and re-focusing to ensure React has processed the input event
            // and the DOM has potentially re-rendered, preventing cursor jumps.
                setTimeout(() => {
                    try { activeEl.setSelectionRange(start, end); } catch (e) {
                        console.warn("Failed to set selection range:", e);
                    }
                    // Re-focus the element after setting selection, ensuring cursor is visible
                    if (activeEl && typeof activeEl.focus === 'function') {
                        activeEl.focus();
                    }
                }, 0);
            }
    };

    // Allows the keyboard to type into ANY active input globally!
    const onKeyPress = (button) => {
        if (button === "{shift}" || button === "{lock}") {
            handleShift();
            return;
        }
        if (button === "{bksp}") return insertTextAtCursor("", true);
        if (button === "{space}") return insertTextAtCursor(" ");
        if (button === "{enter}") return insertTextAtCursor("\n");
        insertTextAtCursor(button);

    };

    const panelInputStyle = { width: '100%', padding: '8px', marginBottom: '10px', background: 'var(--s4)', color: 'inherit', border: '1px solid var(--bd)', borderRadius: '4px' };

    return (
        <div className="floating-keyboard-wrapper">
            {isKeyboardOpen && (
                <div className="virtual-keyboard-container">
                    <div className="virtual-keyboard-header">
                        <span className="vk-title">Conlang Keyboard</span>
                        <button className="vk-close" onClick={() => setIsKeyboardOpen(false)}><X size={16}/></button>
                    </div>
                    <Keyboard keyboardRef={r => (keyboardRef.current = r)} layoutName={layoutName} layout={customLayout} onKeyPress={onKeyPress} theme={"hg-theme-default my-custom-keyboard-theme"} display={{ "{bksp}": "⌫", "{enter}": "↵", "{shift}": "⇧", "{space}": "␣", "{lock}": "⇪" }} preventMouseDownDefault={true} />
                </div>
            )}
            
            {isLexiconOpen && (
                <div className="virtual-keyboard-container">
                    <div className="virtual-keyboard-header">
                        <span className="vk-title">Quick Lexicon</span>
                        <button className="vk-close" onClick={() => setIsLexiconOpen(false)}><X size={16}/></button>
                    </div>
                    <div style={{ padding: '15px' }}>
                        <input autoFocus type="text" placeholder="Search word or translation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={panelInputStyle} />
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {lexicon.filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()) || w.translation.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 15).map(w => (
                                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                                    <strong>{w.word}</strong> <span style={{ opacity: 0.7, fontSize: '0.9em' }}>{w.translation}</span>
                                </div>
                            ))}
                            {lexicon.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', fontSize: '0.9em' }}>No words in dictionary.</p>}
                        </div>
                    </div>
                </div>
            )}

            {isAddWordOpen && (
                <div className="virtual-keyboard-container">
                    <div className="virtual-keyboard-header">
                        <span className="vk-title">Quick Add Word</span>
                        <button className="vk-close" onClick={() => setIsAddWordOpen(false)}><X size={16}/></button>
                    </div>
                    <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <input autoFocus placeholder="Conlang Word" value={newWord.word} onChange={e => setNewWord({...newWord, word: e.target.value})} style={panelInputStyle} />
                        <input placeholder="Part of Speech (e.g., Noun)" value={newWord.wordClass} onChange={e => setNewWord({...newWord, wordClass: e.target.value})} style={panelInputStyle} />
                        <input placeholder="Translation" value={newWord.translation} onChange={e => setNewWord({...newWord, translation: e.target.value})} style={panelInputStyle} />
                        <button onClick={handleQuickSaveWord} style={{ padding: '10px', background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Save to Lexicon
                        </button>
                    </div>
                </div>
            )}

            {isIpaOpen && (
                <div className="virtual-keyboard-container">
                    <div className="virtual-keyboard-header">
                        <span className="vk-title">IPA Picker</span>
                        <button className="vk-close" onClick={() => setIsIpaOpen(false)}><X size={16}/></button>
                    </div>
                    <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {ipaCharacters.map(char => (
                            <button 
                                key={char} 
                                onMouseDown={(e) => e.preventDefault()} // Stops button from stealing focus from inputs
                                onClick={() => insertTextAtCursor(char)} 
                                style={{ padding: '10px', background: 'var(--s2)', border: '1px solid var(--bd)', color: 'inherit', cursor: 'pointer', borderRadius: '4px', fontSize: '1.2em' }}
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={`fab-container ${isFabOpen ? 'open' : ''}`}>
                <button className="fab-action" title="Lexicon Search" onClick={() => togglePanel(setIsLexiconOpen, isLexiconOpen)}>
                    <Book size={20} />
                </button>
                <button className="fab-action" title="Quick Add Word" onClick={handleOpenAddWord}>
                    <BookPlus size={20} />
                </button>
                <button className="fab-action" title="IPA Picker" onClick={() => togglePanel(setIsIpaOpen, isIpaOpen)}>
                    <Languages size={20} />
                </button>
                <button className="fab-action" title="Virtual Keyboard" onClick={() => togglePanel(setIsKeyboardOpen, isKeyboardOpen)}>
                    <KeyboardIcon size={20} />
                </button>
                <button className="fab-main" onClick={() => setIsFabOpen(!isFabOpen)}><Plus size={24} className={`fab-icon ${isFabOpen ? 'rotate' : ''}`} /></button>
            </div>
        </div>
    )
};
