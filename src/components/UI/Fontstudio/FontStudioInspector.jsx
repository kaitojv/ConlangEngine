import React, { useMemo, useState } from 'react';
import {
    Sparkles, Type, Shapes, Scan, Sliders, Upload, Clipboard, Trash2,
    Spline, Download, Wand2, RefreshCw, Layers, Eye
} from 'lucide-react';
import Button from '../Buttons/Buttons.jsx';
import {
    NIB_STYLE_OPTIONS,
    SERIF_STYLES,
    GLYPH_STAMPS,
    isLegacySentinelStroke,
} from '../../../utils/fontStudioTools.js';

function MiniStrokeThumbnail({ strokes, size = 34 }) {
    const clean = (strokes || []).filter(
        (s) => Array.isArray(s) && s.length > 0 && !s.isMeta && !isLegacySentinelStroke(s)
    );
    return (
        <svg width={size} height={size} viewBox="0 0 300 300" className="fs-mini-thumb-svg" aria-hidden="true">
            {clean.map((stroke, idx) => {
                if (stroke.length === 1) {
                    return <circle key={idx} cx={stroke[0].x} cy={stroke[0].y} r="10" fill="currentColor" />;
                }
                const d = `M ${stroke[0].x} ${stroke[0].y} ` + stroke.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
                return (
                    <path
                        key={idx}
                        d={d + (stroke.isFilled ? ' Z' : '')}
                        fill={stroke.isFilled ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={stroke.isFilled ? 0 : 14}
                        strokeLinecap={stroke.lineCap || 'round'}
                        strokeLinejoin="round"
                    />
                );
            })}
        </svg>
    );
}

export default function FontStudioInspector({
    activeTab,
    setActiveTab,
    // Style & Serif props
    activeNibId,
    onSelectNibStyle,
    serifStyle,
    setSerifStyle,
    serifScale,
    setSerifScale,
    serifTargetMode,
    setSerifTargetMode,
    onRegenerateSerifs,
    onStripSerifs,
    isSerifPen,
    isCalligraphy,
    isBrushPen,
    isChisel,
    isPaintBrush,
    chiselAngle,
    setChiselAngle,
    lineCap,
    setLineCap,
    isFillMode,
    setIsFillMode,
    strokeWeight,
    setStrokeWeight,
    onApplyStyleToScript,
    scriptGlyphCount,
    // Stamps & Parts props
    onInsertStamp,
    drawnGlyphsOptions,
    onInsertGlyphStrokes,
    onSetGlyphBackground,
    // Vectorizer & Trace props
    vecImageInfo,
    vecOptions,
    setVecOptions,
    vecPreviewStrokes,
    onRasterFileSelected,
    onSvgFileSelected,
    onBgSvgFileSelected,
    onInsertVectorized,
    onClearVectorizer,
    backgroundStrokes,
    onClearBackground,
    bgOpacity,
    setBgOpacity,
    backgroundText,
    setBackgroundText,
    rasterFileInputRef,
    svgFileInputRef,
    bgSvgInputRef,
    // Metrics & Export props
    glyphScale,
    setGlyphScale,
    isConsistentActive,
    onToggleConsistent,
    fixedAdvanceWidth,
    xOffset,
    setXOffset,
    yOffset,
    setYOffset,
    leftMargin,
    setLeftMargin,
    rightMargin,
    setRightMargin,
    simplifyTolerance,
    setSimplifyTolerance,
    onSimplifyStrokes,
    canvasPointCount,
    strokesCount,
    onExportSvg,
    onOpenFontExport,
}) {
    const [partsSearch, setPartsSearch] = useState('');

    const filteredGlyphs = useMemo(() => {
        const q = partsSearch.trim().toLowerCase();
        if (!q) return drawnGlyphsOptions.slice(0, 60);
        return drawnGlyphsOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 60);
    }, [drawnGlyphsOptions, partsSearch]);

    const tabs = [
        { id: 'style', label: 'Style & Serifs', icon: Sparkles },
        { id: 'parts', label: 'Parts', icon: Shapes },
        { id: 'vectorize', label: 'Vectorize', icon: Scan },
        { id: 'metrics', label: 'Metrics', icon: Sliders },
    ];

    return (
        <aside className="fs-inspector">
            <div className="fs-inspector-tabs" role="tablist">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`fs-inspector-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={14} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="fs-inspector-body">
                {activeTab === 'style' && (
                    <div className="fs-panel-stack">
                        <div className="fs-panel-section">
                            <div className="fs-section-title">Pen / Nib Style (Combines with Serifs)</div>
                            <div className="fs-preset-grid">
                                {NIB_STYLE_OPTIONS.map((nib) => {
                                    const isCurrent = activeNibId === nib.id;
                                    return (
                                        <button
                                            key={nib.id}
                                            type="button"
                                            className={`fs-preset-card ${isCurrent ? 'active' : ''}`}
                                            onClick={() => onSelectNibStyle(nib)}
                                            title={nib.desc}
                                        >
                                            <span className="fs-preset-name">{nib.name}</span>
                                            <span className="fs-preset-desc">{nib.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">
                                <Type size={13} /> Serif Terminals (Any Nib)
                            </div>
                            <div className="fs-chip-row">
                                {SERIF_STYLES.map((st) => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        className={`fs-pill-btn ${(isSerifPen ? serifStyle : 'none') === st.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSerifStyle(st.id);
                                            onRegenerateSerifs(st.id);
                                        }}
                                        title={st.desc}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>

                            <div className="fs-slider-row">
                                <label>Serif Size ({Math.round(serifScale * 100)}%)</label>
                                <input
                                    type="range"
                                    min="0.6"
                                    max="2.2"
                                    step="0.05"
                                    value={serifScale}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSerifScale(val);
                                        if (isSerifPen && serifStyle !== 'none' && strokesCount > 0) {
                                            onRegenerateSerifs(serifStyle, { serifScale: val });
                                        }
                                    }}
                                />
                            </div>

                            <div className="fs-row-between">
                                <span className="fs-mini-label">Attach to:</span>
                                <div className="fs-segmented">
                                    {[
                                        { id: 'terminals', label: 'Free Ends' },
                                        { id: 'verticals', label: 'Stems' },
                                        { id: 'all', label: 'All Ends' },
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            className={serifTargetMode === m.id ? 'active' : ''}
                                            onClick={() => {
                                                setSerifTargetMode(m.id);
                                                if (isSerifPen && serifStyle !== 'none' && strokesCount > 0) {
                                                    onRegenerateSerifs(serifStyle, { targetMode: m.id });
                                                }
                                            }}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="fs-btn-row">
                                <Button
                                    variant="default"
                                    className="btn-sm fs-flex-1"
                                    onClick={() => onRegenerateSerifs(serifStyle === 'none' ? 'classic' : serifStyle)}
                                    disabled={strokesCount === 0}
                                >
                                    <Wand2 size={13} /> Apply / Refresh Serifs
                                </Button>
                                <Button
                                    variant="default"
                                    className="btn-sm"
                                    onClick={onStripSerifs}
                                    disabled={strokesCount === 0}
                                    title="Remove generated serif caps while keeping base strokes"
                                >
                                    Strip
                                </Button>
                            </div>
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">Stroke Appearance</div>
                            <div className="fs-slider-row">
                                <label>Compiled Weight ({strokeWeight.toFixed(2)}x)</label>
                                <input
                                    type="range"
                                    min="0.4"
                                    max="2.4"
                                    step="0.05"
                                    value={strokeWeight}
                                    onChange={(e) => setStrokeWeight(parseFloat(e.target.value))}
                                    title="Scales this glyph's stroke weight consistently in preview & compiled .ttf"
                                />
                            </div>

                            {isChisel && (
                                <div className="fs-chisel-box">
                                    <div className="fs-slider-row">
                                        <label>Chisel Nib Angle ({chiselAngle}°)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="180"
                                            step="5"
                                            value={chiselAngle}
                                            onChange={(e) => setChiselAngle(parseInt(e.target.value, 10))}
                                        />
                                    </div>
                                    <div className="fs-chip-row">
                                        {[0, 30, 45, 60, 90].map((deg) => (
                                            <button
                                                key={deg}
                                                type="button"
                                                className={`fs-pill-btn ${chiselAngle === deg ? 'active' : ''}`}
                                                onClick={() => setChiselAngle(deg)}
                                            >
                                                {deg}°
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="fs-row-between">
                                <span className="fs-mini-label">Line Cap / Fill:</span>
                                <div className="fs-segmented">
                                    <button type="button" className={lineCap === 'round' ? 'active' : ''} onClick={() => setLineCap('round')}>Round</button>
                                    <button type="button" className={lineCap === 'butt' ? 'active' : ''} onClick={() => setLineCap('butt')}>Flat</button>
                                    <button type="button" className={isFillMode ? 'active' : ''} onClick={() => setIsFillMode((v) => !v)}>Fill Shape</button>
                                </div>
                            </div>

                            {(isCalligraphy || isBrushPen || isPaintBrush) && (
                                <p className="fs-hint-text">
                                    Active nib: <strong>{isCalligraphy ? 'Calligraphy' : isBrushPen ? 'East Brush' : 'Dry Ink'}</strong>. Reverses cleanly via Select → Reverse Direction.
                                </p>
                            )}
                        </div>

                        {scriptGlyphCount > 1 && (
                            <div className="fs-panel-section fs-batch-box">
                                <div className="fs-section-title">
                                    <Layers size={13} /> Consistent Script Family
                                </div>
                                <p className="fs-hint-text">
                                    Apply current preset/serif style &amp; weight to all {scriptGlyphCount} glyphs in this script and recompile the font.
                                </p>
                                <Button variant="default" className="btn-sm fs-w-full" onClick={onApplyStyleToScript}>
                                    <RefreshCw size={13} /> Apply Style to Entire Script ({scriptGlyphCount})
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'parts' && (
                    <div className="fs-panel-stack">
                        <div className="fs-panel-section">
                            <div className="fs-section-title">Quick Metric Stamps</div>
                            <p className="fs-hint-text">Click to drop precision-aligned stems, bowls, arches &amp; accents.</p>
                            <div className="fs-stamp-grid">
                                {GLYPH_STAMPS.map((stamp) => (
                                    <button
                                        key={stamp.id}
                                        type="button"
                                        className="fs-stamp-btn"
                                        onClick={() => onInsertStamp(stamp)}
                                        title={stamp.desc}
                                    >
                                        <MiniStrokeThumbnail strokes={stamp.strokes} size={28} />
                                        <span>{stamp.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">Script Glyphs &amp; Radicals ({drawnGlyphsOptions.length})</div>
                            <input
                                type="text"
                                className="fs-search-input"
                                placeholder="Filter letters or radicals..."
                                value={partsSearch}
                                onChange={(e) => setPartsSearch(e.target.value)}
                            />
                            {filteredGlyphs.length === 0 ? (
                                <p className="fs-hint-text">No matching drawn glyphs or radicals yet.</p>
                            ) : (
                                <div className="fs-glyph-picker-grid">
                                    {filteredGlyphs.map((opt) => (
                                        <div key={opt.id} className="fs-glyph-card" title={opt.label}>
                                            <MiniStrokeThumbnail strokes={opt.strokes} size={32} />
                                            <span className="fs-glyph-card-label">{opt.label}</span>
                                            <div className="fs-glyph-card-actions">
                                                <button type="button" onClick={() => onInsertGlyphStrokes(opt)} title="Insert strokes onto canvas">+ Add</button>
                                                <button type="button" onClick={() => onSetGlyphBackground(opt)} title="Show faintly in background">Bg</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'vectorize' && (
                    <div className="fs-panel-stack">
                        <div className="fs-panel-section">
                            <div className="fs-section-title">Image to Vector (Trace Bitmap)</div>
                            <p className="fs-hint-text">
                                Upload PNG/JPG/WebP or press <strong>Ctrl+V</strong> to paste a drawing or screenshot directly.
                            </p>

                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
                                ref={rasterFileInputRef}
                                style={{ display: 'none' }}
                                onChange={onRasterFileSelected}
                            />
                            <input
                                type="file"
                                accept=".svg,image/svg+xml"
                                ref={svgFileInputRef}
                                style={{ display: 'none' }}
                                onChange={onSvgFileSelected}
                            />
                            <input
                                type="file"
                                accept=".svg,image/svg+xml"
                                ref={bgSvgInputRef}
                                style={{ display: 'none' }}
                                onChange={onBgSvgFileSelected}
                            />

                            <div className="fs-btn-row">
                                <Button variant="default" className="btn-sm fs-flex-1" onClick={() => rasterFileInputRef.current?.click()}>
                                    <Upload size={13} /> Trace Image
                                </Button>
                                <Button variant="default" className="btn-sm fs-flex-1" onClick={() => svgFileInputRef.current?.click()}>
                                    <Download size={13} style={{ transform: 'rotate(180deg)' }} /> Import SVG
                                </Button>
                            </div>

                            {vecImageInfo && (
                                <div className="fs-vec-workspace">
                                    <div className="fs-vec-preview-row">
                                        <div className="fs-vec-box">
                                            <span>Source</span>
                                            <img src={vecImageInfo.previewUrl} alt="Source to trace" />
                                        </div>
                                        <div className="fs-vec-box">
                                            <span>Vectors ({vecPreviewStrokes.length})</span>
                                            <MiniStrokeThumbnail strokes={vecPreviewStrokes} size={74} />
                                        </div>
                                    </div>

                                    <div className="fs-row-between">
                                        <span className="fs-mini-label">Trace Mode:</span>
                                        <div className="fs-segmented">
                                            <button
                                                type="button"
                                                className={vecOptions.mode === 'centerline' ? 'active' : ''}
                                                onClick={() => setVecOptions((o) => ({ ...o, mode: 'centerline' }))}
                                                title="Extracts single editable strokes compatible with Serifs, Calligraphy & Brush sizes"
                                            >
                                                Centerline (Stylable)
                                            </button>
                                            <button
                                                type="button"
                                                className={vecOptions.mode === 'outline' ? 'active' : ''}
                                                onClick={() => setVecOptions((o) => ({ ...o, mode: 'outline' }))}
                                                title="Extracts exact filled contours with cutout holes"
                                            >
                                                Filled Outline
                                            </button>
                                        </div>
                                    </div>

                                    <div className="fs-slider-row">
                                        <label>Threshold ({vecOptions.threshold})</label>
                                        <input
                                            type="range"
                                            min="10"
                                            max="245"
                                            value={vecOptions.threshold}
                                            onChange={(e) => setVecOptions((o) => ({ ...o, threshold: parseInt(e.target.value, 10) }))}
                                        />
                                    </div>
                                    <div className="fs-slider-row">
                                        <label>Smoothness ({vecOptions.smoothness})</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="3"
                                            step="1"
                                            value={vecOptions.smoothness}
                                            onChange={(e) => setVecOptions((o) => ({ ...o, smoothness: parseInt(e.target.value, 10) }))}
                                        />
                                    </div>
                                    <div className="fs-slider-row">
                                        <label>Simplify ({vecOptions.simplify.toFixed(1)}px)</label>
                                        <input
                                            type="range"
                                            min="0.6"
                                            max="5.0"
                                            step="0.2"
                                            value={vecOptions.simplify}
                                            onChange={(e) => setVecOptions((o) => ({ ...o, simplify: parseFloat(e.target.value) }))}
                                        />
                                    </div>

                                    <div className="fs-row-between">
                                        <label className="fs-check-inline">
                                            <input
                                                type="checkbox"
                                                checked={vecOptions.invert}
                                                onChange={(e) => setVecOptions((o) => ({ ...o, invert: e.target.checked }))}
                                            />
                                            Invert light/dark
                                        </label>
                                        <select
                                            className="fs-compact-select"
                                            value={vecOptions.fitBand}
                                            onChange={(e) => setVecOptions((o) => ({ ...o, fitBand: e.target.value }))}
                                        >
                                            <option value="cap_to_base">Fit Cap → Base</option>
                                            <option value="x_to_base">Fit X → Base</option>
                                            <option value="center_square">Fit Full Square</option>
                                        </select>
                                    </div>

                                    <div className="fs-btn-row">
                                        <Button
                                            variant="edit"
                                            className="btn-sm fs-flex-1"
                                            onClick={onInsertVectorized}
                                            disabled={vecPreviewStrokes.length === 0}
                                        >
                                            <Clipboard size={13} /> Insert Vectors
                                        </Button>
                                        <Button variant="default" className="btn-sm" onClick={onClearVectorizer}>
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">
                                <Eye size={13} /> Tracing Reference Layer
                            </div>
                            <div className="fs-row-between">
                                <span className="fs-mini-label">Letter Guide:</span>
                                <input
                                    type="text"
                                    className="fs-search-input"
                                    style={{ width: '90px', textAlign: 'center', marginBottom: 0 }}
                                    placeholder="e.g. A g 語"
                                    maxLength={4}
                                    value={backgroundText}
                                    onChange={(e) => setBackgroundText(e.target.value)}
                                />
                            </div>
                            <div className="fs-slider-row">
                                <label>Guide Opacity ({Math.round(bgOpacity * 100)}%)</label>
                                <input
                                    type="range"
                                    min="0.05"
                                    max="0.6"
                                    step="0.05"
                                    value={bgOpacity}
                                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="fs-btn-row">
                                <Button variant="default" className="btn-sm fs-flex-1" onClick={() => bgSvgInputRef.current?.click()}>
                                    SVG as Background
                                </Button>
                                {(backgroundStrokes.length > 0 || backgroundText) && (
                                    <Button variant="default" className="btn-sm" onClick={onClearBackground}>
                                        Clear Bg
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'metrics' && (
                    <div className="fs-panel-stack">
                        <div className="fs-panel-section">
                            <div className="fs-section-title">Glyph Sizing &amp; Advance</div>
                            <div className="fs-row-between">
                                <span className="fs-mini-label">Box Mode:</span>
                                <button
                                    type="button"
                                    className={`fs-mode-chip ${isConsistentActive ? 'active' : ''}`}
                                    onClick={onToggleConsistent}
                                >
                                    {isConsistentActive ? 'Square Em-Box' : 'Variable Width'}
                                </button>
                            </div>
                            <div className="fs-slider-row">
                                <label>Font Scale ({glyphScale.toFixed(2)}x)</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.05"
                                    value={glyphScale}
                                    onChange={(e) => setGlyphScale(parseFloat(e.target.value))}
                                />
                            </div>
                            {isConsistentActive ? (
                                <>
                                    <p className="fs-hint-text">
                                        Fixed Advance: {((fixedAdvanceWidth || 1000) / 1000).toFixed(2)}em ({fixedAdvanceWidth || 1000} units)
                                    </p>
                                    <div className="fs-slider-row">
                                        <label>H-Shift ({xOffset})</label>
                                        <input type="range" min="-200" max="200" step="5" value={xOffset} onChange={(e) => setXOffset(parseInt(e.target.value, 10))} />
                                    </div>
                                    <div className="fs-slider-row">
                                        <label>V-Shift ({yOffset})</label>
                                        <input type="range" min="-300" max="300" step="5" value={yOffset} onChange={(e) => setYOffset(parseInt(e.target.value, 10))} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="fs-slider-row">
                                        <label>Left Bearing ({leftMargin})</label>
                                        <input type="range" min="-200" max="500" step="10" value={leftMargin} onChange={(e) => setLeftMargin(parseInt(e.target.value, 10))} />
                                    </div>
                                    <div className="fs-slider-row">
                                        <label>Right Bearing ({rightMargin})</label>
                                        <input type="range" min="-200" max="500" step="10" value={rightMargin} onChange={(e) => setRightMargin(parseInt(e.target.value, 10))} />
                                    </div>
                                    <div className="fs-slider-row">
                                        <label>Vertical Offset ({yOffset})</label>
                                        <input type="range" min="-500" max="500" step="10" value={yOffset} onChange={(e) => setYOffset(parseInt(e.target.value, 10))} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">Geometry Optimization ({canvasPointCount} pts)</div>
                            <div className="fs-slider-row">
                                <label>Simplify Tolerance ({simplifyTolerance.toFixed(2)}px)</label>
                                <input
                                    type="range"
                                    min="0.05"
                                    max="2.5"
                                    step="0.05"
                                    value={Math.min(Math.max(simplifyTolerance, 0.05), 2.5)}
                                    onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value))}
                                />
                            </div>
                            <Button variant="default" className="btn-sm fs-w-full" onClick={onSimplifyStrokes} disabled={strokesCount === 0}>
                                <Spline size={13} /> Simplify / Lighten Points
                            </Button>
                        </div>

                        <div className="fs-panel-section">
                            <div className="fs-section-title">Export</div>
                            <div className="fs-btn-row">
                                <Button variant="default" className="btn-sm fs-flex-1" onClick={onExportSvg} disabled={strokesCount === 0}>
                                    <Download size={13} /> Glyph SVG
                                </Button>
                                <Button variant="default" className="btn-sm fs-flex-1" onClick={onOpenFontExport}>
                                    <Type size={13} /> Full Font (.ttf)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
