// src/i18n/locales/sync/pt.js
export default {
    title: "Sincronização e Revisão de Fusão",
    summaryTitle: "Alterações Detectadas Entre Dispositivos",
    summaryDesc: "Foram encontradas atualizações entre este dispositivo e seu backup na nuvem. Revise o que mudou ou funda ambas as versões.",
    remoteDevice: "Outro Dispositivo",
    localDevice: "Este Dispositivo",
    addedRemote: "{count} adicionadas no outro dispositivo",
    addedLocal: "{count} adicionadas neste dispositivo",
    similarFound: "{count} palavras similares ou repetidas",
    conflictsFound: "{count} edições conflitantes",
    cleanNotice: "Todas as adições e edições de ambos os dispositivos podem ser mescladas sem perder dados.",

    // Action buttons
    mergeAll: "Mesclar Tudo (Recomendado)",
    mergeAllHint: "Mantém as criações de ambos os dispositivos, combina palavras repetidas e aplica.",
    useCloud: "Usar Versão da Nuvem",
    useLocal: "Manter Apenas Este Dispositivo",
    cancel: "Cancelar",
    applyMerge: "Aplicar Resultado Mesclado",
    
    // Similarity section
    similarTitle: "Palavras Similares e Repetidas",
    similarDesc: "As seguintes palavras foram adicionadas em ambos os dispositivos com escrita ou significados semelhantes:",
    combineAuto: "Combinar Automaticamente",
    chooseWhatStays: "Escolher o que fica",
    keepBoth: "Manter Ambas",
    keepLocalOnly: "Manter apenas deste dispositivo",
    keepRemoteOnly: "Manter apenas do outro dispositivo",
    identicalBadge: "Idêntica",
    sameMeaningBadge: "Mesmo Significado",
    sameWordBadge: "Mesma Grafia",

    // Conflict section
    conflictsTitle: "Edições Simultâneas",
    conflictsDesc: "As seguintes entradas foram editadas em ambos os dispositivos. Escolha qual valor manter:",
    field: "Campo",
    deletedVsEdited: "Excluída em {deletedOn}, editada no outro dispositivo",
    keepEdited: "Manter entrada editada",
    confirmDelete: "Confirmar exclusão",

    // Live sync status & pills
    status: {
        synced: "Sincronizado",
        syncing: "Sincronizando...",
        offline: "Offline (Salvo localmente)",
        needsReview: "Revisar Alterações",
        devicesOnline: "{count} online",
        autoLiveOn: "Sincronização Automática Ao Vivo Ativa",
        autoLiveOff: "Sincronização Pausada",
        autoMergedToast: "Atualizações mescladas do seu outro dispositivo",
        pulledToast: "Idioma atualizado da nuvem",
        pushedToast: "Alterações salvas na nuvem"
    }
};
