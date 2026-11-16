// src/utils/keyboardExporter.js
// Export keyboard layouts for Windows (2-click Tray Installer ZIP + MSKLC .klc),
// macOS (.keylayout), Linux (XKB), and JSON backup.

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

export const WIN_VK_CODES = {
    "0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34,
    "5": 0x35, "6": 0x36, "7": 0x37, "8": 0x38, "9": 0x39,
    "A": 0x41, "B": 0x42, "C": 0x43, "D": 0x44, "E": 0x45,
    "F": 0x46, "G": 0x47, "H": 0x48, "I": 0x49, "J": 0x4A,
    "K": 0x4B, "L": 0x4C, "M": 0x4D, "N": 0x4E, "O": 0x4F,
    "P": 0x50, "Q": 0x51, "R": 0x52, "S": 0x53, "T": 0x54,
    "U": 0x55, "V": 0x56, "W": 0x57, "X": 0x58, "Y": 0x59, "Z": 0x5A,
    "SPACE": 0x20,
    "OEM_1": 0xBA, "OEM_PLUS": 0xBB, "OEM_COMMA": 0xBC,
    "OEM_MINUS": 0xBD, "OEM_PERIOD": 0xBE, "OEM_2": 0xBF, "OEM_3": 0xC0,
    "OEM_4": 0xDB, "OEM_5": 0xDC, "OEM_6": 0xDD, "OEM_7": 0xDE
};

