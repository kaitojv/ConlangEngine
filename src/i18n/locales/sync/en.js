// src/i18n/locales/sync/en.js
export default {
    title: "Sync & Merge Review",
    summaryTitle: "Changes Detected Across Devices",
    summaryDesc: "Updates were found between this device and your cloud backup. Review what changed or merge both versions together.",
    remoteDevice: "Other Device",
    localDevice: "This Device",
    addedRemote: "{count} added on other device",
    addedLocal: "{count} added on this device",
    similarFound: "{count} similar or repeated words found",
    conflictsFound: "{count} conflicting edits",
    cleanNotice: "All additions and edits from both devices can be merged without losing any data.",

    // Action buttons
    mergeAll: "Merge All (Recommended)",
    mergeAllHint: "Keep additions from both devices, combine matching words, and apply.",
    useCloud: "Use Cloud Version",
    useLocal: "Keep This Device Only",
    cancel: "Cancel",
    applyMerge: "Apply Merged Result",
    
    // Similarity section
    similarTitle: "Similar & Repeated Words",
    similarDesc: "The following words were added on both devices with similar spellings or meanings:",
    combineAuto: "Combine Automatically",
    chooseWhatStays: "Choose what stays",
    keepBoth: "Keep Both",
    keepLocalOnly: "Keep local only",
    keepRemoteOnly: "Keep other device only",
    identicalBadge: "Identical",
    sameMeaningBadge: "Same Meaning",
    sameWordBadge: "Same Spelling",

    // Conflict section
    conflictsTitle: "Simultaneous Edits",
    conflictsDesc: "The following entries were edited on both devices. Choose which value to keep:",
    field: "Field",
    deletedVsEdited: "Deleted on {deletedOn}, edited on other device",
    keepEdited: "Keep edited entry",
    confirmDelete: "Confirm deletion",

    // Live sync status & pills
    status: {
        synced: "Synced",
        syncing: "Syncing...",
        offline: "Offline (Saved locally)",
        needsReview: "Review Changes",
        devicesOnline: "{count} online",
        autoLiveOn: "Live Auto-Sync Active",
        autoLiveOff: "Auto-Sync Paused",
        autoMergedToast: "Merged updates from your other device",
        pulledToast: "Language updated from cloud",
        pushedToast: "Changes synced to cloud"
    }
};
