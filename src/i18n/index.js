import en from './locales/en.js';
import pt from './locales/pt.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import ru from './locales/ru.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

const LOCALES = {
    en,
    pt,
    es,
    fr,
    ru,
    zh,
    ja,
};

/**
 * Retrieves a nested value from an object given a dot-separated path (e.g. 'nav.home').
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Translates a key according to the active language, falling back to English ('en') if not found.
 * Supports string interpolation: t('commandPalette.createWord', 'en', { word: 'foo' })
 */
export function t(key, lang = 'en', params = {}) {
    const activeDict = LOCALES[lang] || LOCALES.en;
    let translation = getNestedValue(activeDict, key);

    // Fallback to English if translation is missing in the active language
    if (translation === undefined && lang !== 'en') {
        translation = getNestedValue(LOCALES.en, key);
    }

    // Fallback to the key itself if still not found
    if (translation === undefined) {
        return key;
    }

    if (typeof translation !== 'string') {
        return translation;
    }

    // Interpolate variables: {varName}
    if (params && typeof params === 'object') {
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? String(params[paramKey]) : match;
        });
    }

    return translation;
}

export default {
    t,
    SUPPORTED_LANGUAGES,
    LOCALES,
};