const KLC_KEYS = [
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

export function sanitizeSafeLayoutName(layoutName) {
    return (layoutName || "ConlangLayout").replace(/[^a-zA-Z0-9]/g, "").substring(0, 8) || "Conlang";
}

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

/**
 * Formats one KLC slot. Single BMP printable codepoints encode as 4-hex;
 * multi-code-unit sequences (syllables, combining pairs, or non-BMP chars > 0xFFFF)
 * use "%%" and emit a MSKLC LIGATURE entry (up to 4 UTF-16 code units).
 */
function formatKlcSlot(vk, modIndex, value, ligatures) {
    if (typeof value !== 'string' || !value || value === '-1') return "-1";
    if (value.length === 1) {
        const code = value.charCodeAt(0);
        if (code < 0x0020) return "-1";
        return code.toString(16).toUpperCase().padStart(4, '0');
    }
    const units = [];
    for (let i = 0; i < value.length && units.length < 4; i++) {
        const u = value.charCodeAt(i);
        if (u >= 0x0020) units.push(u.toString(16).toUpperCase().padStart(4, '0'));
    }
    if (units.length === 0) return "-1";
    if (units.length === 1) return units[0];
    ligatures.push(`${vk}\t${modIndex}\t${units.join('\t')}`);
    return "%%";
}

export function generateKLCContent(layoutName, mappedKeys = {}) {
    const safeName = sanitizeSafeLayoutName(layoutName);
    const descName = (layoutName || "Conlang Custom Keyboard").replace(/"/g, "'");
    const ligatures = [];

    const header = [
        `KBD\t${safeName}\t"${descName}"`,
        ``,
        `COPYRIGHT\t"(c) 2026 Conlang Engine"`,
        `COMPANY\t"Conlang Engine"`,
        `LOCALENAME\t"en-US"`,
        `LOCALEID\t"00000409"`,
        `VERSION\t"1.0"`,
        ``,
        `SHIFTSTATE`,
        `0\t// Column 4: Base`,
        `1\t// Column 5: Shift`,
        `6\t// Column 6: AltGr`,
        ``,
        `LAYOUT`,
        `//SC\tVK_\t\tCap\t0\t1\t6`,
        `//--\t----\t\t---\t----\t----\t----`,
        ``
    ].join("\r\n");

    let layoutStr = "";
    KLC_KEYS.forEach(k => {
        const { baseChar, shiftChar, altgrChar } = getMapping(k.vk, mappedKeys);
        const capFlag = (
            typeof baseChar === 'string' && baseChar.length === 1 &&
            typeof shiftChar === 'string' && shiftChar.length === 1 &&
            baseChar !== shiftChar && baseChar.toUpperCase() === shiftChar
        ) ? 1 : 0;

        const baseCode = formatKlcSlot(k.vk, 0, baseChar, ligatures);
        const shiftCode = formatKlcSlot(k.vk, 1, shiftChar, ligatures);
        const altgrCode = formatKlcSlot(k.vk, 2, altgrChar, ligatures);
        layoutStr += `${k.sc}\t${k.vk}\t\t${capFlag}\t${baseCode}\t${shiftCode}\t${altgrCode}\r\n`;
    });

    const ligatureSection = ligatures.length > 0
        ? `\r\nLIGATURE\r\n//VK_\tMod\tCode points\r\n${ligatures.join('\r\n')}\r\n`
        : '';

    const footer = [
        ``,
        `KEYNAME`,
        ``,
        `01\tEsc`,
        `0e\tBackspace`,
        `0f\tTab`,
        `1c\tEnter`,
        `1d\tCtrl`,
        `2a\tShift`,
        `36\t"Right Shift"`,
        `37\t"Num *"`,
        `38\tAlt`,
        `39\tSpace`,
        `3a\t"Caps Lock"`,
        ``,
        `DESCRIPTIONS`,
        `0409\t${descName}`,
        ``,
        `LANGUAGENAMES`,
        `0409\tEnglish (United States)`,
        ``,
        `ENDKBD`,
        ``
    ].join("\r\n");

    return header + layoutStr + ligatureSection + footer;
}

export function encodeUtf16LeWithBom(str) {
    const buffer = new ArrayBuffer(str.length * 2 + 2);
    const view = new Uint16Array(buffer);
    view[0] = 0xFEFF;
    for (let i = 0; i < str.length; i++) {
        view[i + 1] = str.charCodeAt(i);
    }
    return new Uint8Array(buffer);
}

export function exportKLC(layoutName, mappedKeys = {}) {
    const safeName = sanitizeSafeLayoutName(layoutName);
    const fullKlc = generateKLCContent(layoutName, mappedKeys);
    downloadFile(`${safeName}.klc`, fullKlc, "text/plain;charset=utf-16le", true);
}

/**
 * Escapes any non-ASCII code units as C#/JSON `\uXXXX` so the generated PowerShell
 * file is 100% pure ASCII and never breaks regardless of Windows system locale.
 */
function escapeAsciiUnicode(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x20 || code > 0x7E) {
            out += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
        } else if (str[i] === '\\' || str[i] === '"') {
            out += '\\' + str[i];
        } else {
            out += str[i];
        }
    }
    return out;
}

