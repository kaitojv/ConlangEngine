export default {
  title: "Comment Débuter",
  subtitle: "Checklist Complète pour la Création de Conlangs",
  intro: {
    sequenceDesc: "Organisé selon une séquence allant du son de la langue jusqu'à son histoire :",
    sequence: {
      sound: "son",
      wordFormation: "formation des mots",
      sentenceOrganization: "organisation des phrases",
      verbSystem: "système verbal",
      nounSystem: "système nominal",
      spaceAndCulture: "espace et culture",
      writing: "écriture",
      history: "histoire"
    },
    glossDesc: "Tous les exemples proviennent de langues réelles, avec une glose simple (traduction mot à mot sous la phrase originale) pour suivre facilement sans connaître la langue."
  },
  sec0: {
    title: "0. Concepts de Base (glossaire rapide)",
    desc: "Quelques termes techniques apparaîtront tout au long du document :",
    morpheme: {
      term: "Morphème :",
      def: "la plus petite unité de sens d'une langue. Peut être un mot autonome (libre) ou un élément attaché (lié)."
    },
    rootAffix: {
      term: "Racine vs. Affixe :",
      def: "la racine porte le sens central du mot ; l'affixe est l'élément supplémentaire attaché pour apporter des informations grammaticales."
    },
    subjectObject: {
      term: "Sujet et Objet :",
      def: "dans \"le garçon frappe le ballon\", le garçon est le sujet et le ballon est l'objet."
    },
    transitive: {
      term: "Verbe Transitif vs. Intransitif :",
      def: "un verbe est transitif quand il nécessite un objet (\"J'ai vu le chien\"). Il est intransitif quand il a un sens complet seul (\"Je dors\")."
    },
    clause: {
      term: "Proposition :",
      def: "segment d'une phrase organisé autour d'un seul verbe (avec sujet et objet éventuels)."
    },
    mainSubordinate: {
      term: "Proposition Principale vs. Subordonnée :",
      def: "la principale constitue le centre, et la subordonnée existe pour la compléter ou la qualifier."
    }
  },
  part1: {
    badge: "Partie 1",
    title: "Le Son de la Langue",
    sec1: {
      title: "1. Phonologie et Phonotaxe",
      desc: "La base avant toute décision — sans cela, aucun exemple sonore n'est possible.",
      inventory: {
        term: "Inventaire Phonémique :",
        def: "combien et quels sons (consonnes et voyelles) sont distinctifs.",
        boxTitle: "Diversité des Inventaires",
        boxText: "De systèmes vocaliques minimaux (Arabe classique : 3 voyelles) à de très riches inventaires consonantiques (!Xóõ : >100 consonnes)."
      },
      syllable: {
        term: "Structure Syllabique :",
        def: "quelles combinaisons de consonnes et voyelles sont permises.",
        boxTitle: "Exemples Réels",
        boxJapanese: "Le japonais est presque entièrement (C)V (ka, shi, tsu).",
        boxGeorgian: "Le géorgien autorise de lourds groupes : gvprtskvni."
      },
      phonotactics: {
        term: "Restrictions Phonotaxiques :",
        def: "règles régissant quels sons peuvent être contigus."
      },
      allophony: {
        term: "Allophonie :",
        def: "variation de prononciation d'un même phonème selon le contexte."
      }
    },
    sec2: {
      title: "2. Prosodie et Phonologie Suprasegmentale",
      tone: {
        term: "Ton :",
        def: "ton de contour ou ton de registre.",
        boxTitle: "Tons en Mandarin",
        boxText: "La syllabe \"ma\" change de sens selon le ton :",
        mother: "mā (mère)",
        hemp: "má (chanvre)",
        horse: "mǎ (cheval)",
        scold: "mà (gronder)"
      },
      stress: {
        term: "Accent Tonique :",
        def: "peut être fixe ou lexical.",
        boxTitle: "Types d'Accent",
        fixed: "Fixe : tombe toujours sur la même position (Français : dernière syllabe).",
        lexical: "Lexical : varie d'un mot à l'autre."
      }
    }
  },
  part2: {
    badge: "Partie 2",
    title: "Comment les Mots Sont Formés",
    sec3: {
      title: "3. Typologie Morphologique",
      desc: "Définit la charge grammaticale portée par chaque mot.",
      isolating: {
        term: "Isolant :",
        def: "chaque mot porte un seul sens, pas d'affixes.",
        boxTitle: "Mandarin",
        boxText: "我 看 你 (wǒ kàn nǐ, \"Je te vois\") sans marque de temps ni accord."
      },
      agglutinating: {
        term: "Agglutinant :",
        def: "racine + plusieurs affixes empilés ayant chacun une fonction unique.",
        boxTitle: "Turc",
        boxText: "ev-ler-im-de = \"dans mes maisons\"."
      },
      fusional: {
        term: "Fusionnel :",
        def: "un seul affixe fusionne plusieurs informations grammaticales.",
        boxTitle: "Latin",
        boxText: "amō (\"j'aime\") combine 1ère personne, singulier, présent, indicatif dans \"-ō\"."
      },
      polysynthetic: {
        term: "Polysynthétique :",
        def: "un seul mot intègre arguments et adverbes.",
        boxTitle: "Inuktitut",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga (\"Je devrai aller à l'aéroport\")."
      },
      note: "Note de conception : la plupart des conlangs naturalistes privilégient un profil dominant."
    },
    sec4: {
      title: "4. Formation des Mots (hors affixation)",
      compounding: {
        term: "Composition :",
        def: "association de deux racines existantes.",
        boxTitle: "Allemand et Anglais",
        boxText: "Allemand : Donaudampfschifffahrtsgesellschaft. Français : \"chou-fleur\"."
      },
      reduplication: {
        term: "Redoublement :",
        def: "répétition partielle ou totale d'une racine.",
        boxTitle: "Indonésien",
        boxText: "rumah (maison) → rumah-rumah (maisons)."
      },
      blending: {
        term: "Mot-valise :",
        def: "fusion de deux mots.",
        boxTitle: "Anglais",
        boxText: "\"smoke\" + \"fog\" = \"smog\"."
      }
    },
    sec5: {
      title: "5. Types d'Affixes",
      prefix: "Préfixe : avant la racine (mal-heureux).",
      suffix: "Suffixe : après la racine (rapide-ment).",
      infix: {
        term: "Infixe :",
        def: "inséré à l'intérieur de la racine.",
        boxTitle: "Tagalog",
        boxText: "basa (lire) → b-um-asa (lu)."
      },
      circumfix: {
        term: "Circonfixe :",
        def: "deux parties encadrant la racine.",
        boxTitle: "Allemand",
        boxText: "ge-mach-t (fait, de machen)."
      },
      transfix: {
        term: "Transfixe / racine consonantique :",
        def: "squelette consonantique avec voyelles intercalées.",
        boxTitle: "Arabe",
        boxText: "Racine K-T-B → KaTaBa (il a écrit), KiTāB (livre)."
      }
    },
    sec6: {
      title: "6. Fonctions Fréquentes des Affixes",
      negation: "Négation/Opposition : dé-faire.",
      manner: "Manière (adverbe) : rapide-ment.",
      agent: "Agent : chan-teur.",
      nominalization: "Nominalisation Verbale : créa-tion.",
      abstract: "Qualité Abstraite : beau-té.",
      place: "Lieu : boulange-rie.",
      possession: "Possession/Qualité : danger-eux.",
      degree: {
        term: "Degré (diminutif/augmentatif) :",
        boxTitle: "Italien",
        boxText: "casa (maison) → casetta (petite maison)."
      },
      plurality: "Pluralité : maison-s.",
      causative: {
        term: "Causatif :",
        boxTitle: "Turc",
        boxText: "öl- (mourir) → öl-dür- (tuer / faire mourir)."
      }
    },
    sec7: {
      title: "7. Phénomènes de Frontière et Mutations",
      vowelHarmony: {
        term: "Harmonie Vocalique :",
        def: "les affixes s'harmonisent avec les voyelles de la racine.",
        boxTitle: "Turc",
        boxText: "ev-ler vs kız-lar."
      },
      mutation: {
        term: "Mutation Consonantique :",
        def: "la consonne initiale mute selon le mot précédent.",
        boxTitle: "Gallois",
        boxText: "mam (mère) → fam ou nham."
      }
    }
  },
  part3: {
    badge: "Partie 3",
    title: "Organisation des Phrases",
    sec8: {
      title: "8. Syntaxe et Ordre des Mots",
      fixed: "Ordres Fixes : SOV (Japonais), SVO (Français), VSO (Irlandais), VOS (Malgache), OVS (Hixkaryana), OSV.",
      free: {
        term: "Ordre Libre :",
        def: "guidé par l'emphase, nécessite un système casuel robuste.",
        boxTitle: "Russe",
        boxText: "Grâce à l'accusatif sur sobaku, l'ordre n'altère pas les rôles fondamentaux."
      }
    },
    sec9: {
      title: "9. Alignement Morphosyntaxique",
      desc: "Le sujet intransitif s'aligne-t-il sur le sujet ou l'objet transitif ?",
      nomAcc: "Nominatif-Accusatif : (Français, Allemand) Le sujet porte la même marque.",
      ergAbs: {
        term: "Ergatif-Absolutif :",
        def: "Sujet intransitif ressemble à l'objet transitif (absolutif) ; le sujet transitif a sa propre marque (ergatif).",
        boxTitle: "Basque",
        boxText1: "Gizona etorri da (l'homme-ABS est arrivé)",
        boxText2: "Gizonak liburua irakurri du (l'homme-ERG a lu le livre-ABS)"
      },
      activeStative: "Actif-Statif : (Guarani) Marque selon le caractère volontaire ou involontaire.",
      tripartite: "Tripartite : marques distinctes pour sujet transitif, intransitif et objet."
    },
    sec10: {
      title: "10. Voix Verbale",
      passive: "Passive : promeut l'objet en sujet.",
      antipassive: "Antipassive : réduit la valence (langues ergatives).",
      middle: "Voix Moyenne : action affectant le sujet sans être purement réflexive.",
      applicative: {
        term: "Applicative :",
        def: "promeut un oblique en objet direct.",
        boxTitle: "Swahili",
        boxText: "Permet de transformer \"acheter\" en \"acheter pour quelqu'un\"."
      },
      causative: "Causatif Direct vs. Indirect."
    },
    sec11: {
      title: "11. Stratégies Syntaxiques Spécifiques",
      negation: {
        term: "Négation :",
        def: "particule, affixe ou double négation.",
        boxTitle: "Français",
        boxText: "ne...pas."
      },
      questions: "Interrogation : particule finale, inversion, intonation ou affixe.",
      relative: "Propositions Relatives : pronom relatif ou modifieur anteposé.",
      serial: {
        term: "Verbes Sériels :",
        def: "chaîne de verbes sans connecteur.",
        boxTitle: "Yoruba",
        boxText: "\"prit livre vint\" = apporta."
      },
      switchRef: "Switch-Reference : indique si le sujet de la subordonnée est identique à celui de la principale."
    },
    sec12: {
      title: "12. Syntaxe Structurale et Détermination",
      copula: "Copule Zéro : omission du verbe être (Russe).",
      headDirection: "Direction de la Tête : tête initiale ou tête finale.",
      modals: "Modaux : auxiliaires ou affixes verbaux.",
      nonLinearity: "Non-linéarité : bloc visuel de sens simultané."
    }
  },
  part4: {
    badge: "Partie 4",
    title: "Système Verbal",
    sec13: {
      title: "13. Système Verbal (TAM) et Évidentialité",
      tense: {
        heading: "Temps",
        absolute: "Absolu : passé / présent / futur.",
        binary: "Binaire : passé vs. non-passé.",
        distance: "Distance : distingue la proximité temporelle."
      },
      aspect: {
        heading: "Aspect",
        perfective: "Perfectif : action vue comme un tout achevé.",
        continuous: "Imperfectif — Continu : en cours.",
        habitual: "Imperfectif — Habituel : coutumier.",
        perfect: "Parfait : fait passé avec pertinence présente.",
        iterative: "Itératif : action répétée.",
        inchoative: "Inchoatif : focalisation sur le début."
      },
      mood: {
        heading: "Mode",
        indicative: "Indicatif : faits concrets.",
        subjunctive: "Subjonctif : doute, souhait.",
        conditional: "Conditionnel : sous condition.",
        imperative: "Impératif : ordre.",
        optative: "Optatif : souhait fervent.",
        interrogative: "Interrogatif : marqué sur le verbe."
      },
      evidentiality: {
        heading: "Évidentialité (source du savoir)",
        visual: "Sensoriel Visuel : vu de ses yeux.",
        nonVisual: "Sensoriel Non-visuel : entendu, ressenti.",
        inferential: "Inférentiel : déduit.",
        reportative: "Rapporté/Citatif : ouï-dire."
      }
    }
  },
  part5: {
    badge: "Partie 5",
    title: "Système Nominal",
    sec14: {
      title: "14. Cas Grammaticaux / Déclinaisons Nominales",
      central: {
        heading: "Centraux (Syntaxiques)",
        text: "Nominatif (sujet), Accusatif (objet), Datif (bénéficiaire), Ergatif/Absolutif, Agent Passif."
      },
      possession: {
        heading: "Possession et Locatif",
        text: "Génitif (possession), Locatif (dans), Ablatif (depuis), Allatif (vers), Illatif (vers l'intérieur), Élâtif (hors de), Perlatif (à travers)."
      },
      circumstantial: {
        heading: "Circonstanciels et Autres",
        text: "Instrumental, Comitatif, Abessif (sans), Vocatif, Thème/Topic (comme le japonais wa)."
      }
    },
    sec15: {
      title: "15. Détermination et Quantification",
      determination: "Détermination : articles définis/indéfinis, absence ou démonstratifs.",
      numSystems: "Systèmes Numériques : décimal, vicésimal (base 20), etc.",
      numberCats: "Catégories de Nombre : singulier, pluriel, duel (deux), paucal (quelques-uns).",
      classifiers: "Classificateurs Numéraux : obligatoires pour compter les objets.",
      quantifiers: "Quantificateurs : partitifs vs distributifs."
    },
    sec16: {
      title: "16. Système Pronominal Avancé",
      person: "Personne : 1ère, 2ème, 3ème et 4ème obviative.",
      inEx: "Inclusif/Exclusif : \"nous\" incluant ou excluant l'auditeur.",
      animacy: "Animacité : animé vs inanimé.",
      gender: "Genre/Classes : binaire, absent ou basé sur la forme/matière.",
      reflexive: "Réflexivité/Réciprocité."
    },
    sec17: {
      title: "17. Catégories Lexicales",
      stative: "Verbes Statifs : qualités fonctionnant comme des verbes.",
      nounClasses: "Classes Nominales : classées par trait sémantique."
    }
  },
  part6: {
    badge: "Partie 6",
    title: "Espace et Culture",
    sec18: {
      title: "18. Deixis et Référence Spatiale/Temporelle",
      demonstrative: {
        term: "Système Démonstratif :",
        def: "2 termes (ceci/cela) ou 3 termes (près de moi, de toi, lointain).",
        boxTitle: "Japonais",
        boxText: "kore (près de moi), sore (près de toi), are (lointain)."
      },
      vertical: "Deixis Verticale/Géographique : repères cardinaux absolus."
    },
    sec19: {
      title: "19. Pragmatique et Sociolinguistique",
      honorifics: "Honorifiques : affixes/mots de déférence sociale.",
      register: "Registres de Langue : variation formelle/informelle (tu/vous).",
      taboos: "Tabous et Euphémismes."
    },
    sec20: {
      title: "20. Lexique Culturel",
      kinship: "Systèmes de Parenté : distinction oncle maternel vs paternel.",
      color: "Termes de Couleur : ordre d'acquisition évolutif prévisible."
    }
  },
  part7: {
    badge: "Partie 7",
    title: "Écriture et Histoire",
    sec21: {
      title: "21. Système d'Écriture",
      sysType: "Type de Système : alphabétique, syllabaire, logographique, abjad ou abugida.",
      direction: "Direction : de gauche à droite, droite à gauche, boustrophédon ou vertical."
    },
    sec22: {
      title: "22. Diachronie (Évolution Historique de la Langue)",
      soundChange: "Changement Phonétique : règles systématiques d'évolution depuis une proto-langue.",
      loans: "Emprunts et Strates Historiques : coexistence de strates anciennes et prestigieuses."
    }
  }
};
