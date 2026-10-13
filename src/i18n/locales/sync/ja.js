// src/i18n/locales/sync/ja.js
export default {
    title: "デバイス間同期とマージ確認",
    summaryTitle: "複数デバイス間の変更を検出しました",
    summaryDesc: "このデバイスとクラウドバックアップの間で更新が見つかりました。変更点を確認するか、両方のバージョンを統合します。",
    remoteDevice: "他のデバイス",
    localDevice: "このデバイス",
    addedRemote: "他のデバイスで追加: {count} 件",
    addedLocal: "このデバイスで追加: {count} 件",
    similarFound: "類似・重複した単語: {count} 件",
    conflictsFound: "競合する編集: {count} 箇所",
    cleanNotice: "両デバイスで作成・編集されたすべての内容は、データを失うことなく統合できます。",

    // Action buttons
    mergeAll: "すべて統合 (推奨)",
    mergeAllHint: "両デバイスの新規作成をすべて残し、重複した単語をまとめて適用します。",
    useCloud: "クラウド版を使用",
    useLocal: "このデバイスのみ保持",
    cancel: "キャンセル",
    applyMerge: "統合結果を適用",
    
    // Similarity section
    similarTitle: "類似および重複した単語",
    similarDesc: "以下の単語は両方のデバイスで追加され、綴りや意味が類似しています：",
    combineAuto: "自動的に統合",
    chooseWhatStays: "残す内容を選択",
    keepBoth: "両方を別々の単語として残す",
    keepLocalOnly: "このデバイスの単語のみ残す",
    keepRemoteOnly: "他デバイスの単語のみ残す",
    identicalBadge: "完全一致",
    sameMeaningBadge: "同義・同単語",
    sameWordBadge: "同綴り",

    // Conflict section
    conflictsTitle: "同時編集された項目",
    conflictsDesc: "以下の項目は両方のデバイスで同時に編集されました。どちらの値を残すか選択してください：",
    field: "項目",
    deletedVsEdited: "{deletedOn} で削除されましたが、他デバイスで編集されています",
    keepEdited: "編集された単語を残す",
    confirmDelete: "削除を確定",

    // Live sync status & pills
    status: {
        synced: "同期完了",
        syncing: "同期中...",
        offline: "オフライン (ローカルに保存済み)",
        needsReview: "変更を確認",
        devicesOnline: "{count} 台オンライン",
        autoLiveOn: "リアルタイム自動同期中",
        autoLiveOff: "自動同期一時停止中",
        autoMergedToast: "他デバイスからの更新を統合しました",
        pulledToast: "クラウドから言語データを読み込みました",
        pushedToast: "変更をクラウドに保存しました"
    }
};