export function generateWindowsKeyboardPS1(layoutName, mappedKeys = {}) {
    const safeName = sanitizeSafeLayoutName(layoutName);
    const displaySafe = (layoutName || "Conlang Keyboard").replace(/[^\x20-\x7E]/g, c => escapeAsciiUnicode(c)).replace(/"/g, "'");

    // Only intercept keys explicitly mapped by the user so native OS shortcuts and
    // unmapped keys (Backspace, Enter, ABNT2/QWERTY defaults) keep working seamlessly.
    const mapInitializers = [];
    Object.entries(WIN_VK_CODES).forEach(([vkName, vkCode]) => {
        const m = mappedKeys?.[vkName];
        if (!m) return;
        const b = m.base && m.base !== '-1' ? m.base : null;
        const s = m.shift && m.shift !== '-1' ? m.shift : null;
        const a = m.altgr && m.altgr !== '-1' ? m.altgr : null;
        if (!b && !s && !a) return;
        mapInitializers.push(
            `        maps[0x${vkCode.toString(16).toUpperCase()}] = new KeyEntry("${escapeAsciiUnicode(b || '')}", "${escapeAsciiUnicode(s || '')}", "${escapeAsciiUnicode(a || '')}");`
        );
    });

    return `$ErrorActionPreference = 'Stop'

$code = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class ConlangKeyMapHost {
    private class KeyEntry {
        public string Base;
        public string Shift;
        public string AltGr;
        public KeyEntry(string b, string s, string a) {
            Base = b; Shift = s; AltGr = a;
        }
    }

    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const uint LLKHF_INJECTED = 0x00000010;
    private const uint INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const uint KEYEVENTF_UNICODE = 0x0004;

    private const int VK_SHIFT = 0x10;
    private const int VK_CONTROL = 0x11;
    private const int VK_MENU = 0x12;
    private const int VK_CAPITAL = 0x14;
    private const int VK_LCONTROL = 0xA2;
    private const int VK_RCONTROL = 0xA3;
    private const int VK_LMENU = 0xA4;
    private const int VK_RMENU = 0xA5;
    private const int VK_LWIN = 0x5B;
    private const int VK_RWIN = 0x5C;
    private static readonly IntPtr CEKB_TAG = new IntPtr(0x43454B42);

    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT {
        public uint vkCode;
        public uint scanCode;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MOUSEINPUT {
        public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct HARDWAREINPUT {
        public uint uMsg; public ushort wParamL; public ushort wParamH;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct INPUTUNION {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    private static extern short GetKeyState(int nVirtKey);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    private static Form _uiHost;
    private static NotifyIcon _trayIcon;
    private static ToolStripMenuItem _toggleMenuItem;
    private static IntPtr _hookId = IntPtr.Zero;
    private static LowLevelKeyboardProc _proc;
    private static bool _enabled = true;
    private static readonly Dictionary<int, KeyEntry> _maps = BuildMaps();

    private static Dictionary<int, KeyEntry> BuildMaps() {
        var maps = new Dictionary<int, KeyEntry>();
${mapInitializers.join('\r\n')}
        return maps;
    }

    private static bool IsKeyDown(int vk) {
        return (GetAsyncKeyState(vk) & 0x8000) != 0;
    }

    private static void SendUnicodeString(string text, bool releaseAltGr) {
        if (string.IsNullOrEmpty(text)) return;
        var list = new List<INPUT>();

        if (releaseAltGr) {
            int[] mods = new int[] { VK_LCONTROL, VK_RCONTROL, VK_LMENU, VK_RMENU };
            foreach (int m in mods) {
                if (IsKeyDown(m)) {
                    var up = new INPUT { type = INPUT_KEYBOARD };
                    up.u.ki = new KEYBDINPUT { wVk = (ushort)m, wScan = 0, dwFlags = KEYEVENTF_KEYUP, time = 0, dwExtraInfo = CEKB_TAG };
                    list.Add(up);
                }
            }
        }

        for (int i = 0; i < text.Length; i++) {
            ushort unit = text[i];
            var down = new INPUT { type = INPUT_KEYBOARD };
            down.u.ki = new KEYBDINPUT { wVk = 0, wScan = unit, dwFlags = KEYEVENTF_UNICODE, time = 0, dwExtraInfo = CEKB_TAG };
            var up = new INPUT { type = INPUT_KEYBOARD };
            up.u.ki = new KEYBDINPUT { wVk = 0, wScan = unit, dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time = 0, dwExtraInfo = CEKB_TAG };
            list.Add(down);
            list.Add(up);
        }

        SendInput((uint)list.Count, list.ToArray(), Marshal.SizeOf(typeof(INPUT)));
    }

    private static void ToggleEnabled() {
        _enabled = !_enabled;
        UpdateTrayVisuals();
        _trayIcon.ShowBalloonTip(1500, "${displaySafe}", _enabled ? "Conlang Keyboard ACTIVE (Ctrl+Alt+K to pause)" : "Conlang Keyboard PAUSED (Ctrl+Alt+K to resume)", ToolTipIcon.Info);
    }

    private static void UpdateTrayVisuals() {
        if (_toggleMenuItem != null) {
            _toggleMenuItem.Checked = _enabled;
            _toggleMenuItem.Text = _enabled ? "Active (Ctrl+Alt+K to Pause)" : "Paused (Ctrl+Alt+K to Enable)";
        }
        if (_trayIcon != null) {
            _trayIcon.Text = "${displaySafe} - " + (_enabled ? "ACTIVE" : "PAUSED");
        }
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
            var info = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));

            if ((info.flags & LLKHF_INJECTED) == 0 && info.dwExtraInfo != CEKB_TAG) {
                int vk = (int)info.vkCode;
                bool winDown = IsKeyDown(VK_LWIN) || IsKeyDown(VK_RWIN);
                bool altGr = IsKeyDown(VK_RMENU) || (IsKeyDown(VK_CONTROL) && IsKeyDown(VK_MENU));
                bool ctrlOnly = IsKeyDown(VK_CONTROL) && !altGr;
                bool altOnly = IsKeyDown(VK_MENU) && !altGr;

                // Toggle hotkey: Ctrl + Alt + K
                if (vk == 0x4B && IsKeyDown(VK_CONTROL) && IsKeyDown(VK_MENU) && !winDown) {
                    _uiHost.BeginInvoke(new Action(ToggleEnabled));
                    return (IntPtr)1;
                }

                if (_enabled && !winDown && !ctrlOnly && !altOnly && _maps.ContainsKey(vk)) {
                    KeyEntry entry = _maps[vk];
                    bool shiftDown = IsKeyDown(VK_SHIFT);
                    bool capsOn = (GetKeyState(VK_CAPITAL) & 0x0001) != 0;
                    string output = "";

                    if (altGr) {
                        output = entry.AltGr;
                    } else {
                        bool isAlphaCasePair = !string.IsNullOrEmpty(entry.Base) && !string.IsNullOrEmpty(entry.Shift)
                            && entry.Base.Length == 1 && entry.Shift.Length == 1
                            && entry.Base != entry.Shift && entry.Base.ToUpperInvariant() == entry.Shift;
                        bool effectiveShift = isAlphaCasePair ? (shiftDown ^ capsOn) : shiftDown;
                        output = effectiveShift ? entry.Shift : entry.Base;
                    }

                    if (!string.IsNullOrEmpty(output)) {
                        bool hadAltGr = altGr;
                        _uiHost.BeginInvoke(new Action(() => SendUnicodeString(output, hadAltGr)));
                        return (IntPtr)1;
                    }
                }
            }
        }
        return CallNextHookEx(_hookId, nCode, wParam, lParam);
    }

    private static Icon CreateTrayIcon() {
        using (var bmp = new Bitmap(16, 16))
        using (var g = Graphics.FromImage(bmp)) {
            g.Clear(Color.FromArgb(124, 58, 237));
            using (var font = new Font("Segoe UI", 9, FontStyle.Bold, GraphicsUnit.Pixel))
            using (var brush = new SolidBrush(Color.White)) {
                g.DrawString("K", font, brush, 2, 1);
            }
            return Icon.FromHandle(bmp.GetHicon());
        }
    }

    public static void Run(string installDir, string safeName) {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        _uiHost = new Form { ShowInTaskbar = false, WindowState = FormWindowState.Minimized, FormBorderStyle = FormBorderStyle.None, Size = new Size(1, 1) };
        var dummy = _uiHost.Handle;

        var menu = new ContextMenuStrip();
        _toggleMenuItem = new ToolStripMenuItem("Active (Ctrl+Alt+K to Pause)");
        _toggleMenuItem.Click += (s, e) => ToggleEnabled();
        var exitItem = new ToolStripMenuItem("Exit Keyboard");
        exitItem.Click += (s, e) => Application.ExitThread();
        menu.Items.Add(_toggleMenuItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(exitItem);

        _trayIcon = new NotifyIcon {
            Icon = CreateTrayIcon(),
            Visible = true,
            ContextMenuStrip = menu
        };
        _trayIcon.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) ToggleEnabled(); };
        UpdateTrayVisuals();

        _proc = HookCallback;
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            _hookId = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, GetModuleHandle(curModule.ModuleName), 0);
        }

        _trayIcon.ShowBalloonTip(2000, "${displaySafe}", "Keyboard installed and active! Click tray icon or press Ctrl+Alt+K to toggle.", ToolTipIcon.Info);
        Application.Run();

        if (_hookId != IntPtr.Zero) UnhookWindowsHookEx(_hookId);
        _trayIcon.Visible = false;
        _trayIcon.Dispose();
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies "System.Windows.Forms", "System.Drawing"

$mutexName = "ConlangEngine_Kbd_${safeName}"
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    [System.Windows.Forms.MessageBox]::Show("This keyboard (${displaySafe}) is already running in your system tray (bottom-right taskbar).", "${displaySafe}", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
    exit 0
}

try {
    [ConlangKeyMapHost]::Run($PSScriptRoot, "${safeName}")
} finally {
    if ($mutex) { $mutex.ReleaseMutex(); $mutex.Dispose() }
}
`;
}

export function generateWindowsInstallBat(safeName, layoutName) {
    const cleanTitle = (layoutName || safeName).replace(/[^a-zA-Z0-9 _-]/g, '').trim() || safeName;
    return [
        `@echo off`,
        `setlocal`,
        `set "SRC=%~dp0"`,
        `set "DEST=%LOCALAPPDATA%\\ConlangEngine\\Keyboards\\${safeName}"`,
        `if not exist "%DEST%" mkdir "%DEST%"`,
        `copy /Y "%SRC%${safeName}_Keyboard.ps1" "%DEST%\\${safeName}_Keyboard.ps1" >nul`,
        `copy /Y "%SRC%${safeName}.klc" "%DEST%\\${safeName}.klc" >nul`,
        `> "%DEST%\\Run_${safeName}.vbs" (`,
        `  echo Set sh = CreateObject^("WScript.Shell"^)`,
        `  echo sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%DEST%\\${safeName}_Keyboard.ps1""", 0, False`,
        `)`,
        `> "%DEST%\\Uninstall_${safeName}.bat" (`,
        `  echo @echo off`,
        `  echo del /Q "%USERPROFILE%\\Desktop\\${cleanTitle} Keyboard.lnk" 2^>nul`,
        `  echo del /Q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\${cleanTitle} Keyboard.lnk" 2^>nul`,
        `  echo rmdir /S /Q "%DEST%" 2^>nul`,
        `  echo echo Removed ${cleanTitle} Keyboard.`,
        `)`,
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { $s = $ws.CreateShortcut((Join-Path $dir '${cleanTitle} Keyboard.lnk')); $s.TargetPath = '%DEST%\\Run_${safeName}.vbs'; $s.IconLocation = 'shell32.dll,44'; $s.Save() }"`,
        `start "" wscript.exe "%DEST%\\Run_${safeName}.vbs"`,
        `echo.`,
        `echo [Conlang Engine] "${cleanTitle}" installed and started in your System Tray!`,
        `echo Press Ctrl+Alt+K anytime or click the tray icon to pause/resume.`,
        `timeout /t 3 >nul`,
        ``
    ].join('\r\n');
}

export function generateWindowsReadme(safeName, layoutName) {
    const cleanTitle = (layoutName || safeName).replace(/[^\x20-\x7E]/g, '') || safeName;
    return [
        `Conlang Engine - Windows Keyboard Package (${cleanTitle})`,
        `===========================================================`,
        ``,
        `QUICK 2-CLICK INSTALL (NO ADMIN OR EXTRA TOOLS REQUIRED):`,
        `1. Extract all files from this ZIP folder.`,
        `2. Double-click "Install_${safeName}.bat".`,
        ``,
        `What it does:`,
        `- Installs "${cleanTitle} Keyboard" to your user AppData folder and creates`,
        `  a Desktop & Start Menu shortcut.`,
        `- Starts immediately in your Windows System Tray (bottom-right taskbar).`,
        `- Works with ALL Unicode characters, custom PUA glyphs, and multi-character syllables.`,
        `- Press Ctrl + Alt + K (or click the Tray icon) anytime to Pause / Resume.`,
        ``,
        `ADVANCED (Optional MSKLC):`,
        `- "${safeName}.klc" is also included (UTF-16LE CRLF) if you wish to compile`,
        `  a kernel .msi layout with Microsoft Keyboard Layout Creator.`,
        ``
    ].join('\r\n');
}

// IEEE 802.3 CRC-32 table
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Pure-JS zero-dependency ZIP writer (STORE method, method=0).
 * @param {Array<{ name: string, data: Uint8Array }>} entries
 * @returns {Uint8Array}
 */
export function createZipBuffer(entries) {
    const encoder = new TextEncoder();
    const localChunks = [];
    const centralChunks = [];
    let offset = 0;

    entries.forEach(({ name, data }) => {
        const nameBytes = encoder.encode(name);
        const bytes = data instanceof Uint8Array ? data : encoder.encode(String(data));
        const checksum = crc32(bytes);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(localHeader.buffer);
        lv.setUint32(0, 0x04034B50, true); // Local file header signature
        lv.setUint16(4, 20, true);         // Version needed (2.0)
        lv.setUint16(6, 0x0800, true);     // UTF-8 filename flag
        lv.setUint16(8, 0, true);          // Compression method: STORE
        lv.setUint16(10, 0, true);         // Mod time
        lv.setUint16(12, 0x5421, true);    // Mod date
        lv.setUint32(14, checksum, true);  // CRC-32
        lv.setUint32(18, bytes.length, true); // Compressed size
        lv.setUint32(22, bytes.length, true); // Uncompressed size
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);         // Extra field length
        localHeader.set(nameBytes, 30);

        localChunks.push(localHeader, bytes);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(centralHeader.buffer);
        cv.setUint32(0, 0x02014B50, true); // Central directory signature
        cv.setUint16(4, 20, true);         // Version made by
        cv.setUint16(6, 20, true);         // Version needed
        cv.setUint16(8, 0x0800, true);     // UTF-8 filename flag
        cv.setUint16(10, 0, true);         // Compression: STORE
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0x5421, true);
        cv.setUint32(16, checksum, true);
        cv.setUint32(20, bytes.length, true);
        cv.setUint32(24, bytes.length, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);    // Relative offset of local header
        centralHeader.set(nameBytes, 46);

        centralChunks.push(centralHeader);
        offset += localHeader.length + bytes.length;
    });

    let centralSize = 0;
    centralChunks.forEach(c => { centralSize += c.length; });

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);     // End of central dir signature
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + centralSize + eocd.length;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    localChunks.forEach(c => { out.set(c, pos); pos += c.length; });
    centralChunks.forEach(c => { out.set(c, pos); pos += c.length; });
    out.set(eocd, pos);
    return out;
}

