// src/i18n/locales/sync/fr.js
export default {
    title: "Synchronisation et Révision de Fusion",
    summaryTitle: "Modifications Détectées Entre Appareils",
    summaryDesc: "Des mises à jour ont été détectées entre cet appareil et votre sauvegarde cloud. Examinez les changements ou fusionnez les deux versions.",
    remoteDevice: "Autre Appareil",
    localDevice: "Cet Appareil",
    addedRemote: "{count} ajoutés sur l'autre appareil",
    addedLocal: "{count} ajoutés sur cet appareil",
    similarFound: "{count} mots similaires ou répétés trouvés",
    conflictsFound: "{count} modifications en conflit",
    cleanNotice: "Tous les ajouts et modifications des deux appareils peuvent être fusionnés sans perte de données.",

    // Action buttons
    mergeAll: "Tout Fusionner (Recommandé)",
    mergeAllHint: "Conserve les ajouts des deux appareils, combine les doublons et applique.",
    useCloud: "Utiliser la Version Cloud",
    useLocal: "Conserver Uniquement Cet Appareil",
    cancel: "Annuler",
    applyMerge: "Appliquer la Fusion",
    
    // Similarity section
    similarTitle: "Mots Similaires et Répétés",
    similarDesc: "Les mots suivants ont été ajoutés sur les deux appareils avec une orthographe ou un sens proche :",
    combineAuto: "Combiner Automatiquement",
    chooseWhatStays: "Choisir ce qui reste",
    keepBoth: "Conserver les Deux",
    keepLocalOnly: "Conserver uniquement local",
    keepRemoteOnly: "Conserver uniquement l'autre appareil",
    identicalBadge: "Identique",
    sameMeaningBadge: "Même Sens",
    sameWordBadge: "Même Orthographe",

    // Conflict section
    conflictsTitle: "Modifications Simultanées",
    conflictsDesc: "Les entrées suivantes ont été modifiées sur les deux appareils. Choisissez quelle valeur conserver :",
    field: "Champ",
    deletedVsEdited: "Supprimé sur {deletedOn}, modifié sur l'autre appareil",
    keepEdited: "Conserver l'entrée modifiée",
    confirmDelete: "Confirmer la suppression",

    // Live sync status & pills
    status: {
        synced: "Synchronisé",
        syncing: "Synchronisation...",
        offline: "Hors ligne (Enregistré localement)",
        needsReview: "Examiner les Changements",
        devicesOnline: "{count} en ligne",
        autoLiveOn: "Synchronisation Directe Active",
        autoLiveOff: "Synchronisation en Pause",
        autoMergedToast: "Mises à jour fusionnées depuis votre autre appareil",
        pulledToast: "Langue mise à jour depuis le cloud",
        pushedToast: "Modifications enregistrées sur le cloud"
    }
};
