// src/utils/transliteration.js
// Pure transliteration functions extracted from useTransliterator.jsx
// No React, no hooks — usable from exporters and validators.

export const SCRIPT_MAPS = {
    runic: {
        'f': 'ᚠ', 'u': 'ᚢ', 'th': 'ᚦ', 'a': 'ᚨ', 'r': 'ᚱ', 'k': 'ᚲ', 'g': 'ᚷ', 'w': 'ᚹ',
        'h': 'ᚺ', 'n': 'ᚾ', 'i': 'ᛁ', 'j': 'ᛃ', 'ei': 'ᛇ', 'p': 'ᛈ', 'z': 'ᛉ', 's': 'ᛊ',
        't': 'ᛏ', 'b': 'ᛒ', 'e': 'ᛖ', 'm': 'ᛗ', 'l': 'ᛚ', 'ng': 'ᛜ', 'd': 'ᛞ', 'o': 'ᛟ'
    },
    cyrillic: {
        'shch': 'щ', 'sh': 'ш', 'zh': 'ж', 'ch': 'ч', 'ts': 'ц', 'ya': 'я', 'yu': 'ю',
        'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и',
        'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с',
        't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'y': 'ы'
    },
    greek: {
        'th': 'θ', 'ph': 'φ', 'ch': 'χ', 'ps': 'ψ',
        'a': 'α', 'b': 'β', 'g': 'γ', 'd': 'δ', 'e': 'ε', 'z': 'ζ', 'h': 'η', 'i': 'ι',
        'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ', 'o': 'ο', 'p': 'π', 'r': 'ρ',
        's': 'σ', 't': 'τ', 'y': 'υ', 'w': 'ω'
    },
    georgian: {
        'ts': 'ც', 'dz': 'ძ', 'ch': 'ჩ', 'j': 'ჯ', 'sh': 'შ', 'zh': 'ჟ', 'gh': 'ღ', 'kh': 'ხ',
        'ph': 'ფ',
        'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ', 't': 'თ',
        'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ', 'r': 'რ',
        's': 'ს', 'u': 'უ', 'q': 'ქ', 'h': 'ჰ'
    },
    arabic: {
        'a':'ا', 'b':'ب', 't':'ت', 'th':'ث', 'j':'ج', 'H':'ح', 'kh':'خ', 'd':'د', 'dh':'ذ', 'r':'ر', 'z':'ز', 's':'س', 'sh':'ش', 'S':'ص', 'D':'ض', 'T':'ط', 'Z':'ظ', 'ayn':'ع', 'gh':'غ', 'f':'ف', 'q':'ق', 'k':'ك', 'l':'ل', 'm':'م', 'n':'ن', 'h':'ه', 'w':'و', 'y':'ي'
    },
    hebrew: {
        'a':'א', 'b':'ב', 'g':'ג', 'd':'ד', 'h':'ה', 'w':'ו', 'z':'ז', 'H':'ח', 'T':'ט', 'y':'י', 'k':'כ', 'l':'ל', 'm':'מ', 'n':'נ', 's':'ס', 'ayn':'ע', 'p':'פ', 'S':'צ', 'q':'ק', 'r':'ר', 'sh':'ש', 't':'ת'
    },
    devanagari: {
        'a':'अ', 'i':'इ', 'u':'उ', 'e':'ए', 'o':'ओ', 'k':'क', 'kh':'ख', 'g':'ग', 'gh':'घ', 'c':'च', 'ch':'छ', 'j':'ज', 'jh':'झ', 'T':'ट', 'Th':'ठ', 'D':'ड', 'Dh':'ढ', 'N':'ण', 't':'त', 'th':'थ', 'd':'द', 'dh':'ध', 'n':'न', 'p':'प', 'ph':'फ', 'b':'ब', 'bh':'भ', 'm':'म', 'y':'य', 'r':'र', 'l':'ल', 'v':'व', 's':'स', 'sh':'श', 'h':'ह'
    },
    thai: {
        'k':'ก', 'kh':'ข', 'c':'จ', 'ch':'ฉ', 't':'ต', 'th':'ท', 'n':'น', 'b':'บ', 'p':'ป', 'ph':'ผ', 'm':'ม', 'y':'ย', 'r':'ร', 'l':'ล', 'w':'ว', 's':'ส', 'h':'ห'
    },
    hiragana: {
        'a':'あ', 'i':'い', 'u':'う', 'e':'え', 'o':'お', 'ka':'か', 'ki':'き', 'ku':'く', 'ke':'け', 'ko':'こ', 'sa':'さ', 'shi':'し', 'su':'す', 'se':'せ', 'so':'そ', 'ta':'た', 'chi':'ち', 'tsu':'つ', 'te':'て', 'to':'と', 'na':'な', 'ni':'に', 'nu':'ぬ', 'ne':'ね', 'no':'の', 'ha':'は', 'hi':'ひ', 'fu':'ふ', 'he':'へ', 'ho':'ほ', 'ma':'ま', 'mi':'み', 'mu':'む', 'me':'め', 'mo':'も', 'ya':'や', 'yu':'ゆ', 'yo':'よ', 'ra':'ら', 'ri':'り', 'ru':'る', 're':'れ', 'ro':'ろ', 'wa':'わ', 'wo':'を', 'n':'ん'
    },
    katakana: {
        'a':'ア', 'i':'イ', 'u':'ウ', 'e':'エ', 'o':'オ', 'ka':'カ', 'ki':'キ', 'ku':'ク', 'ke':'ケ', 'ko':'コ', 'sa':'サ', 'shi':'シ', 'su':'ス', 'se':'セ', 'so':'ソ', 'ta':'タ', 'chi':'チ', 'tsu':'ツ', 'te':'テ', 'to':'ト', 'na':'ナ', 'ni':'ニ', 'nu':'ヌ', 'ne':'ネ', 'no':'ノ', 'ha':'ハ', 'hi':'ヒ', 'fu':'フ', 'he':'ヘ', 'ho':'ホ', 'ma':'マ', 'mi':'ミ', 'mu':'ム', 'me':'メ', 'mo':'モ', 'ya':'ヤ', 'yu':'ユ', 'yo':'ヨ', 'ra':'ラ', 'ri':'リ', 'ru':'ル', 're':'レ', 'ro':'ロ', 'wa':'ワ', 'wo':'ヲ', 'n':'ン'
    },
    cherokee: {
        'a':'Ꭰ', 'e':'Ꭱ', 'i':'Ꭲ', 'o':'Ꭳ', 'u':'Ꭴ', 'v':'Ꭵ', 'ga':'Ꭶ', 'ka':'Ꭷ', 'ge':'Ꭸ', 'gi':'Ꭹ', 'go':'Ꭺ', 'gu':'Ꭻ', 'gv':'Ꭼ', 'ha':'Ꭽ', 'he':'Ꭾ', 'hi':'Ꭿ', 'ho':'Ꮀ', 'hu':'Ꮁ', 'hv':'Ꮂ', 'ma':'Ꮉ', 'me':'Ꮊ', 'mi':'Ꮋ', 'mo':'Ꮌ', 'mu':'Ꮍ', 'na':'Ꮎ', 'ne':'Ꮑ', 'ni':'Ꮒ', 'no':'Ꮓ', 'nu':'Ꮔ', 'nv':'Ꮕ', 'sa':'Ꮜ', 'se':'Ꮞ', 'si':'Ꮟ', 'so':'Ꮠ', 'su':'Ꮡ', 'sv':'Ꮢ', 'ta':'Ꮣ', 'te':'Ꮥ', 'ti':'Ꮧ', 'to':'Ꮩ', 'tu':'Ꮪ', 'tv':'Ꮫ'
    },
    inuktitut: {
        'i':'ᐃ', 'u':'ᐅ', 'a':'ᐊ', 'pi':'ᐱ', 'pu':'ᐳ', 'pa':'ᐸ', 'ti':'ᑎ', 'tu':'ᑐ', 'ta':'ᑕ', 'ki':'ᑭ', 'ku':'ᑯ', 'ka':'ᑲ', 'gi':'ᒋ', 'gu':'ᒍ', 'ga':'ᒐ', 'mi':'ᒥ', 'mu':'ᒧ', 'ma':'ᒪ', 'ni':'ᓂ', 'nu':'ᓄ', 'na':'ᓇ', 'si':'ᓯ', 'su':'ᓱ', 'sa':'ᓴ', 'li':'ᓕ', 'lu':'ᓗ', 'la':'ᓚ', 'ji':'ᔨ', 'ju':'ᔪ', 'ja':'ᔭ', 'vi':'ᕕ', 'vu':'ᕗ', 'va':'ᕙ', 'ri':'ᕆ', 'ru':'ᕈ', 'ra':'ᕋ', 'qi':'ᕿ', 'qu':'ᖁ', 'qa':'ᖃ', 'ngi':'ᖏ', 'ngu':'ᖑ', 'nga':'ᖓ'
    },
    hanzi: {
        'sun':'日', 'moon':'月', 'water':'水', 'fire':'火', 'tree':'木', 'earth':'土', 'metal':'金', 'person':'人', 'mouth':'口', 'eye':'目', 'hand':'手', 'foot':'足', 'heart':'心', 'mountain':'山', 'river':'川', 'sky':'天', 'star':'星', 'rain':'雨', 'cloud':'雲', 'wind':'風', 'snow':'雪', 'flower':'花', 'grass':'草', 'bird':'鳥', 'fish':'魚', 'dog':'犬', 'cat':'猫', 'horse':'馬', 'cow':'牛', 'meat':'肉', 'blood':'血', 'bone':'骨', 'stone':'石', 'light':'光', 'dark':'暗', 'big':'大', 'small':'小', 'good':'好', 'bad':'悪', 'high':'高', 'low':'低', 'far':'遠', 'near':'近', 'new':'新', 'old':'古', 'hot':'熱', 'cold':'寒', 'eat':'食', 'drink':'飲', 'see':'見', 'hear':'聞', 'say':'言', 'go':'行', 'come':'来', 'stand':'立', 'sit':'座', 'walk':'歩', 'run':'走', 'sleep':'寝', 'one':'一', 'two':'二', 'three':'三', 'four':'四', 'five':'五', 'six':'六', 'seven':'七', 'eight':'八', 'nine':'九', 'ten':'十', 'hundred':'百', 'thousand':'千', 'white':'白', 'black':'黒', 'red':'赤', 'blue':'青', 'yellow':'黄', 'green':'緑', 'gold':'金', 'silver':'銀'
    },
    hieroglyphs: {
        'sun':'𓇳', 'moon':'𓇹', 'water':'𓈗', 'fire':'𓊵', 'tree':'𓆭', 'earth':'𓇾', 'person':'𓀀', 'mouth':'𓂋', 'eye':'𓁹', 'hand':'𓂧', 'foot':'𓂾', 'heart':'𓄣', 'mountain':'𓈋', 'river':'𓈗', 'sky':'𓇯', 'star':'𓇽', 'bird':'𓅄', 'fish':'𓆟', 'dog':'𓃡', 'cat':'𓃠', 'horse':'𓃗', 'cow':'𓃒', 'meat':'𓄹', 'bone':'𓄤', 'stone':'𓊌', 'light':'𓇳', 'dark':'𓇰', 'big':'𓉻', 'small':'𓈖', 'good':'𓄤', 'bad':'𓃀', 'go':'𓂻', 'come':'𓂻', 'one':'𓏤', 'two':'𓏥', 'three':'𓏦', 'four':'𓏧', 'five':'𓏨'
    },
    hangul_jamo: {
        'g':'ㄱ', 'kk':'ㄲ', 'n':'ㄴ', 'd':'ㄷ', 'tt':'ㄸ', 'r':'ㄹ', 'm':'ㅁ', 'b':'ㅂ', 'pp':'ㅃ', 's':'ㅅ', 'ss':'ㅆ', 'ng':'ㅇ', 'j':'ㅈ', 'jj':'ㅉ', 'ch':'ㅊ', 'k':'ㅋ', 't':'ㅌ', 'p':'ㅍ', 'h':'ㅎ', 'a':'ㅏ', 'ae':'ㅐ', 'ya':'ㅑ', 'yae':'ㅒ', 'eo':'ㅓ', 'e':'ㅔ', 'yeo':'ㅕ', 'ye':'ㅖ', 'o':'ㅗ', 'wa':'ㅘ', 'wae':'ㅙ', 'oe':'ㅚ', 'yo':'ㅛ', 'u':'ㅜ', 'wo':'ㅝ', 'we':'ㅞ', 'wi':'ㅟ', 'yu':'ㅠ', 'eu':'ㅡ', 'ui':'ㅢ', 'i':'ㅣ'
    }
};

