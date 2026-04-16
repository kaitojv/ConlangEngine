import { useState } from 'react';
import './ipachart.css'
import Button from '../Buttons/Buttons';


export default function IpaChart({ consonants = '', setConsonants, vowels = '', setVowels }) {
    const [isOpen, setIsOpen] = useState(false);
    
    const togglePhoneme = (phoneme, type) => {
        const currentStr = type === 'cons' ? consonants : vowels;
        const setStr = type === 'cons' ? setConsonants : setVowels;

        let arr = currentStr.trim() ? currentStr.trim().split(',').map(s => s.trim()) : [];
        let idx = arr.findIndex(a => a === phoneme || a.startsWith(phoneme + '='));

        if (idx > -1) { arr.splice(idx, 1); } else { arr.push(phoneme); }
        setStr(arr.join(', '));
    };
    const renderPh = (phoneme, type) => {
        const currentStr = type === 'cons' ? consonants : vowels;
        const isSelected = currentStr.split(',').map(s => s.trim().split('=')[0]).includes(phoneme);
        
        return (
            <span 
                key={phoneme}
                className={`ph ${isSelected ? 'selected' : ''}`} 
                onClick={() => togglePhoneme(phoneme, type)}
            >
                {phoneme}
            </span>
        );
    };

    return (
        <div className='ipa-chart'>
            <Button className='ipa-btn-toggle' onClick={() => setIsOpen(!isOpen)} variant="save">
                {isOpen ? 'Hide IPA Chart' : 'IPA Chart'}
            </Button>
            
            {isOpen && (
                <div className="ipa-map-wrap" style={{ animation: 'fadeIn 0.3s', margin: '15px 0 20px 0' }}>
                    <div className="ipa-wrapper">
                        <table className="ipa-chart">
                            <thead><tr><th></th><th>Bilabial</th><th>Labiodental</th><th>Dental</th><th>Alveolar</th><th>Postalveolar</th><th>Retroflex</th><th>Palatal</th><th>Velar</th><th>Uvular</th><th>Pharyngeal</th><th>Glottal</th></tr></thead>
                            <tbody>
                                <tr><th>Plosive</th><td><div className="ipa-cell">{renderPh('p', 'cons')}{renderPh('b', 'cons')}</div></td><td></td><td></td><td><div className="ipa-cell">{renderPh('t', 'cons')}{renderPh('d', 'cons')}</div></td><td></td><td><div className="ipa-cell">{renderPh('ʈ', 'cons')}{renderPh('ɖ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('c', 'cons')}{renderPh('ɟ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('k', 'cons')}{renderPh('g', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('q', 'cons')}{renderPh('ɢ', 'cons')}</div></td><td className="imp"></td><td><div className="ipa-cell">{renderPh('ʔ', 'cons')}</div></td></tr>
                                <tr><th>Nasal</th><td><div className="ipa-cell">{renderPh('m', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ɱ', 'cons')}</div></td><td></td><td><div className="ipa-cell">{renderPh('n', 'cons')}</div></td><td></td><td><div className="ipa-cell">{renderPh('ɳ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ɲ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ŋ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ɴ', 'cons')}</div></td><td className="imp"></td><td className="imp"></td></tr>
                                <tr><th>Fricative</th><td><div className="ipa-cell">{renderPh('ɸ', 'cons')}{renderPh('β', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('f', 'cons')}{renderPh('v', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('θ', 'cons')}{renderPh('ð', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('s', 'cons')}{renderPh('z', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ʃ', 'cons')}{renderPh('ʒ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ʂ', 'cons')}{renderPh('ʐ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ç', 'cons')}{renderPh('ʝ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('x', 'cons')}{renderPh('ɣ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('χ', 'cons')}{renderPh('ʁ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ħ', 'cons')}{renderPh('ʕ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('h', 'cons')}{renderPh('ɦ', 'cons')}</div></td></tr>
                                <tr><th>Approximant</th><td></td><td><div className="ipa-cell">{renderPh('ʋ', 'cons')}</div></td><td></td><td><div className="ipa-cell">{renderPh('ɹ', 'cons')}</div></td><td></td><td><div className="ipa-cell">{renderPh('ɻ', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('j', 'cons')}</div></td><td><div className="ipa-cell">{renderPh('ɰ', 'cons')}</div></td><td></td><td></td><td className="imp"></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="vowel-grid">
                        {renderPh('i', 'vow')}{renderPh('y', 'vow')}{renderPh('u', 'vow')}{renderPh('e', 'vow')}{renderPh('o', 'vow')}{renderPh('ɛ', 'vow')}{renderPh('ɔ', 'vow')}{renderPh('æ', 'vow')}{renderPh('a', 'vow')}{renderPh('ɑ', 'vow')}
                    </div>
                </div>
            )}
        </div>
    )
}
