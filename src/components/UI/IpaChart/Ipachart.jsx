import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './ipachart.css';
import Button from '../Buttons/Buttons';

const COLUMNS = ['Bilabial', 'Labiodental', 'Dental', 'Alveolar', 'Postalveolar', 'Retroflex', 'Palatal', 'Velar', 'Uvular', 'Pharyngeal', 'Glottal'];

const PULMONIC = [
    { row: 'Plosive', cells: [['p','b'], null, null, ['t','d'], null, ['ʈ','ɖ'], ['c','ɟ'], ['k','g'], ['q','ɢ'], null, ['ʔ', null]] },
    { row: 'Nasal', cells: [['m', null], ['ɱ', null], null, ['n', null], null, ['ɳ', null], ['ɲ', null], ['ŋ', null], ['ɴ', null], null, null] },
    { row: 'Trill', cells: [['ʙ', null], null, null, ['r', null], null, null, null, null, ['ʀ', null], null, null] },
    { row: 'Tap or Flap', cells: [[null, 'ⱱ'], null, null, ['ɾ', null], null, ['ɽ', null], null, null, null, null, null] },
    { row: 'Fricative', cells: [['ɸ','β'], ['f','v'], ['θ','ð'], ['s','z'], ['ʃ','ʒ'], ['ʂ','ʐ'], ['ç','ʝ'], ['x','ɣ'], ['χ','ʁ'], ['ħ','ʕ'], ['h','ɦ']] },
    { row: 'Lateral Fricative', cells: [null, null, null, ['ɬ','ɮ'], null, null, null, null, null, null, null] },
    { row: 'Approximant', cells: [null, ['ʋ', null], null, ['ɹ', null], null, ['ɻ', null], ['j', null], ['ɰ', null], null, null, null] },
    { row: 'Lateral Approximant', cells: [null, null, null, ['l', null], null, ['ɭ', null], ['ʎ', null], ['ʟ', null], null, null, null] }
];

const NON_PULMONIC = [
    { title: 'Clicks', sounds: ['ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ'] },
    { title: 'Voiced Implosives', sounds: ['ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ'] },
    { title: 'Ejectives', sounds: ['pʼ', 'tʼ', 'kʼ', 'sʼ'] }
];

const OTHER_CONSONANTS = [
    'ʍ', 'w', 'ɥ', 'ʜ', 'ʢ', 'ʡ', 'ɕ', 'ʑ', 'ɺ', 'ɧ', 't͡s', 'd͡z', 't͡ʃ', 'd͡ʒ', 't͡ɕ', 'd͡ʑ'
];

const VOWELS = [
    // format: [Front_Unrounded, Front_Rounded, Central_Unrounded, Central_Rounded, Back_Unrounded, Back_Rounded]
    { label: 'Close', sounds: ['i','y','ɨ','ʉ','ɯ','u'] },
    { label: 'Near-close', sounds: ['ɪ','ʏ',null,null,null,'ʊ'] },
    { label: 'Close-mid', sounds: ['e','ø','ɘ','ɵ','ɤ','o'] },
    { label: 'Mid', sounds: [null,null,'ə',null,null,null] },
    { label: 'Open-mid', sounds: ['ɛ','œ','ɜ','ɞ','ʌ','ɔ'] },
    { label: 'Near-open', sounds: ['æ',null,'ɐ',null,null,null] },
    { label: 'Open', sounds: ['a','ɶ',null,null,'ɑ','ɒ'] },
];

const SUPRASEGMENTALS = [
    { title: 'Stress & Length', sounds: ['ˈ', 'ˌ', 'ː', 'ˑ'] },
    { title: 'Tone & Intonation', sounds: ['˥', '˦', '˧', '˨', '˩', '↗', '↘'] },
    { title: 'Boundaries', sounds: ['|', '‖', '.', '‿'] },
];

const DIACRITICS = [
    { title: 'Voicing', sounds: ['̥', '̬'] },
    { title: 'Aspiration', sounds: ['ʰ'] },
    { title: 'Nasalization', sounds: ['̃'] },
    { title: 'Labialization', sounds: ['ʷ'] },
    { title: 'Palatalization', sounds: ['ʲ'] },
    { title: 'Velarization', sounds: ['ˠ'] },
    { title: 'Pharyngealization', sounds: ['ˤ'] },
    { title: 'Syllabic', sounds: ['̩'] },
    { title: 'Release', sounds: ['̚'] },
];

