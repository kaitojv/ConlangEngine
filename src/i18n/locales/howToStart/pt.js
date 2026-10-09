export default {
  title: "Como Começar",
  subtitle: "Checklist Completo para Criação de Conlangs",
  intro: {
    sequenceDesc: "Organizado em uma sequência que vai do som do idioma até sua história:",
    sequence: {
      sound: "som",
      wordFormation: "formação das palavras",
      sentenceOrganization: "organização das frases",
      verbSystem: "sistema verbal",
      nounSystem: "sistema nominal",
      spaceAndCulture: "espaço e cultura",
      writing: "escrita",
      history: "história"
    },
    glossDesc: "Todos os exemplos vêm de idiomas reais, com uma glosa simples (tradução palavra por palavra abaixo da frase original) para que você possa acompanhar mesmo sem conhecer a língua."
  },
  sec0: {
    title: "0. Conceitos Básicos (glossário rápido)",
    desc: "Alguns termos técnicos aparecerão ao longo do documento. Vale a pena fixá-los primeiro:",
    morpheme: {
      term: "Morfema:",
      def: "a menor unidade de significado em uma língua. Pode ser uma palavra inteira por si só (livre) ou um pequeno pedaço que só existe anexado a outro (preso). Em \"gatinhos\", há três morfemas: gat (raiz) + inh (diminutivo/derivação) + s (plural)."
    },
    rootAffix: {
      term: "Raiz vs. Afixo:",
      def: "a raiz carrega o significado central da palavra; o afixo é a peça extra anexada a ela para adicionar informações gramaticais (plural, tempo, negação, etc.)."
    },
    subjectObject: {
      term: "Sujeito e Objeto:",
      def: "em uma frase como \"o menino chutou a bola\", o menino é o sujeito (quem realiza a ação) e a bola é o objeto (quem recebe a ação)."
    },
    transitive: {
      term: "Verbo Transitivo vs. Intransitivo:",
      def: "um verbo é transitivo quando precisa de um objeto para a frase ter sentido completo (\"Eu vi o cachorro\"). Um verbo é intransitivo quando já faz sentido completo sozinho, sem nenhum objeto (\"Eu durmo\")."
    },
    clause: {
      term: "Oração:",
      def: "um trecho de uma sentença organizado em torno de um único verbo (com seu sujeito e objeto, se houver)."
    },
    mainSubordinate: {
      term: "Oração Principal vs. Subordinada:",
      def: "quando duas orações se combinam, a oração principal é o \"centro\", e a oração subordinada existe apenas para completá-la ou qualificá-la. Em \"Eu sei que ele chegou\", \"que ele chegou\" é uma oração subordinada."
    }
  },
  part1: {
    badge: "Parte 1",
    title: "O Som da Língua",
    sec1: {
      title: "1. Fonologia e Fonotática",
      desc: "A base antes de qualquer outra decisão — sem isso definido, nenhum exemplo sonoro da língua é sequer possível.",
      inventory: {
        term: "Inventário Fonêmico:",
        def: "quantos e quais sons (consoantes e vogais) a língua trata como distintivos em significado.",
        boxTitle: "Variação de Inventários",
        boxText: "As línguas variam desde sistemas vocálicos mínimos (Árabe Clássico: 3 vogais) até sistemas enormes. Consoantes variam de inventários pequenos (Havaiano: 13 fonemas) a extremamente ricos (!Xóõ: >100 consoantes)."
      },
      syllable: {
        term: "Estrutura Silábica:",
        def: "quais combinações de consoantes/vogais a língua permite.",
        boxTitle: "Exemplos do Mundo Real",
        boxJapanese: "O japonês é quase inteiramente (C)V (ka, shi, tsu).",
        boxGeorgian: "O georgiano permite encontros consonantais pesados: gvprtskvni (\"você está me descascando\")."
      },
      phonotactics: {
        term: "Restrições Fonotáticas:",
        def: "regras específicas sobre quais sons podem ficar lado a lado. Em inglês e português, nenhuma palavra nativa começa com \"ng\"."
      },
      allophony: {
        term: "Alofonia:",
        def: "quando o mesmo fonema muda de pronúncia dependendo do contexto. Em inglês, o \"t\" em \"top\" é aspirado, enquanto em \"stop\" não é."
      }
    },
    sec2: {
      title: "2. Prosódia e Fonologia Suprassegmental",
      tone: {
        term: "Tom:",
        def: "pode ser tom de contorno (mudanças de altura dentro da sílaba) ou tom de registro (níveis fixos de altura).",
        boxTitle: "Tons do Mandarim",
        boxText: "A sílaba \"ma\" muda de significado dependendo inteiramente do tom:",
        mother: "mā (mãe)",
        hemp: "má (cânhamo)",
        horse: "mǎ (cavalo)",
        scold: "mà (xingar/repreender)"
      },
      stress: {
        term: "Acento Tônico:",
        def: "pode ser fixo ou lexical.",
        boxTitle: "Tipos de Acentuação",
        fixed: "Fixo: sempre caindo na mesma posição (Francês: quase sempre na última sílaba; Polonês: quase sempre na penúltima).",
        lexical: "Lexical: variando de palavra para palavra e distinguindo significado (Inglês: \"REcord\" substantivo vs \"reCORD\" verbo; Português: \"SÁBIA\" vs \"saBIA\" vs \"saBIÁ\")."
      }
    }
  },
  part2: {
    badge: "Parte 2",
    title: "Como as Palavras São Formadas",
    sec3: {
      title: "3. Tipologia Morfológica",
      desc: "Define quanto \"trabalho gramatical\" cada palavra carrega por conta própria.",
      isolating: {
        term: "Isolante:",
        def: "cada palavra carrega um único significado, sem afixos.",
        boxTitle: "Mandarim",
        boxText: "我 看 你 (wǒ kàn nǐ, \"Eu vejo você\") não possui nenhuma marcação de tempo ou concordância."
      },
      agglutinating: {
        term: "Aglutinante:",
        def: "raiz + vários afixos empilhados, cada um com uma função isolada.",
        boxTitle: "Turco",
        boxText: "ev-ler-im-de (casa-PLURAL-minha-em) = \"nas minhas casas\"."
      },
      fusional: {
        term: "Fusional:",
        def: "um único afixo funde várias informações de uma só vez.",
        boxTitle: "Latim",
        boxText: "amō (\"eu amo\") empacota 1ª pessoa, singular, presente do indicativo na terminação \"-ō\"."
      },
      polysynthetic: {
        term: "Polissintética:",
        def: "uma única palavra incorpora múltiplos argumentos e advérbios, funcionando como uma oração inteira.",
        boxTitle: "Inuktitut",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga (\"Eu terei que ir ao aeroporto\")."
      },
      note: "Nota de design: a maioria das conlangs naturalistas escolhe um ponto dominante nesse espectro (não todos de uma vez), com apenas algumas variações internas."
    },
    sec4: {
      title: "4. Formação de Palavras (além da afixação)",
      compounding: {
        term: "Composição:",
        def: "junção de duas raízes existentes.",
        boxTitle: "Alemão e Inglês",
        boxText: "Alemão: Donaudampfschifffahrtsgesellschaft. Inglês: \"sunflower\" (girassol)."
      },
      reduplication: {
        term: "Reduplicação:",
        def: "repetição de parte ou de toda a raiz.",
        boxTitle: "Indonésio",
        boxText: "rumah (casa) → rumah-rumah (casas)."
      },
      blending: {
        term: "Redução / Amálgama (Blending):",
        def: "encurtamento ou fusão de palavras.",
        boxTitle: "Inglês",
        boxText: "\"smoke\" + \"fog\" = \"smog\" (fumaça + neblina)."
      }
    },
    sec5: {
      title: "5. Tipos de Afixos",
      prefix: "Prefixo: antes da raiz (in-feliz).",
      suffix: "Sufixo: depois da raiz (feliz-mente).",
      infix: {
        term: "Infixo:",
        def: "inserido dentro da própria raiz.",
        boxTitle: "Tagalo",
        boxText: "basa (ler) → b-um-asa (leu, passado)."
      },
      circumfix: {
        term: "Circunfixo:",
        def: "duas partes que abraçam a raiz em ambos os lados.",
        boxTitle: "Alemão",
        boxText: "ge-mach-t (feito, a partir de machen)."
      },
      transfix: {
        term: "Transfixo / raiz consonantal:",
        def: "a raiz é um esqueleto de consoantes onde as vogais são intercaladas.",
        boxTitle: "Árabe",
        boxText: "Raiz K-T-B → KaTaBa (ele escreveu), KiTāB (livro), maKTaB (escritório)."
      }
    },
    sec6: {
      title: "6. Funções Comuns dos Afixos",
      negation: "Negação/Oposição: des-fazer.",
      manner: "Modo (advérbio): rapida-mente.",
      agent: "Agente: joga-dor.",
      nominalization: "Nominalização Verbal: cria-ção.",
      abstract: "Qualidade Abstrata: bele-za.",
      place: "Lugar: pada-ria.",
      possession: "Posse/Qualidade: perig-oso.",
      degree: {
        term: "Grau (diminutivo/aumentativo):",
        boxTitle: "Italiano",
        boxText: "casa (casa) → casetta (casinha)."
      },
      plurality: "Pluralidade: casa-s.",
      causative: {
        term: "Causativo:",
        boxTitle: "Turco",
        boxText: "öl- (morrer) → öl-dür- (matar / fazer morrer)."
      }
    },
    sec7: {
      title: "7. Fenômenos de Fronteira e Mutação",
      vowelHarmony: {
        term: "Harmonia Vocálica:",
        def: "os afixos se ajustam para combinar com as vogais da raiz.",
        boxTitle: "Turco",
        boxText: "O sufixo de plural muda de forma: ev-ler (casas) vs kız-lar (meninas)."
      },
      mutation: {
        term: "Mutação Consonantal:",
        def: "a consoante inicial muda dependendo da palavra anterior.",
        boxTitle: "Galês",
        boxText: "mam (mãe) muda para fam ou nham."
      }
    }
  },
  part3: {
    badge: "Parte 3",
    title: "Como as Frases São Organizadas",
    sec8: {
      title: "8. Sintaxe e Ordem das Palavras",
      fixed: "Ordens Fixas: SOV (mais comum, Japonês), SVO (Português, Inglês), VSO (Irlandês), VOS (Malgaxe), OVS (Hixkaryana), OSV (raro na Amazônia).",
      free: {
        term: "Ordem Livre (Não-configuracional):",
        def: "guiada pela ênfase, requer um sistema de casos bem desenvolvido.",
        boxTitle: "Russo",
        boxText: "Мальчик видит собаку e Собаку видит мальчик significam \"o menino vê o cachorro\" devido à marcação acusativa em \"cachorro\" (собаку)."
      }
    },
    sec9: {
      title: "9. Alinhamento Morfossintático",
      desc: "O sujeito de um verbo intransitivo se parece mais com o sujeito ou com o objeto de um verbo transitivo?",
      nomAcc: "Nominativo-Acusativo: (Português, Alemão) O sujeito recebe a mesma marcação; o objeto recebe marcação diferente.",
      ergAbs: {
        term: "Ergativo-Absolutivo:",
        def: "O sujeito intransitivo se assemelha ao objeto transitivo (absolutivo); o sujeito transitivo recebe marcação própria (ergativo).",
        boxTitle: "Basco",
        boxText1: "Gizona etorri da (o homem-ABS chegou)",
        boxText2: "Gizonak liburua irakurri du (o homem-ERG leu o livro-ABS)"
      },
      activeStative: "Ativo-Estativo: (Guarani) A marcação do sujeito intransitivo muda dependendo se a ação é voluntária ou involuntária.",
      tripartite: "Tripartite: (Nez Perce) Sujeito transitivo, sujeito intransitivo e objeto recebem, cada um, marcações distintas."
    },
    sec10: {
      title: "10. Voz Verbal",
      passive: "Passiva: promove o objeto a sujeito (\"o cachorro foi visto\").",
      antipassive: "Antipassiva: reduz a valência mantendo o agente como sujeito e rebaixando o objeto (Línguas ergativas).",
      middle: "Voz Média: ações que afetam o próprio sujeito sem serem puramente reflexivas (\"vestir-se\").",
      applicative: {
        term: "Aplicativa:",
        def: "promove um elemento oblíquo (beneficiário, local) a objeto direto.",
        boxTitle: "Suaíli",
        boxText: "Adicionar um sufixo aplicativo transforma \"comprar\" em \"comprar para alguém\"."
      },
      causative: "Causativo Direto vs. Indireto: \"fazer alguém realizar\" vs \"permitir que alguém realize\"."
    },
    sec11: {
      title: "11. Estratégias Sintáticas Específicas",
      negation: {
        term: "Negação:",
        def: "partícula isolada, afixo ou dupla negação.",
        boxTitle: "Francês",
        boxText: "ne...pas (dupla negação que envolve o verbo)."
      },
      questions: "Formação de Perguntas: partícula final (Japonês ka), inversão (\"is he?\"), entonação ou afixo no verbo.",
      relative: "Orações Relativas: estratégia com pronome relativo (Português) ou modificador antes do substantivo (Japonês).",
      serial: {
        term: "Construções de Verbos Seriais:",
        def: "verbos encadeados sem conjunção ou conector.",
        boxTitle: "Iorubá",
        boxText: "\"pegou livro veio\" = trouxe."
      },
      switchRef: "Switch-Reference (Troca de Referência): marcador na oração subordinada sinaliza se o sujeito é o mesmo da oração principal."
    },
    sec12: {
      title: "12. Sintaxe Estrutural e Determinação",
      copula: "Cópula Zero: dispensa totalmente o verbo \"ser/estar\" (Russo \"ele médico\").",
      headDirection: "Direcionalidade do Núcleo: modificadores antes (núcleo final) ou depois (núcleo inicial) do termo principal.",
      modals: "Modais: verbos auxiliares (deve, pode) ou afixos verbais (Turco -ebil-).",
      nonLinearity: "Não-linearidade (Semasiografia): bloco visual de significado simultâneo (quipos incas)."
    }
  },
  part4: {
    badge: "Parte 4",
    title: "Sistema Verbal",
    sec13: {
      title: "13. Sistema Verbal (TAM) e Evidencialidade",
      tense: {
        heading: "Tempo",
        absolute: "Absoluto: passado / presente / futuro.",
        binary: "Binário: passado vs. não-passado.",
        distance: "Distância: distingue o quão longe no tempo o evento ocorreu (\"hoje\" vs \"ontem\" vs \"passado remoto\")."
      },
      aspect: {
        heading: "Aspecto",
        perfective: "Perfectivo: ação concluída como um todo fechado (Russo прочитал).",
        continuous: "Imperfectivo — Contínuo: acontecendo agora (\"estou lendo\").",
        habitual: "Imperfectivo — Habitual: rotina ou costume (\"costumava ler\").",
        perfect: "Perfeito: evento passado com relevância presente (\"tenho lido / li recentemente\").",
        iterative: "Iterativo: ação repetida várias vezes.",
        inchoative: "Inceptivo/Incoativo: foco no início da ação (\"adormecer\")."
      },
      mood: {
        heading: "Modo",
        indicative: "Indicativo: fatos concretos e reais.",
        subjunctive: "Subjuntivo: dúvida, desejo, subordinação.",
        conditional: "Condicional: se uma condição for atendida (\"iria\").",
        imperative: "Imperativo: comando ou ordem (\"Vá!\").",
        optative: "Optativo: desejo ou anseio fervoroso.",
        interrogative: "Interrogativo: pergunta marcada diretamente no verbo."
      },
      evidentiality: {
        heading: "Evidencialidade (como o falante sabe)",
        visual: "Sensorial Visual: o falante presenciou com os próprios olhos.",
        nonVisual: "Sensorial Não-visual: ouviu, sentiu, cheirou.",
        inferential: "Inferencial: deduzido por evidências (\"deve ter chovido\").",
        reportative: "Reportativo/Citativo: soube por terceiros (Turco gelmiş vs geldi)."
      }
    }
  },
  part5: {
    badge: "Parte 5",
    title: "Sistema Nominal",
    sec14: {
      title: "14. Casos Gramaticais / Declinações Nominais",
      central: {
        heading: "Centrais (Sintáticos)",
        text: "Nominativo (sujeito), Acusativo (objeto), Dativo (beneficiário), Ergativo/Absolutivo, Agente da Passiva."
      },
      possession: {
        heading: "Posse e Locativo",
        text: "Genitivo (posse), Locativo (em), Ablativo (origem/de), Alativo (em direção a), Ilativo (para dentro de), Elativo (para fora de), Perlativo (através de)."
      },
      circumstantial: {
        heading: "Circunstanciais e Outros",
        text: "Instrumental (com instrumento), Comitativo (junto de), Abessivo (sem), Vocativo (chamamento), Tópico (tema principal, como o japonês wa)."
      }
    },
    sec15: {
      title: "15. Determinação e Quantificação",
      determination: "Determinação: artigos definidos/indefinidos, ausência total de artigos ou demonstrativos.",
      numSystems: "Sistemas Numéricos: decimal, vigesimal (base 20: Maia, vestígios no Francês), etc.",
      numberCats: "Categorias de Número: singular, plural, dual (exatamente dois), trial (três), paucal (poucos).",
      classifiers: "Classificadores Numerais: obrigatórios para contar objetos (Mandarim: \"três [volume-encadernado] livro\").",
      quantifiers: "Quantificadores: partitivos vs distributivos."
    },
    sec16: {
      title: "16. Sistema Pronominal Avançado",
      person: "Pessoa: 1ª, 2ª, 3ª e 4ª Obviativa (para distinguir dois referentes diferentes de 3ª pessoa).",
      inEx: "Inclusivo/Exclusivo: \"nós\" incluindo o ouvinte vs excluindo o ouvinte.",
      animacy: "Animacidade: distinção gramatical entre seres vivos e objetos inanimados.",
      gender: "Gênero/Classes: binário, inexistente ou baseado em forma/substância (Bantu).",
      reflexive: "Reflexividade/Reciprocidade: \"ver a si mesmo\" vs \"verem-se mutuamente\"."
    },
    sec17: {
      title: "17. Categorias Lexicais",
      stative: "Verbos Estativos: qualidades e adjetivos funcionam como verbos (Mandarim \"ele alto\", sem verbo \"ser\").",
      nounClasses: "Classes Nominais: categorizadas por traço semântico (animado/forma), concordando com adjetivos/verbos (Suaíli)."
    }
  },
  part6: {
    badge: "Parte 6",
    title: "Espaço e Cultura",
    sec18: {
      title: "18. Dêixis e Referência Espacial/Temporal",
      demonstrative: {
        term: "Sistema Demonstrativo:",
        def: "2 termos (este/aquele) ou 3 termos (perto de mim, perto de você, longe de ambos).",
        boxTitle: "Japonês",
        boxText: "kore (este, perto de mim), sore (esse, perto de você), are (aquele lá, longe de ambos)."
      },
      vertical: "Dêixis Vertical/Geográfica: direções cardeais absolutas (\"ao norte do prato\") em vez de esquerda/direita."
    },
    sec19: {
      title: "19. Pragmática e Sociolinguística",
      honorifics: "Honoríficos: afixos/vocábulos para deferência e respeito social (Japonês).",
      register: "Níveis de Registro: variação formal/informal (Francês tu/vous, Português você/o senhor).",
      taboos: "Tabus e Eufemismos: evitar temas delicados (\"vocabulário de luto\")."
    },
    sec20: {
      title: "20. Léxico Cultural",
      kinship: "Sistemas de Parentesco: distinguir tio materno de tio paterno.",
      color: "Termos Básicos de Cores: as línguas adquirem termos de cores em uma ordem evolutiva previsível."
    }
  },
  part7: {
    badge: "Parte 7",
    title: "Escrita e História",
    sec21: {
      title: "21. Sistema de Escrita",
      sysType: "Tipo de Sistema: alfabético, silabário, logográfico, abjad (somente consoantes) ou abugida (vogal inerente inclusa).",
      direction: "Direção: esquerda para direita, direita para esquerda, bustrofédon (alternado) ou vertical."
    },
    sec22: {
      title: "22. Diacronia (Evolução Histórica da Língua)",
      soundChange: "Mudança Sonora: regras sistemáticas sobre como os sons evoluem a partir de uma protolíngua (Latim /p/ para /b/).",
      loans: "Empréstimos e Camadas Históricas: camada nativa antiga coexistindo com camadas de prestígio emprestadas (camada germânica nativa do inglês vs empréstimos do latim/francês)."
    }
  }
};
