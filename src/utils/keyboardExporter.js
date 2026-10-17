// src/utils/keyboardExporter.js
// Export keyboard layouts for Windows (MSKLC .klc), macOS (.keylayout), Linux (XKB), and JSON backup.

export const QWERTY_DEFAULTS = {
    "1": { base: "1", shift: "!" }, "2": { base: "2", shift: "@" }, "3": { base: "3", shift: "#" }, "4": { base: "4", shift: "$" },
    "5": { base: "5", shift: "%" }, "6": { base: "6", shift: "^" }, "7": { base: "7", shift: "&" }, "8": { base: "8", shift: "*" },
    "9": { base: "9", shift: "(" }, "0": { base: "0", shift: ")" }, "OEM_MINUS": { base: "-", shift: "_" }, "OEM_PLUS": { base: "=", shift: "+" },
    "Q": { base: "q", shift: "Q" }, "W": { base: "w", shift: "W" }, "E": { base: "e", shift: "E" }, "R": { base: "r", shift: "R" },
    "T": { base: "t", shift: "T" }, "Y": { base: "y", shift: "Y" }, "U": { base: "u", shift: "U" }, "I": { base: "i", shift: "I" },
    "O": { base: "o", shift: "O" }, "P": { base: "p", shift: "P" }, "OEM_4": { base: "[", shift: "{" }, "OEM_6": { base: "]", shift: "}" },
    "A": { base: "a", shift: "A" }, "S": { base: "s", shift: "S" }, "D": { base: "d", shift: "D" }, "F": { base: "f", shift: "F" },
    "G": { base: "g", shift: "G" }, "H": { base: "h", shift: "H" }, "J": { base: "j", shift: "J" }, "K": { base: "k", shift: "K" },
    "L": { base: "l", shift: "L" }, "OEM_1": { base: ";", shift: ":" }, "OEM_7": { base: "'", shift: "\"" }, "OEM_5": { base: "\\", shift: "|" },
    "Z": { base: "z", shift: "Z" }, "X": { base: "x", shift: "X" }, "C": { base: "c", shift: "C" }, "V": { base: "v", shift: "V" },
    "B": { base: "b", shift: "B" }, "N": { base: "n", shift: "N" }, "M": { base: "m", shift: "M" }, "OEM_COMMA": { base: ",", shift: "<" },
    "OEM_PERIOD": { base: ".", shift: ">" }, "OEM_2": { base: "/", shift: "?" }, "SPACE": { base: " ", shift: " " }, "OEM_3": { base: "`", shift: "~" }
};

export const MAC_KEY_CODES = {
    "A": 0, "S": 1, "D": 2, "F": 3, "H": 4, "G": 5, "Z": 6, "X": 7, "C": 8, "V": 9,
    "B": 11, "Q": 12, "W": 13, "E": 14, "R": 15, "Y": 16, "T": 17, "1": 18, "2": 19,
    "3": 20, "4": 21, "6": 22, "5": 23, "OEM_PLUS": 24, "9": 25, "7": 26, "OEM_MINUS": 27,
    "8": 28, "0": 29, "OEM_6": 30, "O": 31, "U": 32, "OEM_4": 33, "I": 34, "P": 35,
    "L": 37, "J": 38, "OEM_7": 39, "K": 40, "OEM_1": 41, "OEM_5": 42, "OEM_COMMA": 43,
    "OEM_2": 44, "N": 45, "M": 46, "OEM_PERIOD": 47, "SPACE": 49, "OEM_3": 50
};

export const XKB_KEY_NAMES = {
    "1": "AE01", "2": "AE02", "3": "AE03", "4": "AE04", "5": "AE05", "6": "AE06", "7": "AE07", "8": "AE08", "9": "AE09", "0": "AE10",
    "OEM_MINUS": "AE11", "OEM_PLUS": "AE12", "Q": "AD01", "W": "AD02", "E": "AD03", "R": "AD04", "T": "AD05", "Y": "AD06", "U": "AD07",
    "I": "AD08", "O": "AD09", "P": "AD10", "OEM_4": "AD11", "OEM_6": "AD12", "A": "AC01", "S": "AC02", "D": "AC03", "F": "AC04",
    "G": "AC05", "H": "AC06", "J": "AC07", "K": "AC08", "L": "AC09", "OEM_1": "AC10", "OEM_7": "AC11", "OEM_5": "BKSL",
    "Z": "AB01", "X": "AB02", "C": "AB03", "V": "AB04", "B": "AB05", "N": "AB06", "M": "AB07", "OEM_COMMA": "AB08",
    "OEM_PERIOD": "AB09", "OEM_2": "AB10", "SPACE": "SPCE", "OEM_3": "TLDE"
};

