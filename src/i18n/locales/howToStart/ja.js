export default {
  title: "はじめに",
  subtitle: "人工言語制作のための完全チェックリスト",
  intro: {
    sequenceDesc: "音声から言語の歴史に至る論理的な順序で構成されています：",
    sequence: {
      sound: "音",
      wordFormation: "語形成",
      sentenceOrganization: "文の構造",
      verbSystem: "動詞体系",
      nounSystem: "名詞体系",
      spaceAndCulture: "空間と文化",
      writing: "文字",
      history: "歴史"
    },
    glossDesc: "すべての例は自然言語から引用されており、逐語訳（グロス）が付いています。"
  },
  sec0: {
    title: "0. 基本的な言語学概念（簡易用語集）",
    desc: "解説で頻出する専門用語を事前に整理します：",
    morpheme: {
      term: "形態素：",
      def: "意味を持つ最小の言語単位。単独で語になれる自由形態素と、他と結合して現れる拘束形態素があります。"
    },
    rootAffix: {
      term: "語根 vs 接辞：",
      def: "語根は中核的な語彙的意味を担い、接辞は文法情報や派生情報を付加します。"
    },
    subjectObject: {
      term: "主語と目的語：",
      def: "「少年がボールを蹴った」において、少年は主語（動作主）、ボールは目的語（対象）です。"
    },
    transitive: {
      term: "他動詞 vs 自動詞：",
      def: "他動詞は目的語を必要とし（「犬を見た」）、自動詞は単独で意味が完結します（「眠る」）。"
    },
    clause: {
      term: "節：",
      def: "単一の動詞を中心に構成される文の構成単位。"
    },
    mainSubordinate: {
      term: "主節 vs 従属節：",
      def: "主節が文の中核であり、従属節はそれを修飾・補足します。"
    }
  },
  part1: {
    badge: "第 1 部",
    title: "言語の音",
    sec1: {
      title: "1. 音韻論と音配列（音素配列論）",
      desc: "すべての土台：これが定義されていなければ、言語のいかなる音の例示も不可能です。",
      inventory: {
        term: "音素目録：",
        def: "意味を弁別する子音と母音の体系。",
        boxTitle: "目録の多様性",
        boxText: "最小の母音体系（古典アラビア語：3母音）から、極めて豊富な子音体系（!Xóõ語：100以上の子音）まで多岐にわたります。"
      },
      syllable: {
        term: "音節構造：",
        def: "許容される子音と母音の組み合わせ。",
        boxTitle: "実例",
        boxJapanese: "日本語はほぼ (C)V 構造です（ka, shi, tsu）。",
        boxGeorgian: "ジョージア語は重厚な子音連続を許容します：gvprtskvni。"
      },
      phonotactics: {
        term: "音素配列制約：",
        def: "どの音が隣接できるかの規則。"
      },
      allophony: {
        term: "異音：",
        def: "同一音素が環境に応じて発音を変える現象。"
      }
    },
    sec2: {
      title: "2. 韻律と超分節音韻論",
      tone: {
        term: "声調：",
        def: "曲線声調または段声調。",
        boxTitle: "中国語の声調",
        boxText: "音節「ma」は声調によって意味が全く異なります：",
        mother: "mā（母）",
        hemp: "má（麻）",
        horse: "mǎ（馬）",
        scold: "mà（叱る）"
      },
      stress: {
        term: "アクセント・強勢：",
        def: "固定アクセントまたは語彙的アクセント。",
        boxTitle: "アクセントの型",
        fixed: "固定：常に決まった位置に現れる（フランス語：末尾音節、ポーランド語：最後から2番目）。",
        lexical: "語彙的：語によって異なり弁別機能を持つ（英語：REcord 名詞 vs reCORD 動詞）。"
      }
    }
  },
  part2: {
    badge: "第 2 部",
    title: "語の形成",
    sec3: {
      title: "3. 形態論的類型",
      desc: "個々の語がどれだけの文法機能を担うかを決定します。",
      isolating: {
        term: "孤立語：",
        def: "語が単一の意味を持ち接辞がない。",
        boxTitle: "中国語",
        boxText: "我 看 你（私はあなたを見る）には時制や一致の標識がありません。"
      },
      agglutinating: {
        term: "膠着語：",
        def: "語根に単一機能の接辞が連なる。",
        boxTitle: "トルコ語",
        boxText: "ev-ler-im-de = 「私の家々の中で」。"
      },
      fusional: {
        term: "屈折語：",
        def: "1つの接辞が複数の文法情報を融合して担う。",
        boxTitle: "ラテン語",
        boxText: "amō（私は愛する）は「-ō」に1人称・単数・現在・直説法を融合。"
      },
      polysynthetic: {
        term: "抱合語（複総合語）：",
        def: "1つの複合語が複数の項や副詞を取り込み1文全体として機能する。",
        boxTitle: "イヌクティトゥット語",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga（「私は空港に行かなければならないだろう」）。"
      },
      note: "設計のヒント：多くの自然主義的コンラングは、このスペクトルの1つの型を主軸にします。"
    },
    sec4: {
      title: "4. 接辞以外の語形成",
      compounding: {
        term: "複合：",
        def: "既存の2つの語根を結合する。",
        boxTitle: "ドイツ語・英語",
        boxText: "ドイツ語：Donaudampfschifffahrtsgesellschaft。英語：sunflower。"
      },
      reduplication: {
        term: "重複：",
        def: "語根の一部または全部を繰り返す。",
        boxTitle: "インドネシア語",
        boxText: "rumah（家）→ rumah-rumah（家々）。"
      },
      blending: {
        term: "かばん語（混成語）：",
        def: "単語の短縮や結合。",
        boxTitle: "英語",
        boxText: "\"smoke\" + \"fog\" = \"smog\"。"
      }
    },
    sec5: {
      title: "5. 接辞の種類",
      prefix: "接頭辞：語根の前（un-happy）。",
      suffix: "接尾辞：語根の後（happi-ly）。",
      infix: {
        term: "接中辞：",
        def: "語根の内部に挿入。",
        boxTitle: "タガログ語",
        boxText: "basa（読む）→ b-um-asa（読んだ）。"
      },
      circumfix: {
        term: "接周辞：",
        def: "語根の前後に挟み込む。",
        boxTitle: "ドイツ語",
        boxText: "ge-mach-t（作られた）。"
      },
      transfix: {
        term: "貫入接辞（子音語根）：",
        def: "子音の骨組みに母音を挿入。",
        boxTitle: "アラビア語",
        boxText: "語根 K-T-B → KaTaBa（彼は書いた）、KiTāB（本）。"
      }
    },
    sec6: {
      title: "6. 接辞の一般的機能",
      negation: "否定/反対：un-do。",
      manner: "様態（副詞化）：quick-ly。",
      agent: "動作主：play-er。",
      nominalization: "動詞の名詞化：crea-tion。",
      abstract: "抽象名詞化：beau-ty。",
      place: "場所：bak-ery。",
      possession: "所有/性質：danger-ous。",
      degree: {
        term: "度合い（指小辞/指大辞）：",
        boxTitle: "イタリア語",
        boxText: "casa → casetta（小さな家）。"
      },
      plurality: "複数：house-s。",
      causative: {
        term: "使役：",
        boxTitle: "トルコ語",
        boxText: "öl-（死ぬ）→ öl-dür-（殺す / 死なせる）。"
      }
    },
    sec7: {
      title: "7. 境界現象と変異",
      vowelHarmony: {
        term: "母音調和：",
        def: "接辞の母音が語根の母音に同化する。",
        boxTitle: "トルコ語",
        boxText: "ev-ler 対 kız-lar。"
      },
      mutation: {
        term: "子音交替：",
        def: "先行語の影響で語頭子音が変化する。",
        boxTitle: "ウェールズ語",
        boxText: "mam（母）が fam や nham に変化。"
      }
    }
  },
  part3: {
    badge: "第 3 部",
    title: "文の構造",
    sec8: {
      title: "8. 統語論と語順",
      fixed: "固定語順：SOV（日本語）、SVO（英語）、VSO（アイルランド語）、VOS、OVS、OSV。",
      free: {
        term: "自由語順（非形態統語論）：",
        def: "格体系が発達しており、語順は強調や焦点に委ねられる。",
        boxTitle: "ロシア語",
        boxText: "格標識により語順を変えても基本意味が保たれます。"
      }
    },
    sec9: {
      title: "9. 形態統語的整列（アラインメント）",
      desc: "自動詞の主語は他動詞の主語と目的語のどちらと同じように標示されるか？",
      nomAcc: "対格型（主格-対格）：他動詞と自動詞の主語を同じ格で標示。",
      ergAbs: {
        term: "能格型（能格-絶対格）：",
        def: "自動詞の主語と他動詞の目的語を同じ格（絶対格）で標示し、他動詞の主語を能格で標示。",
        boxTitle: "バスク語",
        boxText1: "Gizona etorri da（男-ABS が到着した）",
        boxText2: "Gizonak liburua irakurri du（男-ERG が本-ABS を読んだ）"
      },
      activeStative: "活格型：動作が自発的か非自発的かによって標示が分かれる。",
      tripartite: "三分型：他動詞主語、自動詞主語、目的語がそれぞれ異なる標示を受ける。"
    },
    sec10: {
      title: "10. 態（ヴォイス）",
      passive: "受動態：目的語を主語に昇格させる。",
      antipassive: "逆受動態：目的語の格を下げ自動詞化する（能格言語）。",
      middle: "中動態：主語自身に影響が及ぶ動作。",
      applicative: {
        term: "適用態：",
        def: "斜格（受益者・場所など）を直接目的語に昇格。",
        boxTitle: "スワヒリ語",
        boxText: "「買う」を「〜のために買う」に変える。"
      },
      causative: "直接使役 vs 間接使役：「〜させる」vs「〜することを許す」。"
    },
    sec11: {
      title: "11. 特定の統語戦略",
      negation: {
        term: "否定文：",
        def: "独立不変化詞、接辞、または二重否定枠構造。",
        boxTitle: "フランス語",
        boxText: "ne...pas。"
      },
      questions: "疑問文形成：文末助詞（日本語「か」）、倒置、イントネーション、動詞標識。",
      relative: "関係節：関係代名詞戦略または名詞前置修飾節。",
      serial: {
        term: "連続動詞構文：",
        def: "接続詞なしで動詞が連続する構文。",
        boxTitle: "ヨルバ語",
        boxText: "「本を取って来た」＝持ってきた。"
      },
      switchRef: "スイッチ・リファレンス：従属節が主節と主語が同一か否かを明示。"
    },
    sec12: {
      title: "12. 構造的統語論と限定",
      copula: "ゼロコピュラ：「〜である」動詞を完全に省略（ロシア語）。",
      headDirection: "主要部方向性：主要部前置か主要部後置か。",
      modals: "モダリティ：助動詞または動詞接辞。",
      nonLinearity: "非線形（表意表記）：同時的意味ブロック。"
    }
  },
  part4: {
    badge: "第 4 部",
    title: "動詞体系",
    sec13: {
      title: "13. 動詞範疇（TAM）と証拠性",
      tense: {
        heading: "時制（テンス）",
        absolute: "絶対時制：過去 / 現在 / 未来。",
        binary: "二分時制：過去 vs 非過去。",
        distance: "距離時制：時間の遠近（今日、昨日、遠い昔）。"
      },
      aspect: {
        heading: "相（アスペクト）",
        perfective: "完結相：全体として捉えられる動作。",
        continuous: "進行相：継続中の動作。",
        habitual: "習慣相：日常的・習慣的動作。",
        perfect: "完了相：現在に関連を持つ過去。",
        iterative: "反復相：繰り返される動作。",
        inchoative: "起動相：開始に焦点を当てる。"
      },
      mood: {
        heading: "法（ムード）",
        indicative: "直説法：客観的事実。",
        subjunctive: "接続法：疑念、願望、従属。",
        conditional: "条件法：条件が満たされた場合。",
        imperative: "命令法：命令や要請。",
        optative: "希求法：強い願望。",
        interrogative: "疑問法：動詞形態で疑問を表す。"
      },
      evidentiality: {
        heading: "証拠性（情報源）",
        visual: "視覚証拠：話者が直接目撃。",
        nonVisual: "非視覚感覚：聞いた、触れた、匂った。",
        inferential: "推論：証拠から導いた推測。",
        reportative: "伝聞：他者から聞いた情報。"
      }
    }
  },
  part5: {
    badge: "第 5 部",
    title: "名詞体系",
    sec14: {
      title: "14. 格と名詞曲用",
      central: {
        heading: "中核格（統語格）",
        text: "主格、対格、与格、能格/絶対格。"
      },
      possession: {
        heading: "所有・場所格",
        text: "属格、処格（〜で）、奪格（〜から）、向格（〜へ）、入格、出格、貫通格。"
      },
      circumstantial: {
        heading: "状況格・その他",
        text: "具格（手段）、共格（同伴）、欠格（〜なしで）、呼格、主題格（日本語「は」）。"
      }
    },
    sec15: {
      title: "15. 限定と数量化",
      determination: "限定性：定冠詞/不定冠詞、冠詞なし、指示詞。",
      numSystems: "記数法：十進法、二十進法（マヤ語）など。",
      numberCats: "数範疇：単数、複数、双数（きっかり2つ）、少数。",
      classifiers: "助数詞（類別詞）：名詞を数える際に必須。",
      quantifiers: "数量詞：部分数量詞 vs 分配数量詞。"
    },
    sec16: {
      title: "16. 発展的な代名詞体系",
      person: "人称：1人称、2人称、3人称、4人称（遠称3人称）。",
      inEx: "包括/排除：「聞き手を含む私たち」vs「聞き手を含まない私たち」。",
      animacy: "有生性：有情物と無情物の文法的区別。",
      gender: "性・名詞クラス：形状や材質に基づく分類（バントゥー語群）。",
      reflexive: "再帰と相互代名詞。"
    },
    sec17: {
      title: "17. 語彙範疇",
      stative: "状態動詞：形容詞的性質が動詞として振る舞う（中国語）。",
      nounClasses: "名詞クラス：意味特徴による分類と一致現象。"
    }
  },
  part6: {
    badge: "第 6 部",
    title: "空間と文化",
    sec18: {
      title: "18. 直示と時空間参照",
      demonstrative: {
        term: "指示詞体系：",
        def: "2項（これ/あれ）または3項（これ、それ、あれ）。",
        boxTitle: "日本語",
        boxText: "これ（話し手の近く）、それ（聞き手の近く）、あれ（双方から遠い）。"
      },
      vertical: "絶対的空間直示：左右の代わりに絶対方角（「皿の北側」など）を用いる。"
    },
    sec19: {
      title: "19. 語用論と社会言語学",
      honorifics: "敬語体系：敬意や社会的距離の表現。",
      register: "位相差・文体：フォーマルとインフォーマル。",
      taboos: "タブーと婉曲表現。"
    },
    sec20: {
      title: "20. 文化的語彙",
      kinship: "親族呼称体系：母方と父方の叔父の区別など。",
      color: "基本色彩語：色の獲得順序に関する普遍性。"
    }
  },
  part7: {
    badge: "第 7 部",
    title: "文字と歴史",
    sec21: {
      title: "21. 文字体系",
      sysType: "文字の種類：音素文字（アルファベット）、音節文字、表語文字、アブジャド、アブギダ。",
      direction: "書字方向：左から右、右から左、牛耕式、縦書き。"
    },
    sec22: {
      title: "22. 通時言語学（歴史的言語発展）",
      soundChange: "音韻変化：祖語からの規則的な音の変化。",
      loans: "借用語と歴史的層：固有語層と権威ある借用語層の共存。"
    }
  }
};
