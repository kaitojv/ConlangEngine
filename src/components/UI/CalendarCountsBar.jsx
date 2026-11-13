import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { CALENDAR_COUNT_FIELDS, resolveCalendarCounts } from '@/utils/calendarHelpers.js';

/**
 * Shared controls for configuring days per week, weeks per month, and months per year.
 * Keeps temporary input drafts locally so clearing a digit with Backspace works smoothly.
 */
export default function CalendarCountsBar({ calendarSystem, onChangeCalendarSystem, marginBottom = '1.25rem' }) {
    const { t } = useTranslation();
    const { cal, daysPerWeek, weeksPerMonth, monthsPerYear } = resolveCalendarCounts(calendarSystem);
    const [drafts, setDrafts] = useState({});
    const currentValues = { daysPerWeek, weeksPerMonth, monthsPerYear };

    const handleChange = (field, rawVal) => {
        setDrafts((prev) => ({ ...prev, [field.key]: rawVal }));
        const trimmed = rawVal.trim();
        if (!trimmed) return;
        const parsed = parseInt(trimmed, 10);
        if (Number.isNaN(parsed)) return;
        if (parsed >= field.min && parsed <= field.max) {
            onChangeCalendarSystem({ ...cal, [field.key]: parsed });
        }
    };

    const handleBlur = (field) => {
        const raw = drafts[field.key];
        setDrafts((prev) => {
            if (!(field.key in prev)) return prev;
            const next = { ...prev };
            delete next[field.key];
            return next;
        });
        if (raw === undefined) return;
        const parsed = parseInt(raw, 10);
        const clamped = Number.isNaN(parsed)
            ? field.def
            : Math.min(field.max, Math.max(field.min, parsed));
        onChangeCalendarSystem({ ...cal, [field.key]: clamped });
    };

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.85rem 1rem',
                marginBottom,
                borderRadius: '0.5rem',
                background: 'var(--s2)',
                border: '1px solid var(--bd)',
            }}
        >
            {CALENDAR_COUNT_FIELDS.map((field) => (
                <label
                    key={field.key}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--tx)',
                    }}
                >
                    <span>{t(field.labelKey, field.fallbackLabel)}</span>
                    <input
                        type="number"
                        className="fi"
                        min={field.min}
                        max={field.max}
                        value={drafts[field.key] ?? String(currentValues[field.key])}
                        onChange={(e) => handleChange(field, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        style={{ width: '70px', textAlign: 'center' }}
                    />
                </label>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--tx2)' }}>
                {daysPerWeek * weeksPerMonth} days/month • {daysPerWeek * weeksPerMonth * monthsPerYear} days/year
            </span>
        </div>
    );
}
