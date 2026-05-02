import React, { useState, useMemo, useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Infobox from '@/components/UI/Infobox/Infobox.jsx';
import { Hash, Calculator, ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import './numeralTab.css';

export default function NumeralTab() {
    const updateConfig = useConfigStore(s => s.updateConfig);
    const numeralBase = useConfigStore(s => s.numeralBase) || 10;

    // Converter state
    const [decimalInput, setDecimalInput] = useState('');
    
    // Calculator state
    const [calcVal1, setCalcVal1] = useState('');
    const [calcVal2, setCalcVal2] = useState('');
    const [calcOp, setCalcOp] = useState('+');

    // --- CONVERTER ---
    const conversionResult = useMemo(() => {
        const num = parseInt(decimalInput);
        if (isNaN(num) || num < 0) return null;

        const converted = num.toString(numeralBase).toUpperCase();

        // Generate mathematical breakdown
        let explanation = '';
        if (num === 0) {
            explanation = 'Zero is usually just zero.';
        } else {
            const parts = [];
            let temp = num;
            let power = 0;
            while (temp > 0) {
                const remainder = temp % numeralBase;
                if (remainder > 0) {
                    const digit = remainder >= 10 ? String.fromCharCode(55 + remainder) : remainder;
                    if (power === 0) {
                        parts.unshift(`${digit}`);
                    } else if (power === 1) {
                        parts.unshift(`(${digit} × ${numeralBase})`);
                    } else {
                        parts.unshift(`(${digit} × ${numeralBase}^${power})`);
                    }
                }
                temp = Math.floor(temp / numeralBase);
                power++;
            }
            explanation = parts.join(' + ');
        }

        return { converted, explanation };
    }, [decimalInput, numeralBase]);

    // --- CALCULATOR ---
    const calcResult = useMemo(() => {
        if (!calcVal1.trim() || !calcVal2.trim()) return null;

        const num1 = parseInt(calcVal1, numeralBase);
        const num2 = parseInt(calcVal2, numeralBase);

        if (isNaN(num1) || isNaN(num2)) {
            return { error: `Invalid characters for Base-${numeralBase}. Valid digits: ${getValidDigits(numeralBase)}` };
        }

        let result;
        switch (calcOp) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '×': result = num1 * num2; break;
            case '÷':
                if (num2 === 0) return { error: 'Cannot divide by zero.' };
                result = Math.floor(num1 / num2);
                break;
            default: return null;
        }

        const resultStr = result < 0
            ? '-' + Math.abs(result).toString(numeralBase).toUpperCase()
            : result.toString(numeralBase).toUpperCase();

        return { value: resultStr, decimal: result };
    }, [calcVal1, calcVal2, calcOp, numeralBase]);

    // --- REFERENCE TABLE ---
    const referenceNumbers = useMemo(() => {
        const nums = [0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100, 1000];
        return nums.map(n => ({
            decimal: n,
            converted: n.toString(numeralBase).toUpperCase()
        }));
    }, [numeralBase]);

    return (
        <div className="numeral-tab">
            {/* Base Selector */}
            <Card>
                <h2 className="flex sg-title"><Hash /> Numeral System</h2>
                <Infobox title="Numeral System Guide">
                    Many conlangs use non-decimal bases. Mayan used Base-20 (vigesimal), Babylonian used Base-60, and many cultures use Base-12 (duodecimal). Choose your conlang's number base here.
                </Infobox>

                <div className="numeral-base-selector">
                    <label className="form-label">Number Base</label>
                    <div className="base-options">
                        {[2, 5, 6, 8, 10, 12, 16, 20].map(base => (
                            <button
                                key={base}
                                className={`base-option ${numeralBase === base ? 'active' : ''}`}
                                onClick={() => updateConfig({ numeralBase: base })}
                            >
                                <span className="base-number">{base}</span>
                                <span className="base-name">{getBaseName(base)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="base-custom">
                        <label className="form-label">Or enter a custom base (2–36):</label>
                        <input
                            type="number"
                            min="2"
                            max="36"
                            value={numeralBase}
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (v >= 2 && v <= 36) updateConfig({ numeralBase: v });
                            }}
                            className="fi num-custom-base-input"
                        />
                    </div>
                    <p className="base-info">
                        Your conlang uses <strong>Base-{numeralBase}</strong> ({getBaseName(numeralBase)}). 
                        Valid digits: <code>{getValidDigits(numeralBase)}</code>
                    </p>
                </div>
            </Card>

            {/* Converter */}
            <Card>
                <h2 className="flex sg-title"><ArrowRight /> Base-10 → Base-{numeralBase} Converter</h2>
                <div className="converter-row">
                    <div className="converter-input">
                        <label className="form-label">Decimal Number</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="e.g. 42"
                            value={decimalInput}
                            onChange={(e) => setDecimalInput(e.target.value)}
                            className="fi"
                        />
                    </div>
                    <div className="converter-arrow">→</div>
                    <div className="converter-result-box">
                        <label className="form-label">Base-{numeralBase}</label>
                        <div className="converter-result-value">
                            {conversionResult ? conversionResult.converted : '—'}
                        </div>
                    </div>
                </div>
                {conversionResult && conversionResult.explanation && (
                    <div className="converter-explanation">
                        <strong>Breakdown:</strong> {conversionResult.explanation}
                    </div>
                )}
            </Card>

            {/* Calculator */}
            <Card>
                <h2 className="flex sg-title"><Calculator /> Base-{numeralBase} Calculator</h2>
                <p className="numeral-calc-desc">
                    Perform math directly in your conlang's number system.
                </p>
                <div className="calc-row">
                    <input
                        type="text"
                        placeholder="Value 1"
                        value={calcVal1}
                        onChange={(e) => setCalcVal1(e.target.value.toUpperCase())}
                        className="fi calc-input"
                    />
                    <select
                        value={calcOp}
                        onChange={(e) => setCalcOp(e.target.value)}
                        className="fi calc-op"
                    >
                        <option value="+">+</option>
                        <option value="-">−</option>
                        <option value="×">×</option>
                        <option value="÷">÷</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Value 2"
                        value={calcVal2}
                        onChange={(e) => setCalcVal2(e.target.value.toUpperCase())}
                        className="fi calc-input"
                    />
                    <div className="calc-equals">=</div>
                    <div className="calc-result-display">
                        {calcResult?.error ? (
                            <span className="calc-error">{calcResult.error}</span>
                        ) : (
                            <span className="calc-value">{calcResult?.value || '—'}</span>
                        )}
                    </div>
                </div>
                {calcResult?.value && !calcResult?.error && (
                    <div className="calc-decimal-note">
                        (= {calcResult.decimal} in decimal)
                    </div>
                )}
            </Card>

            {/* Quick Reference */}
            <Card>
                <h2 className="flex sg-title"><RefreshCw /> Quick Reference: Base-{numeralBase}</h2>
                <div className="reference-grid">
                    {referenceNumbers.map(({ decimal, converted }) => (
                        <div key={decimal} className="reference-item">
                            <span className="ref-decimal">{decimal}</span>
                            <span className="ref-arrow">→</span>
                            <span className="ref-converted">{converted}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// --- Helpers ---
function getBaseName(base) {
    const names = {
        2: 'Binary', 5: 'Quinary', 6: 'Senary',
        8: 'Octal', 10: 'Decimal', 12: 'Duodecimal',
        16: 'Hexadecimal', 20: 'Vigesimal', 60: 'Sexagesimal'
    };
    return names[base] || `Base-${base}`;
}

function getValidDigits(base) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars.slice(0, Math.min(base, 36));
}
