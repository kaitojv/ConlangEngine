import React, { useRef, useState, useEffect, useMemo, useCallback, useReducer } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { getScriptTypographySettings } from '../../../utils/scriptResolver.js';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import { buildFontCompileSignature } from '../../../utils/useFontInjector.jsx';
import Button from '../Buttons/Buttons.jsx';
import {
    RotateCw, Undo2, Redo2, Trash2, Pencil, Minus, Spline, Eraser,
    FlipHorizontal, FlipVertical, Grid, Square, Circle, Triangle,
    SquareDashed, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn,
    ZoomOut, MousePointer, Maximize2, Type, Plus, Pointer, Copy,
    AlignCenter, Eye, ArrowLeftRight, PaintBucket
} from 'lucide-react';
import { exportStrokesAsSVG } from '../../../utils/svgExporter.jsx';
import { parseSVGToStrokes } from '../../../utils/svgImporter.jsx';
import { simplifyGlyph, countGlyphPoints } from '../../../utils/glyphSimplify.js';
import {
    FONT_STUDIO_CANVAS_SIZE,
    NIB_STYLE_OPTIONS,
    SERIF_STYLES,
    cloneStrokeWithMeta,
    generateQuadraticCurvePoints,
    applySerifsToStrokes,
    stripSerifParts,
    applyStylePresetToGlyphEntry,
    translateStrokes,
    flipStrokes,
    centerStrokesHorizontally,
    alignStrokesToBaseline,
    fitStrokesToBand,
    reverseStrokesDirection,
    snapPointToTypographyGuides,
    instantiateStampStrokes,
    isLegacySentinelStroke,
} from '../../../utils/fontStudioTools.js';
import {
    computeOtsuThreshold,
    vectorizeImageData,
    loadRasterImageData,
} from '../../../utils/imageVectorizer.js';
import FontExportModal from '../FontExportModal/FontExportModal.jsx';
import FontStudioInspector from './FontStudioInspector.jsx';
import toast from 'react-hot-toast';
import './fontStudio.css';

const distToSegment = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const projectToSegment = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return { x: a.x + t * dx, y: a.y + t * dy };
};

const extractInitialGlyphData = (existingCharCode, customGlyphs) => {
    if (!existingCharCode || !customGlyphs || !customGlyphs[existingCharCode]) return null;
    const existingStrokes = customGlyphs[existingCharCode];
    if (!existingStrokes || existingStrokes.length === 0) return null;

    let actualStrokes = existingStrokes;
    const firstStroke = existingStrokes[0];
    const meta = {
        scale: 1.0,
        leftMargin: 100,
        rightMargin: 100,
        yOffset: 0,
        xOffset: 0,
        consistentSize: undefined,
        isCalligraphy: false,
        isBrushPen: false,
        isChisel: false,
        isPaintBrush: false,
        isSerifPen: false,
        serifStyle: 'none',
        chiselAngle: 45,
        strokeWeight: 1.0,
    };

    if (!Array.isArray(firstStroke) && firstStroke?.isMeta) {
        meta.scale = firstStroke.scale ?? 1.0;
        meta.leftMargin = firstStroke.leftMargin ?? 100;
        meta.rightMargin = firstStroke.rightMargin ?? 100;
        meta.yOffset = firstStroke.yOffset ?? 0;
        meta.xOffset = firstStroke.xOffset ?? 0;
        meta.consistentSize = firstStroke.consistentSize;
        meta.isCalligraphy = firstStroke.isCalligraphy ?? false;
        meta.isBrushPen = firstStroke.isBrushPen ?? false;
        meta.isChisel = firstStroke.isChisel ?? false;
        meta.isPaintBrush = firstStroke.isPaintBrush ?? false;
        meta.isSerifPen = firstStroke.isSerifPen ?? false;
        meta.serifStyle = firstStroke.serifStyle || (meta.isSerifPen ? 'classic' : 'none');
        meta.chiselAngle = firstStroke.chiselAngle ?? 45;
        meta.strokeWeight = Number.isFinite(firstStroke.strokeWeight) && firstStroke.strokeWeight > 0
            ? firstStroke.strokeWeight
            : 1.0;
        actualStrokes = existingStrokes.slice(1);
    } else if (isLegacySentinelStroke(firstStroke)) {
        const x = firstStroke[0]?.x;
        if (x === -999) meta.isCalligraphy = true;
        else if (x === -998) meta.isBrushPen = true;
        else if (x === -997) meta.isPaintBrush = true;
        else if (x === -996) {
            meta.isSerifPen = true;
            meta.serifStyle = 'classic';
        }
        actualStrokes = existingStrokes.slice(1);
    }

    // Clone deeply so edits never mutate store entries directly
    const clonedStrokes = actualStrokes
        .filter((s) => Array.isArray(s) && !isLegacySentinelStroke(s))
        .map((s) => cloneStrokeWithMeta(s, s));

    return { actualStrokes: clonedStrokes, meta };
};