export const HANGUL_INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
export const HANGUL_VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
export const HANGUL_FINALS = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

export function composeHangulSyllable(initial, vowel, final = '') {
    const iIdx = HANGUL_INITIALS.indexOf(initial);
    const vIdx = HANGUL_VOWELS.indexOf(vowel);
    const fIdx = HANGUL_FINALS.indexOf(final);

    if (iIdx === -1 || vIdx === -1 || fIdx === -1) return null;

    return String.fromCharCode(0xAC00 + (iIdx * 588) + (vIdx * 28) + fIdx);
}


/**
 * Build the two-way orthography map from consonants/vowels/otherPhonemes.
 * Returns { mapToText, mapToBase }.
 */
export function getOrthographyMap(config) {
    const mapToText = {};
    const mapToBase = {};
    const consonants = config.consonants || '';
    const vowels = config.vowels || '';
    const otherPhonemes = config.otherPhonemes || '';
    const allSounds = `${consonants},${vowels},${otherPhonemes}`.split(',');

    allSounds.forEach(sound => {
        if (sound.includes('=')) {
            const [base, text] = sound.split('=').map(s => s.trim());
            if (base && text) {
                mapToText[base.toLowerCase()] = text;
                mapToBase[text.toLowerCase()] = base.toLowerCase();
            }
        }
    });
    return { mapToText, mapToBase };
}

