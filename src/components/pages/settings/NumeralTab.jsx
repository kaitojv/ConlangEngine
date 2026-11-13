import React, { useState, useMemo } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Infobox from '@/components/UI/Infobox/Infobox.jsx';
import CalendarCountsBar from '@/components/UI/CalendarCountsBar.jsx';
import { resolveCalendarCounts } from '@/utils/calendarHelpers.js';
import { Hash, Calculator, ArrowRight, Lightbulb, RefreshCw, CalendarDays } from 'lucide-react';
import './numeralTab.css';

export default function NumeralTab() {
    const { t } = useTranslation();
    const updateConfig = useConfigStore(s => s.updateConfig);
    const numeralBase = useConfigStore(s => s.numeralBase) || 10;
    const rawCalendarSystem = useConfigStore(s => s.calendarSystem);
    const { cal: calendarSystem, daysPerWeek, weeksPerMonth, monthsPerYear } = resolveCalendarCounts(rawCalendarSystem);

    const [customBaseInput, setCustomBaseInput] = React.useState(numeralBase.toString());
    
    React.useEffect(() => {
        setCustomBaseInput(numeralBase.toString());
    }, [numeralBase]);

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

    // --- CALENDAR GENERATOR ---
    const [realDateStr, setRealDateStr] = useState(new Date().toISOString().split('T')[0]);

    const generatedDate = useMemo(() => {
        if (!realDateStr) return null;
        const parts = realDateStr.split('-');
        if (parts.length !== 3) return null;
        
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let day = parseInt(parts[2], 10);
        
        // Calculate weekday (0 = Sun, 1 = Mon ... 6 = Sat)
        const dateObj = new Date(year, month - 1, day);
        let weekdayIndex = dateObj.getDay(); 
        // Shift to Monday=0, Sunday=6 for better UX if they think of Monday as day 1
        weekdayIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
        
        const conlangYear = year + (parseInt(calendarSystem.yearOffset) || 0);

        const isStandardEarth = daysPerWeek === 7 && weeksPerMonth === 4 && monthsPerYear === 12;
        let effectiveDay = day;
        let safeMonthIdx = (month - 1) % monthsPerYear;
        let safeWeekIdx = weekdayIndex % daysPerWeek;

        if (!isStandardEarth) {
            const startOfYear = new Date(year, 0, 1);
            const dayOfYear = Math.max(0, Math.floor((dateObj - startOfYear) / 86400000));
            const daysPerMonth = daysPerWeek * weeksPerMonth;
            const daysPerYear = daysPerMonth * monthsPerYear;
            const calDay = dayOfYear % daysPerYear;
            safeWeekIdx = calDay % daysPerWeek;
            safeMonthIdx = Math.floor(calDay / daysPerMonth) % monthsPerYear;
            effectiveDay = (calDay % daysPerMonth) + 1;
        }

        // Convert numbers to conlang base
        const dStr = effectiveDay.toString(numeralBase).toUpperCase();
        const yStr = conlangYear.toString(numeralBase).toUpperCase();

        // Get month and weekday names
        const mName = (calendarSystem.months || [])[safeMonthIdx] || `[Month ${safeMonthIdx + 1}]`;
        const wName = (calendarSystem.daysOfWeek || [])[safeWeekIdx] || `[Weekday ${safeWeekIdx + 1}]`;
        
        // Format
        let result = calendarSystem.dateFormat;
        result = result.replace('DD', dStr);
        result = result.replace('MM', mName);
        result = result.replace('YYYY', yStr);
        result = result.replace('WW', wName);
        
        return result;
    }, [realDateStr, calendarSystem, numeralBase, daysPerWeek, weeksPerMonth, monthsPerYear]);

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
                <h2 className="flex sg-title"><Hash /> {t('settings.numerals.title')}</h2>
                <Infobox title={t('settings.numerals.guideTitle')}>
                    {t('settings.numerals.baseGuideDesc')}
                </Infobox>

                <div className="numeral-base-selector">
                    <label className="form-label">{t('settings.numerals.numberBase')}</label>
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
                        <label className="form-label">{t('settings.numerals.customBaseLabel')}</label>
                        <input
                            type="number"
                            min="2"
                            max="36"
                            value={customBaseInput}
                            onChange={(e) => {
                                setCustomBaseInput(e.target.value);
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v >= 2 && v <= 36) {
                                    updateConfig({ numeralBase: v });
                                }
                            }}
                            onBlur={() => {
                                const v = parseInt(customBaseInput);
                                if (isNaN(v) || v < 2 || v > 36) {
                                    setCustomBaseInput(numeralBase.toString());
                                }
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
                <h2 className="flex sg-title"><ArrowRight /> {t('settings.numerals.converterTitle', { base: numeralBase })}</h2>
                <div className="converter-row">
                    <div className="converter-input">
                        <label className="form-label">{t('settings.numerals.decimalNumber')}</label>
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
                        <div className="converter-result-value custom-font-text notranslate">
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
                <h2 className="flex sg-title"><Calculator /> {t('settings.numerals.calculatorTitle', { base: numeralBase })}</h2>
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
                            <span className="calc-value custom-font-text notranslate">{calcResult?.value || '—'}</span>
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
                            <span className="ref-converted custom-font-text notranslate">{converted}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Calendar & Date System */}
            <Card>
                <h2 className="flex sg-title"><CalendarDays /> {t('settings.numerals.calendarTitle')}</h2>
                <Infobox title={t('settings.numerals.dateTranslatorTitle')}>
                    <span dangerouslySetInnerHTML={{ __html: t('settings.numerals.dateTranslatorDesc', { base: numeralBase }) }} />
                </Infobox>

                <CalendarCountsBar
                    calendarSystem={calendarSystem}
                    onChangeCalendarSystem={(nextCal) => updateConfig({ calendarSystem: nextCal })}
                    marginBottom="1.25rem"
                />

                <div className="calendar-config-grid">
                    <div className="cal-section">
                        <h3>{t('settings.numerals.daysOfWeek')}</h3>
                        <p className="cal-desc">{t('settings.numerals.startFromMonday')}</p>
                        <div className="cal-inputs">
                            {Array.from({ length: daysPerWeek }, (_, idx) => {
                                const defaultLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                                const label = daysPerWeek === 7 ? defaultLabels[idx] : `D${idx + 1}`;
                                return (
                                    <div key={`day-${idx}`} className="cal-input-row">
                                        <span className="cal-label">{label}</span>
                                        <input 
                                            type="text" 
                                            className="fi custom-font-text notranslate" 
                                            placeholder={t('settings.numerals.conlangWordPlaceholder')}
                                            value={(calendarSystem.daysOfWeek || [])[idx] || ''}
                                            onChange={(e) => {
                                                const newDays = [...(calendarSystem.daysOfWeek || [])];
                                                newDays[idx] = e.target.value;
                                                updateConfig({ calendarSystem: { ...calendarSystem, daysOfWeek: newDays }});
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="cal-section">
                        <h3>{t('settings.numerals.months')}</h3>
                        <p className="cal-desc">{t('settings.numerals.janToDec')}</p>
                        <div className="cal-inputs months-grid">
                            {Array.from({ length: monthsPerYear }, (_, idx) => {
                                const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const label = monthsPerYear === 12 ? defaultMonths[idx] : `M${idx + 1}`;
                                return (
                                    <div key={`month-${idx}`} className="cal-input-row">
                                        <span className="cal-label">{label}</span>
                                        <input 
                                            type="text" 
                                            className="fi custom-font-text notranslate" 
                                            placeholder={t('settings.numerals.conlangWordPlaceholder')}
                                            value={(calendarSystem.months || [])[idx] || ''}
                                            onChange={(e) => {
                                                const newMonths = [...(calendarSystem.months || [])];
                                                newMonths[idx] = e.target.value;
                                                updateConfig({ calendarSystem: { ...calendarSystem, months: newMonths }});
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="cal-format-section">
                    <div className="cal-format-inputs">
                        <div className="cal-input-group">
                            <label className="form-label">{t('settings.numerals.dateFormat')}</label>
                            <select 
                                className="fi"
                                value={calendarSystem.dateFormat}
                                onChange={(e) => updateConfig({ calendarSystem: { ...calendarSystem, dateFormat: e.target.value }})}
                            >
                                <option value="WW, DD MM YYYY">WW, DD MM YYYY (Mon, 25 Dec 2023)</option>
                                <option value="DD MM YYYY">DD MM YYYY (25 Dec 2023)</option>
                                <option value="MM DD, YYYY">MM DD, YYYY (Dec 25, 2023)</option>
                                <option value="YYYY MM DD">YYYY MM DD (2023 Dec 25)</option>
                                <option value="The DD of MM, YYYY">The DD of MM, YYYY</option>
                                <option value="WW - DD/MM/YYYY">WW - DD/MM/YYYY</option>
                            </select>
                        </div>
                        <div className="cal-input-group">
                            <label className="form-label">{t('settings.numerals.epochOffset')}</label>
                            <input 
                                type="number" 
                                className="fi"
                                value={calendarSystem.yearOffset}
                                onChange={(e) => updateConfig({ calendarSystem: { ...calendarSystem, yearOffset: parseInt(e.target.value) || 0 }})}
                                placeholder="e.g. -1000 or 500"
                            />
                            <p className="cal-sub-label">{t('settings.numerals.addSubtractYears')}</p>
                        </div>
                    </div>
                </div>

                <div className="cal-preview-section">
                    <div className="cal-preview-header">
                        <h3>{t('settings.numerals.dateTranslatorTitle')}</h3>
                        <input 
                            type="date" 
                            className="fi date-picker"
                            value={realDateStr}
                            onChange={(e) => setRealDateStr(e.target.value)}
                        />
                    </div>
                    <div className="cal-preview-box">
                        <span className="cal-preview-text custom-font-text notranslate">
                            {generatedDate}
                        </span>
                    </div>
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