export function getMapping(vk, mappedKeys = {}) {
    const def = QWERTY_DEFAULTS[vk] || { base: "", shift: "" };
    const mapping = mappedKeys[vk];
    const baseChar = mapping && mapping.base !== "-1" && mapping.base !== undefined ? mapping.base : def.base;
    const shiftChar = mapping && mapping.shift !== "-1" && mapping.shift !== undefined ? mapping.shift : def.shift;
    const altgrChar = mapping && mapping.altgr !== "-1" && mapping.altgr !== undefined ? mapping.altgr : "";
    return { baseChar, shiftChar, altgrChar };
}

export function getHexPoint(char) {
    if (typeof char !== 'string' || !char || char === '-1') return "-1";
    const codePoint = char.codePointAt(0);
    if (codePoint == null || Number.isNaN(codePoint)) return "-1";
    return codePoint.toString(16).toUpperCase().padStart(4, '0');
}

export function escapeXmlChar(char) {
    if (!char) return '';
    let out = '';
    for (const cp of char) {
        const point = cp.codePointAt(0);
        out += `&#x${point.toString(16).toUpperCase()};`;
    }
    return out;
}

export function exportKLC(layoutName, mappedKeys = {}) {
    const safeName = (layoutName || "ConlangLayout").replace(/[^a-zA-Z0-9]/g, "").substring(0, 8) || "Conlang";
    const descName = layoutName || "Conlang Custom Keyboard";

    const header = `KBD\t${safeName}\t"${descName}"\n\nCOPYRIGHT\t"(c) 2026 Conlang Engine"\nCOMPANY\t"Conlang Engine"\nLOCALENAME\t"en-US"\nLOCALEID\t"00000409"\nVERSION\t"1.0"\n\nSHIFTSTATE\n0\t// Column 4: Base\n1\t// Column 5: Shift\n6\t// Column 6: AltGr\n\nLAYOUT\n//SC\tVK_ \tCap\t0\t1\t6\n//--\t----\t\t---\t----\t----\t----\n`;

    const keys = [
        { sc: "02", vk: "1" }, { sc: "03", vk: "2" }, { sc: "04", vk: "3" }, { sc: "05", vk: "4" },
        { sc: "06", vk: "5" }, { sc: "07", vk: "6" }, { sc: "08", vk: "7" }, { sc: "09", vk: "8" },
        { sc: "0a", vk: "9" }, { sc: "0b", vk: "0" }, { sc: "0c", vk: "OEM_MINUS" }, { sc: "0d", vk: "OEM_PLUS" },
        { sc: "10", vk: "Q" }, { sc: "11", vk: "W" }, { sc: "12", vk: "E" }, { sc: "13", vk: "R" },
        { sc: "14", vk: "T" }, { sc: "15", vk: "Y" }, { sc: "16", vk: "U" }, { sc: "17", vk: "I" },
        { sc: "18", vk: "O" }, { sc: "19", vk: "P" }, { sc: "1a", vk: "OEM_4" }, { sc: "1b", vk: "OEM_6" },
        { sc: "1e", vk: "A" }, { sc: "1f", vk: "S" }, { sc: "20", vk: "D" }, { sc: "21", vk: "F" },
        { sc: "22", vk: "G" }, { sc: "23", vk: "H" }, { sc: "24", vk: "J" }, { sc: "25", vk: "K" },
        { sc: "26", vk: "L" }, { sc: "27", vk: "OEM_1" }, { sc: "28", vk: "OEM_7" }, { sc: "2b", vk: "OEM_5" },
        { sc: "2c", vk: "Z" }, { sc: "2d", vk: "X" }, { sc: "2e", vk: "C" }, { sc: "2f", vk: "V" },
        { sc: "30", vk: "B" }, { sc: "31", vk: "N" }, { sc: "32", vk: "M" }, { sc: "33", vk: "OEM_COMMA" },
        { sc: "34", vk: "OEM_PERIOD" }, { sc: "35", vk: "OEM_2" }, { sc: "39", vk: "SPACE" }, { sc: "29", vk: "OEM_3" }
    ];

    let layoutStr = "";
    keys.forEach(k => {
        const { baseChar, shiftChar, altgrChar } = getMapping(k.vk, mappedKeys);
        const baseCode = getHexPoint(baseChar);
        const shiftCode = getHexPoint(shiftChar);
        const altgrCode = getHexPoint(altgrChar);
        layoutStr += `${k.sc}\t${k.vk}\t\t0\t${baseCode}\t${shiftCode}\t${altgrCode}\n`;
    });

    const footer = `\nKEYNAME\n\n01\tEsc\n0e\tBackspace\n0f\tTab\n1c\tEnter\n1d\tCtrl\n2a\tShift\n36\t"Right Shift"\n37\t"Num *"\n38\tAlt\n39\tSpace\n3a\t"Caps Lock"\n`;
    const fullKlc = header + layoutStr + footer;

    downloadFile(`${safeName}.klc`, fullKlc, "text/plain;charset=utf-16le", true);
}

