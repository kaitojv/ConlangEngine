// src/hooks/useScriptResolver.jsx
// React hook wrapper for script resolution utilities.
import { useMemo } from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';
import {
    resolveWordScriptId,
    getScriptSystem,
    buildScriptConfig,
    getDefaultScriptId,
} from '../utils/scriptResolver.js';
import { renderWordInScript, renderWordStringInScript } from '../utils/scriptRendering.js';

/**
 * Hook that provides script resolution functions bound to the current config.
 */
export function useScriptResolver() {
    const config = useConfigStore();
    const lexicon = useConfigStore.getState().lexicon || [];

    const defaultScriptId = useMemo(() => getDefaultScriptId(config), [config.scriptRules, config.scriptSystems]);

    const currentScriptSystem = useMemo(() => {
        const activeId = config.activeScriptSystemId || defaultScriptId;
        return getScriptSystem(config, activeId);
    }, [config.activeScriptSystemId, config.scriptSystems, defaultScriptId]);

    const currentScriptConfig = useMemo(() => {
        const activeId = config.activeScriptSystemId || defaultScriptId;
        return buildScriptConfig(config, activeId);
    }, [config.activeScriptSystemId, config.scriptSystems, config.scriptDataById, defaultScriptId]);

    return {
        defaultScriptId,
        currentScriptSystem,
        currentScriptConfig,
        scriptSystems: config.scriptSystems || [],
        scriptRules: config.scriptRules || {},
        activeScriptSystemId: config.activeScriptSystemId || defaultScriptId,

        // Bound functions
        resolveWordScriptId: (entry) => resolveWordScriptId(entry, config),
        getScriptSystem: (scriptId) => getScriptSystem(config, scriptId),
        buildScriptConfig: (scriptId) => buildScriptConfig(config, scriptId),
        renderWord: (entry) => renderWordInScript(entry, config, lexicon),
        renderWordString: (word, scriptId) => renderWordStringInScript(word, config, scriptId),
    };
}
