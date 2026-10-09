export default {
  title: "入门指南",
  subtitle: "人造语言创作完整清单",
  intro: {
    sequenceDesc: "按照从语音到历史的逻辑顺序组织：",
    sequence: {
      sound: "语音",
      wordFormation: "构词法",
      sentenceOrganization: "句法结构",
      verbSystem: "动词系统",
      nounSystem: "名词系统",
      spaceAndCulture: "空间与文化",
      writing: "文字系统",
      history: "语言历史"
    },
    glossDesc: "所有示例均来自真实自然语言，并配有简单对齐逐字注释（Gloss）。"
  },
  sec0: {
    title: "0. 基础语言学概念（快速词汇表）",
    desc: "文档中会涉及一些专业术语，建议先明确定义：",
    morpheme: {
      term: "语素（词素）：",
      def: "语言中最小的音义结合体。可以是独立词（自由语素），也可以是依附成分（黏着语素）。"
    },
    rootAffix: {
      term: "词根 vs 词缀：",
      def: "词根承载核心词义；词缀附加在词根上以提供语法或派生信息。"
    },
    subjectObject: {
      term: "主语与宾语：",
      def: "如“男孩踢球”中，男孩是动作发出者（主语），球是承受者（宾语）。"
    },
    transitive: {
      term: "及物 vs 不及物动词：",
      def: "及物动词需要宾语（“我看见狗”）；不及物动词自身表意完整（“我睡觉”）。"
    },
    clause: {
      term: "分句（从句）：",
      def: "围绕单个动词组织的句子成分片段。"
    },
    mainSubordinate: {
      term: "主句 vs 从句：",
      def: "主句是句子的核心，从句起修饰、补充或限定作用。"
    }
  },
  part1: {
    badge: "第 1 部分",
    title: "语言的声音",
    sec1: {
      title: "1. 语音学与音系结合规则（音位学）",
      desc: "一切创造的基础——没有音系，就无法产生任何声音示例。",
      inventory: {
        term: "音位系统：",
        def: "该语言视为具有辨义功能的辅音与元音集合。",
        boxTitle: "音库范围",
        boxText: "从极少元音系统（古典阿拉伯语：3个元音）到极丰富辅音系统（!Xóõ语：>100个辅音）。"
      },
      syllable: {
        term: "音节结构：",
        def: "该语言允许的辅音与元音组合形式。",
        boxTitle: "真实示例",
        boxJapanese: "日语几乎全是 (C)V 结构（ka, shi, tsu）。",
        boxGeorgian: "格鲁吉亚语允许极复杂的辅音丛：gvprtskvni。"
      },
      phonotactics: {
        term: "音位配列限制：",
        def: "关于哪些声音可以相邻的具体规则（如英语单词开头不能出现ng）。"
      },
      allophony: {
        term: "条件变体（同位音）：",
        def: "同一音位在不同语音环境中出现的发音变化。"
      }
    },
    sec2: {
      title: "2. 韵律与超音段音系",
      tone: {
        term: "声调：",
        def: "调型声调（音高曲折）或阶调声调（固定音高等级）。",
        boxTitle: "汉语普通话声调",
        boxText: "音节“ma”因声调不同含义完全改变：",
        mother: "mā（妈）",
        hemp: "má（麻）",
        horse: "mǎ（马）",
        scold: "mà（骂）"
      },
      stress: {
        term: "重音：",
        def: "固定重音或词汇重音。",
        boxTitle: "重音类型",
        fixed: "固定重音：总落在固定音节位置（法语：末音节；波兰语：倒数第二音节）。",
        lexical: "词汇重音：区分词义（英语：REcord 名词 vs reCORD 动词）。"
      }
    }
  },
  part2: {
    badge: "第 2 部分",
    title: "构词法",
    sec3: {
      title: "3. 形态类型学",
      desc: "决定每个词自身承担多少语法信息。",
      isolating: {
        term: "孤立语：",
        def: "单词表单义，缺乏词缀屈折。",
        boxTitle: "汉语",
        boxText: "“我 看 你”没有时态或人称一致性标记。"
      },
      agglutinating: {
        term: "黏着语：",
        def: "词根串联多个单一功能的词缀。",
        boxTitle: "土耳其语",
        boxText: "ev-ler-im-de = “在我的房子里”。"
      },
      fusional: {
        term: "屈折语（融合语）：",
        def: "单个词缀同时融合多项语法范畴。",
        boxTitle: "拉丁语",
        boxText: "amō（我爱）通过“-ō”同时体现第一人称、单数、现在时、直陈式。"
      },
      polysynthetic: {
        term: "多式综合语：",
        def: "单个复合词可囊括多个论元和状语。",
        boxTitle: "因纽特语",
        boxText: "qangatasuukkuvimmuuriaqalaaqtunga（“我得去机场”）。"
      },
      note: "设计提示：多数自然风格人造语言会选择光谱上的一个主导类型。"
    },
    sec4: {
      title: "4. 其他构词方式",
      compounding: {
        term: "复合构词：",
        def: "连接两个已有词根。",
        boxTitle: "德语与英语",
        boxText: "德语：Donaudampfschifffahrtsgesellschaft。英语：sunflower。"
      },
      reduplication: {
        term: "重叠构词：",
        def: "重复词根的一部分或全部。",
        boxTitle: "印尼语",
        boxText: "rumah（房子）→ rumah-rumah（多所房子）。"
      },
      blending: {
        term: "混成词（缩合）：",
        def: "缩写或合并词语。",
        boxTitle: "英语",
        boxText: "\"smoke\" + \"fog\" = \"smog\"。"
      }
    },
    sec5: {
      title: "5. 词缀类型",
      prefix: "前缀：位于词根前（un-happy）。",
      suffix: "后缀：位于词根后（happi-ly）。",
      infix: {
        term: "中缀：",
        def: "插入词根内部。",
        boxTitle: "他加禄语",
        boxText: "basa（读）→ b-um-asa（读了）。"
      },
      circumfix: {
        term: "环缀：",
        def: "前后两部分包裹词根。",
        boxTitle: "德语",
        boxText: "ge-mach-t（做完）。"
      },
      transfix: {
        term: "贯缀（辅音词根）：",
        def: "辅音骨架中插入不同元音模板。",
        boxTitle: "阿拉伯语",
        boxText: "词根 K-T-B → KaTaBa（他写了），KiTāB（书）。"
      }
    },
    sec6: {
      title: "6. 常见词缀功能",
      negation: "否定/反义：un-do。",
      manner: "方式（副词）：quick-ly。",
      agent: "施事者：play-er。",
      nominalization: "动词名物化：crea-tion。",
      abstract: "抽象性质：beau-ty。",
      place: "场所：bak-ery。",
      possession: "从属/特征：danger-ous。",
      degree: {
        term: "程度（指小/指大）：",
        boxTitle: "意大利语",
        boxText: "casa → casetta（小屋）。"
      },
      plurality: "复数：house-s。",
      causative: {
        term: "使役：",
        boxTitle: "土耳其语",
        boxText: "öl-（死）→ öl-dür-（杀死 / 使死）。"
      }
    },
    sec7: {
      title: "7. 边界与音变现象",
      vowelHarmony: {
        term: "元音和谐律：",
        def: "词缀元音根据词根元音特征发生同化。",
        boxTitle: "土耳其语",
        boxText: "ev-ler 对比 kız-lar。"
      },
      mutation: {
        term: "辅音交替（突变）：",
        def: "词首辅音受前词语法属性影响发生音变。",
        boxTitle: "威尔士语",
        boxText: "mam（母亲）变为 fam 或 nham。"
      }
    }
  },
  part3: {
    badge: "第 3 部分",
    title: "句法结构",
    sec8: {
      title: "8. 句法与词序",
      fixed: "固定词序：SOV（最普遍，日语）、SVO（汉语、英语）、VSO（爱尔兰语）、VOS（马达加斯加语）、OVS、OSV。",
      free: {
        term: "自由词序（非形态句法限制）：",
        def: "由焦点与强调驱动，依赖丰富的格标记。",
        boxTitle: "俄语",
        boxText: "Мальчик видит собаку 与 Собаку видит мальчик 均表“男孩看见狗”。"
      }
    },
    sec9: {
      title: "9. 形态句法排列对齐",
      desc: "不及物动词的主语在形态上更接近及物动词的主语还是宾语？",
      nomAcc: "主宾格配列（主格-宾格）：及物与不及物主语同标记，宾语异标记。",
      ergAbs: {
        term: "作通格配列（作格-通格）：",
        def: "不及物主语与及物宾语同标记（通格）；及物主语单独标记（作格）。",
        boxTitle: "巴斯克语",
        boxText1: "Gizona etorri da（那人-ABS 到了）",
        boxText2: "Gizonak liburua irakurri du（那人-ERG 读了 那本书-ABS）"
      },
      activeStative: "主动态-静态：不及物主语根据动作是否出于自愿而改变标记。",
      tripartite: "三分格：及物主语、不及物主语和宾语三者各用不同格标记。"
    },
    sec10: {
      title: "10. 语态",
      passive: "被动态：将宾语提升为主语。",
      antipassive: "反被动态：降低宾语凸显度（作通格语言）。",
      middle: "中间语态：动作作用于自身但非单纯反身。",
      applicative: {
        term: "应用态：",
        def: "将斜格（受益者、位置）提升为直接宾语。",
        boxTitle: "斯瓦希里语",
        boxText: "将“买”转化为“为某人买”。"
      },
      causative: "直接使役 vs 间接使役：“令其做” vs “允许其做”。"
    },
    sec11: {
      title: "11. 特定句法策略",
      negation: {
        term: "否定句构建：",
        def: "独立助词、词缀或双重否定框式。",
        boxTitle: "法语",
        boxText: "ne...pas。"
      },
      questions: "疑问句构建：句末疑问助词（日语 ka）、倒装、语调或动词标记。",
      relative: "关系从句：关系代词策略或名词前置修饰从句。",
      serial: {
        term: "连动结构（连动句）：",
        def: "动词无连接词直接串联。",
        boxTitle: "约鲁巴语",
        boxText: "“拿书来” = 带来。"
      },
      switchRef: "指称转换标记（Switch-Reference）：从句标记主语是否与主句主语相同。"
    },
    sec12: {
      title: "12. 结构句法与限定",
      copula: "零系词：完全省略“是/在”动词（俄语“他 医生”）。",
      headDirection: "中心词方向性：前置中心词（中心语在先）或后置中心词。",
      modals: "情态：情态动词或动词词缀。",
      nonLinearity: "非线性（表意书写）：同时性意象区块。"
    }
  },
  part4: {
    badge: "第 4 部分",
    title: "动词系统",
    sec13: {
      title: "13. 动词范畴（TAM）与言据性",
      tense: {
        heading: "时态（Tense）",
        absolute: "绝对时态：过去 / 现在 / 将来。",
        binary: "二分时态：过去 vs 非过去。",
        distance: "距离时态：精细划分时间远近（“今日”、“昨日”、“远古”）。"
      },
      aspect: {
        heading: "体（Aspect）",
        perfective: "完成体：动作作为整体呈现。",
        continuous: "进行体：正在进行中。",
        habitual: "习惯体：常态或惯常。",
        perfect: "完型体：对当前仍具关联的过去动作。",
        iterative: "反复体：多次重复动作。",
        inchoative: "始动态：聚焦动作起始阶段。"
      },
      mood: {
        heading: "式（Mood）",
        indicative: "直陈式：客观事实陈述。",
        subjunctive: "虚拟式：假设、愿望、从属。",
        conditional: "条件式：条件满足下发生。",
        imperative: "祈使式：命令与请求。",
        optative: "愿望式：热切祈愿。",
        interrogative: "疑问式：动词自身带疑问式形态。"
      },
      evidentiality: {
        heading: "言据性（信息来源）",
        visual: "目击证据：说话人亲眼所见。",
        nonVisual: "非视觉感官：亲耳所闻、所感、所嗅。",
        inferential: "推测证据：根据痕迹逻辑推导。",
        reportative: "传闻证据：转述自他人。"
      }
    }
  },
  part5: {
    badge: "第 5 部分",
    title: "名词系统",
    sec14: {
      title: "14. 语法格与名词变格",
      central: {
        heading: "核心格（句法格）",
        text: "主格（主语）、宾格（宾语）、与格（受益者）、作格/通格、被动施事格。"
      },
      possession: {
        heading: "属格与方位格",
        text: "属格（所属）、处所格（在...）、离格（从...）、向格（朝...）、入格、出格、经格。"
      },
      circumstantial: {
        heading: "状语格与其他",
        text: "工具格、伴随格、无格（缺格）、呼格、主题格（如日语 wa）。"
      }
    },
    sec15: {
      title: "15. 限定与量化",
      determination: "限定范畴：定/不定冠词、无冠词、指示代词。",
      numSystems: "数词进位制：十进制、二十进制（玛雅语）等。",
      numberCats: "数范畴：单数、复数、双数（恰好两个）、三数、少数（几个）。",
      classifiers: "量词系统：计数时必需的名词分类词（如汉语“三本书”）。",
      quantifiers: "量词修饰：部分量词 vs 分布量词。"
    },
    sec16: {
      title: "16. 高级代词系统",
      person: "人称：第一、第二、第三及第四人称（旁称，区分两个不同第三人称）。",
      inEx: "包括式/排除式：“咱们”（含听者）vs“我们”（不含听者）。",
      animacy: "有生性：有生命 vs 无生命语法区别。",
      gender: "性属/名词阶级：阴阳二分、无性别、或基于形状/材质分类（班图语支）。",
      reflexive: "反身与相互范畴。"
    },
    sec17: {
      title: "17. 词汇范畴",
      stative: "状态动词：性质形容词直接充当动词（汉语“他很高”，无需系动词）。",
      nounClasses: "名词类别：按语义特征分类并引发修饰词与动词一致协应。"
    }
  },
  part6: {
    badge: "第 6 部分",
    title: "空间与文化",
    sec18: {
      title: "18. 指示语与时空参照",
      demonstrative: {
        term: "指示词系统：",
        def: "二分（近/远）或三分（近我、近你、远距两者）。",
        boxTitle: "日语",
        boxText: "kore（此/近我）、sore（彼/近你）、are（彼/远距）。"
      },
      vertical: "绝对地理指示：使用绝对方向（如“盘子北面”）替代左右前后相对参照。"
    },
    sec19: {
      title: "19. 语用学与社会语言学",
      honorifics: "敬语系统：社会地位与客气程度表达。",
      register: "语体等级：正式语体与口语体。",
      taboos: "禁忌语与委婉语。"
    },
    sec20: {
      title: "20. 文化词库",
      kinship: "亲属称谓系统：区分母系与父系叔伯舅姨。",
      color: "基本颜色词：自然语言演化获得颜色词的普遍顺序。"
    }
  },
  part7: {
    badge: "第 7 部分",
    title: "文字与历史",
    sec21: {
      title: "21. 文字系统",
      sysType: "文字类别：全音素文字（字母）、音节文字、意音文字（词素文字）、辅音音素文字（Abjad）或元音附标文字（Abugida）。",
      direction: "书写方向：从左至右、从右至左、牛耕式或纵向垂直。"
    },
    sec22: {
      title: "22. 历时演变（历史语言学）",
      soundChange: "语音演变律：从原始母语演变为后代语言的规则性音变。",
      loans: "借词与历史层次：古老底层词汇与借入的威望层词汇共存。"
    }
  }
};
