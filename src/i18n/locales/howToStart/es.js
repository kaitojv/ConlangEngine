export default {
  title: "Cómo Empezar",
  subtitle: "Checklist Completo para la Creación de Conlangs",
  intro: {
    sequenceDesc: "Organizado en una secuencia que va desde el sonido del idioma hasta su historia:",
    sequence: {
      sound: "sonido",
      wordFormation: "formación de palabras",
      sentenceOrganization: "organización de oraciones",
      verbSystem: "sistema verbal",
      nounSystem: "sistema nominal",
      spaceAndCulture: "espacio y cultura",
      writing: "escritura",
      history: "historia"
    },
    glossDesc: "Todos los ejemplos provienen de idiomas reales, con una glosa simple (traducción palabra por palabra debajo de la oración original) para que puedas seguir el contenido sin conocer la lengua."
  },
  sec0: {
    title: "0. Conceptos Básicos (glosario rápido)",
    desc: "Varios términos técnicos aparecerán a lo largo del documento. Conviene definirlos primero:",
    morpheme: {
      term: "Morfema:",
      def: "la unidad mínima de significado en una lengua. Puede ser una palabra completa por sí misma (libre) o una pieza que solo existe unida a otra (ligada). En \"gatitos\", hay tres morfemas: gat (raíz) + it (diminutivo/derivación) + s (plural)."
    },
    rootAffix: {
      term: "Raíz vs. Afijo:",
      def: "la raíz porta el significado central de la palabra; el afijo es la pieza extra adherida para agregar información gramatical (plural, tiempo, negación, etc.)."
    },
    subjectObject: {
      term: "Sujeto y Objeto:",
      def: "en una oración como \"el niño pateó el balón\", el niño es el sujeto (quien realiza la acción) y el balón es el objeto (quien la recibe)."
    },
    transitive: {
      term: "Verbo Transitivo vs. Intransitivo:",
      def: "un verbo es transitivo cuando necesita un objeto para completar su sentido (\"Vi el perro\"). Es intransitivo cuando tiene sentido completo por sí solo (\"Duermo\")."
    },
    clause: {
      term: "Cláusula / Proposición:",
      def: "un fragmento oracional organizado en torno a un único verbo (con su sujeto y objeto, si los hay)."
    },
    mainSubordinate: {
      term: "Cláusula Principal vs. Subordinada:",
      def: "cuando dos cláusulas se combinan, la principal es el \"centro\", y la subordinada existe solo para completarla o calificarla. En \"Sé que llegó\", \"que llegó\" es una cláusula subordinada."
    }
  },
  part1: {
    badge: "Parte 1",
    title: "El Sonido de la Lengua",
    sec1: {
      title: "1. Fonología y Fonotáctica",
      desc: "La base antes de cualquier otra decisión: sin esto definido, no es posible ningún ejemplo sonoro de la lengua.",
      inventory: {
        term: "Inventario Fonémico:",
        def: "cuántos y cuáles sonidos (consonantes y vocales) la lengua trata como significativamente distintos.",
        boxTitle: "Variedad de Inventarios",
        boxText: "Las lenguas varían desde sistemas vocálicos mínimos (Árabe Clásico: 3 vocales) hasta sistemas enormes. Las consonantes van desde inventarios pequeños (Hawaiano: 13 fonemas) hasta extremadamente ricos (!Xóõ: >100 consonantes)."
      },
      syllable: {
        term: "Estructura Silábica:",
        def: "qué combinaciones de consonantes y vocales permite la lengua.",
        boxTitle: "Ejemplos Reales",
        boxJapanese: "El japonés es casi completamente (C)V (ka, shi, tsu).",
        boxGeorgian: "El georgiano permite grupos complejos: gvprtskvni (\"me estás pelando\")."
      },
      phonotactics: {
        term: "Restricciones Fonotácticas:",
        def: "reglas específicas sobre qué sonidos pueden estar juntos. En español e inglés, ninguna palabra nativa comienza con \"ng\"."
      },
      allophony: {
        term: "Alofonía:",
        def: "cuando el mismo fonema cambia su pronunciación según el contexto."
      }
    },
    sec2: {
      title: "2. Prosodia y Fonología Suprasegmental",
      tone: {
        term: "Tono:",
        def: "puede ser tono de contorno o tono de registro (niveles fijos).",
        boxTitle: "Tonos en Mandarín",
        boxText: "La sílaba \"ma\" cambia de significado según el tono:",
        mother: "mā (madre)",
        hemp: "má (cáñamo)",
        horse: "mǎ (caballo)",
        scold: "mà (regañar)"
      },
      stress: {
        term: "Acento:",
        def: "puede ser fijo o léxico.",
        boxTitle: "Tipos de Acento",
        fixed: "Fijo: cae siempre en la misma posición (Francés: última sílaba; Polaco: penúltima).",
        lexical: "Léxico: varía de palabra a palabra y distingue significado (Español: \"canto\" vs \"cantó\")."
      }
    }
  },
  part2: {
    badge: "Parte 2",
    title: "Cómo se Forman las Palabras",
    sec3: {
      title: "3. Tipología Morfológica",
      desc: "Define cuánto \"trabajo gramatical\" realiza cada palabra por sí misma.",
      isolating: {
        term: "Aislante:",
        def: "cada palabra porta un solo significado, sin afijos.",
        boxTitle: "Mandarín",
        boxText: "我 看 你 (wǒ kàn nǐ, \"Te veo\") no tiene marcas de tiempo ni concordancia."
      },
      agglutinating: {
        term: "Aglutinante:",
        def: "raíz + varios afijos apilados, cada uno con una función aislada.",
        boxTitle: "Turco",
        boxText: "ev-ler-im-de (casa-PLURAL-mi-en) = \"en mis casas\"."
      },
      fusional: {
        term: "Fusional:",
        def: "un solo afijo fusiona varias informaciones gramaticales a la vez.",
        boxTitle: "Latín",
        boxText: "amō (\"yo amo\") empaqueta 1ª persona, singular, presente, indicativo en \"-ō\"."
      },
      polysynthetic: {
        term: "Polisintética:",
        def: "una sola palabra incorpora múltiples argumentos y adverbios.",
        boxTitle: "Inuktitut",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga (\"Tendré que ir al aeropuerto\")."
      },
      note: "Nota de diseño: la mayoría de conlangs naturalistas eligen un punto dominante en este espectro, con alguna variación interna."
    },
    sec4: {
      title: "4. Formación de Palabras (más allá de la afijación)",
      compounding: {
        term: "Composición:",
        def: "unión de dos raíces existentes.",
        boxTitle: "Alemán e Inglés",
        boxText: "Alemán: Donaudampfschifffahrtsgesellschaft. Español: \"paraguas\"."
      },
      reduplication: {
        term: "Reduplicación:",
        def: "repetición parcial o total de una raíz.",
        boxTitle: "Indonesio",
        boxText: "rumah (casa) → rumah-rumah (casas)."
      },
      blending: {
        term: "Acrónimo / Cruce Léxico:",
        def: "acortamiento o fusión de palabras.",
        boxTitle: "Inglés",
        boxText: "\"smoke\" + \"fog\" = \"smog\"."
      }
    },
    sec5: {
      title: "5. Tipos de Afijos",
      prefix: "Prefijo: antes de la raíz (in-feliz).",
      suffix: "Sufijo: después de la raíz (rápida-mente).",
      infix: {
        term: "Infijo:",
        def: "insertado dentro de la propia raíz.",
        boxTitle: "Tagalo",
        boxText: "basa (leer) → b-um-asa (leyó, pasado)."
      },
      circumfix: {
        term: "Circunfijo:",
        def: "dos partes a ambos lados de la raíz.",
        boxTitle: "Alemán",
        boxText: "ge-mach-t (hecho, de machen)."
      },
      transfix: {
        term: "Transfijo / raíz consonántica:",
        def: "la raíz es un esqueleto de consonantes en el que se intercalan vocales.",
        boxTitle: "Árabe",
        boxText: "Raíz K-T-B → KaTaBa (escribió), KiTāB (libro), maKTaB (oficina)."
      }
    },
    sec6: {
      title: "6. Funciones Comunes de los Afijos",
      negation: "Negación/Oposición: des-hacer.",
      manner: "Modo (adverbio): rápida-mente.",
      agent: "Agente: juga-dor.",
      nominalization: "Nominalización Verbal: crea-ción.",
      abstract: "Cualidad Abstracta: belle-za.",
      place: "Lugar: pana-dería.",
      possession: "Posesión/Cualidad: peligro-so.",
      degree: {
        term: "Grado (diminutivo/aumentativo):",
        boxTitle: "Italiano",
        boxText: "casa (casa) → casetta (casita)."
      },
      plurality: "Pluralidad: casa-s.",
      causative: {
        term: "Causativo:",
        boxTitle: "Turco",
        boxText: "öl- (morir) → öl-dür- (matar / hacer morir)."
      }
    },
    sec7: {
      title: "7. Fenómenos de Límite y Mutación",
      vowelHarmony: {
        term: "Armonía Vocálica:",
        def: "los afijos se ajustan a las vocales de la raíz.",
        boxTitle: "Turco",
        boxText: "El sufijo plural cambia: ev-ler (casas) vs kız-lar (chicas)."
      },
      mutation: {
        term: "Mutación Consonántica:",
        def: "la consonante inicial cambia según la palabra anterior.",
        boxTitle: "Galés",
        boxText: "mam (madre) cambia a fam o nham."
      }
    }
  },
  part3: {
    badge: "Parte 3",
    title: "Cómo se Organizan las Oraciones",
    sec8: {
      title: "8. Sintaxis y Orden de Palabras",
      fixed: "Órdenes Fijos: SOV (más común, Japonés), SVO (Español, Inglés), VSO (Irlandés), VOS (Malgache), OVS (Hixkaryana), OSV (raro en el Amazonas).",
      free: {
        term: "Orden Libre (No configuracional):",
        def: "guiado por el énfasis, requiere un sistema de casos robusto.",
        boxTitle: "Ruso",
        boxText: "Мальчик видит собаку y Собаку видит мальчик significan \"el niño ve al perro\" gracias a la marca acusativa en perro (собаку)."
      }
    },
    sec9: {
      title: "9. Alineamiento Morfosintáctico",
      desc: "¿El sujeto de un verbo intransitivo se parece más al sujeto o al objeto de un verbo transitivo?",
      nomAcc: "Nominativo-Acusativo: (Español, Alemán) El sujeto recibe la misma marca; el objeto recibe marca distinta.",
      ergAbs: {
        term: "Ergativo-Absolutivo:",
        def: "El sujeto intransitivo se parece al objeto transitivo (absolutivo); el sujeto transitivo recibe marca propia (ergativo).",
        boxTitle: "Vasco",
        boxText1: "Gizona etorri da (el hombre-ABS llegó)",
        boxText2: "Gizonak liburua irakurri du (el hombre-ERG leyó el libro-ABS)"
      },
      activeStative: "Activo-Estativo: (Guaraní) La marca del sujeto intransitivo cambia si la acción es voluntaria o involuntaria.",
      tripartite: "Tripartito: (Nez Perce) Sujeto transitivo, sujeto intransitivo y objeto reciben marcas distintas."
    },
    sec10: {
      title: "10. Voz Verbal",
      passive: "Pasiva: promueve el objeto a sujeto (\"el perro fue visto\").",
      antipassive: "Antipasiva: reduce valencia manteniendo el agente como sujeto y degradando el objeto.",
      middle: "Voz Media: acciones que afectan al sujeto sin ser puramente reflexivas (\"vestirse\").",
      applicative: {
        term: "Aplicativa:",
        def: "promueve un elemento oblicuo a objeto directo.",
        boxTitle: "Suajili",
        boxText: "Añadir un sufijo aplicativo convierte \"comprar\" en \"comprar para alguien\"."
      },
      causative: "Causativo Directo vs. Indirecto: \"hacer hacer\" vs \"permitir hacer\"."
    },
    sec11: {
      title: "11. Estrategias Sintácticas Específicas",
      negation: {
        term: "Negación:",
        def: "partícula aislada, afijo o doble negación.",
        boxTitle: "Francés",
        boxText: "ne...pas (doble negación que envuelve al verbo)."
      },
      questions: "Formación de Preguntas: partícula final (Japonés ka), inversión, entonación o afijo en el verbo.",
      relative: "Oraciones Relativas: mediante pronombre relativo o modificador antepuesto.",
      serial: {
        term: "Construcciones de Verbos Seriales:",
        def: "verbos encadenados sin conector.",
        boxTitle: "Yoruba",
        boxText: "\"tomó libro vino\" = trajo."
      },
      switchRef: "Cambio de Referencia (Switch-Reference): marca en la cláusula subordinada si el sujeto es el mismo que el principal."
    },
    sec12: {
      title: "12. Sintaxis Estructural y Determinación",
      copula: "Cópula Cero: prescinde totalmente del verbo \"ser/estar\" (Ruso \"él médico\").",
      headDirection: "Direccionalidad del Núcleo: modificadores antes (núcleo final) o después (núcleo inicial).",
      modals: "Modales: verbos auxiliares o afijos verbales.",
      nonLinearity: "No linealidad (Semasiografía): bloque visual de significado simultáneo (quipus incas)."
    }
  },
  part4: {
    badge: "Parte 4",
    title: "Sistema Verbal",
    sec13: {
      title: "13. Sistema Verbal (TAM) y Evidencialidad",
      tense: {
        heading: "Tiempo",
        absolute: "Absoluto: pasado / presente / futuro.",
        binary: "Binario: pasado vs. no-pasado.",
        distance: "Distancia: distingue qué tan lejos en el tiempo ocurrió el evento (\"hoy\" vs \"ayer\" vs \"remoto\")."
      },
      aspect: {
        heading: "Aspecto",
        perfective: "Perfectivo: paquete completo cerrado (Ruso прочитал).",
        continuous: "Imperfectivo — Continuo: ocurriendo ahora (\"estoy leyendo\").",
        habitual: "Imperfectivo — Habitual: rutina o costumbre (\"solía leer\").",
        perfect: "Perfecto: evento pasado con relevancia presente (\"he leído\").",
        iterative: "Iterativo: acción repetida.",
        inchoative: "Inceptivo/Incoativo: foco en el inicio (\"dormirse\")."
      },
      mood: {
        heading: "Modo",
        indicative: "Indicativo: hechos concretos y reales.",
        subjunctive: "Subjuntivo: duda, deseo, subordinación.",
        conditional: "Condicional: si se cumple una condición (\"iría\").",
        imperative: "Imperativo: orden (\"¡Ve!\").",
        optative: "Optativo: deseo o anhelo ferviente.",
        interrogative: "Interrogativo: pregunta marcada en el verbo."
      },
      evidentiality: {
        heading: "Evidencialidad (cómo lo sabe el hablante)",
        visual: "Sensorial Visual: el hablante lo vio con sus propios ojos.",
        nonVisual: "Sensorial No Visual: lo escuchó, sintió u olió.",
        inferential: "Inferencial: deducido a partir de pruebas (\"debe haber llovido\").",
        reportative: "Reportativo/Citativo: aprendido de otros (Turco gelmiş vs geldi)."
      }
    }
  },
  part5: {
    badge: "Parte 5",
    title: "Sistema Nominal",
    sec14: {
      title: "14. Casos Gramaticales / Declinaciones Nominales",
      central: {
        heading: "Centrales (Sintácticos)",
        text: "Nominativo (sujeto), Acusativo (objeto), Dativo (beneficiario), Ergativo/Absolutivo, Agente Pasivo."
      },
      possession: {
        heading: "Posesión y Locativo",
        text: "Genitivo (posesión), Locativo (en), Ablativo (desde), Alativo (hacia), Ilativo (hacia dentro), Elativo (hacia fuera), Perlativo (a través de)."
      },
      circumstantial: {
        heading: "Circunstanciales y Otros",
        text: "Instrumental (con herramienta), Comitativo (junto a), Abesivo (sin), Vocativo (apelación), Tópico (tema principal, como el japonés wa)."
      }
    },
    sec15: {
      title: "15. Determinación y Cuantificación",
      determination: "Determinación: artículos definidos/indefinidos, ausencia o demostrativos.",
      numSystems: "Sistemas Numéricos: decimal, vigesimal (base 20: Maya), etc.",
      numberCats: "Categorías de Número: singular, plural, dual (exactamente dos), trial (tres), paucal (unos pocos).",
      classifiers: "Clasificadores Numerales: obligatorios para contar objetos (Mandarín: \"tres [volumen] libro\").",
      quantifiers: "Cuantificadores: partitivos vs distributivos."
    },
    sec16: {
      title: "16. Sistema Pronominal Avanzado",
      person: "Persona: 1ª, 2ª, 3ª y 4ª Obviativa (para distinguir dos referentes de 3ª persona).",
      inEx: "Inclusivo/Exclusivo: \"nosotros\" incluyendo al oyente vs excluyéndolo.",
      animacy: "Animacidad: distinción gramatical entre seres vivos y objetos inanimados.",
      gender: "Género/Clases: binario, ausente o según forma/sustancia (Bantú).",
      reflexive: "Reflexividad/Reciprocidad: \"verse a uno mismo\" vs \"verse mutuamente\"."
    },
    sec17: {
      title: "17. Categorías Léxicas",
      stative: "Verbos Estativos: cualidades que funcionan como verbos (Mandarín \"él alto\", sin \"ser\").",
      nounClasses: "Clases Nominales: categorizadas por rasgo semántico, concordando con adjetivos/verbos (Suajili)."
    }
  },
  part6: {
    badge: "Parte 6",
    title: "Espacio y Cultura",
    sec18: {
      title: "18. Deixis y Referencia Espacial/Temporal",
      demonstrative: {
        term: "Sistema Demostrativo:",
        def: "2 términos (este/aquel) o 3 términos (cerca de mí, cerca de ti, lejos de ambos).",
        boxTitle: "Japonés",
        boxText: "kore (este, cerca de mí), sore (ese, cerca de ti), are (aquel, lejos de ambos)."
      },
      vertical: "Deixis Vertical/Geográfica: direcciones cardinales absolutas (\"al norte del plato\")."
    },
    sec19: {
      title: "19. Pragmática y Sociolingüística",
      honorifics: "Honoríficos: afijos/palabras para cortesía social (Japonés).",
      register: "Niveles de Registro: variación formal/informal (Francés tu/vous, Español tú/usted).",
      taboos: "Tabúes y Eufemismos: evitar temas sensibles (\"vocabulario de luto\")."
    },
    sec20: {
      title: "20. Léxico Cultural",
      kinship: "Sistemas de Parentesco: distinguir tío materno de tío paterno.",
      color: "Términos Básicos de Color: las lenguas adquieren términos de color en un orden evolutivo predecible."
    }
  },
  part7: {
    badge: "Parte 7",
    title: "Escritura e Historia",
    sec21: {
      title: "21. Sistema de Escritura",
      sysType: "Tipo de Sistema: alfabético, silabario, logográfico, abyad (solo consonantes) o abugida (vocal inherente incorporada).",
      direction: "Dirección: izquierda a derecha, derecha a izquierda, bustrófedon o vertical."
    },
    sec22: {
      title: "22. Diacronía (Evolución Histórica de la Lengua)",
      soundChange: "Cambio Sonoro: reglas sistemáticas de cómo los sonidos evolucionan desde una protolengua (Latín /p/ a /b/).",
      loans: "Préstamos y Capas Históricas: capa nativa antigua coexistiendo con capas prestadas de prestigio."
    }
  }
};
