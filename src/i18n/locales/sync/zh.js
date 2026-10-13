// src/i18n/locales/sync/zh.js
export default {
    title: "多设备同步与合并审核",
    summaryTitle: "检测到多设备更新",
    summaryDesc: "在当前设备与云端存档之间检测到差异。您可以审查具体修改，或将两端的创作完美合并。",
    remoteDevice: "另一台设备",
    localDevice: "当前设备",
    addedRemote: "另一台设备新增 {count} 项",
    addedLocal: "当前设备新增 {count} 项",
    similarFound: "发现 {count} 个相似或重复词汇",
    conflictsFound: "发现 {count} 处冲突修改",
    cleanNotice: "两台设备的所有新增和修改内容都可以安全合并，不会丢失任何数据。",

    // Action buttons
    mergeAll: "全部合并 (推荐)",
    mergeAllHint: "保留所有设备的新增内容，自动合并相同词汇并应用。",
    useCloud: "仅使用云端版本",
    useLocal: "仅保留当前设备",
    cancel: "取消",
    applyMerge: "应用合并结果",
    
    // Similarity section
    similarTitle: "相似与重复词汇",
    similarDesc: "以下词汇在两台设备上分别添加，具有相似的拼写或含义：",
    combineAuto: "智能自动合并",
    chooseWhatStays: "自选保留内容",
    keepBoth: "全部保留为独立词汇",
    keepLocalOnly: "仅保留当前设备词汇",
    keepRemoteOnly: "仅保留另一设备词汇",
    identicalBadge: "完全一致",
    sameMeaningBadge: "同义同词",
    sameWordBadge: "拼写相同",

    // Conflict section
    conflictsTitle: "同时修改的字段",
    conflictsDesc: "以下词条在两台设备上被同时修改，请选择保留哪一方的数值：",
    field: "字段",
    deletedVsEdited: "在 {deletedOn} 已删除，但在另一设备上有修改",
    keepEdited: "保留被修改的词条",
    confirmDelete: "确认删除",

    // Live sync status & pills
    status: {
        synced: "已同步",
        syncing: "正在同步...",
        offline: "离线 (已本地保存)",
        needsReview: "需审核变更",
        devicesOnline: "{count} 台设备在线",
        autoLiveOn: "实时自动同步已开启",
        autoLiveOff: "自动同步已暂停",
        autoMergedToast: "已成功合并来自其他设备的更新",
        pulledToast: "已从云端载入最新语言数据",
        pushedToast: "修改已同步至云端"
    }
};