export function exportMac(layoutName, mappedKeys = {}) {
    const name = layoutName || "ConlangLayout";
    let baseMap = "";
    let shiftMap = "";
    let altMap = "";

    Object.keys(MAC_KEY_CODES).forEach(vk => {
        const macCode = MAC_KEY_CODES[vk];
        const { baseChar, shiftChar, altgrChar } = getMapping(vk, mappedKeys);
        
        if (baseChar) baseMap += `\n            <key code="${macCode}" output="${escapeXmlChar(baseChar)}"/>`;
        if (shiftChar) shiftMap += `\n            <key code="${macCode}" output="${escapeXmlChar(shiftChar)}"/>`;
        if (altgrChar) altMap += `\n            <key code="${macCode}" output="${escapeXmlChar(altgrChar)}"/>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE keyboard SYSTEM "file://localhost/System/Library/DTDs/KeyboardLayout.dtd">
<keyboard group="126" id="-12345" name="${name}" maxout="1">
    <layouts>
        <layout first="0" last="127" mapSet="ANSI" modifiers="Modifiers"/>
    </layouts>
    <modifierMap id="Modifiers" defaultIndex="0">
        <keyMapSelect mapIndex="0">
            <modifier keys="any"/>
        </keyMapSelect>
        <keyMapSelect mapIndex="1">
            <modifier keys="shift"/>
        </keyMapSelect>
        <keyMapSelect mapIndex="2">
            <modifier keys="option"/>
        </keyMapSelect>
    </modifierMap>
    <keyMapSet id="ANSI">
        <keyMap index="0">${baseMap}
        </keyMap>
        <keyMap index="1">${shiftMap}
        </keyMap>
        <keyMap index="2">${altMap}
        </keyMap>
    </keyMapSet>
</keyboard>`;

    downloadFile(`${name.replace(/[^a-zA-Z0-9]/g, "") || "Conlang"}.keylayout`, xml, "application/xml", false);
}

export function exportLinux(layoutName, mappedKeys = {}) {
    const name = layoutName || "ConlangLayout";
    let symbols = "";

    Object.keys(XKB_KEY_NAMES).forEach(vk => {
        const xkbKey = XKB_KEY_NAMES[vk];
        const { baseChar, shiftChar, altgrChar } = getMapping(vk, mappedKeys);
        
        if (baseChar || shiftChar || altgrChar) {
            const b = (baseChar || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const s = (shiftChar || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const a = (altgrChar || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            symbols += `    key <${xkbKey}> { [ "${b}", "${s}", "${a}" ] };\n`;
        }
    });

    const xkbStr = `default partial alphanumeric_keys
xkb_symbols "basic" {
    include "us(basic)"
    name[Group1]= "${name}";
    
${symbols}
};`;

    downloadFile(`conlang_xkb`, xkbStr, "text/plain", false);
}

export function exportJSON(layoutName, mappedKeys = {}, metadata = {}) {
    const safeName = (layoutName || "conlang_keyboard").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const payload = {
        name: layoutName || "Conlang Custom Keyboard",
        version: "2.0",
        date: new Date().toISOString(),
        metadata,
        mappings: mappedKeys
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    downloadFile(`${safeName}.json`, jsonStr, "application/json", false);
}

function downloadFile(filename, content, type, utf16le = false) {
    if (typeof window === 'undefined') return;
    let blobOrBuffer = content;
    
    if (utf16le) {
        const buffer = new ArrayBuffer(content.length * 2 + 2);
        const view = new Uint16Array(buffer);
        view[0] = 0xFEFF;
        for (let i = 0; i < content.length; i++) {
            view[i + 1] = content.charCodeAt(i);
        }
        blobOrBuffer = view;
        type = "application/octet-stream";
    }

    const blob = new Blob([blobOrBuffer], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
