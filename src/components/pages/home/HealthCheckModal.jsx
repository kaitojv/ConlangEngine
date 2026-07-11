import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { Activity, CheckCircle, AlertTriangle, XCircle, FlaskConical } from 'lucide-react';

const SWADESH_100 = [
    "I", "you", "we", "this", "that", "who", "what", "not", "all", "many",
    "one", "two", "big", "long", "small", "woman", "man", "person", "fish", "bird",
    "dog", "louse", "tree", "seed", "leaf", "root", "bark", "skin", "flesh", "blood",
    "bone", "grease", "egg", "horn", "tail", "feather", "hair", "head", "ear", "eye",
    "nose", "mouth", "tooth", "tongue", "fingernail", "foot", "leg", "knee", "hand", "wing",
    "belly", "guts", "neck", "back", "breast", "heart", "liver", "drink", "eat", "bite",
    "suck", "spit", "puke", "blow", "breathe", "laugh", "see", "hear", "know", "think",
    "smell", "fear", "sleep", "live", "die", "kill", "fight", "hunt", "hit", "cut",
    "split", "stab", "scratch", "dig", "swim", "fly", "walk", "come", "lie", "sit",
    "stand", "turn", "fall", "give", "hold", "squeeze", "rub", "wash", "wipe", "pull"
];

export default function HealthCheckModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const lexicon = useLexiconStore(state => state.lexicon || []);
    const consonants = useConfigStore(state => state.consonants || []);
    const vowels = useConfigStore(state => state.vowels || []);
    const grammarRules = useConfigStore(state => state.grammarRules || []);

    const { score, metrics } = useMemo(() => {
        const result = { total: 0, max: 100, details: [] };

        // 1. Vocabulary Size (Max 30 pts)
        let vocabScore = 0;
        if (lexicon.length >= 1000) vocabScore = 30;
        else if (lexicon.length >= 500) vocabScore = 20;
        else if (lexicon.length >= 100) vocabScore = 10;
        else if (lexicon.length > 0) vocabScore = 5;
        result.total += vocabScore;
        result.details.push({
            name: "Lexicon Size",
            value: lexicon.length,
            pts: vocabScore,
            max: 30,
            msg: lexicon.length < 500 ? "Aim for 500+ words for basic fluency." : "Excellent vocabulary size!"
        });

        // 2. Swadesh List Coverage (Max 30 pts)
        const translations = lexicon.map(w => (w.translation || '').toLowerCase());
        let swadeshCount = 0;
        SWADESH_100.forEach(sw => {
            // Check if any word translation contains this swadesh word as a standalone word
            const regex = new RegExp(`\\b${sw}\\b`);
            if (translations.some(t => regex.test(t))) {
                swadeshCount++;
            }
        });
        let swadeshScore = Math.floor((swadeshCount / 100) * 30);
        result.total += swadeshScore;
        result.details.push({
            name: "Core Vocabulary (Swadesh 100)",
            value: `${swadeshCount}%`,
            pts: swadeshScore,
            max: 30,
            msg: swadeshCount < 50 ? "Missing essential universal concepts." : "Good coverage of core words!"
        });

        // 3. Phonology (Max 20 pts)
        let phonoScore = 0;
        if (consonants.length >= 8 && vowels.length >= 3) phonoScore = 20;
        else if (consonants.length > 0) phonoScore = 10;
        result.total += phonoScore;
        result.details.push({
            name: "Phoneme Inventory",
            value: `${consonants.length} C, ${vowels.length} V`,
            pts: phonoScore,
            max: 20,
            msg: phonoScore === 20 ? "Healthy phoneme count." : "Warning: Very small inventory."
        });

        // 4. Grammar Rules (Max 20 pts)
        let grammarScore = 0;
        if (grammarRules.length >= 10) grammarScore = 20;
        else if (grammarRules.length >= 5) grammarScore = 15;
        else if (grammarRules.length > 0) grammarScore = 5;
        result.total += grammarScore;
        result.details.push({
            name: "Morphology Rules",
            value: grammarRules.length,
            pts: grammarScore,
            max: 20,
            msg: grammarRules.length < 5 ? "Needs more inflectional rules." : "Solid grammar foundation."
        });

        return { score: result.total, metrics: result.details };
    }, [lexicon, consonants, vowels, grammarRules]);

    const getGrade = (s) => {
        if (s >= 90) return { label: 'S (Excellent)', color: 'var(--ok)' };
        if (s >= 75) return { label: 'A (Great)', color: 'var(--acc)' };
        if (s >= 50) return { label: 'B (Good)', color: 'var(--warn)' };
        if (s >= 25) return { label: 'C (Developing)', color: 'var(--err)' };
        return { label: 'D (Beginner)', color: 'var(--tx3)' };
    };

    const grade = getGrade(score);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Conlang Health Check">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Activity size={48} style={{ color: grade.color, marginBottom: '10px' }} />
                <h2 style={{ fontSize: '2rem', margin: '0', color: grade.color }}>{grade.label}</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--tx2)', marginTop: '5px' }}>Overall Score: {score} / 100</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', padding: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--tx)' }}>{m.name}</strong>
                            <span style={{ fontWeight: 'bold', color: 'var(--acc)' }}>{m.pts} / {m.max} pts</span>
                        </div>
                        <div style={{ color: 'var(--tx2)', fontSize: '0.95rem', marginBottom: '8px' }}>Current: {m.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.pts === m.max ? 'var(--ok)' : m.pts === 0 ? 'var(--err)' : 'var(--warn)', fontSize: '0.9rem' }}>
                            {m.pts === m.max ? <CheckCircle size={14} /> : m.pts === 0 ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                            {m.msg}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                <Button variant="save" onClick={() => { onClose(); navigate('/typology'); }}>
                    <FlaskConical size={16} style={{ marginBottom: '-3px', marginRight: '6px' }} />
                    Naturalness Report
                </Button>
                <Button variant="imp" onClick={onClose}>Close Report</Button>
            </div>
        </Modal>
    );
}
