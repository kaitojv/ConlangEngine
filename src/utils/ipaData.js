// src/utils/ipaData.js
// Shared IPA chart data + phoneme metadata.
// Audio uses Wikimedia Commons Special:FilePath — no hash needed, server redirects automatically.

export const IPA_COLUMNS = [
    'Bilabial', 'Labiodental', 'Dental', 'Alveolar',
    'Postalveolar', 'Retroflex', 'Palatal', 'Velar',
    'Uvular', 'Pharyngeal', 'Glottal'
];

export const IPA_PULMONIC = [
    { row: 'Plosive',              cells: [['p','b'], null, null, ['t','d'], null, ['ʈ','ɖ'], ['c','ɟ'], ['k','g'], ['q','ɢ'], null, ['ʔ', null]] },
    { row: 'Nasal',                cells: [['m',null], ['ɱ',null], null, ['n',null], null, ['ɳ',null], ['ɲ',null], ['ŋ',null], ['ɴ',null], null, null] },
    { row: 'Trill',                cells: [['ʙ',null], null, null, ['r',null], null, null, null, null, ['ʀ',null], null, null] },
    { row: 'Tap or Flap',          cells: [[null,'ⱱ'], null, null, ['ɾ',null], null, ['ɽ',null], null, null, null, null, null] },
    { row: 'Fricative',            cells: [['ɸ','β'], ['f','v'], ['θ','ð'], ['s','z'], ['ʃ','ʒ'], ['ʂ','ʐ'], ['ç','ʝ'], ['x','ɣ'], ['χ','ʁ'], ['ħ','ʕ'], ['h','ɦ']] },
    { row: 'Lateral Fricative',    cells: [null, null, null, ['ɬ','ɮ'], null, null, null, null, null, null, null] },
    { row: 'Approximant',          cells: [null, ['ʋ',null], null, ['ɹ',null], null, ['ɻ',null], ['j',null], ['ɰ',null], null, null, null] },
    { row: 'Lateral Approximant',  cells: [null, null, null, ['l',null], null, ['ɭ',null], ['ʎ',null], ['ʟ',null], null, null, null] }
];

export const IPA_VOWELS = [
    { label: 'Close',      sounds: ['i','y','ɨ','ʉ','ɯ','u'] },
    { label: 'Near-close', sounds: ['ɪ','ʏ',null,null,null,'ʊ'] },
    { label: 'Close-mid',  sounds: ['e','ø','ɘ','ɵ','ɤ','o'] },
    { label: 'Mid',        sounds: [null,null,'ə',null,null,null] },
    { label: 'Open-mid',   sounds: ['ɛ','œ','ɜ','ɞ','ʌ','ɔ'] },
    { label: 'Near-open',  sounds: ['æ',null,'ɐ',null,null,null] },
    { label: 'Open',       sounds: ['a','ɶ',null,null,'ɑ','ɒ'] },
];

export const IPA_NON_PULMONIC = [
    { title: 'Clicks',            sounds: ['ʘ','ǀ','ǃ','ǂ','ǁ'] },
    { title: 'Voiced Implosives', sounds: ['ɓ','ɗ','ʄ','ɠ','ʛ'] },
    { title: 'Ejectives',         sounds: ["p'","t'","k'","s'"] }
];

export const IPA_OTHER_CONSONANTS = [
    'ʍ','w','ɥ','ʜ','ʢ','ʡ','ɕ','ʑ','ɺ','ɧ','t͡s','d͡z','t͡ʃ','d͡ʒ','t͡ɕ','d͡ʑ'
];

export const IPA_SUPRASEGMENTALS = [
    { title: 'Stress & Length',   sounds: ['ˈ','ˌ','ː','ˑ'] },
    { title: 'Tone & Intonation', sounds: ['˥','˦','˧','˨','˩','↗','↘'] },
    { title: 'Boundaries',        sounds: ['|','‖','.','‿'] },
];

