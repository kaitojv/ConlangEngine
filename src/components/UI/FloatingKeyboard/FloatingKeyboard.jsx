import React, { useState, useRef, useMemo } from 'react';
import SimpleKeyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { Keyboard as KeyboardIcon, Plus, X } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import './floatingKeyboard.css';

const Keyboard = SimpleKeyboard.default || SimpleKeyboard;

export default function FloatingKeyboard() {
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [layoutName, setLayoutName] = useState("default");
    const keyboardRef = useRef(null);

    // Get the letters decided on the settings page
    const vowels = useConfigStore(state => state.vowels) || "";
    const consonants = useConfigStore(state => state.consonants) || "";

    // Dynamically build the keyboard layout
    const customLayout = useMemo(() => {
        // Extract letters (removing mapping rules like '=a')
        const extract = (str) => {
            if (!str) return [];
            return str.split(',').map(s => s.split('=')[0].trim()).filter(Boolean);
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

    // Allows the keyboard to type into ANY active input globally!
    const onKeyPress = (button) => {
        if (button === "{shift}" || button === "{lock}") {
            handleShift();
            return;
        }

        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            let val = activeEl.value;
            let start = activeEl.selectionStart;
            let end = activeEl.selectionEnd;
            let insertStr = button;

            if (button === "{bksp}") {
                if (start === end && start > 0) {
                    val = val.slice(0, start - 1) + val.slice(end);
                    start--; end--;
                } else {
                    val = val.slice(0, start) + val.slice(end);
                    end = start;
                }
                insertStr = ""; 
            } else if (button === "{space}") {
                insertStr = " ";
            } else if (button === "{enter}") {
                insertStr = "\n";
            }

            if (insertStr) {
                val = val.slice(0, start) + insertStr + val.slice(end);
                start += insertStr.length;
                end = start;
            }

            // Use native setter so React picks up the global DOM change
            const nativeSetter = Object.getOwnPropertyDescriptor(
                activeEl.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
                "value"
            ).set;
            
            if (nativeSetter) {
                nativeSetter.call(activeEl, val);
                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                try { activeEl.setSelectionRange(start, end); } catch (e) {} // Fails gracefully on number inputs
            }
        }
    };

    return (
        <div className="floating-keyboard-wrapper">
            {isKeyboardOpen && (
                <div className="virtual-keyboard-container">
                    <div className="virtual-keyboard-header">
                        <span className="vk-title">Conlang Keyboard</span>
                        <button className="vk-close" onClick={() => setIsKeyboardOpen(false)}><X size={16}/></button>
                    </div>
                    <Keyboard keyboardRef={r => (keyboardRef.current = r)} layoutName={layoutName} layout={customLayout} onKeyPress={onKeyPress} theme={"hg-theme-default my-custom-keyboard-theme"} display={{ "{bksp}": "⌫", "{enter}": "↵", "{shift}": "⇧", "{space}": "␣", "{lock}": "⇪" }} />
                </div>
            )}
            <div className={`fab-container ${isFabOpen ? 'open' : ''}`}>
                <button className="fab-action fab-kb" title="Virtual Keyboard" onClick={() => { setIsKeyboardOpen(!isKeyboardOpen); setIsFabOpen(false); }}><KeyboardIcon size={20} /></button>
                <button className="fab-main" onClick={() => setIsFabOpen(!isFabOpen)}><Plus size={24} className={`fab-icon ${isFabOpen ? 'rotate' : ''}`} /></button>
            </div>
        </div>
    );
}