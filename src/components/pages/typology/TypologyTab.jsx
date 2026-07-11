import React, { useMemo, useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import { analyzeTypology, STATUS } from '@/utils/typologyEngine.js';
import {
    FlaskConical, CheckCircle, AlertTriangle, XCircle, Info, Sparkles,
    ChevronRight, Quote,
} from 'lucide-react';
import './typologyTab.css';

// Map an observation status to its display icon + color.
const STATUS_ICON = {
    natural: CheckCircle,
    marked: Sparkles,
    notable: AlertTriangle,
    unusual: XCircle,
    info: Info,
};

// Fixed category order so the report always reads top-to-bottom the same way.
const CATEGORY_ORDER = [
    'Phonology',
    'Syllable Structure',
    'Word Order',
    'Morphology',
    'Numerals',
    'Suprasegmentals',
];

// SVG ring showing the naturalness score.
function ScoreRing({ score, color }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);
    return (
        <div className="typ-ring-wrap">
            <svg viewBox="0 0 128 128" className="typ-ring">
                <circle cx="64" cy="64" r={radius} className="typ-ring-track" />
                <circle
                    cx="64" cy="64" r={radius}
                    className="typ-ring-value"
                    style={{
                        stroke: color,
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                    }}
                />
            </svg>
            <div className="typ-ring-label">
                <span className="typ-ring-score" style={{ color }}>{score}</span>
                <span className="typ-ring-max">/ 100</span>
            </div>
        </div>
    );
}

export default function TypologyTab() {
    const config = useConfigStore();

    const [reviewOnly, setReviewOnly] = useState(false);

    const report = useMemo(
        () => analyzeTypology(config),
        [config]
    );

    const { naturalnessScore, grade, summary, inventory, observations } = report;

    // Group observations by category, honoring CATEGORY_ORDER.
    const grouped = useMemo(() => {
        const visible = reviewOnly
            ? observations.filter(o => o.status === 'notable' || o.status === 'unusual')
            : observations;
        const map = {};
        visible.forEach(o => {
            (map[o.category] = map[o.category] || []).push(o);
        });
        // Sort each group most-marked-first so problems bubble up.
        Object.values(map).forEach(list =>
            list.sort((a, b) => (STATUS[b.status]?.rank || 0) - (STATUS[a.status]?.rank || 0))
        );
        return CATEGORY_ORDER
            .filter(cat => map[cat]?.length)
            .map(cat => ({ category: cat, items: map[cat] }));
    }, [observations, reviewOnly]);

    const summaryChips = [
        { key: 'natural', label: 'Natural', color: STATUS.natural.color },
        { key: 'marked', label: 'Marked', color: STATUS.marked.color },
        { key: 'notable', label: 'Notable', color: STATUS.notable.color },
        { key: 'unusual', label: 'Unusual', color: STATUS.unusual.color },
    ];

    const reviewCount = (summary.notable || 0) + (summary.unusual || 0);

    return (
        <div className="typ-container">
            {/* Header */}
            <div>
                <h1 className="typ-header-title">
                    <FlaskConical size={26} /> Naturalness &amp; Typology
                </h1>
                <p className="typ-description">
                    See how <b>{config.conlangName || 'your conlang'}</b> compares to the world's natural
                    languages. Every check is a cross-linguistic tendency drawn from typology (WALS) and
                    Greenbergian universals — <i>guidance, not rules</i>. A boldly alien language is a perfectly
                    valid goal.
                </p>
            </div>

            {/* Score hero */}
            <Card className="typ-hero">
                <ScoreRing score={naturalnessScore} color={grade.color} />
                <div className="typ-hero-body">
                    <span className="typ-grade" style={{ color: grade.color }}>{grade.label}</span>
                    <p className="typ-blurb">{grade.blurb}</p>
                    <div className="typ-chips">
                        {summaryChips.map(chip => (
                            <span key={chip.key} className="typ-chip" style={{ borderColor: chip.color }}>
                                <span className="typ-chip-dot" style={{ background: chip.color }} />
                                {summary[chip.key] || 0} {chip.label}
                            </span>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Inventory snapshot */}
            <div className="typ-stat-grid">
                <div className="typ-stat">
                    <span className="typ-stat-value">{inventory.consonantCount}</span>
                    <span className="typ-stat-label">Consonants <em>({inventory.consonantClass})</em></span>
                </div>
                <div className="typ-stat">
                    <span className="typ-stat-value">{inventory.vowelCount}</span>
                    <span className="typ-stat-label">Vowels <em>({inventory.vowelClass})</em></span>
                </div>
                <div className="typ-stat">
                    <span className="typ-stat-value">{inventory.ratio || '—'}</span>
                    <span className="typ-stat-label">C : V ratio</span>
                </div>
                <div className="typ-stat">
                    <span className="typ-stat-value typ-stat-text">{inventory.syllableComplexity}</span>
                    <span className="typ-stat-label">Syllable structure</span>
                </div>
            </div>

            {/* Review filter */}
            <div className="typ-toolbar">
                <label className="typ-toggle">
                    <input
                        type="checkbox"
                        checked={reviewOnly}
                        onChange={(e) => setReviewOnly(e.target.checked)}
                    />
                    <span>Show only things to review {reviewCount > 0 && `(${reviewCount})`}</span>
                </label>
            </div>

            {/* Observations by category */}
            {grouped.length === 0 ? (
                <Card className="typ-empty">
                    <CheckCircle size={40} style={{ color: 'var(--ok)' }} />
                    <p>
                        {reviewOnly
                            ? 'Nothing flagged for review — your language is tracking closely with natural-language norms. Nice work!'
                            : 'Add a phonology and grammar in Settings to generate your naturalness report.'}
                    </p>
                </Card>
            ) : (
                grouped.map(group => (
                    <Card key={group.category} className="typ-group">
                        <h3 className="typ-group-title">
                            {group.category}
                            <span className="typ-group-count">{group.items.length}</span>
                        </h3>
                        <div className="typ-obs-list">
                            {group.items.map(obs => {
                                const StatusIcon = STATUS_ICON[obs.status] || Info;
                                const color = STATUS[obs.status]?.color || 'var(--tx2)';
                                return (
                                    <div key={obs.id} className="typ-obs" style={{ '--obs-color': color }}>
                                        <StatusIcon size={18} className="typ-obs-icon" style={{ color }} />
                                        <div className="typ-obs-body">
                                            <div className="typ-obs-head">
                                                <span className="typ-obs-title">{obs.title}</span>
                                                <span className="typ-obs-tag" style={{ color }}>
                                                    {STATUS[obs.status]?.label}
                                                </span>
                                            </div>
                                            <p className="typ-obs-detail">{obs.detail}</p>
                                            {obs.universal && (
                                                <div className="typ-obs-universal">
                                                    <Quote size={13} />
                                                    <span>{obs.universal}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ))
            )}

            {/* Footer disclaimer */}
            <p className="typ-footnote">
                <Info size={14} />
                Typological tendencies describe what natural languages usually do — they are not laws.
                Treat “unusual” flags as creative prompts, not errors.
                <ChevronRight size={14} className="typ-footnote-arrow" />
                Data patterns after the <i>World Atlas of Language Structures</i> (WALS).
            </p>
        </div>
    );
}