export function buildWindowsPackageFiles(layoutName, mappedKeys = {}) {
    const safeName = sanitizeSafeLayoutName(layoutName);
    const encoder = new TextEncoder();

    return [
        {
            name: `Install_${safeName}.bat`,
            data: encoder.encode(generateWindowsInstallBat(safeName, layoutName))
        },
        {
            name: `${safeName}_Keyboard.ps1`,
            data: encoder.encode(generateWindowsKeyboardPS1(layoutName, mappedKeys))
        },
        {
            name: `${safeName}.klc`,
            data: encodeUtf16LeWithBom(generateKLCContent(layoutName, mappedKeys))
        },
        {
            name: `README.txt`,
            data: encoder.encode(generateWindowsReadme(safeName, layoutName))
        }
    ];
}

export function exportWindowsInstaller(layoutName, mappedKeys = {}) {
    const safeName = sanitizeSafeLayoutName(layoutName);
    const files = buildWindowsPackageFiles(layoutName, mappedKeys);
    const zipBytes = createZipBuffer(files);
    downloadFile(`${safeName}_Windows_Keyboard.zip`, zipBytes, "application/zip", false);
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
        blobOrBuffer = encodeUtf16LeWithBom(content);
        type = "application/octet-stream";
    }

    const blob = new Blob([blobOrBuffer], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
