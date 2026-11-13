export const DEFAULT_CALENDAR = {
    daysOfWeek: ['', '', '', '', '', '', ''],
    months: ['', '', '', '', '', '', '', '', '', '', '', ''],
    daysPerWeek: 7,
    weeksPerMonth: 4,
    monthsPerYear: 12,
    dateFormat: 'DD/MM/YYYY',
    yearOffset: 0,
};

export const CALENDAR_COUNT_FIELDS = [
    { key: 'daysPerWeek', labelKey: 'settings.numerals.daysPerWeek', fallbackLabel: 'Days / Week', min: 1, max: 30, def: 7 },
    { key: 'weeksPerMonth', labelKey: 'settings.numerals.weeksPerMonth', fallbackLabel: 'Weeks / Month', min: 1, max: 16, def: 4 },
    { key: 'monthsPerYear', labelKey: 'settings.numerals.monthsPerYear', fallbackLabel: 'Months / Year', min: 1, max: 36, def: 12 },
];

/**
 * Normalizes calendarSystem counts into safe clamped integers with defaults.
 */
export function resolveCalendarCounts(calendarSystem) {
    const cal = calendarSystem || DEFAULT_CALENDAR;
    const daysPerWeek = Math.min(30, Math.max(1, parseInt(cal.daysPerWeek, 10) || 7));
    const weeksPerMonth = Math.min(16, Math.max(1, parseInt(cal.weeksPerMonth, 10) || 4));
    const monthsPerYear = Math.min(36, Math.max(1, parseInt(cal.monthsPerYear, 10) || 12));
    return { cal, daysPerWeek, weeksPerMonth, monthsPerYear };
}

