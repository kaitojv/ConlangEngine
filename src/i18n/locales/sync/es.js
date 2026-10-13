// src/i18n/locales/sync/es.js
export default {
    title: "Sincronización y Revisión de Fusión",
    summaryTitle: "Cambios Detectados Entre Dispositivos",
    summaryDesc: "Se encontraron actualizaciones entre este dispositivo y tu copia en la nube. Revisa qué cambió o fusiona ambas versiones.",
    remoteDevice: "Otro Dispositivo",
    localDevice: "Este Dispositivo",
    addedRemote: "{count} añadidas en el otro dispositivo",
    addedLocal: "{count} añadidas en este dispositivo",
    similarFound: "{count} palabras similares o repetidas",
    conflictsFound: "{count} ediciones en conflicto",
    cleanNotice: "Todas las creaciones de ambos dispositivos pueden fusionarse sin perder datos.",

    // Action buttons
    mergeAll: "Fusionar Todo (Recomendado)",
    mergeAllHint: "Conserva las adiciones de ambos dispositivos, combina palabras repetidas y aplica.",
    useCloud: "Usar Versión de la Nube",
    useLocal: "Mantener Solo Este Dispositivo",
    cancel: "Cancelar",
    applyMerge: "Aplicar Resultado Fusionado",
    
    // Similarity section
    similarTitle: "Palabras Similares y Repetidas",
    similarDesc: "Las siguientes palabras fueron añadidas en ambos dispositivos con escritura o significados similares:",
    combineAuto: "Combinar Automáticamente",
    chooseWhatStays: "Elegir qué conservar",
    keepBoth: "Mantener Ambas",
    keepLocalOnly: "Mantener solo local",
    keepRemoteOnly: "Mantener solo del otro dispositivo",
    identicalBadge: "Idéntica",
    sameMeaningBadge: "Mismo Significado",
    sameWordBadge: "Misma Grafía",

    // Conflict section
    conflictsTitle: "Ediciones Simultáneas",
    conflictsDesc: "Las siguientes entradas fueron editadas en ambos dispositivos. Elige qué valor conservar:",
    field: "Campo",
    deletedVsEdited: "Eliminada en {deletedOn}, editada en el otro dispositivo",
    keepEdited: "Conservar entrada editada",
    confirmDelete: "Confirmar eliminación",

    // Live sync status & pills
    status: {
        synced: "Sincronizado",
        syncing: "Sincronizando...",
        offline: "Sin conexión (Guardado local)",
        needsReview: "Revisar Cambios",
        devicesOnline: "{count} en línea",
        autoLiveOn: "Sincronización En Vivo Activa",
        autoLiveOff: "Sincronización Pausada",
        autoMergedToast: "Actualizaciones fusionadas de tu otro dispositivo",
        pulledToast: "Idioma actualizado desde la nube",
        pushedToast: "Cambios guardados en la nube"
    }
};