/**
 * Pure transliteration: memory → screen.
 * Takes a word string and a script-config object (from buildScriptConfig),
 * returns the rendered text.
 */
export function transliterateText(word, config, lexicon = []) {
    if (!word) return '';
    let cleanWord = word.replace(/\*/g, '');

    const phonologyTypes = config.phonologyTypes;
    const alphabeticScript = config.alphabeticScript;
    const alphabetGlyphs = config.alphabetGlyphs || {};
    const syllabaryMap = config.syllabaryMap || {};
    const syllabificationAlgorithm = config.syllabificationAlgorithm || 'ltr';
    const consonants = config.consonants || '';
    const vowels = config.vowels || '';
    const typographySettings = config.typographySettings || {};
    const activeDisplayMode = typographySettings.activeDisplayMode || 'Base';
    
    const isLinearScript = ['alphabetic', 'abjad', 'abugida'].includes(phonologyTypes) || !phonologyTypes;

    if (isLinearScript) {
        const { mapToText } = getOrthographyMap(config);

        let scriptMap = {};
        if (alphabeticScript && alphabeticScript !== 'latin' && alphabeticScript !== 'custom') {
            scriptMap = { ...(SCRIPT_MAPS[alphabeticScript] || {}) };
        }

        // Parse all defined phonemes (base forms) so multi-character entries
        // like 'aa', 'ee', 'sh', 'th' etc. participate in longest-match-first.
        const parsePhonemeBase = (str) => (str || '').split(',').map(s => {
            let clean = s.trim();
            if (clean.includes('=')) clean = clean.split('=')[0].trim();
            return clean.toLowerCase();
        }).filter(Boolean);

        const allPhonemes = [
            ...parsePhonemeBase(consonants),
            ...parsePhonemeBase(vowels),
            ...parsePhonemeBase(config.otherPhonemes),
        ];

        const allBases = new Set([
            ...Object.keys(mapToText),
            ...Object.keys(scriptMap),
            ...Object.keys(alphabetGlyphs).map(k => k.split('_')[0]),
            ...allPhonemes,
        ]);

        const sortedBases = Array.from(allBases).sort((a, b) => b.length - a.length);

        let out = '';
        let i = 0;
        const rawWord = cleanWord;
        const lowerWord = rawWord.toLowerCase();

        while (i < lowerWord.length) {
            let matchFound = null;
            
            for (let base of sortedBases) {
                if (lowerWord.startsWith(base, i)) {
                    const match = base;
                    const originalStr = rawWord.substring(i, i + match.length);
                    const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                    const isInitial = i === 0 || !/[a-zA-Z]/.test(rawWord[i - 1]);
                    const isFinal = i + match.length === rawWord.length || !/[a-zA-Z]/.test(rawWord[i + match.length]);

                    let mappedChar = null;

                    // 1. Alphabet Glyphs (highest priority)
                    if (activeDisplayMode !== 'Base') {
                        const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                        if (alphabetGlyphs[`${match}${modeSuffix}`]) {
                            mappedChar = alphabetGlyphs[`${match}${modeSuffix}`];
                        }
                    }
                    if (!mappedChar && isCapitalized && alphabetGlyphs[`${match}_uppercase`]) {
                        mappedChar = alphabetGlyphs[`${match}_uppercase`];
                    }
                    if (!mappedChar && alphabetGlyphs[match]) {
                        mappedChar = alphabetGlyphs[match];
                    }

                    // 2. Script mappings
                    if (!mappedChar && scriptMap[match]) {
                        mappedChar = scriptMap[match];
                    }

                    // 3. Custom mappings
                    if (!mappedChar && mapToText[match]) {
                        mappedChar = mapToText[match];
                    }

                    // If a mapping resolved to a Latin/base character (like 'sh' -> 'ʃ'),
                    // check if that resulting character has a custom drawn glyph.
                    if (mappedChar && !mappedChar.match(/[\uE000-\uF8FF]/)) {
                        if (activeDisplayMode !== 'Base' && alphabetGlyphs[`${mappedChar}_${activeDisplayMode.toLowerCase()}`]) {
                            mappedChar = alphabetGlyphs[`${mappedChar}_${activeDisplayMode.toLowerCase()}`];
                        } else if (isCapitalized && alphabetGlyphs[`${mappedChar}_uppercase`]) {
                            mappedChar = alphabetGlyphs[`${mappedChar}_uppercase`];
                        } else if (alphabetGlyphs[mappedChar]) {
                            mappedChar = alphabetGlyphs[mappedChar];
                        }
                    }

                    // If we STILL don't have a mappedChar, it means this base was in the phonology list
                    // but hasn't been drawn or aliased yet. We should ignore this match and let the 
                    // transliterator fall back to shorter matches (e.g. 'aa' falls back to 'a' + 'a').
                    if (!mappedChar) {
                        continue;
                    }

                    if (isCapitalized && !mappedChar.match(/[\uE000-\uF8FF]/)) {
                        if (!alphabetGlyphs[`${match}_uppercase`]) {
                            out += mappedChar.toUpperCase();
                        } else {
                            out += mappedChar;
                        }
                    } else {
                        out += mappedChar;
                    }
                    
                    matchFound = match;
                    break;
                }
            }

            if (matchFound) {
                i += matchFound.length;
            } else {
                out += rawWord[i];
                i++;
            }
        }
        return out;
    }

    if (phonologyTypes === 'syllabic' || phonologyTypes === 'featural_block') {
        const fallbackMap = SCRIPT_MAPS[alphabeticScript] || {};
        const effectiveSyllabaryMap = { ...fallbackMap, ...syllabaryMap };
        const syllables = Object.keys(effectiveSyllabaryMap).sort((a, b) => b.length - a.length);
        const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord);
        let sourceStr = (dictEntry && dictEntry.ideogram) ? dictEntry.ideogram : cleanWord;

        // Apply Tone Mapping preprocessing so the text matches the generated blocks
        const toneMap = config.blockSettings?.toneMap || [];
        for (const mapping of toneMap) {
            const replacement = mapping.output !== undefined ? mapping.output : ((mapping.base || '') + (mapping.tone || ''));
            if (mapping.toned && replacement) {
                sourceStr = sourceStr.split(mapping.toned.toLowerCase()).join(replacement.toLowerCase());
            }
        }

        const blocks = sourceStr.split('.');
        let finalOut = '';

        blocks.forEach(rawBlock => {
            let block = rawBlock;
            if (rawBlock.includes(':') && !syllabaryMap[rawBlock]) {
                block = rawBlock.split(':')[0];
            }

            let out = '';
            if (syllabificationAlgorithm === 'rtl') {
                let i = block.length;
                while (i > 0) {
                    let match = null;
                    for (let syl of syllables) {
                        if (i - syl.length >= 0 && block.substring(i - syl.length, i).toLowerCase() === syl && effectiveSyllabaryMap[syl]) {
                            match = syl; break;
                        }
                    }
                    if (match) {
                        const originalStr = block.substring(i - match.length, i);
                        const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                        let mappedChar = null;
                        if (activeDisplayMode !== 'Base') {
                            const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                            if (effectiveSyllabaryMap[`${match}${modeSuffix}`]) {
                                mappedChar = effectiveSyllabaryMap[`${match}${modeSuffix}`];
                            }
                        }
                        if (!mappedChar && isCapitalized && effectiveSyllabaryMap[`${match}_uppercase`]) {
                            mappedChar = effectiveSyllabaryMap[`${match}_uppercase`];
                        }
                        if (!mappedChar) mappedChar = effectiveSyllabaryMap[match];
                        out = mappedChar + out;
                        i -= match.length;
                    } else {
                        out = block[i - 1] + out;
                        i--;
                    }
                }
            } else {
                let i = 0;
                while (i < block.length) {
                    let match = null;
                    for (let syl of syllables) {
                        if (block.substring(i).toLowerCase().startsWith(syl) && effectiveSyllabaryMap[syl]) {
                            match = syl; break;
                        }
                    }
                    if (match) {
                        const originalStr = block.substring(i, i + match.length);
                        const isCapitalized = originalStr[0] !== originalStr[0].toLowerCase();
                        let mappedChar = null;
                        if (activeDisplayMode !== 'Base') {
                            const modeSuffix = `_${activeDisplayMode.toLowerCase()}`;
                            if (effectiveSyllabaryMap[`${match}${modeSuffix}`]) {
                                mappedChar = effectiveSyllabaryMap[`${match}${modeSuffix}`];
                            }
                        }
                        if (!mappedChar && isCapitalized && effectiveSyllabaryMap[`${match}_uppercase`]) {
                            mappedChar = effectiveSyllabaryMap[`${match}_uppercase`];
                        }
                        if (!mappedChar) mappedChar = effectiveSyllabaryMap[match];
                        out += mappedChar;
                        i += match.length;
                    } else {
                        out += block[i];
                        i++;
                    }
                }
            }
            finalOut += out;
        });

        return finalOut;
    }

    if (phonologyTypes === 'logographic') {
        const fallbackMap = SCRIPT_MAPS[alphabeticScript] || {};
        const dictEntry = lexicon.find(e => e.word.replace(/\*/g, '').toLowerCase() === cleanWord.toLowerCase());
        
        if (dictEntry && dictEntry.ideogram) {
            return dictEntry.ideogram;
        }

        // Try mapping the translation to a logographic fallback
        if (dictEntry && dictEntry.translation) {
            const trans = dictEntry.translation.toLowerCase();
            if (fallbackMap[trans]) return fallbackMap[trans];
            
            // Check comma-separated definitions
            const subwords = trans.split(',').map(s => s.trim());
            for (let w of subwords) {
                if (fallbackMap[w]) return fallbackMap[w];
            }
        }
        
        return cleanWord;
    }

    return cleanWord;
}

