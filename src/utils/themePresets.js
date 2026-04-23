// src/utils/themePresets.js

export const DARK_THEMES = [
    {
        name: "Midnight (Default)",
        preview: "#0b0f19",
        colors: {
            bg: "#0b0f19",
            s1: "#151a28",
            s2: "#1a2033",
            s3: "#1f283d",
            s4: "#12121c",
            header: "#080812",
            font: "#f8fafc",
            font2: "#94a3b8",
            accent: "#7c3aed",
            accent2: "#8b5cf6",
            accent3: "#4c1d95",
            border: "rgba(255, 255, 255, 0.08)",
            blur: "0px",
            glow: "#1a1638"
        }
    },
    {
        name: "Obsidian Void",
        preview: "linear-gradient(135deg, #000000, #0a0a0a)",
        colors: {
            bg: "#000000",
            s1: "#09090b",
            s2: "#121214",
            s3: "#1a1a1c",
            s4: "#040405",
            header: "#000000",
            font: "#ffffff",
            font2: "#a1a1aa",
            accent: "#1d4ed8",
            accent2: "#3b82f6",
            accent3: "#1e3a8a",
            border: "#1f1f22",
            blur: "0px",
            glow: "rgba(29, 78, 216, 0.2)"
        }
    },
    {
        name: "Hacker Matrix",
        preview: "linear-gradient(135deg, #050b06, #001f05)",
        colors: {
            bg: "#050b06",
            s1: "#0a140b",
            s2: "#0d1f0e",
            s3: "#122a13",
            s4: "#030804",
            header: "#030804",
            font: "#4af626",
            font2: "#1f8a11",
            accent: "#00ff41",
            accent2: "#00ff41",
            accent3: "#0891b2",
            border: "#124211",
            blur: "0px",
            glow: "rgba(0, 255, 65, 0.15)"
        }
    },
    {
        name: "Deep Purple",
        preview: "linear-gradient(135deg, #13071e, #2b1145)",
        colors: {
            bg: "#0f0518",
            s1: "#1d0b30",
            s2: "#2a1045",
            s3: "#37155a",
            s4: "#0a0312",
            header: "#0a0312",
            font: "#f3e8ff",
            font2: "#c084fc",
            accent: "#d946ef",
            accent2: "#c084fc",
            accent3: "#db2777",
            border: "rgba(192, 132, 252, 0.2)",
            blur: "0px",
            glow: "rgba(217, 70, 239, 0.2)"
        }
    },
    {
        name: "Apple Glass",
        preview: "linear-gradient(135deg, #1d1b2e, #471d47, #0f223a)",
        colors: {
            bg: "linear-gradient(120deg, #11101a 0%, #3b1745 45%, #0d2138 100%)",
            s1: "linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.01) 100%)",
            s2: "rgba(255, 255, 255, 0.05)",
            s3: "rgba(255, 255, 255, 0.1)",
            s4: "rgba(0, 0, 0, 0.2)",
            header: "rgba(10, 10, 10, 0.25)",
            font: "#ffffff",
            font2: "rgba(235, 235, 245, 0.6)",
            accent: "#0A84FF",
            accent2: "#0A84FF",
            accent3: "#5E5CE6",
            border: "rgba(255, 255, 255, 0.18)",
            blur: "40px",
            glow: "rgba(10, 132, 255, 0.25)"
        }
    }
];

export const LIGHT_THEMES = [
    {
        name: "Clean Paper",
        preview: "#ffffff",
        colors: {
            bg: "#f4f4f5",
            s1: "#ffffff",
            s2: "#f8f8fa",
            s3: "#f1f1f4",
            s4: "#fafafa",
            header: "#fafafa",
            font: "#09090b",
            font2: "#71717a",
            accent: "#3b82f6",
            accent2: "#3b82f6",
            accent3: "#8b5cf6",
            border: "#e4e4e7",
            blur: "0px",
            glow: "rgba(0, 0, 0, 0.08)"
        }
    },
    {
        name: "Vintage Sepia",
        preview: "#fdf6e3",
        colors: {
            bg: "#fdf6e3",
            s1: "#fefbf4",
            s2: "#f9f2e0",
            s3: "#f4ead2",
            s4: "#fcf8ef",
            header: "#fdf6e3",
            font: "#4a3c31",
            font2: "#9a8c83",
            accent: "#d97706",
            accent2: "#d97706",
            accent3: "#9a3412",
            border: "#e8dfcc",
            blur: "0px",
            glow: "rgba(217, 119, 6, 0.15)"
        }
    },
    {
        name: "Nord Snow",
        preview: "#eceff4",
        colors: {
            bg: "#eceff4",
            s1: "#ffffff",
            s2: "#f3f4f7",
            s3: "#e5e9f0",
            s4: "#d8dee9",
            header: "#e5e9f0",
            font: "#2e3440",
            font2: "#4c566a",
            accent: "#5e81ac",
            accent2: "#81a1c1",
            accent3: "#88c0d0",
            border: "#d8dee9",
            blur: "0px",
            glow: "rgba(94, 129, 172, 0.15)"
        }
    },
    {
        name: "Rose Quartz",
        preview: "#fff1f2",
        colors: {
            bg: "#fff1f2",
            s1: "#fffbfa",
            s2: "#fff5f5",
            s3: "#ffe4e6",
            s4: "#fecdd3",
            header: "#ffe4e6",
            font: "#881337",
            font2: "#f43f5e",
            accent: "#e11d48",
            accent2: "#f43f5e",
            accent3: "#be123c",
            border: "#fecdd3",
            blur: "0px",
            glow: "rgba(225, 29, 72, 0.15)"
        }
    },
    {
        name: "Light Glass",
        preview: "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
        colors: {
            bg: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
            s1: "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%)",
            s2: "rgba(255, 255, 255, 0.4)",
            s3: "rgba(255, 255, 255, 0.5)",
            s4: "rgba(255, 255, 255, 0.8)",
            header: "rgba(255, 255, 255, 0.5)",
            font: "#1c1c1e",
            font2: "rgba(28, 28, 30, 0.6)",
            accent: "#007AFF",
            accent2: "#007AFF",
            accent3: "#AF52DE",
            border: "rgba(255, 255, 255, 0.8)",
            blur: "40px",
            glow: "rgba(175, 82, 222, 0.2)"
        }
    }
];
