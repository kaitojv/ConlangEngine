import { useCallback } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { t as translate, SUPPORTED_LANGUAGES } from '@/i18n';

export function useTranslation() {
    const currentLang = useConfigStore(state => state.appLanguage) || 'en';
    const updateConfig = useConfigStore(state => state.updateConfig);

    const t = useCallback((key, params) => {
        return translate(key, currentLang, params);
    }, [currentLang]);

    const setLanguage = useCallback((langCode) => {
        updateConfig({ appLanguage: langCode });
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('conlang_app_language', langCode);
            }
            if (typeof document !== 'undefined') {
                document.documentElement.lang = langCode;
            }
        } catch (e) {
            console.warn('Failed to persist language preference:', e);
        }
    }, [updateConfig]);

    return {
        t,
        currentLang,
        setLanguage,
        languages: SUPPORTED_LANGUAGES,
    };
}

export default useTranslation;