function renderStrokeOnCanvas(ctx, stroke, defaults) {
    if (!Array.isArray(stroke) || stroke.isMeta || stroke.length === 0) return;

    const strokeWeightMult = Number.isFinite(stroke.strokeWeight)
        ? stroke.strokeWeight
        : (defaults.strokeWeight || 1.0);
    const widthBase = Math.max(1.5, defaults.brushSize * strokeWeightMult);

    if (stroke.length === 1) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, Math.max(2, widthBase / 2), 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.lineCap = stroke.lineCap || defaults.lineCap || 'round';
    ctx.lineJoin = ctx.lineCap === 'butt' ? 'miter' : 'round';

    if (stroke.isFilled) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.closePath();
        ctx.fill();
        return;
    }

    const useCalligraphy = stroke.isCalligraphy ?? defaults.isCalligraphy;
    const useBrushPen = stroke.isBrushPen ?? defaults.isBrushPen;
    const usePaintBrush = stroke.isPaintBrush ?? defaults.isPaintBrush;
    const useChisel = stroke.isChisel ?? defaults.isChisel;
    const angle = Number.isFinite(stroke.chiselAngle) ? stroke.chiselAngle : defaults.chiselAngle;

    if (useCalligraphy) {
        for (let i = 0; i < stroke.length - 1; i++) {
            const p1 = stroke[i];
            const p2 = stroke[i + 1];
            const taper = Math.sin((i / (stroke.length - 1)) * Math.PI);
            ctx.lineWidth = Math.max(1, widthBase * (0.3 + 0.7 * taper));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    } else if (useBrushPen) {
        for (let i = 0; i < stroke.length - 1; i++) {
            const p1 = stroke[i];
            const p2 = stroke[i + 1];
            const progress = i / (stroke.length - 1 || 1);
            const widthMult = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) * 5);
            const startMult = progress < 0.1 ? (0.5 + progress * 5) : 1.0;
            ctx.lineWidth = Math.max(1, widthBase * Math.max(0.1, widthMult * startMult));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    } else if (usePaintBrush) {
        for (let i = 0; i < stroke.length - 1; i++) {
            const p1 = stroke[i];
            const p2 = stroke[i + 1];
            const hash = Math.abs(p1.x * 13 + p1.y * 17) % 10;
            ctx.lineWidth = Math.max(1, widthBase * (0.7 + (hash / 10) * 0.4));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    } else if (useChisel) {
        const radAngle = (angle * Math.PI) / 180;
        for (let i = 0; i < stroke.length - 1; i++) {
            const p1 = stroke[i];
            const p2 = stroke[i + 1];
            const strokeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const diff = Math.abs(Math.sin(strokeAngle - radAngle));
            ctx.lineWidth = Math.max(1.5, widthBase * (0.2 + 0.8 * diff));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    } else {
        ctx.lineWidth = widthBase;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
    }
}

const MAX_UNDO_HISTORY = 60;

function strokeHistoryReducer(state, action) {
    switch (action.type) {
        case 'SET_DIRECT': {
            const next = typeof action.updater === 'function' ? action.updater(state.present) : action.updater;
            return next === state.present ? state : { ...state, present: next };
        }
        case 'PUSH_SNAPSHOT': {
            return {
                ...state,
                past: [...state.past.slice(-(MAX_UNDO_HISTORY - 1)), state.present],
                future: [],
            };
        }
        case 'COMMIT': {
            const next = typeof action.updater === 'function' ? action.updater(state.present) : action.updater;
            if (next === state.present) return state;
            return {
                past: [...state.past.slice(-(MAX_UNDO_HISTORY - 1)), state.present],
                present: next,
                future: [],
            };
        }
        case 'UNDO': {
            if (state.past.length === 0) return state;
            return {
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [state.present, ...state.future.slice(0, MAX_UNDO_HISTORY - 1)],
            };
        }
        case 'REDO': {
            if (state.future.length === 0) return state;
            return {
                past: [...state.past.slice(-(MAX_UNDO_HISTORY - 1)), state.present],
                present: state.future[0],
                future: state.future.slice(1),
            };
        }
        default:
            return state;
    }
}

export default function FontStudioModal({ targetLabel, onSave, onCancel, existingCharCode, scriptId = null }) {
    const canvasRef = useRef(null);
    const {
        defaultScriptId,
        rootCustomGlyphs,
        scriptCustomGlyphs,
        scriptPuaCounter,
        storePuaCounter,
        addCustomGlyph,
        incrementPuaCounter,
        scriptAlphabetGlyphs,
        storeAlphabetGlyphs,
        scriptAlphabetNames,
        storeAlphabetNames,
        scriptFeaturalComponents,
        storeFeaturalComponents,
        updateScriptData,
    } = useConfigStore(useShallow((state) => {
        const defId = state.scriptRules?.defaultScriptId || 'default';
        const targetId = scriptId || state.activeScriptSystemId || defId;
        const scriptData = targetId ? state.scriptDataById?.[targetId] : null;
        return {
            defaultScriptId: defId,
            rootCustomGlyphs: state.customGlyphs,
            scriptCustomGlyphs: scriptData?.customGlyphs,
            scriptPuaCounter: scriptData?.puaCounter,
            storePuaCounter: state.puaCounter,
            addCustomGlyph: state.addCustomGlyph,
            incrementPuaCounter: state.incrementPuaCounter,
            scriptAlphabetGlyphs: scriptData?.alphabetGlyphs,
            storeAlphabetGlyphs: state.alphabetGlyphs,
            scriptAlphabetNames: (state.scriptSystems || []).find((s) => s.id === targetId)?.alphabetNames,
            storeAlphabetNames: state.alphabetNames,
            scriptFeaturalComponents: scriptData?.featuralComponents,
            storeFeaturalComponents: state.featuralComponents,
            updateScriptData: state.updateScriptData,
        };
    }));

    const activeScriptSystemId = useConfigStore((state) => state.activeScriptSystemId);
    const resolvedScriptId = scriptId || activeScriptSystemId || defaultScriptId;
    const isDefaultScript = !resolvedScriptId || resolvedScriptId === defaultScriptId;

    const customGlyphs = useMemo(() => {
        if (isDefaultScript) {
            if (!scriptCustomGlyphs || Object.keys(scriptCustomGlyphs).length === 0) {
                return rootCustomGlyphs || {};
            }
            return { ...(rootCustomGlyphs || {}), ...scriptCustomGlyphs };
        }
        return scriptCustomGlyphs || {};
    }, [isDefaultScript, rootCustomGlyphs, scriptCustomGlyphs]);

    const puaCounter = isDefaultScript ? (scriptPuaCounter || storePuaCounter || 57344) : (scriptPuaCounter || 57344);
    const alphabetGlyphs = isDefaultScript ? (scriptAlphabetGlyphs || storeAlphabetGlyphs) : (scriptAlphabetGlyphs || {});
    const alphabetNames = isDefaultScript ? (scriptAlphabetNames || storeAlphabetNames) : (scriptAlphabetNames || {});
    const featuralComponents = isDefaultScript ? (scriptFeaturalComponents || storeFeaturalComponents) : (scriptFeaturalComponents || {});

    const initialData = useMemo(() => extractInitialGlyphData(existingCharCode, customGlyphs), [existingCharCode, customGlyphs]);
    const initialStrokesJson = useMemo(() => JSON.stringify(initialData?.actualStrokes || []), [initialData]);

    const [historyState, dispatchHistory] = useReducer(strokeHistoryReducer, initialData, (init) => ({
        past: [],
        present: init?.actualStrokes || [],
        future: [],
    }));
    const strokes = historyState.present;
    const setStrokes = useCallback((updater) => {
        dispatchHistory({ type: 'COMMIT', updater });
    }, []);

    // Drawing & Tool State
    const [isDrawing, setIsDrawing] = useState(false);
    const dragHistoryPushedRef = useRef(false);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [brushSize, setBrushSize] = useState(6);
    const [strokeWeight, setStrokeWeight] = useState(() => initialData?.meta?.strokeWeight ?? 1.0);
    const [activeTool, setActiveTool] = useState('brush');
    const [symmetryMode, setSymmetryMode] = useState('none');
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [isSnapToMetrics, setIsSnapToMetrics] = useState(true);
    const [showGuides, setShowGuides] = useState(true);
    const [gridDivisions, setGridDivisions] = useState(15);
    const gridSize = gridDivisions > 0 ? FONT_STUDIO_CANVAS_SIZE / gridDivisions : 0;
    const [zoom, setZoom] = useState(1.0);
    const [lineCap, setLineCap] = useState('round');
    const [isFillMode, setIsFillMode] = useState(false);
    const [interactionPoints, setInteractionPoints] = useState([]);
    const [interactionStage, setInteractionStage] = useState(0);
    const [cursorPos, setCursorPos] = useState(null);

    // Style & Serif State
    const [isCalligraphy, setIsCalligraphy] = useState(() => initialData?.meta?.isCalligraphy ?? false);
    const [isBrushPen, setIsBrushPen] = useState(() => initialData?.meta?.isBrushPen ?? false);
    const [isChisel, setIsChisel] = useState(() => initialData?.meta?.isChisel ?? false);
    const [isPaintBrush, setIsPaintBrush] = useState(() => initialData?.meta?.isPaintBrush ?? false);
    const [isSerifPen, setIsSerifPen] = useState(() => initialData?.meta?.isSerifPen ?? false);
    const [serifStyle, setSerifStyle] = useState(() => initialData?.meta?.serifStyle || 'classic');
    const [serifScale, setSerifScale] = useState(1.15);
    const [serifTargetMode, setSerifTargetMode] = useState('terminals');
    const [chiselAngle, setChiselAngle] = useState(() => initialData?.meta?.chiselAngle ?? 45);

    // Inspector & Selection State
    const [inspectorTab, setInspectorTab] = useState('style');
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedStrokeIndex, setSelectedStrokeIndex] = useState(null);
    const [softNodeDrag, setSoftNodeDrag] = useState(true);
    const nodeDragStartRef = useRef(null);
    const strokeDragRef = useRef(null);

    // Metrics State
    const [glyphScale, setGlyphScale] = useState(() => initialData?.meta?.scale ?? 1.0);
    const [leftMargin, setLeftMargin] = useState(() => initialData?.meta?.leftMargin ?? 100);
    const [rightMargin, setRightMargin] = useState(() => initialData?.meta?.rightMargin ?? 100);
    const [yOffset, setYOffset] = useState(() => initialData?.meta?.yOffset ?? 0);
    const [xOffset, setXOffset] = useState(() => initialData?.meta?.xOffset ?? 0);
    const [isGlyphConsistent, setIsGlyphConsistent] = useState(() => initialData?.meta?.consistentSize);
    const [simplifyTolerance, setSimplifyTolerance] = useState(0.5);
    const [isFontExportOpen, setIsFontExportOpen] = useState(false);

    // Reference & Vectorizer State
    const [backgroundStrokes, setBackgroundStrokes] = useState([]);
    const [backgroundText, setBackgroundText] = useState('');
    const [bgOpacity, setBgOpacity] = useState(0.25);
    const [vecImageInfo, setVecImageInfo] = useState(null);
    const [vecOptions, setVecOptions] = useState({
        mode: 'centerline',
        threshold: 140,
        invert: false,
        smoothness: 1,
        simplify: 1.6,
        minArea: 5,
        fitBand: 'cap_to_base',
    });

    const rasterFileInputRef = useRef(null);
    const svgFileInputRef = useRef(null);
    const bgSvgInputRef = useRef(null);

    const scriptConsistent = useConfigStore((state) =>
        Boolean(getScriptTypographySettings(state, resolvedScriptId).consistentCharacterSize ?? true)
    );
    const fixedAdvanceWidth = useConfigStore((state) =>
        Number(getScriptTypographySettings(state, resolvedScriptId).fixedAdvanceWidth ?? 1000)
    );
    const isConsistentActive = isGlyphConsistent !== undefined ? Boolean(isGlyphConsistent) : scriptConsistent;

    const activeNibId = useMemo(() => {
        if (isCalligraphy) return 'calligraphy';
        if (isBrushPen) return 'brush';
        if (isChisel) return 'chisel';
        if (isPaintBrush) return 'paint';
        return 'sans';
    }, [isCalligraphy, isBrushPen, isChisel, isPaintBrush]);

    const activeStyleLabel = useMemo(() => {
        const nibName = NIB_STYLE_OPTIONS.find((p) => p.id === activeNibId)?.name || 'Monoline';
        if (isSerifPen && serifStyle !== 'none') {
            const serifName = SERIF_STYLES.find((s) => s.id === serifStyle)?.label || 'Serif';
            return activeNibId === 'sans' ? serifName : `${nibName} + ${serifName}`;
        }
        return nibName;
    }, [activeNibId, isSerifPen, serifStyle]);

    const drawnGlyphsOptions = useMemo(() => {
        const options = [];
        if (alphabetGlyphs) {
            Object.entries(alphabetGlyphs).forEach(([charKey, unicodeChar]) => {
                if (!unicodeChar) return;
                const charCode = unicodeChar.codePointAt(0);
                if (customGlyphs[charCode]) {
                    const name = alphabetNames?.[charKey] || charKey;
                    options.push({ label: `${name} (${charKey})`, strokes: customGlyphs[charCode], id: charCode });
                }
            });
        }
        if (featuralComponents) {
            Object.entries(featuralComponents).forEach(([comp, compStrokes]) => {
                if (compStrokes && compStrokes.length > 0) {
                    options.push({ label: `Radical: ${comp}`, strokes: compStrokes, id: `rad_${comp}` });
                }
            });
        }
        Object.entries(customGlyphs).forEach(([code, gStrokes]) => {
            if (!options.find((o) => o.id == code)) {
                options.push({ label: `Glyph ${code}`, strokes: gStrokes, id: code });
            }
        });
        return options;
    }, [alphabetGlyphs, alphabetNames, customGlyphs, featuralComponents]);

    const vecPreviewStrokes = useMemo(() => {
        if (!vecImageInfo?.imageData) return [];
        return vectorizeImageData(vecImageInfo.imageData, {
            ...vecOptions,
            lineCap,
        });
    }, [vecImageInfo, vecOptions, lineCap]);

    const startVectorizingRaster = useCallback(async (fileOrBlob) => {
        try {
            const decoded = await loadRasterImageData(fileOrBlob, 160);
            const autoThresh = computeOtsuThreshold(decoded.imageData);
            setVecImageInfo(decoded);
            setVecOptions((prev) => ({ ...prev, threshold: autoThresh }));
            setInspectorTab('vectorize');
            toast.success('Image loaded! Adjust Threshold/Mode and click Insert Vectors.');
        } catch {
            toast.error('Could not read image file.');
        }
    }, []);

    // Global clipboard paste support for images
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        e.preventDefault();
                        startVectorizingRaster(blob);
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [startVectorizingRaster]);

    const handleRasterFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (file) startVectorizingRaster(file);
        if (rasterFileInputRef.current) rasterFileInputRef.current.value = '';
    };

    const handleSvgFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imported = parseSVGToStrokes(event.target.result, { fitBand: vecOptions.fitBand || 'cap_to_base' });
            if (imported.length > 0) {
                setStrokes((prev) => [...prev, ...imported]);
                toast.success(`Imported ${imported.length} SVG contour${imported.length > 1 ? 's' : ''}!`);
            } else {
                toast.error('No vector paths found in SVG.');
            }
        };
        reader.readAsText(file);
        if (svgFileInputRef.current) svgFileInputRef.current.value = '';
    };

    const handleBgSvgFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imported = parseSVGToStrokes(event.target.result, { fitBand: 'cap_to_base' });
            if (imported.length > 0) {
                setBackgroundStrokes(imported);
                toast.success('SVG loaded as background guide.');
            }
        };
        reader.readAsText(file);
        if (bgSvgInputRef.current) bgSvgInputRef.current.value = '';
    };

    const handleInsertVectorized = () => {
        if (vecPreviewStrokes.length === 0) return;
        const prepared = vecPreviewStrokes.map((s) => cloneStrokeWithMeta(s, s));
        setStrokes((prev) => [...prev, ...prepared]);
        toast.success(`Inserted ${prepared.length} vectorized stroke${prepared.length > 1 ? 's' : ''}!`);
    };

    const handleSelectNibStyle = (nibOption) => {
        const flags = nibOption.flags;
        const nextCallig = Boolean(flags.isCalligraphy);
        const nextBrush = Boolean(flags.isBrushPen);
        const nextChisel = Boolean(flags.isChisel);
        const nextPaint = Boolean(flags.isPaintBrush);
        const nextCap = flags.lineCap || 'round';

        setIsCalligraphy(nextCallig);
        setIsBrushPen(nextBrush);
        setIsChisel(nextChisel);
        setIsPaintBrush(nextPaint);
        setChiselAngle(flags.chiselAngle ?? 45);
        setLineCap(nextCap);

        // Preserve any active serifs and refresh them to match the new nib taper/cap cleanly
        if (isSerifPen && serifStyle !== 'none') {
            setStrokes((prev) => applySerifsToStrokes(prev, {
                serifStyle,
                size: brushSize * strokeWeight,
                serifScale,
                targetMode: serifTargetMode,
                lineCap: nextCap,
                isCalligraphy: nextCallig,
                isBrushPen: nextBrush,
            }));
        }
    };

    const handleRegenerateSerifs = (styleToUse, overrides = {}) => {
        if (styleToUse === 'none') {
            setIsSerifPen(false);
            setSerifStyle('none');
            setStrokes((prev) => stripSerifParts(prev));
            return;
        }
        const nextScale = overrides.serifScale ?? serifScale;
        const nextTarget = overrides.targetMode ?? serifTargetMode;
        setIsSerifPen(true);
        setSerifStyle(styleToUse);
        setStrokes((prev) => applySerifsToStrokes(prev, {
            serifStyle: styleToUse,
            size: brushSize * strokeWeight,
            serifScale: nextScale,
            targetMode: nextTarget,
            lineCap,
            isCalligraphy,
            isBrushPen,
        }));
    };

    const handleStripSerifs = () => {
        setIsSerifPen(false);
        setSerifStyle('none');
        setStrokes((prev) => stripSerifParts(prev));
    };

    const handleApplyStyleToScript = async () => {
        const entries = Object.entries(customGlyphs || {});
        if (entries.length === 0) return;
        const nibPreset = NIB_STYLE_OPTIONS.find((p) => p.id === activeNibId) || NIB_STYLE_OPTIONS[0];
        const activeSerif = isSerifPen && serifStyle !== 'none' ? serifStyle : 'none';
        const ok = window.confirm(
            `Apply "${activeStyleLabel}" style (weight ${strokeWeight.toFixed(2)}x) to all ${entries.length} glyphs in this script and recompile your font?`
        );
        if (!ok) return;

        const updatedDb = {};
        entries.forEach(([code, entry]) => {
            updatedDb[code] = applyStylePresetToGlyphEntry(entry, nibPreset, {
                chiselAngle,
                strokeWeight,
                isSerifPen: activeSerif !== 'none',
                serifStyle: activeSerif,
                serifBrushSize: brushSize,
                serifScale,
                serifTargetMode,
            });
        });

        const scriptTypo = getScriptTypographySettings(useConfigStore.getState(), resolvedScriptId);
        const base64Font = await compileFont(
            updatedDb,
            scriptTypo.traceWidth ?? 30,
            scriptTypo.customFontScale ?? 1.0,
            {
                consistentCharacterSize: isConsistentActive,
                fixedAdvanceWidth,
            }
        );

        updateScriptData(resolvedScriptId, {
            customGlyphs: updatedDb,
            ...(base64Font ? { customFontBase64: base64Font, customFont: base64Font } : {}),
            compiledSignature: buildFontCompileSignature(updatedDb, scriptTypo),
        });
        useConfigStore.setState({ lastGlyphUpdate: Date.now() });

        // Also update the active canvas to stay in sync if editing an existing char
        if (existingCharCode != null && updatedDb[existingCharCode]) {
            const refreshed = extractInitialGlyphData(existingCharCode, updatedDb);
            if (refreshed) {
                setStrokes(refreshed.actualStrokes);
            }
        }

        toast.success(`Styled & recompiled ${entries.length} glyphs with ${activeStyleLabel}!`);
    };

    const handleInsertStamp = (stamp) => {
        const stamped = instantiateStampStrokes(stamp, { lineCap, isFilled: isFillMode });
        setStrokes((prev) => [...prev, ...stamped]);
    };

    const handleInsertGlyphStrokes = (opt) => {
        const valid = (opt.strokes || [])
            .filter((s) => Array.isArray(s) && !isLegacySentinelStroke(s))
            .map((s) => cloneStrokeWithMeta(s, s));
        if (valid.length > 0) {
            setStrokes((prev) => [...prev, ...valid]);
            toast.success(`Added strokes from ${opt.label}`);
        }
    };

    const handleSetGlyphBackground = (opt) => {
        const valid = (opt.strokes || [])
            .filter((s) => Array.isArray(s) && !isLegacySentinelStroke(s))
            .map((s) => cloneStrokeWithMeta(s, s));
        setBackgroundStrokes(valid);
        toast(`Tracing background set to ${opt.label}`);
    };

    // Selection scope helper: returns Set of selected stroke index, or null for whole glyph
    const selectedScope = useMemo(
        () => (selectedStrokeIndex != null ? new Set([selectedStrokeIndex]) : null),
        [selectedStrokeIndex]
    );

    const getTransformCenter = (prevStrokes) => {
        if (selectedStrokeIndex !== null && Array.isArray(prevStrokes[selectedStrokeIndex])) {
            const s = prevStrokes[selectedStrokeIndex];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            s.forEach((p) => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            if (Number.isFinite(minX)) return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
        }
        return { cx: 150, cy: 150 };
    };

    const handleRotate = (deg = 90) => {
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        setStrokes((prev) => {
            const { cx, cy } = getTransformCenter(prev);
            return prev.map((stroke, idx) => {
                if (selectedStrokeIndex !== null && idx !== selectedStrokeIndex) return stroke;
                if (!Array.isArray(stroke) || isLegacySentinelStroke(stroke)) return stroke;
                const rotated = stroke.map((pt) => {
                    const dx = pt.x - cx;
                    const dy = pt.y - cy;
                    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
                });
                return cloneStrokeWithMeta(rotated, stroke);
            });
        });
    };

    const handleScaleStrokes = (factor) => {
        setStrokes((prev) => {
            const { cx, cy } = getTransformCenter(prev);
            return prev.map((stroke, idx) => {
                if (selectedStrokeIndex !== null && idx !== selectedStrokeIndex) return stroke;
                if (!Array.isArray(stroke) || isLegacySentinelStroke(stroke)) return stroke;
                const scaled = stroke.map((pt) => ({
                    x: cx + (pt.x - cx) * factor,
                    y: cy + (pt.y - cy) * factor,
                }));
                return cloneStrokeWithMeta(scaled, stroke);
            });
        });
    };

    const handleMove = (dx, dy) => {
        setStrokes((prev) => translateStrokes(prev, dx, dy, selectedScope));
    };

    const handleFlip = (axis) => {
        setStrokes((prev) => flipStrokes(prev, axis, selectedScope));
    };

    const handleDuplicateSelected = useCallback(() => {
        if (selectedStrokeIndex == null || !Array.isArray(strokes[selectedStrokeIndex])) return;
        const copy = cloneStrokeWithMeta(
            strokes[selectedStrokeIndex].map((p) => ({ x: Math.min(295, p.x + 14), y: Math.min(295, p.y + 14) })),
            strokes[selectedStrokeIndex]
        );
        setStrokes((prev) => [...prev, copy]);
        setSelectedStrokeIndex(strokes.length);
    }, [selectedStrokeIndex, strokes, setStrokes]);

    const handleToggleSelectedFill = () => {
        if (selectedStrokeIndex == null) return;
        setStrokes((prev) => prev.map((s, idx) => {
            if (idx !== selectedStrokeIndex || !Array.isArray(s)) return s;
            const copy = cloneStrokeWithMeta(s, s);
            copy.isFilled = !copy.isFilled;
            return copy;
        }));
    };

    const handleReverseSelected = () => {
        if (selectedStrokeIndex == null) return;
        setStrokes((prev) => reverseStrokesDirection(prev, selectedScope));
    };

    // Redraw canvas whenever drawing/style/selection changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(2, 2);

        const txColor = getComputedStyle(document.documentElement).getPropertyValue('--tx').trim() || '#0f172a';
        const tx2Color = getComputedStyle(document.documentElement).getPropertyValue('--tx2').trim() || '#64748b';
        const accColor = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#3b82f6';

        ctx.save();
        ctx.translate(150, 150);
        ctx.scale(zoom, zoom);
        ctx.translate(-150, -150);

        // Symmetry guide axis
        if (symmetryMode !== 'none') {
            ctx.save();
            ctx.strokeStyle = accColor;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            if (symmetryMode === 'horizontal') {
                ctx.moveTo(150, 0);
                ctx.lineTo(150, 300);
            } else {
                ctx.moveTo(0, 150);
                ctx.lineTo(300, 150);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Background vector tracing guide
        if (backgroundStrokes.length > 0) {
            ctx.save();
            ctx.strokeStyle = tx2Color;
            ctx.fillStyle = tx2Color;
            ctx.globalAlpha = bgOpacity;
            backgroundStrokes.forEach((s) => renderStrokeOnCanvas(ctx, s, {
                brushSize,
                strokeWeight,
                lineCap: 'round',
                isCalligraphy: false,
                isBrushPen: false,
                isPaintBrush: false,
                isChisel: false,
                chiselAngle: 45,
            }));
            ctx.restore();
        }

        // Background text tracing guide (centered cleanly across Cap->Base)
        if (backgroundText) {
            ctx.save();
            ctx.font = '195px serif';
            ctx.fillStyle = tx2Color;
            ctx.globalAlpha = Math.max(0.08, bgOpacity * 0.75);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(backgroundText, 150, 162);
            ctx.restore();
        }

        // Main strokes
        ctx.strokeStyle = txColor;
        ctx.fillStyle = txColor;
        const renderDefaults = {
            brushSize,
            strokeWeight,
            lineCap,
            isCalligraphy,
            isBrushPen,
            isPaintBrush,
            isChisel,
            chiselAngle,
        };
        strokes.forEach((stroke) => renderStrokeOnCanvas(ctx, stroke, renderDefaults));

        // Selected whole stroke highlight
        if (selectedStrokeIndex != null && Array.isArray(strokes[selectedStrokeIndex])) {
            const sel = strokes[selectedStrokeIndex];
            ctx.save();
            ctx.strokeStyle = accColor;
            ctx.fillStyle = accColor;
            ctx.globalAlpha = 0.85;
            if (sel.length >= 2) {
                ctx.lineWidth = Math.max(4, brushSize * strokeWeight + 4);
                ctx.beginPath();
                ctx.moveTo(sel[0].x, sel[0].y);
                for (let i = 1; i < sel.length; i++) ctx.lineTo(sel[i].x, sel[i].y);
                if (sel.isFilled) { ctx.closePath(); ctx.fill(); } else { ctx.stroke(); }
            } else if (sel.length === 1) {
                ctx.beginPath();
                ctx.arc(sel[0].x, sel[0].y, Math.max(5, brushSize * strokeWeight), 0, Math.PI * 2);
                ctx.fill();
            }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            sel.forEach((pt) => {
                minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
            });
            const pad = 8;
            ctx.globalAlpha = 1;
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
            ctx.restore();
        }

        // In-progress stroke preview
        if (currentStroke.length >= 2) {
            ctx.save();
            ctx.strokeStyle = tx2Color;
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
            ctx.stroke();
            ctx.restore();
        }

        // Curve stage 2 visual Bezier control handles
        if (activeTool === 'curve' && interactionStage === 2 && interactionPoints.length === 2) {
            const [p0, p2] = interactionPoints;
            const ctrl = cursorPos || { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
            ctx.save();
            ctx.strokeStyle = accColor;
            ctx.globalAlpha = 0.65;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(ctrl.x, ctrl.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            [p0, p2, ctrl].forEach((pt, idx) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, idx === 2 ? 5 : 4, 0, Math.PI * 2);
                ctx.fillStyle = idx === 2 ? '#f59e0b' : accColor;
                ctx.fill();
            });
            ctx.restore();
        }

        // Node edit handles
        if (activeTool === 'node_edit') {
            strokes.forEach((stroke, sIdx) => {
                if (!Array.isArray(stroke) || stroke.isMeta || stroke.length === 0) return;
                ctx.save();
                ctx.strokeStyle = accColor;
                ctx.globalAlpha = 0.6;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
                ctx.stroke();
                ctx.restore();

                const isDense = stroke.length > 14;
                stroke.forEach((pt, pIdx) => {
                    const isSelected = selectedNode && selectedNode.strokeIndex === sIdx && selectedNode.pointIndex === pIdx;
                    const isEndpoint = pIdx === 0 || pIdx === stroke.length - 1;
                    const radius = isSelected ? 5.5 : (isEndpoint ? 4.5 : (isDense ? 2.5 : 3.5));
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                    if (isSelected) {
                        ctx.fillStyle = '#ef4444';
                        ctx.fill();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = '#ffffff';
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = isEndpoint ? accColor : '#ffffff';
                        ctx.fill();
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = accColor;
                        ctx.stroke();
                    }
                });
            });
        }

        ctx.restore();
        ctx.restore();
    }, [
        strokes, currentStroke, brushSize, strokeWeight, lineCap,
        isCalligraphy, isBrushPen, isChisel, chiselAngle, isPaintBrush, isSerifPen,
        backgroundStrokes, backgroundText, bgOpacity, zoom, activeTool,
        selectedNode, selectedStrokeIndex, symmetryMode, interactionStage, interactionPoints, cursorPos,
    ]);

    const getCoords = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const scale = FONT_STUDIO_CANVAS_SIZE / rect.width;
        let x = (e.clientX - rect.left) * scale;
        let y = (e.clientY - rect.top) * scale;
        x = (x - 150) / zoom + 150;
        y = (y - 150) / zoom + 150;
        return snapPointToTypographyGuides(
            { x, y },
            { snapToGrid: isSnapToGrid, gridSize, snapToMetrics: isSnapToMetrics }
        );
    };

    const getMirroredStroke = (stroke, mode) => {
        if (mode === 'none') return null;
        const pts = stroke.map((pt) => ({
            x: mode === 'horizontal' ? FONT_STUDIO_CANVAS_SIZE - pt.x : pt.x,
            y: mode === 'vertical' ? FONT_STUDIO_CANVAS_SIZE - pt.y : pt.y,
        }));
        return cloneStrokeWithMeta(pts, stroke);
    };

    const splitStrokes = (strokesToFilter, isInsideFn) => {
        const newStrokes = [];
        strokesToFilter.forEach((strokeObj) => {
            const points = Array.isArray(strokeObj) ? strokeObj : (strokeObj.points || []);
            if (points.length === 0 || isLegacySentinelStroke(strokeObj)) {
                if (isLegacySentinelStroke(strokeObj)) newStrokes.push(strokeObj);
                return;
            }
            const densePoints = [points[0]];
            for (let i = 1; i < points.length; i++) {
                const p1 = points[i - 1];
                const p2 = points[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
                for (let j = 1; j <= steps; j++) {
                    densePoints.push({ x: p1.x + (dx * j) / steps, y: p1.y + (dy * j) / steps });
                }
            }
            let chunk = [];
            for (let i = 0; i < densePoints.length; i++) {
                const pt = densePoints[i];
                if (!isInsideFn(pt)) {
                    chunk.push(pt);
                } else if (chunk.length > 0) {
                    newStrokes.push(cloneStrokeWithMeta(chunk, strokeObj));
                    chunk = [];
                }
            }
            if (chunk.length > 0) {
                newStrokes.push(cloneStrokeWithMeta(chunk, strokeObj));
            }
        });
        return newStrokes;
    };

    const eraseStrokesAt = (coords) => {
        if (!dragHistoryPushedRef.current) {
            dragHistoryPushedRef.current = true;
            dispatchHistory({ type: 'PUSH_SNAPSHOT' });
        }
        dispatchHistory({
            type: 'SET_DIRECT',
            updater: (prev) => splitStrokes(prev, (pt) => Math.hypot(pt.x - coords.x, pt.y - coords.y) < (brushSize + 9)),
        });
    };

    const commitStrokeWithStyleAndMirror = (rawPoints) => {
        if (!rawPoints || rawPoints.length === 0) return;
        const finalStroke = cloneStrokeWithMeta(rawPoints);
        finalStroke.lineCap = lineCap;
        finalStroke.isFilled = isFillMode;

        const batch = [finalStroke];
        if (isSerifPen && serifStyle !== 'none' && !isFillMode && finalStroke.length >= 2) {
            const withSerifs = applySerifsToStrokes([finalStroke], {
                serifStyle,
                size: brushSize * strokeWeight,
                serifScale,
                targetMode: serifTargetMode,
                lineCap,
                isCalligraphy,
                isBrushPen,
            });
            batch.length = 0;
            batch.push(...withSerifs);
        }

        const all = [];
        batch.forEach((s) => {
            all.push(s);
            const mirrored = getMirroredStroke(s, symmetryMode);
            if (mirrored) all.push(mirrored);
        });

        setStrokes((prev) => [...prev, ...all]);
    };

    const handleCanvasDoubleClick = (e) => {
        if (activeTool !== 'node_edit') return;
        const coords = getCoords(e);
        let best = null;
        let bestDist = 12;
        strokes.forEach((stroke, sIdx) => {
            if (!Array.isArray(stroke) || stroke.length < 2) return;
            for (let i = 0; i < stroke.length - 1; i++) {
                const d = distToSegment(coords, stroke[i], stroke[i + 1]);
                if (d < bestDist) {
                    bestDist = d;
                    best = { sIdx, afterIdx: i, pt: projectToSegment(coords, stroke[i], stroke[i + 1]) };
                }
            }
        });
        if (best) {
            setStrokes((prev) => prev.map((stroke, idx) => {
                if (idx !== best.sIdx) return stroke;
                const updated = [...stroke];
                updated.splice(best.afterIdx + 1, 0, best.pt);
                return cloneStrokeWithMeta(updated, stroke);
            }));
            setSelectedNode({ strokeIndex: best.sIdx, pointIndex: best.afterIdx + 1 });
        }
    };

    const handlePointerDown = (e) => {
        const coords = getCoords(e);
        setCursorPos(coords);

        if (activeTool === 'select') {
            let bestIdx = null;
            let bestDist = Infinity;
            strokes.forEach((s, idx) => {
                if (!Array.isArray(s) || s.isMeta) return;
                if (s.length === 1) {
                    const d = Math.hypot(s[0].x - coords.x, s[0].y - coords.y);
                    if (d < bestDist) { bestDist = d; bestIdx = idx; }
                    return;
                }
                for (let i = 0; i < s.length - 1; i++) {
                    const d = distToSegment(coords, s[i], s[i + 1]);
                    if (d < bestDist) { bestDist = d; bestIdx = idx; }
                }
            });
            const threshold = Math.max(12, brushSize + 8);
            const picked = bestDist <= threshold ? bestIdx : null;
            setSelectedStrokeIndex(picked);
            if (picked != null && Array.isArray(strokes[picked])) {
                dragHistoryPushedRef.current = false;
                strokeDragRef.current = {
                    strokeIndex: picked,
                    startX: coords.x,
                    startY: coords.y,
                    originalStroke: cloneStrokeWithMeta(strokes[picked], strokes[picked]),
                };
                setIsDrawing(true);
            }
            return;
        }

        if (activeTool === 'node_edit') {
            let foundNode = null;
            for (let sIdx = strokes.length - 1; sIdx >= 0; sIdx--) {
                const stroke = strokes[sIdx];
                if (!Array.isArray(stroke) || stroke.isMeta) continue;
                for (let pIdx = stroke.length - 1; pIdx >= 0; pIdx--) {
                    if (Math.hypot(stroke[pIdx].x - coords.x, stroke[pIdx].y - coords.y) < 10) {
                        foundNode = { strokeIndex: sIdx, pointIndex: pIdx };
                        break;
                    }
                }
                if (foundNode) break;
            }
            if (foundNode) {
                dragHistoryPushedRef.current = false;
                setSelectedNode(foundNode);
                nodeDragStartRef.current = {
                    ...foundNode,
                    startX: coords.x,
                    startY: coords.y,
                    originalStroke: cloneStrokeWithMeta(strokes[foundNode.strokeIndex], strokes[foundNode.strokeIndex]),
                };
                setIsDrawing(true);
            } else {
                nodeDragStartRef.current = null;
                setSelectedNode(null);
            }
        } else if (activeTool === 'brush') {
            setIsDrawing(true);
            setCurrentStroke([coords]);
        } else if (activeTool === 'line') {
            setIsDrawing(true);
            setInteractionPoints([coords]);
        } else if (activeTool === 'curve') {
            if (interactionStage === 0) {
                setInteractionStage(1);
                setInteractionPoints([coords]);
                setIsDrawing(true);
            } else if (interactionStage === 2) {
                const [p0, p2] = interactionPoints;
                commitStrokeWithStyleAndMirror(generateQuadraticCurvePoints(p0, coords, p2, 22));
                setInteractionStage(0);
                setInteractionPoints([]);
                setCurrentStroke([]);
            }
        } else if (activeTool === 'eraser') {
            dragHistoryPushedRef.current = false;
            setIsDrawing(true);
            eraseStrokesAt(coords);
        } else if (['rect', 'circle', 'triangle', 'arc_half', 'arc_three_quarter', 'arc_quarter', 'diamond', 'select_erase'].includes(activeTool)) {
            setIsDrawing(true);
            setInteractionPoints([coords]);
        }
    };

    const handlePointerMove = (e) => {
        const coords = getCoords(e);
        setCursorPos(coords);

        if (activeTool === 'select' && isDrawing && strokeDragRef.current) {
            const drag = strokeDragRef.current;
            const dx = coords.x - drag.startX;
            const dy = coords.y - drag.startY;
            if (Math.hypot(dx, dy) < 0.5) return;
            if (!dragHistoryPushedRef.current) {
                dragHistoryPushedRef.current = true;
                dispatchHistory({ type: 'PUSH_SNAPSHOT' });
            }
            dispatchHistory({
                type: 'SET_DIRECT',
                updater: (prev) => prev.map((s, idx) => {
                    if (idx !== drag.strokeIndex) return s;
                    const shifted = drag.originalStroke.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
                    return cloneStrokeWithMeta(shifted, drag.originalStroke);
                }),
            });
            return;
        }

        if (activeTool === 'node_edit' && isDrawing && selectedNode) {
            if (!dragHistoryPushedRef.current) {
                dragHistoryPushedRef.current = true;
                dispatchHistory({ type: 'PUSH_SNAPSHOT' });
            }
            const dragInfo = nodeDragStartRef.current;
            dispatchHistory({
                type: 'SET_DIRECT',
                updater: (prev) => {
                    const newStrokes = [...prev];
                    const orig = dragInfo?.originalStroke;
                    if (!orig || orig.length === 0) return prev;
                    const dx = coords.x - dragInfo.startX;
                    const dy = coords.y - dragInfo.startY;
                    const pIdx = selectedNode.pointIndex;
                    const useSoft = softNodeDrag && !e.shiftKey && orig.length > 3;
                    const radius = useSoft ? Math.min(5, Math.max(2, Math.floor(orig.length / 4))) : 0;

                    const updated = orig.map((pt, idx) => {
                        const dist = Math.abs(idx - pIdx);
                        if (dist === 0) return { x: coords.x, y: coords.y };
                        if (useSoft && dist <= radius) {
                            const weight = 0.5 * (1 + Math.cos((Math.PI * dist) / (radius + 1)));
                            return { x: pt.x + dx * weight, y: pt.y + dy * weight };
                        }
                        return pt;
                    });
                    newStrokes[selectedNode.strokeIndex] = cloneStrokeWithMeta(updated, newStrokes[selectedNode.strokeIndex]);
                    return newStrokes;
                },
            });
        } else if (activeTool === 'brush' && isDrawing) {
            setCurrentStroke((prev) => {
                const last = prev[prev.length - 1];
                if (last && Math.hypot(coords.x - last.x, coords.y - last.y) < 1.2) return prev;
                return [...prev, coords];
            });
        } else if (activeTool === 'line' && isDrawing) {
            setCurrentStroke([interactionPoints[0], coords]);
        } else if (activeTool === 'curve') {
            if (interactionStage === 1) {
                setCurrentStroke([interactionPoints[0], coords]);
            } else if (interactionStage === 2 && interactionPoints.length === 2) {
                setCurrentStroke(generateQuadraticCurvePoints(interactionPoints[0], coords, interactionPoints[1], 22));
            }
        } else if (activeTool === 'eraser' && isDrawing) {
            eraseStrokesAt(coords);
        } else if (activeTool === 'rect' && isDrawing) {
            const p0 = interactionPoints[0];
            let p1 = coords;
            if (e.shiftKey) {
                const s = Math.max(Math.abs(coords.x - p0.x), Math.abs(coords.y - p0.y));
                p1 = { x: p0.x + Math.sign(coords.x - p0.x || 1) * s, y: p0.y + Math.sign(coords.y - p0.y || 1) * s };
            }
            setCurrentStroke([p0, { x: p1.x, y: p0.y }, p1, { x: p0.x, y: p1.y }, p0]);
        } else if (activeTool === 'circle' && isDrawing) {
            const p0 = interactionPoints[0];
            const r = Math.hypot(coords.x - p0.x, coords.y - p0.y);
            setCurrentStroke(Array.from({ length: 37 }, (_, i) => {
                const a = (i / 36) * Math.PI * 2;
                return { x: p0.x + Math.cos(a) * r, y: p0.y + Math.sin(a) * r };
            }));
        } else if (activeTool === 'triangle' && isDrawing) {
            const p0 = interactionPoints[0];
            const minX = Math.min(p0.x, coords.x);
            const maxX = Math.max(p0.x, coords.x);
            const minY = Math.min(p0.y, coords.y);
            const maxY = Math.max(p0.y, coords.y);
            const midX = (minX + maxX) / 2;
            setCurrentStroke([{ x: midX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }, { x: midX, y: minY }]);
        } else if (['arc_half', 'arc_three_quarter', 'arc_quarter'].includes(activeTool) && isDrawing) {
            const p0 = interactionPoints[0];
            const dx = coords.x - p0.x;
            const dy = coords.y - p0.y;
            const r = Math.hypot(dx, dy);
            const startAngle = Math.atan2(dy, dx);
            const span = activeTool === 'arc_half' ? Math.PI : activeTool === 'arc_three_quarter' ? Math.PI * 1.5 : Math.PI * 0.5;
            const steps = activeTool === 'arc_quarter' ? 14 : activeTool === 'arc_half' ? 20 : 28;
            setCurrentStroke(Array.from({ length: steps + 1 }, (_, i) => {
                const a = startAngle + (i / steps) * span;
                return { x: p0.x + Math.cos(a) * r, y: p0.y + Math.sin(a) * r };
            }));
        } else if (activeTool === 'diamond' && isDrawing) {
            const p0 = interactionPoints[0];
            const minX = Math.min(p0.x, coords.x);
            const maxX = Math.max(p0.x, coords.x);
            const minY = Math.min(p0.y, coords.y);
            const maxY = Math.max(p0.y, coords.y);
            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;
            setCurrentStroke([{ x: midX, y: minY }, { x: maxX, y: midY }, { x: midX, y: maxY }, { x: minX, y: midY }, { x: midX, y: minY }]);
        } else if (activeTool === 'select_erase' && isDrawing) {
            const p0 = interactionPoints[0];
            setCurrentStroke([p0, { x: coords.x, y: p0.y }, coords, { x: p0.x, y: coords.y }, p0]);
        }
    };

    const simplifyFreehand = (stroke) => {
        if (!stroke || stroke.length <= 2) return stroke;
        const out = [stroke[0]];
        let lastPt = stroke[0];
        for (let i = 1; i < stroke.length - 1; i++) {
            if (Math.hypot(stroke[i].x - lastPt.x, stroke[i].y - lastPt.y) > 4.5) {
                out.push(stroke[i]);
                lastPt = stroke[i];
            }
        }
        out.push(stroke[stroke.length - 1]);
        return out;
    };

    const handlePointerUp = () => {
        if (activeTool === 'select' && isDrawing) {
            setIsDrawing(false);
            strokeDragRef.current = null;
            return;
        }
        if (activeTool === 'node_edit' && isDrawing) {
            setIsDrawing(false);
            return;
        }
        if (activeTool === 'brush' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length > 0) {
                commitStrokeWithStyleAndMirror(simplifyFreehand(currentStroke));
            }
            setCurrentStroke([]);
        } else if (activeTool === 'line' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length >= 2) commitStrokeWithStyleAndMirror(currentStroke);
            setCurrentStroke([]);
            setInteractionPoints([]);
        } else if (activeTool === 'eraser' && isDrawing) {
            setIsDrawing(false);
            setCurrentStroke([]);
        } else if (['rect', 'circle', 'triangle', 'arc_half', 'arc_three_quarter', 'arc_quarter', 'diamond'].includes(activeTool) && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length > 0) {
                const s = cloneStrokeWithMeta(currentStroke);
                s.lineCap = lineCap;
                s.isFilled = isFillMode;
                const mirror = getMirroredStroke(s, symmetryMode);
                setStrokes((prev) => (mirror ? [...prev, s, mirror] : [...prev, s]));
            }
            setCurrentStroke([]);
            setInteractionPoints([]);
        } else if (activeTool === 'select_erase' && isDrawing) {
            setIsDrawing(false);
            if (currentStroke.length >= 3) {
                const p0 = interactionPoints[0];
                const p1 = currentStroke[2];
                const minX = Math.min(p0.x, p1.x);
                const maxX = Math.max(p0.x, p1.x);
                const minY = Math.min(p0.y, p1.y);
                const maxY = Math.max(p0.y, p1.y);
                setStrokes((prev) => splitStrokes(prev, (pt) => pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY));
            }
            setCurrentStroke([]);
            setInteractionPoints([]);
        } else if (activeTool === 'curve' && interactionStage === 1) {
            setIsDrawing(false);
            const endPoint = currentStroke[1] || interactionPoints[0];
            if (Math.hypot(endPoint.x - interactionPoints[0].x, endPoint.y - interactionPoints[0].y) >= 2) {
                setInteractionPoints((prev) => [prev[0], endPoint]);
                setInteractionStage(2);
            } else {
                setInteractionStage(0);
                setInteractionPoints([]);
                setCurrentStroke([]);
            }
        }
    };

    const handleUndo = () => {
        dispatchHistory({ type: 'UNDO' });
        setSelectedNode(null);
        setSelectedStrokeIndex(null);
    };

    const handleRedo = () => {
        dispatchHistory({ type: 'REDO' });
        setSelectedNode(null);
        setSelectedStrokeIndex(null);
    };

    useEffect(() => {
        const onKeyDown = (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                dispatchHistory({ type: e.shiftKey ? 'REDO' : 'UNDO' });
                setSelectedNode(null);
                setSelectedStrokeIndex(null);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                dispatchHistory({ type: 'REDO' });
                setSelectedNode(null);
                setSelectedStrokeIndex(null);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleDuplicateSelected();
                return;
            }
            if (e.key === 'Escape' && interactionStage > 0) {
                setInteractionStage(0);
                setInteractionPoints([]);
                setCurrentStroke([]);
                setIsDrawing(false);
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStrokeIndex != null) {
                e.preventDefault();
                setStrokes((prev) => prev.filter((_, i) => i !== selectedStrokeIndex));
                setSelectedStrokeIndex(null);
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const k = e.key.toLowerCase();
            if (k === 'b') setActiveTool('brush');
            else if (k === 'v') setActiveTool('node_edit');
            else if (k === 's') setActiveTool('select');
            else if (k === 'l') setActiveTool('line');
            else if (k === 'c') setActiveTool('curve');
            else if (k === 'e') setActiveTool('eraser');
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleDuplicateSelected, interactionStage, selectedStrokeIndex, setStrokes]);

    const handleDeleteSelectedNode = () => {
        if (!selectedNode) return;
        setStrokes((prev) => prev
            .map((stroke, sIdx) => (sIdx !== selectedNode.strokeIndex
                ? stroke
                : cloneStrokeWithMeta(stroke.filter((_, pIdx) => pIdx !== selectedNode.pointIndex), stroke)))
            .filter((s) => s.length >= 2));
        setSelectedNode(null);
    };

    const handleSmoothNode = () => {
        if (!selectedNode) return;
        setStrokes((prev) => prev.map((stroke, sIdx) => {
            if (sIdx !== selectedNode.strokeIndex) return stroke;
            const pIdx = selectedNode.pointIndex;
            if (pIdx === 0 || pIdx === stroke.length - 1) return stroke;
            const A = stroke[pIdx - 1];
            const B = stroke[pIdx];
            const C = stroke[pIdx + 1];
            const curvePts = generateQuadraticCurvePoints(A, B, C, 6).slice(1, -1);
            const next = [...stroke];
            next.splice(pIdx, 1, ...curvePts);
            return cloneStrokeWithMeta(next, stroke);
        }));
        setSelectedNode(null);
    };

    const handleAddNodeAfter = () => {
        if (!selectedNode) return;
        setStrokes((prev) => prev.map((stroke, sIdx) => {
            if (sIdx !== selectedNode.strokeIndex) return stroke;
            const pIdx = selectedNode.pointIndex;
            if (pIdx === stroke.length - 1) return stroke;
            const mid = { x: (stroke[pIdx].x + stroke[pIdx + 1].x) / 2, y: (stroke[pIdx].y + stroke[pIdx + 1].y) / 2 };
            const next = [...stroke];
            next.splice(pIdx + 1, 0, mid);
            return cloneStrokeWithMeta(next, stroke);
        }));
        setSelectedNode({ strokeIndex: selectedNode.strokeIndex, pointIndex: selectedNode.pointIndex + 1 });
    };

    const handleClear = () => {
        if (strokes.length > 0 && !window.confirm('Clear all strokes from the canvas? (Undo still restores it until saved.)')) {
            return;
        }
        setStrokes([]);
        setCurrentStroke([]);
        setSelectedNode(null);
        setSelectedStrokeIndex(null);
    };

    const handleCancel = () => {
        if (JSON.stringify(strokes) !== initialStrokesJson) {
            if (!window.confirm('Discard unsaved drawing changes?')) return;
        }
        onCancel();
    };

    const handleSimplifyStrokes = () => {
        const beforePts = countGlyphPoints(strokes);
        const withMeta = [{
            isMeta: true,
            scale: glyphScale,
            leftMargin,
            rightMargin,
            yOffset,
            xOffset,
            consistentSize: isGlyphConsistent,
            isCalligraphy,
            isBrushPen,
            isChisel,
            isPaintBrush,
            isSerifPen,
            serifStyle,
            chiselAngle,
            strokeWeight,
        }, ...strokes];
        const simplified = simplifyGlyph(withMeta, { tolerance: simplifyTolerance, precision: 2 });
        const afterStrokes = simplified.filter((entry) => Array.isArray(entry));
        const afterPts = countGlyphPoints(afterStrokes);
        setStrokes(afterStrokes);
        if (beforePts > afterPts) {
            toast.success(`Simplified: ${beforePts} -> ${afterPts} pts (${Math.round((1 - afterPts / beforePts) * 100)}% lighter)`);
        } else {
            toast('Glyph geometry is already optimal at this tolerance.');
        }
    };

    const canvasPointCount = useMemo(() => countGlyphPoints(strokes), [strokes]);

    const handleSave = async () => {
        if (strokes.length === 0) return toast.error('Draw or insert a glyph before saving.');

        let charCode;
        if (existingCharCode != null) {
            charCode = typeof existingCharCode === 'number' ? existingCharCode : parseInt(existingCharCode, 10);
        } else {
            charCode = puaCounter;
            incrementPuaCounter(resolvedScriptId);
        }

        const metaObj = {
            isMeta: true,
            scale: glyphScale,
            leftMargin,
            rightMargin,
            yOffset,
            xOffset,
            consistentSize: isGlyphConsistent,
            isCalligraphy,
            isBrushPen,
            isChisel,
            isPaintBrush,
            isSerifPen,
            serifStyle: isSerifPen ? serifStyle : 'none',
            chiselAngle,
            ...(Math.abs(strokeWeight - 1.0) > 0.01 ? { strokeWeight } : {}),
        };

        const strokesToSave = [metaObj, ...strokes];
        const updatedGlyphDb = { ...customGlyphs, [charCode]: strokesToSave };

        const scriptTypo = getScriptTypographySettings(useConfigStore.getState(), resolvedScriptId);
        const base64Font = await compileFont(
            updatedGlyphDb,
            scriptTypo.traceWidth ?? 30,
            scriptTypo.customFontScale ?? 1.0,
            {
                consistentCharacterSize: isConsistentActive,
                fixedAdvanceWidth,
            }
        );

        if (base64Font) {
            addCustomGlyph(charCode, strokesToSave, base64Font, resolvedScriptId);
            updateScriptData(resolvedScriptId, {
                compiledSignature: buildFontCompileSignature(updatedGlyphDb, scriptTypo),
            });
            onSave(String.fromCodePoint(charCode), strokesToSave);
        }
    };

    // Sample existing script glyphs to preview alongside the live glyph
    const sampleScriptChars = useMemo(() => {
        return Object.values(alphabetGlyphs || {})
            .filter((ch) => typeof ch === 'string' && ch.length > 0)
            .slice(0, 6);
    }, [alphabetGlyphs]);

    return (
        <div className="fs-container">
            <div className="fs-header">
                <div className="fs-header-row">
                    <div style={{ textAlign: 'left' }}>
                        <h3 className="fs-title">
                            Font Studio: <span className={`custom-font-text ${resolvedScriptId ? `conlang-script-${resolvedScriptId}` : ''}`}>{targetLabel}</span>
                        </h3>
                        <p className="fs-subtitle">
                            {activeTool === 'curve' && interactionStage === 2
                                ? 'Step 2: Move cursor to bend curve, click to finish (Esc cancels).'
                                : activeTool === 'select'
                                    ? 'Click any stroke & drag to move it, or press Ctrl+D to duplicate / Del to remove.'
                                    : activeTool === 'node_edit'
                                        ? 'Drag handles to sculpt (Shift = pinpoint). Double-click a segment to add a node.'
                                        : 'Draw, stamp parts, apply serifs/styles, or trace an image (Ctrl+V pastes image).'}
                        </p>
                    </div>
                    <div className="fs-header-badges">
                        <span className="fs-simplify-count">{canvasPointCount.toLocaleString()} pts</span>
                        <span className="fs-style-badge">
                            {activeStyleLabel}
                        </span>
                    </div>
                </div>
            </div>

            <div className="fs-studio-grid">
                {/* Left Vertical Tool Rail */}
                <div className="fs-tool-rail" aria-label="Drawing Tools">
                    {[
                        { id: 'brush', title: 'Brush (B)', icon: Pencil },
                        { id: 'node_edit', title: 'Vector Nodes (V)', icon: MousePointer },
                        { id: 'select', title: 'Select & Drag Stroke (S)', icon: Pointer },
                        { id: 'line', title: 'Straight Line (L)', icon: Minus },
                        { id: 'curve', title: 'Bezier Curve (C)', icon: Spline },
                        { id: 'rect', title: 'Rectangle (Shift=Square)', icon: Square },
                        { id: 'circle', title: 'Circle', icon: Circle },
                        { id: 'triangle', title: 'Triangle', icon: Triangle },
                    ].map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <button
                                key={tool.id}
                                type="button"
                                className={`fs-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                                onClick={() => { setActiveTool(tool.id); setInteractionStage(0); }}
                                title={tool.title}
                            >
                                <Icon size={17} />
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'diamond' ? 'active' : ''}`}
                        onClick={() => setActiveTool('diamond')}
                        title="Diamond / Rhombus"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                            <polygon points="12,3 21,12 12,21 3,12" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'arc_half' ? 'active' : ''}`}
                        onClick={() => setActiveTool('arc_half')}
                        title="Half Circle (180° Arc)"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M4 15 A8 8 0 0 1 20 15" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'arc_three_quarter' ? 'active' : ''}`}
                        onClick={() => setActiveTool('arc_three_quarter')}
                        title="3/4 Circle (270° Arc)"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 4 A8 8 0 1 0 20 12" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'arc_quarter' ? 'active' : ''}`}
                        onClick={() => setActiveTool('arc_quarter')}
                        title="Quarter Arc (90° Curve)"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 18 A12 12 0 0 1 18 6" />
                        </svg>
                    </button>

                    <div className="fs-tool-separator horizontal" />

                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setActiveTool('eraser')}
                        title="Eraser (E)"
                    >
                        <Eraser size={17} />
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${activeTool === 'select_erase' ? 'active' : ''}`}
                        onClick={() => setActiveTool('select_erase')}
                        title="Box Erase"
                    >
                        <SquareDashed size={17} />
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${isFillMode ? 'active' : ''}`}
                        onClick={() => setIsFillMode((v) => !v)}
                        title="Fill Closed Paths"
                    >
                        <PaintBucket size={17} />
                    </button>

                    <div className="fs-tool-separator horizontal" />

                    <button
                        type="button"
                        className={`fs-tool-btn ${symmetryMode === 'horizontal' ? 'active' : ''}`}
                        onClick={() => setSymmetryMode(symmetryMode === 'horizontal' ? 'none' : 'horizontal')}
                        title="Horizontal Symmetry Mirror"
                    >
                        <FlipHorizontal size={17} />
                    </button>
                    <button
                        type="button"
                        className={`fs-tool-btn ${symmetryMode === 'vertical' ? 'active' : ''}`}
                        onClick={() => setSymmetryMode(symmetryMode === 'vertical' ? 'none' : 'vertical')}
                        title="Vertical Symmetry Mirror"
                    >
                        <FlipVertical size={17} />
                    </button>
                </div>

                {/* Center Canvas & Quick Controls */}
                <div className="fs-canvas-column">
                    {/* Quick Fit & Transform Strip */}
                    <div className="fs-controls">
                        <div className="fs-brush-control" title="Visual preview brush size">
                            <span className="fs-brush-label">Preview:</span>
                            <input
                                type="range"
                                min="2"
                                max="18"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                                className="fs-brush-slider"
                            />
                        </div>

                        <div className="fs-controls-group">
                            <Button variant="default" className="btn-sm" onClick={() => setStrokes((p) => centerStrokesHorizontally(p, 150, selectedScope))} disabled={strokes.length === 0} title="Center horizontally">
                                <AlignCenter size={14} /> Center
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => setStrokes((p) => alignStrokesToBaseline(p, 240, selectedScope))} disabled={strokes.length === 0} title="Seat bottom edge onto Baseline">
                                Base
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => setStrokes((p) => fitStrokesToBand(p, 'cap_to_base', selectedScope))} disabled={strokes.length === 0} title="Scale cleanly into Cap-Height → Baseline">
                                Fit Cap
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => setStrokes((p) => fitStrokesToBand(p, 'x_to_base', selectedScope))} disabled={strokes.length === 0} title="Scale cleanly into X-Height → Baseline">
                                Fit X-Ht
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleFlip('horizontal')} disabled={strokes.length === 0} title="Flip Horizontal">
                                <FlipHorizontal size={14} />
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleFlip('vertical')} disabled={strokes.length === 0} title="Flip Vertical">
                                <FlipVertical size={14} />
                            </Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleRotate(-15)} disabled={strokes.length === 0} title="Rotate -15°">-15°</Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleRotate(15)} disabled={strokes.length === 0} title="Rotate +15°">+15°</Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleScaleStrokes(0.9)} disabled={strokes.length === 0} title="Shrink 90%">90%</Button>
                            <Button variant="default" className="btn-sm" onClick={() => handleScaleStrokes(1.1)} disabled={strokes.length === 0} title="Grow 110%">110%</Button>
                            <Button variant="default" className="btn-sm" onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))} title="Zoom In"><ZoomIn size={14} /></Button>
                            <Button variant="default" className="btn-sm" onClick={() => setZoom((z) => Math.max(1.0, z - 0.25))} title="Zoom Out"><ZoomOut size={14} /></Button>
                            <Button variant="default" className="btn-sm" onClick={handleUndo} disabled={historyState.past.length === 0} title="Undo (Ctrl+Z)"><Undo2 size={14} /></Button>
                            <Button variant="default" className="btn-sm" onClick={handleRedo} disabled={historyState.future.length === 0} title="Redo (Ctrl+Y)"><Redo2 size={14} /></Button>
                            <Button variant="default" className="btn-sm fs-clear-btn" onClick={handleClear} title="Clear Canvas"><Trash2 size={14} /></Button>
                        </div>
                    </div>

                    {selectedStrokeIndex != null && Array.isArray(strokes[selectedStrokeIndex]) && (
                        <div className="fs-context-bar">
                            <span>Stroke #{selectedStrokeIndex + 1}</span>
                            <div className="fs-context-actions">
                                <button type="button" onClick={handleDuplicateSelected} title="Duplicate Stroke (Ctrl+D)"><Copy size={13} /> Clone</button>
                                <button type="button" onClick={handleReverseSelected} title="Flip direction (swaps calligraphy/brush taper)"><ArrowLeftRight size={13} /> Reverse</button>
                                <button type="button" onClick={handleToggleSelectedFill} title="Toggle Fill / Outline">Fill</button>
                                <button type="button" className="danger" onClick={() => { setStrokes((p) => p.filter((_, i) => i !== selectedStrokeIndex)); setSelectedStrokeIndex(null); }} title="Delete Stroke (Del)"><Trash2 size={13} /> Delete</button>
                            </div>
                        </div>
                    )}

                    {activeTool === 'node_edit' && (
                        <div className="fs-context-bar">
                            <span>Node Edit {selectedNode ? `[#${selectedNode.strokeIndex + 1}:${selectedNode.pointIndex + 1}]` : '· Drag or double-click segment'}</span>
                            <div className="fs-context-actions">
                                <button type="button" className={softNodeDrag ? 'active' : ''} onClick={() => setSoftNodeDrag((v) => !v)}>
                                    {softNodeDrag ? 'Smooth Bend' : 'Pinpoint'}
                                </button>
                                {selectedNode && (
                                    <>
                                        <button type="button" onClick={handleSmoothNode} title="Convert corner to curve"><Spline size={13} /> Smooth</button>
                                        <button type="button" onClick={handleAddNodeAfter} title="Insert node after"><Plus size={13} /> Split</button>
                                        <button type="button" className="danger" onClick={handleDeleteSelectedNode} title="Delete node"><Trash2 size={13} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className="fs-canvas-wrapper"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onDoubleClick={handleCanvasDoubleClick}
                    >
                        <div
                            className="fs-canvas-grid"
                            style={{
                                backgroundSize: `${zoom * (400 / 300) * gridSize}px ${zoom * (400 / 300) * gridSize}px`,
                                opacity: isSnapToGrid ? 0.35 : 0.1,
                            }}
                        />

                        {showGuides && (
                            <>
                                <div className="fs-metric-line ascent"><span>ASC</span></div>
                                <div className="fs-metric-line cap-height"><span>CAP</span></div>
                                <div className="fs-metric-line x-height"><span>X-H</span></div>
                                <div className="fs-metric-line baseline"><span>BASE</span></div>
                                <div className="fs-metric-line descent"><span>DESC</span></div>
                            </>
                        )}

                        <canvas ref={canvasRef} className="fs-canvas" width={600} height={600} />
                    </div>

                    {/* Canvas Footer Status & Nudge Controls */}
                    <div className="fs-status-bar">
                        <div className="fs-status-toggles">
                            <button type="button" className={`fs-status-chip ${showGuides ? 'active' : ''}`} onClick={() => setShowGuides((v) => !v)}>
                                <Eye size={12} /> Guides
                            </button>
                            <button type="button" className={`fs-status-chip ${isSnapToMetrics ? 'active' : ''}`} onClick={() => setIsSnapToMetrics((v) => !v)}>
                                <Maximize2 size={12} /> Snap Guides
                            </button>
                            <button type="button" className={`fs-status-chip ${isSnapToGrid ? 'active' : ''}`} onClick={() => setIsSnapToGrid((v) => !v)}>
                                <Grid size={12} /> Grid ({gridDivisions})
                            </button>
                            <input
                                type="number"
                                min="4"
                                max="40"
                                value={gridDivisions}
                                onChange={(e) => setGridDivisions(Math.max(4, parseInt(e.target.value, 10) || 15))}
                                className="fs-grid-num"
                                title="Grid divisions"
                            />
                            {zoom !== 1.0 && (
                                <button type="button" className="fs-status-chip active" onClick={() => setZoom(1.0)}>
                                    {(zoom * 100).toFixed(0)}% Reset
                                </button>
                            )}
                        </div>
                        <div className="fs-nudge-group" title="Nudge glyph or selected stroke">
                            <button type="button" onClick={() => handleMove(-4, 0)}><ArrowLeft size={12} /></button>
                            <button type="button" onClick={() => handleMove(0, -4)}><ArrowUp size={12} /></button>
                            <button type="button" onClick={() => handleMove(0, 4)}><ArrowDown size={12} /></button>
                            <button type="button" onClick={() => handleMove(4, 0)}><ArrowRight size={12} /></button>
                        </div>
                    </div>
                </div>

                {/* Right Tabbed Inspector */}
                <FontStudioInspector
                    activeTab={inspectorTab}
                    setActiveTab={setInspectorTab}
                    activeNibId={activeNibId}
                    onSelectNibStyle={handleSelectNibStyle}
                    serifStyle={serifStyle}
                    setSerifStyle={setSerifStyle}
                    serifScale={serifScale}
                    setSerifScale={setSerifScale}
                    serifTargetMode={serifTargetMode}
                    setSerifTargetMode={setSerifTargetMode}
                    onRegenerateSerifs={handleRegenerateSerifs}
                    onStripSerifs={handleStripSerifs}
                    isSerifPen={isSerifPen}
                    isCalligraphy={isCalligraphy}
                    isBrushPen={isBrushPen}
                    isChisel={isChisel}
                    isPaintBrush={isPaintBrush}
                    chiselAngle={chiselAngle}
                    setChiselAngle={setChiselAngle}
                    lineCap={lineCap}
                    setLineCap={setLineCap}
                    isFillMode={isFillMode}
                    setIsFillMode={setIsFillMode}
                    strokeWeight={strokeWeight}
                    setStrokeWeight={setStrokeWeight}
                    onApplyStyleToScript={handleApplyStyleToScript}
                    scriptGlyphCount={Object.keys(customGlyphs || {}).length}
                    onInsertStamp={handleInsertStamp}
                    drawnGlyphsOptions={drawnGlyphsOptions}
                    onInsertGlyphStrokes={handleInsertGlyphStrokes}
                    onSetGlyphBackground={handleSetGlyphBackground}
                    vecImageInfo={vecImageInfo}
                    vecOptions={vecOptions}
                    setVecOptions={setVecOptions}
                    vecPreviewStrokes={vecPreviewStrokes}
                    onRasterFileSelected={handleRasterFileSelected}
                    onSvgFileSelected={handleSvgFileSelected}
                    onBgSvgFileSelected={handleBgSvgFileSelected}
                    onInsertVectorized={handleInsertVectorized}
                    onClearVectorizer={() => setVecImageInfo(null)}
                    backgroundStrokes={backgroundStrokes}
                    onClearBackground={() => { setBackgroundStrokes([]); setBackgroundText(''); }}
                    bgOpacity={bgOpacity}
                    setBgOpacity={setBgOpacity}
                    backgroundText={backgroundText}
                    setBackgroundText={setBackgroundText}
                    rasterFileInputRef={rasterFileInputRef}
                    svgFileInputRef={svgFileInputRef}
                    bgSvgInputRef={bgSvgInputRef}
                    glyphScale={glyphScale}
                    setGlyphScale={setGlyphScale}
                    isConsistentActive={isConsistentActive}
                    onToggleConsistent={() => setIsGlyphConsistent((prev) => (prev === undefined ? !scriptConsistent : !prev))}
                    fixedAdvanceWidth={fixedAdvanceWidth}
                    xOffset={xOffset}
                    setXOffset={setXOffset}
                    yOffset={yOffset}
                    setYOffset={setYOffset}
                    leftMargin={leftMargin}
                    setLeftMargin={setLeftMargin}
                    rightMargin={rightMargin}
                    setRightMargin={setRightMargin}
                    simplifyTolerance={simplifyTolerance}
                    setSimplifyTolerance={setSimplifyTolerance}
                    onSimplifyStrokes={handleSimplifyStrokes}
                    canvasPointCount={canvasPointCount}
                    strokesCount={strokes.length}
                    onExportSvg={() => exportStrokesAsSVG(strokes, `${targetLabel || 'glyph'}.svg`, {
                        isCalligraphy,
                        isBrushPen,
                        isChisel,
                        isPaintBrush,
                        isSerifPen,
                        chiselAngle,
                        strokeWidth: brushSize * strokeWeight,
                    })}
                    onOpenFontExport={() => setIsFontExportOpen(true)}
                />
            </div>

            {/* Footer Save / Cancel + Live Typographic Context Preview */}
            <div className="fs-footer-bar">
                <div className="fs-preview-strip">
                    <span className="fs-preview-label">Context Preview:</span>
                    <div className={`fs-preview-text custom-font-text ${resolvedScriptId ? `conlang-script-${resolvedScriptId}` : ''}`}>
                        {(() => {
                            const renderMiniSVG = (key) => (
                                <svg
                                    key={key}
                                    width="1.25em"
                                    height="1.25em"
                                    viewBox="0 0 300 300"
                                    style={{ verticalAlign: 'middle', margin: '0 2px', display: 'inline-block' }}
                                >
                                    {(currentStroke.length >= 2 ? [...strokes, currentStroke] : strokes).map((s, i) => {
                                        if (!Array.isArray(s) || s.length === 0 || isLegacySentinelStroke(s)) return null;
                                        const w = brushSize * (s.strokeWeight ?? strokeWeight);
                                        if (s.length === 1) {
                                            return <circle key={i} cx={s[0].x} cy={s[0].y} r={Math.max(2, w / 2)} fill="currentColor" />;
                                        }
                                        const d = `M ${s[0].x} ${s[0].y} ` + s.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
                                        return (
                                            <path
                                                key={i}
                                                d={d + (s.isFilled ? ' Z' : '')}
                                                fill={s.isFilled ? 'currentColor' : 'none'}
                                                stroke="currentColor"
                                                strokeWidth={s.isFilled ? 0 : w}
                                                strokeLinecap={s.lineCap || lineCap || 'round'}
                                                strokeLinejoin="round"
                                            />
                                        );
                                    })}
                                </svg>
                            );

                            return (
                                <>
                                    {sampleScriptChars.length > 0 && (
                                        <span className="fs-preview-neighbors">
                                            {sampleScriptChars.slice(0, 3).join('')}{renderMiniSVG('s1')}{sampleScriptChars.slice(3, 6).join('')} ·{' '}
                                        </span>
                                    )}
                                    <span>Aa {renderMiniSVG('g1')}{renderMiniSVG('g2')} Bb</span>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="fs-action-btns">
                    <Button variant="cancel" onClick={handleCancel}>Cancel</Button>
                    <Button variant="default" onClick={() => setIsFontExportOpen(true)} title="Export full .ttf font">
                        <Type size={15} /> Export .ttf
                    </Button>
                    <Button variant="edit" className="fs-btn-save" onClick={handleSave}>Save Glyph</Button>
                </div>
            </div>

            <FontExportModal
                isOpen={isFontExportOpen}
                onClose={() => setIsFontExportOpen(false)}
                initialScriptId={resolvedScriptId}
            />
        </div>
    );
}