export default function IpaChart({ consonants = '', setConsonants, vowels = '', setVowels, onSelect, alwaysOpen }) {
    const [isOpen, setIsOpen] = useState(false);
    const [collapsed, setCollapsed] = useState({
        pulmonic: true,
        nonPulmonic: true,
        vowels: true,
        suprasegmentals: true
    });

    const toggleSection = (section) => {
        setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
    };
    
    const handleClick = (phoneme, type) => {
        if (!phoneme) return;
        
        // If onSelect is provided, we act as a keyboard (appending text)
        if (onSelect) {
            onSelect(phoneme);
            return;
        }

        // Otherwise, we act as an inventory selector (toggling commas)
        const currentStr = type === 'cons' ? consonants : vowels;
        const setStr = type === 'cons' ? setConsonants : setVowels;

        let arr = currentStr.trim() ? currentStr.trim().split(',').map(s => s.trim()) : [];
        let idx = arr.findIndex(a => a === phoneme || a.startsWith(phoneme + '='));

        if (idx > -1) { arr.splice(idx, 1); } else { arr.push(phoneme); }
        setStr(arr.join(', '));
    };

    const isSelected = (phoneme, type) => {
        if (!phoneme || onSelect) return false;
        const currentStr = type === 'cons' ? consonants : vowels;
        return currentStr.split(',').map(s => s.trim().split('=')[0]).includes(phoneme);
    };

    const renderPh = (phoneme, type) => {
        if (!phoneme) return <span className="ph empty"></span>;
        return (
            <span 
                key={phoneme}
                className={`ph ${isSelected(phoneme, type) ? 'selected' : ''}`} 
                onClick={(e) => {
                    e.preventDefault();
                    handleClick(phoneme, type);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    handleClick(phoneme, type);
                }}
                title={`Select ${phoneme}`}
            >
                {phoneme}
            </span>
        );
    };

    return (
        <div className='ipa-chart-container'>
            {!alwaysOpen && (
                <Button className='ipa-btn-toggle' onClick={() => setIsOpen(!isOpen)} variant={isOpen ? "default" : "ipa"}>
                    {isOpen ? 'Close IPA Chart' : 'Interactive Visual IPA Chart'}
                </Button>
            )}
            
            {(isOpen || alwaysOpen) && (
                <div className="ipa-map-wrap">
                    {/* PULMONIC CONSONANTS */}
                    <div className="ipa-collapsible-section">
                        <div className="ipa-section-header" onClick={() => toggleSection('pulmonic')}>
                            {collapsed.pulmonic ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            <h3 className="ipa-section-title">Pulmonic Consonants</h3>
                        </div>
                        
                        {!collapsed.pulmonic && (
                            <div className="ipa-wrapper">
                                <table className="ipa-chart-table">
                                    <thead>
                                        <tr>
                                            <th></th>
                                            {COLUMNS.map(col => <th key={col}>{col}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PULMONIC.map((rowData, i) => (
                                            <tr key={rowData.row}>
                                                <th>{rowData.row}</th>
                                                {rowData.cells.map((cell, j) => (
                                                    <td key={j} className={!cell ? 'imp' : ''}>
                                                        {cell && (
                                                            <div className="ipa-cell">
                                                                {renderPh(cell[0], 'cons')}
                                                                {renderPh(cell[1], 'cons')}
                                                            </div>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* NON-PULMONIC & OTHER */}
                    <div className="ipa-collapsible-section">
                        <div className="ipa-section-header" onClick={() => toggleSection('nonPulmonic')}>
                            {collapsed.nonPulmonic ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            <h3 className="ipa-section-title">Non-Pulmonic & Co-articulated</h3>
                        </div>
                        
                        {!collapsed.nonPulmonic && (
                            <div className="ipa-extra-sections">
                                <div className="ipa-extra-box">
                                    <h3 className="ipa-subsection-title">Non-Pulmonic</h3>
                            <div className="ipa-non-pulmonic">
                                {NON_PULMONIC.map(group => (
                                    <div key={group.title} className="np-group">
                                        <span className="np-title">{group.title}</span>
                                        <div className="np-sounds">
                                            {group.sounds.map(s => renderPh(s, 'cons'))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="ipa-extra-box">
                            <h3 className="ipa-section-title">Co-articulated & Other</h3>
                            <div className="ipa-other-sounds">
                                {OTHER_CONSONANTS.map(s => renderPh(s, 'cons'))}
                            </div>
                        </div>
                            </div>
                        )}
                    </div>

                    {/* VOWEL TRAPEZOID */}
                    <div className="ipa-collapsible-section">
                        <div className="ipa-section-header" onClick={() => toggleSection('vowels')}>
                            {collapsed.vowels ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            <h3 className="ipa-section-title">Vowels</h3>
                        </div>
                        
                        {!collapsed.vowels && (
                            <div className="ipa-vowel-container">
                        <div className="vowel-headers">
                            <span>Front</span>
                            <span>Central</span>
                            <span>Back</span>
                        </div>
                        <div className="vowel-trapezoid">
                            <svg className="vowel-trapezoid-svg">
                                {/* Outer Trapezoid */}
                                <polygon points="10%,0 90%,0 90%,100% 50%,100%" fill="none" stroke="var(--bd)" strokeWidth="2" />
                                {/* Central Line */}
                                <line x1="50%" y1="0" x2="70%" y2="100%" stroke="var(--bd)" strokeWidth="2" />
                                {/* Close-mid Horizontal Line */}
                                <line x1="23.33%" y1="33.33%" x2="90%" y2="33.33%" stroke="var(--bd)" strokeWidth="2" />
                                {/* Open-mid Horizontal Line */}
                                <line x1="36.66%" y1="66.66%" x2="90%" y2="66.66%" stroke="var(--bd)" strokeWidth="2" />
                            </svg>
                            
                            {VOWELS.map((row, i) => {
                                const frontLeft = 10 + (i * 6.666);
                                const centralLeft = 50 + (i * 3.333);
                                const backLeft = 90;

                                return (
                                    <div key={row.label || i} className="vowel-row">
                                        <span className="vowel-row-label">{row.label}</span>
                                        
                                        {(row.sounds[0] || row.sounds[1]) && (
                                            <div className="vowel-cell-group front" style={{ '--v-left': `${frontLeft}%` }}>
                                                {renderPh(row.sounds[0], 'vow')}
                                                {renderPh(row.sounds[1], 'vow')}
                                            </div>
                                        )}
                                        
                                        {(row.sounds[2] || row.sounds[3]) && (
                                            <div className="vowel-cell-group central" style={{ '--v-left': `${centralLeft}%` }}>
                                                {renderPh(row.sounds[2], 'vow')}
                                                {renderPh(row.sounds[3], 'vow')}
                                            </div>
                                        )}

                                        {(row.sounds[4] || row.sounds[5]) && (
                                            <div className="vowel-cell-group back" style={{ '--v-left': `${backLeft}%` }}>
                                                {renderPh(row.sounds[4], 'vow')}
                                                {renderPh(row.sounds[5], 'vow')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                        )}
                    </div>

                    {/* SUPRASEGMENTALS & DIACRITICS */}
                    <div className="ipa-collapsible-section">
                        <div className="ipa-section-header" onClick={() => toggleSection('suprasegmentals')}>
                            {collapsed.suprasegmentals ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            <h3 className="ipa-section-title">Suprasegmentals & Diacritics</h3>
                        </div>

                        {!collapsed.suprasegmentals && (
                            <div className="ipa-extra-sections">
                                <div className="ipa-extra-box">
                                    <h3 className="ipa-subsection-title">Suprasegmentals</h3>
                            <div className="ipa-non-pulmonic">
                                {SUPRASEGMENTALS.map(group => (
                                    <div key={group.title} className="np-group">
                                        <span className="np-title">{group.title}</span>
                                        <div className="np-sounds">
                                            {group.sounds.map(s => renderPh(s, 'cons'))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="ipa-extra-box">
                            <h3 className="ipa-section-title">Diacritics</h3>
                            <div className="ipa-diacritics-grid">
                                {DIACRITICS.map(group => (
                                    <div key={group.title} className="np-group">
                                        <span className="np-title">{group.title}</span>
                                        <div className="np-sounds">
                                            {group.sounds.map(s => (
                                                <span
                                                    key={s}
                                                    className="ph diacritic-ph"
                                                    onClick={() => handleClick(s, 'cons')}
                                                    title={`${group.title}: ◌${s}`}
                                                >
                                                    ◌{s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