/**
 * Pure normalizer: screen → memory.
 * Reverses transliteration back to base form.
 */
export function normalizeToBase(word, config) {
    if (!word) return '';
    const phonologyTypes = config.phonologyTypes;
    const isLinearScript = ['alphabetic', 'abjad', 'abugida'].includes(phonologyTypes) || !phonologyTypes;
    
    if (!isLinearScript) return word;

    const alphabeticScript = config.alphabeticScript;
    const alphabetGlyphs = config.alphabetGlyphs || {};

    const { mapToBase } = getOrthographyMap(config);
    let baseWord = word;

    for (const [text, base] of Object.entries(mapToBase)) {
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'gi');
        baseWord = baseWord.replace(regex, (match) => {
            if (match === match.toUpperCase() && match !== match.toLowerCase()) return base.toUpperCase();
            if (match[0] === match[0].toUpperCase()) return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
            return base.toLowerCase();
        });
    }

    let scriptMapToReverse = {};
    if (alphabeticScript && alphabeticScript !== 'latin' && alphabeticScript !== 'custom') {
        Object.entries(SCRIPT_MAPS[alphabeticScript] || {}).forEach(([base, text]) => {
            scriptMapToReverse[text] = base;
        });
    }

    Object.entries(alphabetGlyphs).forEach(([key, text]) => {
        let base = key.split('_')[0];
        if (key.includes('_uppercase')) base = base.toUpperCase();
        scriptMapToReverse[text] = base;
    });

    if (Object.keys(scriptMapToReverse).length > 0) {
        for (const [text, base] of Object.entries(scriptMapToReverse)) {
            const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedText, 'gi');
            baseWord = baseWord.replace(regex, (match) => {
                if (!match.match(/[\uE000-\uF8FF]/) && match === match.toUpperCase() && match !== match.toLowerCase()) {
                    return base.charAt(0).toUpperCase() + base.slice(1);
                }
                return base;
            });
        }
    }

    return baseWord;
}
