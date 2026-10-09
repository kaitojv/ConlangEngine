export default {
  title: "How to Start",
  subtitle: "Complete Checklist for Creating Conlangs",
  intro: {
    sequenceDesc: "Organized in a sequence that goes from the sound of the language all the way to its history:",
    sequence: {
      sound: "sound",
      wordFormation: "how words are formed",
      sentenceOrganization: "how sentences are organized",
      verbSystem: "verb system",
      nounSystem: "noun system",
      spaceAndCulture: "space and culture",
      writing: "writing",
      history: "history"
    },
    glossDesc: "All examples come from real languages, with a simple gloss (a word-by-word translation under the original sentence) so you can follow along even without knowing the language."
  },
  sec0: {
    title: "0. Basic Concepts (quick glossary)",
    desc: "A few technical terms will show up throughout the document. Worth pinning down first:",
    morpheme: {
      term: "Morpheme:",
      def: "the smallest unit of meaning in a language. It can be a whole word on its own (free) or a small piece that only exists attached to something else (bound). In \"kittens,\" there are three morphemes: kitt (root) + en (diminutive-ish/derivational piece) + s (plural)."
    },
    rootAffix: {
      term: "Root vs. Affix:",
      def: "the root carries the core meaning of the word; the affix is the extra piece attached to it to add grammatical information (plural, tense, negation, etc.)."
    },
    subjectObject: {
      term: "Subject and Object:",
      def: "in a sentence like \"the boy kicked the ball,\" the boy is the subject (who performs the action) and the ball is the object (who receives the action)."
    },
    transitive: {
      term: "Transitive vs. Intransitive Verb:",
      def: "a verb is transitive when it needs an object for the sentence to feel complete (\"I saw the dog\"). A verb is intransitive when it already makes full sense on its own, with no object at all (\"I sleep\")."
    },
    clause: {
      term: "Clause:",
      def: "a stretch of a sentence organized around a single verb (with its subject and object, if any)."
    },
    mainSubordinate: {
      term: "Main Clause vs. Subordinate Clause:",
      def: "when two clauses combine, the main clause is the \"center\", and the subordinate clause exists only to complete or qualify it. In \"I know that he arrived,\" \"that he arrived\" is a subordinate clause."
    }
  },
  part1: {
    badge: "Part 1",
    title: "The Sound of the Language",
    sec1: {
      title: "1. Phonology and Phonotactics",
      desc: "The foundation before any other decision — without this defined, no sound example of the language is even possible.",
      inventory: {
        term: "Phonemic Inventory:",
        def: "how many and which sounds (consonants and vowels) the language treats as meaningfully distinct.",
        boxTitle: "Range of Inventories",
        boxText: "Languages range from minimal vowel systems (Classical Arabic: 3 vowels) to huge ones. Consonants range from small inventories (Hawaiian: 13 phonemes) to extremely rich ones (!Xóõ: >100 consonants)."
      },
      syllable: {
        term: "Syllable Structure:",
        def: "which consonant/vowel combinations the language allows.",
        boxTitle: "Real World Examples",
        boxJapanese: "Japanese is almost entirely (C)V (ka, shi, tsu).",
        boxGeorgian: "Georgian allows heavy clusters: gvprtskvni (\"you're peeling me\")."
      },
      phonotactics: {
        term: "Phonotactic Restrictions:",
        def: "specific rules about which sounds can sit next to each other. In English, no native word begins with \"ng\"."
      },
      allophony: {
        term: "Allophony:",
        def: "when the same phoneme changes pronunciation depending on context. In English, the \"t\" in \"top\" is aspirated, while in \"stop\" it is not."
      }
    },
    sec2: {
      title: "2. Prosody and Suprasegmental Phonology",
      tone: {
        term: "Tone:",
        def: "can be contour tone (pitch changes within the syllable) or register tone (fixed pitch levels).",
        boxTitle: "Mandarin Tones",
        boxText: "The syllable \"ma\" changes meaning depending entirely on tone:",
        mother: "mā (mother)",
        hemp: "má (hemp)",
        horse: "mǎ (horse)",
        scold: "mà (scold)"
      },
      stress: {
        term: "Stress:",
        def: "can be fixed or lexical.",
        boxTitle: "Stress Types",
        fixed: "Fixed: always falling in the same position (French: almost always the last syllable; Polish: almost always the second-to-last).",
        lexical: "Lexical: varying from word to word and distinguishing meaning (English: \"REcord\" noun vs \"reCORD\" verb)."
      }
    }
  },
  part2: {
    badge: "Part 2",
    title: "How Words Are Formed",
    sec3: {
      title: "3. Morphological Typology",
      desc: "Defines how much \"grammatical work\" each word carries on its own.",
      isolating: {
        term: "Isolating:",
        def: "each word carries a single meaning, no affixes.",
        boxTitle: "Mandarin",
        boxText: "我 看 你 (wǒ kàn nǐ, \"I see you\") has no marking for tense or agreement."
      },
      agglutinating: {
        term: "Agglutinating:",
        def: "root + several stacked affixes, each carrying one isolated function.",
        boxTitle: "Turkish",
        boxText: "ev-ler-im-de (house-PLURAL-my-in) = \"in my houses\"."
      },
      fusional: {
        term: "Fusional:",
        def: "a single affix fuses several pieces of information at once.",
        boxTitle: "Latin",
        boxText: "amō (\"I love\") packs 1st person, singular, present, indicative into \"-ō\"."
      },
      polysynthetic: {
        term: "Polysynthetic:",
        def: "a single word incorporates multiple arguments and adverbs.",
        boxTitle: "Inuktitut",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga (\"I'll have to go to the airport\")."
      },
      note: "Design note: most naturalistic conlangs pick a dominant point along this spectrum (not all four at once), with only some internal variation."
    },
    sec4: {
      title: "4. Word Formation (beyond affixation)",
      compounding: {
        term: "Compounding:",
        def: "joining two existing roots.",
        boxTitle: "German & English",
        boxText: "German: Donaudampfschifffahrtsgesellschaft. English: \"sunflower\"."
      },
      reduplication: {
        term: "Reduplication:",
        def: "repeating part or all of a root.",
        boxTitle: "Indonesian",
        boxText: "rumah (house) → rumah-rumah (houses)."
      },
      blending: {
        term: "Clipping/Blending:",
        def: "shortening or merging words.",
        boxTitle: "English",
        boxText: "\"smoke\" + \"fog\" = \"smog\"."
      }
    },
    sec5: {
      title: "5. Types of Affixes",
      prefix: "Prefix: before the root (un-happy).",
      suffix: "Suffix: after the root (happi-ly).",
      infix: {
        term: "Infix:",
        def: "inserted inside the root itself.",
        boxTitle: "Tagalog",
        boxText: "basa (read) → b-um-asa (read, past tense)."
      },
      circumfix: {
        term: "Circumfix:",
        def: "two parts on both sides.",
        boxTitle: "German",
        boxText: "ge-mach-t (done/made, from machen)."
      },
      transfix: {
        term: "Transfix / consonantal root:",
        def: "root is a skeleton of consonants, vowels are inserted.",
        boxTitle: "Arabic",
        boxText: "Root K-T-B → KaTaBa (he wrote), KiTāB (book), maKTaB (office)."
      }
    },
    sec6: {
      title: "6. Common Functions of Affixes",
      negation: "Negation/Opposition: un-do.",
      manner: "Manner (adverb): quick-ly.",
      agent: "Agent: play-er.",
      nominalization: "Verb Nominalization: crea-tion.",
      abstract: "Abstract Quality: beau-ty.",
      place: "Place: bak-ery.",
      possession: "Possession/Quality: danger-ous.",
      degree: {
        term: "Degree (diminutive/augmentative):",
        boxTitle: "Italian",
        boxText: "casa (house) → casetta (little house)."
      },
      plurality: "Plurality: house-s.",
      causative: {
        term: "Causative:",
        boxTitle: "Turkish",
        boxText: "öl- (die) → öl-dür- (kill / make die)."
      }
    },
    sec7: {
      title: "7. Boundary and Mutation Phenomena",
      vowelHarmony: {
        term: "Vowel Harmony:",
        def: "affixes adjust to \"match\" the root's vowels.",
        boxTitle: "Turkish",
        boxText: "The plural suffix changes shape: ev-ler (houses) vs kız-lar (girls)."
      },
      mutation: {
        term: "Consonant Mutation:",
        def: "initial consonant changes depending on preceding word.",
        boxTitle: "Welsh",
        boxText: "mam (mother) changes to fam or nham."
      }
    }
  },
  part3: {
    badge: "Part 3",
    title: "How Sentences Are Organized",
    sec8: {
      title: "8. Syntax and Word Order",
      fixed: "Fixed Orders: SOV (most common, Japanese), SVO (English), VSO (Irish), VOS (Malagasy), OVS (Hixkaryana), OSV (rare Amazonian).",
      free: {
        term: "Free Order (Non-configurational):",
        def: "driven by emphasis, requires a robust case system.",
        boxTitle: "Russian",
        boxText: "Мальчик видит собаку and Собаку видит мальчик both mean \"the boy sees the dog\" due to accusative marking on \"dog\" (собаку)."
      }
    },
    sec9: {
      title: "9. Morphosyntactic Alignment",
      desc: "Does the subject of an intransitive verb resemble more the subject or the object of a transitive verb?",
      nomAcc: "Nominative-Accusative: (English, German) Subject gets same marking; Object gets different marking.",
      ergAbs: {
        term: "Ergative-Absolutive:",
        def: "Intransitive subject resembles transitive object (absolutive); transitive subject gets its own marking (ergative).",
        boxTitle: "Basque",
        boxText1: "Gizona etorri da (the man-ABS arrived)",
        boxText2: "Gizonak liburua irakurri du (the man-ERG read the book-ABS)"
      },
      activeStative: "Active-Stative: (Guaraní) Marking of intransitive subject changes if action is voluntary vs involuntary.",
      tripartite: "Tripartite: (Nez Perce) Transitive subject, intransitive subject, and object all get distinct markings."
    },
    sec10: {
      title: "10. Verbal Voice",
      passive: "Passive: promotes object to subject (\"the dog was seen\").",
      antipassive: "Antipassive: reduces valency keeping agent as subject, demoting object (Ergative languages).",
      middle: "Middle Voice: actions affecting subject without being fully reflexive (\"getting dressed\").",
      applicative: {
        term: "Applicative:",
        def: "promotes oblique (beneficiary, location) to direct object.",
        boxTitle: "Swahili",
        boxText: "Adding an applicative suffix turns \"buy\" into \"buy for someone\"."
      },
      causative: "Direct vs. Indirect Causative: \"make someone do\" vs \"allow someone to do\"."
    },
    sec11: {
      title: "11. Specific Syntactic Strategies",
      negation: {
        term: "Negation:",
        def: "standalone particle, affix, or double negation.",
        boxTitle: "French",
        boxText: "ne...pas (double negation wrapping the verb)."
      },
      questions: "Question Formation: final particle (Japanese ka), inversion (\"is he?\"), intonation, or verb marking.",
      relative: "Relative Clauses: gap strategy (English) or modifier before noun (Japanese).",
      serial: {
        term: "Serial Verb Constructions:",
        def: "verbs strung together with no connector.",
        boxTitle: "Yoruba",
        boxText: "\"took book came\" = brought."
      },
      switchRef: "Switch-Reference: marker on subordinate clause signals if subject is same as main clause."
    },
    sec12: {
      title: "12. Structural Syntax and Determination",
      copula: "Zero Copula: drops \"to be\" verb entirely (Russian \"he doctor\").",
      headDirection: "Head-directionality: modifiers before (head-final) or after (head-initial) the main element.",
      modals: "Modals: auxiliary verbs (must, can) or verbal affixes (Turkish -ebil-).",
      nonLinearity: "Non-linearity (Semasiography): visual \"block\" of simultaneous meaning (Inca quipus)."
    }
  },
  part4: {
    badge: "Part 4",
    title: "Verb System",
    sec13: {
      title: "13. Verb System (TAM) and Evidentiality",
      tense: {
        heading: "Tense",
        absolute: "Absolute: past / present / future.",
        binary: "Binary: past vs. non-past.",
        distance: "Distance: distinguishes how far away in time the event is (\"today\" vs \"yesterday\" vs \"long ago\")."
      },
      aspect: {
        heading: "Aspect",
        perfective: "Perfective: complete package (Russian прочитал).",
        continuous: "Imperfective — Continuous: happening now (\"am reading\").",
        habitual: "Imperfective — Habitual: routine (\"used to read\").",
        perfect: "Perfect: past event with present relevance (\"have read\").",
        iterative: "Iterative: repeated action.",
        inchoative: "Inceptive/Inchoative: focus on beginning (\"fall asleep\")."
      },
      mood: {
        heading: "Mood",
        indicative: "Indicative: concrete facts.",
        subjunctive: "Subjunctive: doubt, desire, subordination.",
        conditional: "Conditional: if condition is met (\"would go\").",
        imperative: "Imperative: command (\"Go!\").",
        optative: "Optative: strong hope/wish.",
        interrogative: "Interrogative: question marked on verb."
      },
      evidentiality: {
        heading: "Evidentiality (how speaker knows)",
        visual: "Visual Sensory: speaker saw it.",
        nonVisual: "Non-visual Sensory: heard, felt, smelled it.",
        inferential: "Inferential: deduced from evidence (\"must have rained\").",
        reportative: "Reportative/Citative: learned from someone else (Turkish gelmiş vs geldi)."
      }
    }
  },
  part5: {
    badge: "Part 5",
    title: "Noun System",
    sec14: {
      title: "14. Grammatical Cases / Nominal Declensions",
      central: {
        heading: "Central (Syntactic)",
        text: "Nominative (subject), Accusative (object), Dative (beneficiary), Ergative/Absolutive, Passive Agent."
      },
      possession: {
        heading: "Possession & Locative",
        text: "Genitive (possession), Locative (in), Ablative (from), Allative (toward), Illative (into), Elative (out of), Perlative (through)."
      },
      circumstantial: {
        heading: "Circumstantial & Other",
        text: "Instrumental (with tool), Comitative (together with), Abessive (without), Vocative (addressing someone), Topic (main subject matter, like Japanese wa)."
      }
    },
    sec15: {
      title: "15. Determination and Quantification",
      determination: "Determination: definite/indefinite articles, none at all, or demonstratives.",
      numSystems: "Numerical Systems: decimal, base-20 (Mayan, traces in French), etc.",
      numberCats: "Number Categories: singular, plural, dual (exactly two), trial (three), paucal (a few).",
      classifiers: "Numeral Classifiers: required to count objects (Mandarin: \"three [bound-volume] book\").",
      quantifiers: "Quantifiers: partitive vs distributive."
    },
    sec16: {
      title: "16. Advanced Pronominal System",
      person: "Person: 1st, 2nd, 3rd, and 4th Obviative (to distinguish two different 3rd-person referents).",
      inEx: "Inclusive/Exclusive: \"we\" including listener vs excluding listener.",
      animacy: "Animacy: grammatical distinction between living beings and objects.",
      gender: "Gender/Classes: binary, absent, or based on shape/substance (Bantu).",
      reflexive: "Reflexivity/Reciprocity: \"see oneself\" vs \"see each other\"."
    },
    sec17: {
      title: "17. Lexical Categories",
      stative: "Stative Verbs: qualities function as verbs (Mandarin \"he tall\", no \"to be\").",
      nounClasses: "Noun Classes: categorized by semantic trait (animate/shape), agreeing with adjectives/verbs (Swahili)."
    }
  },
  part6: {
    badge: "Part 6",
    title: "Space and Culture",
    sec18: {
      title: "18. Deixis and Spatial/Temporal Reference",
      demonstrative: {
        term: "Demonstrative System:",
        def: "2 terms (this/that) or 3 terms (near me, near you, far).",
        boxTitle: "Japanese",
        boxText: "kore (this, near me), sore (that, near you), are (that over there, far from both)."
      },
      vertical: "Vertical/Geographic Deixis: absolute cardinal directions (\"north of plate\") instead of left/right."
    },
    sec19: {
      title: "19. Pragmatics and Sociolinguistics",
      honorifics: "Honorifics: affixes/words for social deference (Japanese).",
      register: "Register Levels: formal/informal variation (French tu/vous).",
      taboos: "Taboos and Euphemisms: avoiding sensitive topics (\"mourning vocabulary\")."
    },
    sec20: {
      title: "20. Cultural Lexicon",
      kinship: "Kinship Systems: distinguishing maternal vs paternal uncle.",
      color: "Basic Color Terms: languages gain color terms in a predictable order."
    }
  },
  part7: {
    badge: "Part 7",
    title: "Writing and History",
    sec21: {
      title: "21. Writing System",
      sysType: "System Type: alphabetic, syllabary, logographic, abjad (only consonants), or abugida (default vowel built in).",
      direction: "Direction: left-to-right, right-to-left, boustrophedon (alternating), or vertical."
    },
    sec22: {
      title: "22. Diachrony (Historical Language Evolution)",
      soundChange: "Sound Change: systematic rules for how sounds shift from a proto-language (Latin /p/ to /b/).",
      loans: "Loanwords and Historical Layers: older native layer coexisting with borrowed prestige layers (English native vs Latin/Greek borrowings)."
    }
  }
};
