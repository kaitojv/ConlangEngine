import React from 'react';
import './howtostart.css';
import { BookOpen, Hash, CheckCircle2, ChevronRight, Lightbulb, GraduationCap, Globe, MessageCircle } from 'lucide-react';
import StressWave from '../../UI/StressWave/StressWave.jsx';

export default function HowToStart() {
    return (
        <div className="how-to-start-container animate-fade-in">
            <header className="how-to-start-header">
                <div className="header-icon-wrapper">
                    <GraduationCap size={32} className="header-icon" />
                </div>
                <h2>How to Start</h2>
                <p className="subtitle">Complete Checklist for Creating Conlangs</p>
            </header>
            
            <div className="how-to-start-content">
                <div className="guide-intro">
                    <p>
                        Organized in a sequence that goes from the sound of the language all the way to its history: 
                    </p>
                    <div className="sequence">
                        <span>sound</span> <ChevronRight size={14}/> 
                        <span>how words are formed</span> <ChevronRight size={14}/> 
                        <span>how sentences are organized</span> <ChevronRight size={14}/> 
                        <span>verb system</span> <ChevronRight size={14}/> 
                        <span>noun system</span> <ChevronRight size={14}/> 
                        <span>space and culture</span> <ChevronRight size={14}/> 
                        <span>writing</span> <ChevronRight size={14}/> 
                        <span>history</span>
                    </div>
                    <p>
                        All examples come from real languages, with a simple gloss (a word-by-word translation under the original sentence) so you can follow along even without knowing the language.
                    </p>
                </div>

                <div className="guide-sections">
                    <section className="guide-section concept-section">
                        <h3>0. Basic Concepts (quick glossary)</h3>
                        <p className="section-desc">A few technical terms will show up throughout the document. Worth pinning down first:</p>
                        <div className="concept-list">
                            <div className="concept-item">
                                <strong>Morpheme:</strong> the smallest unit of meaning in a language. It can be a whole word on its own (free) or a small piece that only exists attached to something else (bound). In "kittens," there are three morphemes: kitt (root) + en (diminutive-ish/derivational piece) + s (plural).
                            </div>
                            <div className="concept-item">
                                <strong>Root vs. Affix:</strong> the root carries the core meaning of the word; the affix is the extra piece attached to it to add grammatical information (plural, tense, negation, etc.).
                            </div>
                            <div className="concept-item">
                                <strong>Subject and Object:</strong> in a sentence like "the boy kicked the ball," the boy is the subject (who performs the action) and the ball is the object (who receives the action).
                            </div>
                            <div className="concept-item">
                                <strong>Transitive vs. Intransitive Verb:</strong> a verb is transitive when it needs an object for the sentence to feel complete ("I saw the dog"). A verb is intransitive when it already makes full sense on its own, with no object at all ("I sleep").
                            </div>
                            <div className="concept-item">
                                <strong>Clause:</strong> a stretch of a sentence organized around a single verb (with its subject and object, if any).
                            </div>
                            <div className="concept-item">
                                <strong>Main Clause vs. Subordinate Clause:</strong> when two clauses combine, the main clause is the "center", and the subordinate clause exists only to complete or qualify it. In "I know that he arrived," "that he arrived" is a subordinate clause.
                            </div>
                        </div>
                    </section>

                    <div className="part-divider">
                        <span>Part 1</span>
                        <h4>The Sound of the Language</h4>
                    </div>

                    <section className="guide-section">
                        <h3>1. Phonology and Phonotactics</h3>
                        <p className="section-desc">The foundation before any other decision — without this defined, no sound example of the language is even possible.</p>
                        <ul className="detail-list">
                            <li><strong>Phonemic Inventory:</strong> how many and which sounds (consonants and vowels) the language treats as meaningfully distinct.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Range of Inventories</div>
                                    <p>Languages range from minimal vowel systems (<strong>Classical Arabic</strong>: 3 vowels) to huge ones. Consonants range from small inventories (<strong>Hawaiian</strong>: 13 phonemes) to extremely rich ones (<strong>!Xóõ</strong>: &gt;100 consonants).</p>
                                </div>
                            </li>
                            <li>
                                <strong>Syllable Structure:</strong> which consonant/vowel combinations the language allows.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Real World Examples</div>
                                    <p><strong>Japanese</strong> is almost entirely (C)V (ka, shi, tsu).</p>
                                    <p><strong>Georgian</strong> allows heavy clusters: <em>gvprtskvni</em> ("you're peeling me").</p>
                                </div>
                            </li>
                            <li><strong>Phonotactic Restrictions:</strong> specific rules about which sounds can sit next to each other. In English, no native word begins with "ng".</li>
                            <li><strong>Allophony:</strong> when the same phoneme changes pronunciation depending on context. In English, the "t" in "top" is aspirated, while in "stop" it is not.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>2. Prosody and Suprasegmental Phonology</h3>
                        <ul className="detail-list">
                            <li>
                                <strong>Tone:</strong> can be contour tone (pitch changes within the syllable) or register tone (fixed pitch levels).
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Mandarin Tones</div>
                                    <p>The syllable "ma" changes meaning depending entirely on tone:</p>
                                    <div className="visual-row">
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="high" width="40px" height="20px" />
                                            <span>mā (mother)</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="rising" width="40px" height="20px" />
                                            <span>má (hemp)</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="dipping" width="40px" height="20px" />
                                            <span>mǎ (horse)</span>
                                        </div>
                                        <div className="visual-item">
                                            <StressWave word="ma" tone="falling" width="40px" height="20px" />
                                            <span>mà (scold)</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                            <li><strong>Stress:</strong> can be fixed or lexical.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Stress Types</div>
                                    <p><strong>Fixed:</strong> always falling in the same position (<strong>French</strong>: almost always the last syllable; <strong>Polish</strong>: almost always the second-to-last).</p>
                                    <p><strong>Lexical:</strong> varying from word to word and distinguishing meaning (<strong>English</strong>: "REcord" noun vs "reCORD" verb).</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>Part 2</span>
                        <h4>How Words Are Formed</h4>
                    </div>

                    <section className="guide-section">
                        <h3>3. Morphological Typology</h3>
                        <p className="section-desc">Defines how much "grammatical work" each word carries on its own.</p>
                        <ul className="detail-list">
                            <li><strong>Isolating:</strong> each word carries a single meaning, no affixes. 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Mandarin</div>
                                    <p>我 看 你 (wǒ kàn nǐ, "I see you") has no marking for tense or agreement.</p>
                                </div>
                            </li>
                            <li><strong>Agglutinating:</strong> root + several stacked affixes, each carrying one isolated function. 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Turkish</div>
                                    <p><em>ev-ler-im-de</em> (house-PLURAL-my-in) = "in my houses".</p>
                                </div>
                            </li>
                            <li><strong>Fusional:</strong> a single affix fuses several pieces of information at once. 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Latin</div>
                                    <p><em>amō</em> ("I love") packs 1st person, singular, present, indicative into "-ō".</p>
                                </div>
                            </li>
                            <li><strong>Polysynthetic:</strong> a single word incorporates multiple arguments and adverbs. 
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Inuktitut</div>
                                    <p><em>qangatasuukkuvimmuuriaqalaaqtunga</em> ("I'll have to go to the airport").</p>
                                </div>
                            </li>
                        </ul>
                        <div className="info-box">
                            <Lightbulb size={16} />
                            <span>Design note: most naturalistic conlangs pick a dominant point along this spectrum (not all four at once), with only some internal variation.</span>
                        </div>
                    </section>

                    <section className="guide-section">
                        <h3>4. Word Formation (beyond affixation)</h3>
                        <ul className="detail-list">
                            <li><strong>Compounding:</strong> joining two existing roots.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> German & English</div>
                                    <p><strong>German:</strong> <em>Donaudampfschifffahrtsgesellschaft</em>. <strong>English:</strong> "sunflower".</p>
                                </div>
                            </li>
                            <li><strong>Reduplication:</strong> repeating part or all of a root.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Indonesian</div>
                                    <p><em>rumah</em> (house) → <em>rumah-rumah</em> (houses).</p>
                                </div>
                            </li>
                            <li><strong>Clipping/Blending:</strong> shortening or merging words.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> English</div>
                                    <p>"smoke" + "fog" = "smog".</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>5. Types of Affixes</h3>
                        <ul className="detail-list">
                            <li><strong>Prefix:</strong> before the root (<em>un-</em>happy).</li>
                            <li><strong>Suffix:</strong> after the root (happi-<em>ly</em>).</li>
                            <li><strong>Infix:</strong> inserted inside the root itself.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Tagalog</div>
                                    <p><em>basa</em> (read) → <em>b-um-asa</em> (read, past tense).</p>
                                </div>
                            </li>
                            <li><strong>Circumfix:</strong> two parts on both sides.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> German</div>
                                    <p><em>ge-mach-t</em> (done/made, from <em>machen</em>).</p>
                                </div>
                            </li>
                            <li><strong>Transfix / consonantal root:</strong> root is a skeleton of consonants, vowels are inserted.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Arabic</div>
                                    <p>Root <strong>K-T-B</strong> → <em>KaTaBa</em> (he wrote), <em>KiTāB</em> (book), <em>maKTaB</em> (office).</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>6. Common Functions of Affixes</h3>
                        <ul className="detail-list">
                            <li><strong>Negation/Opposition:</strong> <em>un-</em>do.</li>
                            <li><strong>Manner (adverb):</strong> quick-<em>ly</em>.</li>
                            <li><strong>Agent:</strong> play-<em>er</em>.</li>
                            <li><strong>Verb Nominalization:</strong> crea-<em>tion</em>.</li>
                            <li><strong>Abstract Quality:</strong> beau-<em>ty</em>.</li>
                            <li><strong>Place:</strong> bak-<em>ery</em>.</li>
                            <li><strong>Possession/Quality:</strong> danger-<em>ous</em>.</li>
                            <li><strong>Degree (diminutive/augmentative):</strong>
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Italian</div>
                                    <p><em>casa</em> (house) → <em>casetta</em> (little house).</p>
                                </div>
                            </li>
                            <li><strong>Plurality:</strong> house-<em>s</em>.</li>
                            <li><strong>Causative:</strong>
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Turkish</div>
                                    <p><em>öl-</em> (die) → <em>öl-dür-</em> (kill / make die).</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>7. Boundary and Mutation Phenomena</h3>
                        <ul className="detail-list">
                            <li><strong>Vowel Harmony:</strong> affixes adjust to "match" the root's vowels.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Turkish</div>
                                    <p>The plural suffix changes shape: <em>ev-ler</em> (houses) vs <em>kız-lar</em> (girls).</p>
                                </div>
                            </li>
                            <li><strong>Consonant Mutation:</strong> initial consonant changes depending on preceding word.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Welsh</div>
                                    <p><em>mam</em> (mother) changes to <em>fam</em> or <em>nham</em>.</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>Part 3</span>
                        <h4>How Sentences Are Organized</h4>
                    </div>

                    <section className="guide-section">
                        <h3>8. Syntax and Word Order</h3>
                        <ul className="detail-list">
                            <li><strong>Fixed Orders:</strong> SOV (most common, Japanese), SVO (English), VSO (Irish), VOS (Malagasy), OVS (Hixkaryana), OSV (rare Amazonian).</li>
                            <li><strong>Free Order (Non-configurational):</strong> driven by emphasis, requires a robust case system.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Russian</div>
                                    <p><em>Мальчик видит собаку</em> and <em>Собаку видит мальчик</em> both mean "the boy sees the dog" due to accusative marking on "dog" (собаку).</p>
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>9. Morphosyntactic Alignment</h3>
                        <p className="section-desc">Does the subject of an intransitive verb resemble more the subject or the object of a transitive verb?</p>
                        <ul className="detail-list">
                            <li><strong>Nominative-Accusative:</strong> (English, German) Subject gets same marking; Object gets different marking.</li>
                            <li><strong>Ergative-Absolutive:</strong> Intransitive subject resembles transitive object (absolutive); transitive subject gets its own marking (ergative).
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Basque</div>
                                    <p><em>Gizona etorri da</em> (the man-ABS arrived)</p>
                                    <p><em>Gizonak liburua irakurri du</em> (the man-ERG read the book-ABS)</p>
                                </div>
                            </li>
                            <li><strong>Active-Stative:</strong> (Guaraní) Marking of intransitive subject changes if action is voluntary vs involuntary.</li>
                            <li><strong>Tripartite:</strong> (Nez Perce) Transitive subject, intransitive subject, and object all get distinct markings.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>10. Verbal Voice</h3>
                        <ul className="detail-list">
                            <li><strong>Passive:</strong> promotes object to subject ("the dog was seen").</li>
                            <li><strong>Antipassive:</strong> reduces valency keeping agent as subject, demoting object (Ergative languages).</li>
                            <li><strong>Middle Voice:</strong> actions affecting subject without being fully reflexive ("getting dressed").</li>
                            <li><strong>Applicative:</strong> promotes oblique (beneficiary, location) to direct object.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Swahili</div>
                                    <p>Adding an applicative suffix turns "buy" into "buy for someone".</p>
                                </div>
                            </li>
                            <li><strong>Direct vs. Indirect Causative:</strong> "make someone do" vs "allow someone to do".</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>11. Specific Syntactic Strategies</h3>
                        <ul className="detail-list">
                            <li><strong>Negation:</strong> standalone particle, affix, or double negation.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> French</div>
                                    <p><em>ne...pas</em> (double negation wrapping the verb).</p>
                                </div>
                            </li>
                            <li><strong>Question Formation:</strong> final particle (Japanese <em>ka</em>), inversion ("is he?"), intonation, or verb marking.</li>
                            <li><strong>Relative Clauses:</strong> gap strategy (English) or modifier before noun (Japanese).</li>
                            <li><strong>Serial Verb Constructions:</strong> verbs strung together with no connector.
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Yoruba</div>
                                    <p>"took book came" = brought.</p>
                                </div>
                            </li>
                            <li><strong>Switch-Reference:</strong> marker on subordinate clause signals if subject is same as main clause.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>12. Structural Syntax and Determination</h3>
                        <ul className="detail-list">
                            <li><strong>Zero Copula:</strong> drops "to be" verb entirely (Russian "he doctor").</li>
                            <li><strong>Head-directionality:</strong> modifiers before (head-final) or after (head-initial) the main element.</li>
                            <li><strong>Modals:</strong> auxiliary verbs (must, can) or verbal affixes (Turkish <em>-ebil-</em>).</li>
                            <li><strong>Non-linearity (Semasiography):</strong> visual "block" of simultaneous meaning (Inca quipus).</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>Part 4</span>
                        <h4>Verb System</h4>
                    </div>

                    <section className="guide-section">
                        <h3>13. Verb System (TAM) and Evidentiality</h3>
                        <div className="sub-section">
                            <h4>Tense</h4>
                            <ul>
                                <li><strong>Absolute:</strong> past / present / future.</li>
                                <li><strong>Binary:</strong> past vs. non-past.</li>
                                <li><strong>Distance:</strong> distinguishes how far away in time the event is ("today" vs "yesterday" vs "long ago").</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>Aspect</h4>
                            <ul>
                                <li><strong>Perfective:</strong> complete package (Russian <em>прочитал</em>).</li>
                                <li><strong>Imperfective — Continuous:</strong> happening now ("am reading").</li>
                                <li><strong>Imperfective — Habitual:</strong> routine ("used to read").</li>
                                <li><strong>Perfect:</strong> past event with present relevance ("have read").</li>
                                <li><strong>Iterative:</strong> repeated action.</li>
                                <li><strong>Inceptive/Inchoative:</strong> focus on beginning ("fall asleep").</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>Mood</h4>
                            <ul>
                                <li><strong>Indicative:</strong> concrete facts.</li>
                                <li><strong>Subjunctive:</strong> doubt, desire, subordination.</li>
                                <li><strong>Conditional:</strong> if condition is met ("would go").</li>
                                <li><strong>Imperative:</strong> command ("Go!").</li>
                                <li><strong>Optative:</strong> strong hope/wish.</li>
                                <li><strong>Interrogative:</strong> question marked on verb.</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>Evidentiality (how speaker knows)</h4>
                            <ul>
                                <li><strong>Visual Sensory:</strong> speaker saw it.</li>
                                <li><strong>Non-visual Sensory:</strong> heard, felt, smelled it.</li>
                                <li><strong>Inferential:</strong> deduced from evidence ("must have rained").</li>
                                <li><strong>Reportative/Citative:</strong> learned from someone else (Turkish <em>gelmiş</em> vs <em>geldi</em>).</li>
                            </ul>
                        </div>
                    </section>

                    <div className="part-divider">
                        <span>Part 5</span>
                        <h4>Noun System</h4>
                    </div>

                    <section className="guide-section">
                        <h3>14. Grammatical Cases / Nominal Declensions</h3>
                        <div className="sub-section">
                            <h4>Central (Syntactic)</h4>
                            <ul>
                                <li>Nominative (subject), Accusative (object), Dative (beneficiary), Ergative/Absolutive, Passive Agent.</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>Possession & Locative</h4>
                            <ul>
                                <li>Genitive (possession), Locative (in), Ablative (from), Allative (toward), Illative (into), Elative (out of), Perlative (through).</li>
                            </ul>
                        </div>
                        <div className="sub-section">
                            <h4>Circumstantial & Other</h4>
                            <ul>
                                <li>Instrumental (with tool), Comitative (together with), Abessive (without), Vocative (addressing someone), Topic (main subject matter, like Japanese <em>wa</em>).</li>
                            </ul>
                        </div>
                    </section>

                    <section className="guide-section">
                        <h3>15. Determination and Quantification</h3>
                        <ul className="detail-list">
                            <li><strong>Determination:</strong> definite/indefinite articles, none at all, or demonstratives.</li>
                            <li><strong>Numerical Systems:</strong> decimal, base-20 (Mayan, traces in French), etc.</li>
                            <li><strong>Number Categories:</strong> singular, plural, dual (exactly two), trial (three), paucal (a few).</li>
                            <li><strong>Numeral Classifiers:</strong> required to count objects (Mandarin: "three [bound-volume] book").</li>
                            <li><strong>Quantifiers:</strong> partitive vs distributive.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>16. Advanced Pronominal System</h3>
                        <ul className="detail-list">
                            <li><strong>Person:</strong> 1st, 2nd, 3rd, and 4th Obviative (to distinguish two different 3rd-person referents).</li>
                            <li><strong>Inclusive/Exclusive:</strong> "we" including listener vs excluding listener.</li>
                            <li><strong>Animacy:</strong> grammatical distinction between living beings and objects.</li>
                            <li><strong>Gender/Classes:</strong> binary, absent, or based on shape/substance (Bantu).</li>
                            <li><strong>Reflexivity/Reciprocity:</strong> "see oneself" vs "see each other".</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>17. Lexical Categories</h3>
                        <ul className="detail-list">
                            <li><strong>Stative Verbs:</strong> qualities function as verbs (Mandarin "he tall", no "to be").</li>
                            <li><strong>Noun Classes:</strong> categorized by semantic trait (animate/shape), agreeing with adjectives/verbs (Swahili).</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>Part 6</span>
                        <h4>Space and Culture</h4>
                    </div>

                    <section className="guide-section">
                        <h3>18. Deixis and Spatial/Temporal Reference</h3>
                        <ul className="detail-list">
                            <li><strong>Demonstrative System:</strong> 2 terms (this/that) or 3 terms (near me, near you, far).
                                <div className="example-box">
                                    <div className="example-box-header"><Globe size={14}/> Japanese</div>
                                    <p><em>kore</em> (this, near me), <em>sore</em> (that, near you), <em>are</em> (that over there, far from both).</p>
                                </div>
                            </li>
                            <li><strong>Vertical/Geographic Deixis:</strong> absolute cardinal directions ("north of plate") instead of left/right.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>19. Pragmatics and Sociolinguistics</h3>
                        <ul className="detail-list">
                            <li><strong>Honorifics:</strong> affixes/words for social deference (Japanese).</li>
                            <li><strong>Register Levels:</strong> formal/informal variation (French <em>tu/vous</em>).</li>
                            <li><strong>Taboos and Euphemisms:</strong> avoiding sensitive topics ("mourning vocabulary").</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>20. Cultural Lexicon</h3>
                        <ul className="detail-list">
                            <li><strong>Kinship Systems:</strong> distinguishing maternal vs paternal uncle.</li>
                            <li><strong>Basic Color Terms:</strong> languages gain color terms in a predictable order.</li>
                        </ul>
                    </section>

                    <div className="part-divider">
                        <span>Part 7</span>
                        <h4>Writing and History</h4>
                    </div>

                    <section className="guide-section">
                        <h3>21. Writing System</h3>
                        <ul className="detail-list">
                            <li><strong>System Type:</strong> alphabetic, syllabary, logographic, abjad (only consonants), or abugida (default vowel built in).</li>
                            <li><strong>Direction:</strong> left-to-right, right-to-left, boustrophedon (alternating), or vertical.</li>
                        </ul>
                    </section>

                    <section className="guide-section">
                        <h3>22. Diachrony (Historical Language Evolution)</h3>
                        <ul className="detail-list">
                            <li><strong>Sound Change:</strong> systematic rules for how sounds shift from a proto-language (Latin /p/ to /b/).</li>
                            <li><strong>Loanwords and Historical Layers:</strong> older native layer coexisting with borrowed prestige layers (English native vs Latin/Greek borrowings).</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