export const IPA_DIACRITICS = [
    { title: 'Voicing',           sounds: ['̥','̬'] },
    { title: 'Aspiration',        sounds: ['ʰ'] },
    { title: 'Nasalization',      sounds: ['̃'] },
    { title: 'Labialization',     sounds: ['ʷ'] },
    { title: 'Palatalization',    sounds: ['ʲ'] },
    { title: 'Velarization',      sounds: ['ˠ'] },
    { title: 'Pharyngealization', sounds: ['ˤ'] },
    { title: 'Syllabic',          sounds: ['̩'] },
    { title: 'Release',           sounds: ['̚'] },
];

// ─── Audio URL helper ─────────────────────────────────────────────────────────
// Wikimedia Commons Special:FilePath redirects automatically — no hash needed.
const WM = (filename) => `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;

// ─── Per-phoneme metadata ─────────────────────────────────────────────────────
export const IPA_INFO = {
    // ── PLOSIVES ──
    'p':  { name:'Voiceless bilabial plosive',          place:'Bilabial',     manner:'Plosive',           voiced:false, isVowel:false, description:'Both lips press together to stop airflow completely, then release in a burst. Vocal cords are silent.', example:'"p" in English "spin"',        audio:WM('Voiceless_bilabial_plosive.ogg') },
    'b':  { name:'Voiced bilabial plosive',              place:'Bilabial',     manner:'Plosive',           voiced:true,  isVowel:false, description:'Both lips press together to block airflow, then release. Vocal cords vibrate throughout.',            example:'"b" in English "bed"',         audio:WM('Voiced_bilabial_plosive.ogg') },
    't':  { name:'Voiceless alveolar plosive',           place:'Alveolar',     manner:'Plosive',           voiced:false, isVowel:false, description:'Tongue tip touches the alveolar ridge (just behind upper teeth) to block airflow, then releases sharply.', example:'"t" in English "stop"',     audio:WM('Voiceless_alveolar_plosive.ogg') },
    'd':  { name:'Voiced alveolar plosive',              place:'Alveolar',     manner:'Plosive',           voiced:true,  isVowel:false, description:'Tongue tip touches the alveolar ridge to block airflow, then releases. Vocal cords vibrate.',          example:'"d" in English "dog"',         audio:WM('Voiced_alveolar_plosive.ogg') },
    'k':  { name:'Voiceless velar plosive',              place:'Velar',        manner:'Plosive',           voiced:false, isVowel:false, description:'Back of tongue presses against the soft palate to stop airflow, then releases sharply. No voicing.',   example:'"k" in English "sky"',         audio:WM('Voiceless_velar_plosive.ogg') },
    'g':  { name:'Voiced velar plosive',                 place:'Velar',        manner:'Plosive',           voiced:true,  isVowel:false, description:'Back of tongue presses against the velum to stop airflow, then releases with vocal cord vibration.',   example:'"g" in English "go"',          audio:WM('Voiced_velar_plosive.ogg') },
    'q':  { name:'Voiceless uvular plosive',             place:'Uvular',       manner:'Plosive',           voiced:false, isVowel:false, description:'Back of tongue presses against the uvula to block airflow. Produced further back than /k/.',           example:'Arabic "qamar" (moon)',         audio:WM('Voiceless_uvular_plosive.ogg') },
    'ɢ':  { name:'Voiced uvular plosive',                place:'Uvular',       manner:'Plosive',           voiced:true,  isVowel:false, description:'Like /q/ but with vocal cord vibration. A voiced stop at the uvula.',                                 example:'Some Arabic dialects',         audio:null },
    'ʔ':  { name:'Glottal stop',                         place:'Glottal',      manner:'Plosive',           voiced:false, isVowel:false, description:'The vocal cords themselves close completely, blocking airflow, then snap open. The "uh-oh" catch.',     example:'"uh-oh" in English',           audio:WM('Glottal_stop.ogg') },
    'ʈ':  { name:'Voiceless retroflex plosive',          place:'Retroflex',    manner:'Plosive',           voiced:false, isVowel:false, description:'Tongue tip curls back to touch the post-alveolar area. Common in South Asian languages.',              example:'Hindi "ṭ"',                    audio:WM('Voiceless_retroflex_stop.oga') },
    'ɖ':  { name:'Voiced retroflex plosive',             place:'Retroflex',    manner:'Plosive',           voiced:true,  isVowel:false, description:'Like /ʈ/ but voiced. Tongue tip curled back, with vocal cord vibration.',                             example:'Hindi "ḍ"',                    audio:null },
    'c':  { name:'Voiceless palatal plosive',            place:'Palatal',      manner:'Plosive',           voiced:false, isVowel:false, description:'Tongue body presses against the hard palate. Found in Hungarian and other languages.',                  example:'Hungarian "ty"',               audio:WM('Voiceless_palatal_plosive.ogg') },
    'ɟ':  { name:'Voiced palatal plosive',               place:'Palatal',      manner:'Plosive',           voiced:true,  isVowel:false, description:'Like /c/ but voiced. Tongue body against hard palate with vibrating vocal cords.',                     example:'Hungarian "gy"',               audio:WM('Voiced_palatal_plosive.ogg') },

    // ── NASALS ──
    'm':  { name:'Bilabial nasal',                       place:'Bilabial',     manner:'Nasal',             voiced:true,  isVowel:false, description:'Both lips close while air flows through the nose. Vocal cords vibrate. One of the most universal sounds.', example:'"m" in English "man"',      audio:WM('Bilabial_nasal.ogg') },
    'n':  { name:'Alveolar nasal',                       place:'Alveolar',     manner:'Nasal',             voiced:true,  isVowel:false, description:'Tongue tip touches the alveolar ridge while air flows through the nose. Vocal cords vibrate.',           example:'"n" in English "noon"',        audio:WM('Alveolar_nasal.ogg') },
    'ŋ':  { name:'Velar nasal',                          place:'Velar',        manner:'Nasal',             voiced:true,  isVowel:false, description:'Back of tongue rises to the velum while air flows through the nose. The final sound in "ring".',          example:'"ng" in English "ring"',       audio:WM('Velar_nasal.ogg') },
    'ɱ':  { name:'Labiodental nasal',                    place:'Labiodental',  manner:'Nasal',             voiced:true,  isVowel:false, description:'Lower lip touches upper teeth while air flows through the nose. Rare phonemically but common in clusters.', example:'Before /f/ or /v/',          audio:WM('Voiced_labiodental_nasal.ogg') },
    'ɲ':  { name:'Palatal nasal',                        place:'Palatal',      manner:'Nasal',             voiced:true,  isVowel:false, description:'Tongue body presses against the hard palate while air escapes through the nose.',                        example:'Spanish "ñ" in "niño"',        audio:WM('Palatal_nasal.ogg') },
    'ɳ':  { name:'Retroflex nasal',                      place:'Retroflex',    manner:'Nasal',             voiced:true,  isVowel:false, description:'Tongue tip curled back touches post-alveolar region while air flows through nose. Used in South Asian.',  example:'Hindi "ṇ"',                    audio:WM('Retroflex_nasal.ogg') },
    'ɴ':  { name:'Uvular nasal',                         place:'Uvular',       manner:'Nasal',             voiced:true,  isVowel:false, description:'Back of tongue contacts the uvula while air escapes through the nose. Rare cross-linguistically.',        example:'Some Japanese dialects',       audio:WM('Uvular_nasal.ogg') },

    // ── TRILLS ──
    'r':  { name:'Alveolar trill',                       place:'Alveolar',     manner:'Trill',             voiced:true,  isVowel:false, description:'Tongue tip vibrates rapidly against the alveolar ridge due to the airstream passing through.',            example:'Spanish "rr" in "perro"',      audio:WM('Alveolar_trill.ogg') },
    'ʙ':  { name:'Bilabial trill',                       place:'Bilabial',     manner:'Trill',             voiced:true,  isVowel:false, description:'Both lips vibrate rapidly against each other from the passing airstream.',                                 example:'Used in Nias (Indonesia)',     audio:WM('Bilabial_trill.ogg') },
    'ʀ':  { name:'Uvular trill',                         place:'Uvular',       manner:'Trill',             voiced:true,  isVowel:false, description:'The uvula vibrates against the back of the tongue. This is the "French R" sound.',                        example:'French "r" in "rouge"',        audio:WM('Uvular_trill.ogg') },

    // ── TAPS & FLAPS ──
    'ɾ':  { name:'Alveolar tap',                         place:'Alveolar',     manner:'Tap / Flap',        voiced:true,  isVowel:false, description:'Tongue tip makes a single quick contact with the alveolar ridge. Very brief, unlike a full trill.',       example:'"r" in Spanish "para"',        audio:WM('Alveolar_tap.ogg') },
    'ɽ':  { name:'Retroflex flap',                       place:'Retroflex',    manner:'Tap / Flap',        voiced:true,  isVowel:false, description:'Tongue tip curled back makes a single flap against the post-alveolar region.',                            example:'Used in Hindi and Bengali',    audio:null },

    // ── FRICATIVES ──
    'f':  { name:'Voiceless labiodental fricative',      place:'Labiodental',  manner:'Fricative',         voiced:false, isVowel:false, description:'Lower lip touches upper front teeth. Air forced through the narrow gap creates friction. No voicing.',    example:'"f" in English "fan"',         audio:WM('Voiceless_labiodental_fricative.ogg') },
    'v':  { name:'Voiced labiodental fricative',         place:'Labiodental',  manner:'Fricative',         voiced:true,  isVowel:false, description:'Lower lip touches upper front teeth. Air creates friction while vocal cords vibrate.',                     example:'"v" in English "van"',         audio:WM('Voiced_labiodental_fricative.ogg') },
    'θ':  { name:'Voiceless dental fricative',           place:'Dental',       manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue tip between or behind upper front teeth. Air forced through creates friction. No voicing.',         example:'"th" in English "thin"',       audio:WM('Voiceless_dental_fricative.ogg') },
    'ð':  { name:'Voiced dental fricative',              place:'Dental',       manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /θ/ but with vocal cord vibration. Tongue tip at upper teeth, with air friction.',                   example:'"th" in English "this"',       audio:WM('Voiced_dental_fricative.ogg') },
    's':  { name:'Voiceless alveolar fricative',         place:'Alveolar',     manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue tip near the alveolar ridge. Airstream forced through a narrow channel creates a hissing sound.',  example:'"s" in English "sun"',         audio:WM('Voiceless_alveolar_sibilant.ogg') },
    'z':  { name:'Voiced alveolar fricative',            place:'Alveolar',     manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /s/ but with vocal cord vibration. The buzzed version of "s".',                                      example:'"z" in English "zoo"',         audio:WM('Voiced_alveolar_sibilant.ogg') },
    'ʃ':  { name:'Voiceless postalveolar fricative',     place:'Postalveolar', manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue tip or blade near the postalveolar region. Lips often rounded. Creates a hushing sound.',          example:'"sh" in English "ship"',       audio:WM('Voiceless_palato-alveolar_sibilant.ogg') },
    'ʒ':  { name:'Voiced postalveolar fricative',        place:'Postalveolar', manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /ʃ/ but voiced. The buzzing "sh" sound.',                                                           example:'"s" in English "vision"',      audio:WM('Voiced_palato-alveolar_sibilant.ogg') },
    'x':  { name:'Voiceless velar fricative',            place:'Velar',        manner:'Fricative',         voiced:false, isVowel:false, description:'Back of tongue raised near the velum. Air forced through creates friction. No voicing.',                   example:'German "ch" in "Bach"',        audio:WM('Voiceless_velar_fricative.ogg') },
    'ɣ':  { name:'Voiced velar fricative',               place:'Velar',        manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /x/ but voiced. Common in Greek and Arabic.',                                                        example:'Greek "γ" in "γάλα"',          audio:WM('Voiced_velar_fricative.ogg') },
    'h':  { name:'Voiceless glottal fricative',          place:'Glottal',      manner:'Fricative',         voiced:false, isVowel:false, description:'Air passes through the open glottis creating turbulence. The vocal tract is wide open.',                   example:'"h" in English "hat"',         audio:WM('Voiceless_glottal_fricative.ogg') },
    'ɦ':  { name:'Voiced glottal fricative',             place:'Glottal',      manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /h/ but with slight vocal cord vibration. Breathy quality.',                                          example:'Czech "h"',                    audio:WM('Voiced_glottal_fricative.ogg') },
    'ɸ':  { name:'Voiceless bilabial fricative',         place:'Bilabial',     manner:'Fricative',         voiced:false, isVowel:false, description:'Both lips nearly closed, air squeezed through creating friction. No voicing.',                             example:'Japanese "f" in "Fuji"',       audio:WM('Voiceless_bilabial_fricative.ogg') },
    'β':  { name:'Voiced bilabial fricative',            place:'Bilabial',     manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /ɸ/ but voiced. Spanish "v/b" between vowels.',                                                      example:'Spanish "b/v" mid-word',       audio:WM('Voiced_bilabial_fricative.ogg') },
    'ç':  { name:'Voiceless palatal fricative',          place:'Palatal',      manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue body raised toward hard palate, air forced through the narrow gap.',                                 example:'German "ch" in "ich"',         audio:WM('Voiceless_palatal_fricative.ogg') },
    'ʝ':  { name:'Voiced palatal fricative',             place:'Palatal',      manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /ç/ but voiced. Tongue body near hard palate with vibrating cords.',                                  example:'Spanish "y" in some dialects', audio:null },
    'χ':  { name:'Voiceless uvular fricative',           place:'Uvular',       manner:'Fricative',         voiced:false, isVowel:false, description:'Back of tongue near the uvula, air forced through the gap creates strong friction.',                        example:'Arabic "خ" kha',               audio:WM('Voiceless_uvular_fricative.ogg') },
    'ʁ':  { name:'Voiced uvular fricative',              place:'Uvular',       manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /χ/ but voiced. The guttural "R" in French and German.',                                              example:'French "r" in "Paris"',        audio:WM('Voiced_uvular_fricative.ogg') },
    'ħ':  { name:'Voiceless pharyngeal fricative',       place:'Pharyngeal',   manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue root retracted toward the pharyngeal wall, producing tense friction deep in the throat.',            example:'Arabic "ح" ħa',                audio:WM('Voiceless_pharyngeal_fricative.ogg') },
    'ʕ':  { name:'Voiced pharyngeal fricative',          place:'Pharyngeal',   manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /ħ/ but voiced. A tight, strident sound from the deep throat.',                                       example:'Arabic "ع" ʕayn',              audio:WM('Voiced_pharyngeal_fricative.ogg') },
    'ʂ':  { name:'Voiceless retroflex fricative',        place:'Retroflex',    manner:'Fricative',         voiced:false, isVowel:false, description:'Tongue tip curled back near post-alveolar. Air friction with no voicing. Used in Mandarin.',                example:'Mandarin "sh"',                audio:WM('Voiceless_retroflex_fricative.ogg') },
    'ʐ':  { name:'Voiced retroflex fricative',           place:'Retroflex',    manner:'Fricative',         voiced:true,  isVowel:false, description:'Like /ʂ/ but voiced. Tongue tip curled back, voiced friction.',                                            example:'Mandarin "r" in "rén"',        audio:null },
    'ɬ':  { name:'Voiceless alveolar lateral fricative', place:'Alveolar',     manner:'Lateral Fricative', voiced:false, isVowel:false, description:'Tongue tip touches alveolar ridge while air flows around the sides, creating lateral friction.',            example:'Welsh "ll"',                   audio:WM('Voiceless_alveolar_lateral_fricative.ogg') },
    'ɮ':  { name:'Voiced alveolar lateral fricative',    place:'Alveolar',     manner:'Lateral Fricative', voiced:true,  isVowel:false, description:'Like /ɬ/ but voiced. Lateral airflow with voicing.',                                                       example:'Some Mongolian dialects',      audio:null },

    // ── APPROXIMANTS ──
    'j':  { name:'Palatal approximant',                  place:'Palatal',      manner:'Approximant',       voiced:true,  isVowel:false, description:'Tongue body approaches the hard palate but does not create friction.',                                     example:'"y" in English "yes"',         audio:WM('Palatal_approximant.ogg') },
    'w':  { name:'Voiced labio-velar approximant',       place:'Velar',        manner:'Approximant',       voiced:true,  isVowel:false, description:'Lips rounded and tongue back raised toward velum simultaneously. A semi-vowel.',                            example:'"w" in English "wet"',         audio:WM('Voiced_labio-velar_approximant.ogg') },
    'ɹ':  { name:'Alveolar approximant',                 place:'Alveolar',     manner:'Approximant',       voiced:true,  isVowel:false, description:'Tongue tip approaches (but does not touch) the alveolar ridge. The English "R" sound.',                    example:'"r" in American English',      audio:WM('Alveolar_approximant.ogg') },
    'ɰ':  { name:'Velar approximant',                    place:'Velar',        manner:'Approximant',       voiced:true,  isVowel:false, description:'Tongue back approaches the velum without friction. Like the vowel /ɯ/ used as a consonant.',                example:'Korean ㅇ (null onset)',        audio:null },
    'ʋ':  { name:'Labiodental approximant',              place:'Labiodental',  manner:'Approximant',       voiced:true,  isVowel:false, description:'Lower lip approaches upper teeth but does not create significant friction.',                                 example:'Dutch "v"',                    audio:WM('Voiced_labiodental_approximant.ogg') },
    'ɻ':  { name:'Retroflex approximant',                place:'Retroflex',    manner:'Approximant',       voiced:true,  isVowel:false, description:'Tongue tip curled back approaches (without touching) the post-alveolar area.',                              example:'Mandarin "r" initial',         audio:null },
    'l':  { name:'Alveolar lateral approximant',         place:'Alveolar',     manner:'Lateral Approx.',   voiced:true,  isVowel:false, description:'Tongue tip touches the alveolar ridge while air flows around the sides of the tongue.',                    example:'"l" in English "leaf"',        audio:WM('Alveolar_lateral_approximant.ogg') },
    'ɭ':  { name:'Retroflex lateral approximant',        place:'Retroflex',    manner:'Lateral Approx.',   voiced:true,  isVowel:false, description:'Like /l/ but with the tongue tip curled back. Common in Dravidian languages.',                             example:'Tamil lateral',                audio:null },
    'ʎ':  { name:'Palatal lateral approximant',          place:'Palatal',      manner:'Lateral Approx.',   voiced:true,  isVowel:false, description:'Tongue body against hard palate, lateral airflow. The Italian "gl" or Spanish "ll".',                      example:'Italian "gli"',                audio:WM('Palatal_lateral_approximant.ogg') },
    'ʟ':  { name:'Velar lateral approximant',            place:'Velar',        manner:'Lateral Approx.',   voiced:true,  isVowel:false, description:'Back of tongue near the velum with lateral airflow. A rare sound.',                                        example:'Some languages in PNG',        audio:null },

    // ── VOWELS ──
    'i':  { name:'Close front unrounded vowel',          place:'Front',        manner:'Close',    voiced:true, isVowel:true, height:'Close',     backness:'Front',   rounded:false, description:'Tongue high and forward, lips spread. The highest front vowel.',                                              example:'"ee" in English "see"',        audio:WM('Close_front_unrounded_vowel.ogg') },
    'y':  { name:'Close front rounded vowel',            place:'Front',        manner:'Close',    voiced:true, isVowel:true, height:'Close',     backness:'Front',   rounded:true,  description:'Like /i/ but with rounded lips. Present in French and German.',                                              example:'French "u" in "lune"',         audio:WM('Close_front_rounded_vowel.ogg') },
    'ɨ':  { name:'Close central unrounded vowel',        place:'Central',      manner:'Close',    voiced:true, isVowel:true, height:'Close',     backness:'Central', rounded:false, description:'Tongue high and central, lips unrounded. Between /i/ and /ɯ/.',                                              example:'Romanian "î/â"',               audio:WM('Close_central_unrounded_vowel.ogg') },
    'ɯ':  { name:'Close back unrounded vowel',           place:'Back',         manner:'Close',    voiced:true, isVowel:true, height:'Close',     backness:'Back',    rounded:false, description:'Tongue high and back, lips spread (unrounded). Found in Turkish and Korean.',                                example:'Turkish "ı"',                   audio:WM('Close_back_unrounded_vowel.ogg') },
    'u':  { name:'Close back rounded vowel',             place:'Back',         manner:'Close',    voiced:true, isVowel:true, height:'Close',     backness:'Back',    rounded:true,  description:'Tongue high and back, lips rounded. One of the most common vowels cross-linguistically.',                    example:'"oo" in English "moon"',       audio:WM('Close_back_rounded_vowel.ogg') },
    'ɪ':  { name:'Near-close front unrounded vowel',     place:'Front',        manner:'Near-close',voiced:true,isVowel:true, height:'Near-close',backness:'Front',   rounded:false, description:'Like /i/ but with the tongue slightly lower and more central.',                                                example:'"i" in English "bit"',         audio:WM('Near-close_near-front_unrounded_vowel.ogg') },
    'ʏ':  { name:'Near-close front rounded vowel',       place:'Front',        manner:'Near-close',voiced:true,isVowel:true, height:'Near-close',backness:'Front',   rounded:true,  description:'Like /y/ but with tongue slightly lower. Found in Swedish and Norwegian.',                                    example:'Swedish "y" in "nytt"',        audio:null },
    'ʊ':  { name:'Near-close back rounded vowel',        place:'Back',         manner:'Near-close',voiced:true,isVowel:true, height:'Near-close',backness:'Back',    rounded:true,  description:'Like /u/ but with tongue slightly lower and more central.',                                                   example:'"u" in English "put"',         audio:WM('Near-close_near-back_rounded_vowel.ogg') },
    'e':  { name:'Close-mid front unrounded vowel',      place:'Front',        manner:'Close-mid',voiced:true, isVowel:true, height:'Close-mid', backness:'Front',   rounded:false, description:'Tongue mid-high and forward, lips spread. A pure "e" with no diphthonging.',                                 example:'"é" in French "été"',          audio:WM('Close-mid_front_unrounded_vowel.ogg') },
    'ø':  { name:'Close-mid front rounded vowel',        place:'Front',        manner:'Close-mid',voiced:true, isVowel:true, height:'Close-mid', backness:'Front',   rounded:true,  description:'Like /e/ but with rounded lips. German "ö" and French "eu".',                                               example:'German "ö" in "schön"',        audio:WM('Close-mid_front_rounded_vowel.ogg') },
    'ɤ':  { name:'Close-mid back unrounded vowel',       place:'Back',         manner:'Close-mid',voiced:true, isVowel:true, height:'Close-mid', backness:'Back',    rounded:false, description:'Tongue mid-high and back, lips unrounded. A rare vowel.',                                                     example:'Some Korean vowels',           audio:null },
    'o':  { name:'Close-mid back rounded vowel',         place:'Back',         manner:'Close-mid',voiced:true, isVowel:true, height:'Close-mid', backness:'Back',    rounded:true,  description:'Tongue mid-high and back, lips rounded. The pure "o" found in most languages.',                              example:'"o" in Spanish "sol"',         audio:WM('Close-mid_back_rounded_vowel.ogg') },
    'ə':  { name:'Mid central vowel (schwa)',             place:'Central',      manner:'Mid',      voiced:true, isVowel:true, height:'Mid',       backness:'Central', rounded:false, description:'The most neutral vowel — tongue at mid-central position, completely relaxed. The most common sound in English.', example:'"a" in English "about"',    audio:WM('Mid-central_vowel.ogg') },
    'ɛ':  { name:'Open-mid front unrounded vowel',       place:'Front',        manner:'Open-mid', voiced:true, isVowel:true, height:'Open-mid',  backness:'Front',   rounded:false, description:'Tongue at an open-mid front position. Like /e/ but lower.',                                                  example:'"e" in English "bed"',         audio:WM('Open-mid_front_unrounded_vowel.ogg') },
    'œ':  { name:'Open-mid front rounded vowel',         place:'Front',        manner:'Open-mid', voiced:true, isVowel:true, height:'Open-mid',  backness:'Front',   rounded:true,  description:'Like /ɛ/ but with rounded lips. Found in French.',                                                            example:'French "œ" in "cœur"',         audio:WM('Open-mid_front_rounded_vowel.ogg') },
    'ʌ':  { name:'Open-mid back unrounded vowel',        place:'Back',         manner:'Open-mid', voiced:true, isVowel:true, height:'Open-mid',  backness:'Back',    rounded:false, description:'Tongue in open-mid back position, lips unrounded. The English "uh" sound.',                                 example:'"u" in English "cup"',         audio:WM('Open-mid_back_unrounded_vowel.ogg') },
    'ɔ':  { name:'Open-mid back rounded vowel',          place:'Back',         manner:'Open-mid', voiced:true, isVowel:true, height:'Open-mid',  backness:'Back',    rounded:true,  description:'Tongue open-mid and back, lips rounded. The "aw" sound.',                                                    example:'"aw" in English "law"',        audio:WM('Open-mid_back_rounded_vowel.ogg') },
    'æ':  { name:'Near-open front unrounded vowel',      place:'Front',        manner:'Near-open',voiced:true, isVowel:true, height:'Near-open', backness:'Front',   rounded:false, description:'Tongue near-open in a front position, between /ɛ/ and /a/.',                                                 example:'"a" in English "cat"',         audio:WM('Near-open_front_unrounded_vowel.ogg') },
    'ɐ':  { name:'Near-open central vowel',              place:'Central',      manner:'Near-open',voiced:true, isVowel:true, height:'Near-open', backness:'Central', rounded:false, description:'Tongue near-open at a central position. Found in many languages as an unstressed vowel.',                    example:'German unstressed vowels',     audio:WM('Near-open_central_vowel.ogg') },
    'a':  { name:'Open front unrounded vowel',           place:'Front',        manner:'Open',     voiced:true, isVowel:true, height:'Open',      backness:'Front',   rounded:false, description:'Jaw wide open, tongue low and forward. A very common vowel cross-linguistically.',                            example:'"a" in Spanish "casa"',        audio:WM('Open_front_unrounded_vowel.ogg') },
    'ɑ':  { name:'Open back unrounded vowel',            place:'Back',         manner:'Open',     voiced:true, isVowel:true, height:'Open',      backness:'Back',    rounded:false, description:'Jaw wide open, tongue low and back. The "ah" in "father" for many English accents.',                         example:'"a" in British "father"',      audio:WM('Open_back_unrounded_vowel.ogg') },
    'ɒ':  { name:'Open back rounded vowel',              place:'Back',         manner:'Open',     voiced:true, isVowel:true, height:'Open',      backness:'Back',    rounded:true,  description:'Jaw wide open, tongue low and back, lips rounded. Used in British English.',                                 example:'British "o" in "lot"',         audio:WM('Open_back_rounded_vowel.ogg') },
};
