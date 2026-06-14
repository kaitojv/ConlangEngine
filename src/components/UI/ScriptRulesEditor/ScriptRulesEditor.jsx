// src/components/UI/ScriptRulesEditor/ScriptRulesEditor.jsx
import React, { useState, useMemo } from "react";
import { useConfigStore } from "../../../store/useConfigStore.jsx";
import { useLexiconStore } from "../../../store/useLexiconStore.jsx";
import { normalizeRuleKey } from "../../../utils/scriptResolver.js";
import { Plus, X } from "lucide-react";
import "./scriptRulesEditor.css";

const STANDARD_WORD_CLASSES = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "particle",
  "conjunction",
  "preposition",
];

const RULE_GROUPS = [
  {
    key: "wordClasses",
    label: "Word Classes",
    placeholder: "Select word class...",
    desc: "Map word classes (Noun, Verb, etc.) to scripts. Comma-separated classes in entries are matched individually.",
  },
  {
    key: "tags",
    label: "Tags",
    placeholder: "Select tag...",
    desc: "Map semantic tags (loanword, honorific, archaic, etc.) to scripts.",
  },
  {
    key: "personCategories",
    label: "Person Categories",
    placeholder: "Select person category...",
    desc: "Map grammatical person categories (1s, 2s, 3m, etc.) to scripts.",
  },
  {
    key: "roles",
    label: "Roles",
    placeholder: "Select role...",
    desc: "Reserved for future explicit role field on lexicon entries.",
  },
];

export default function ScriptRulesEditor() {
  const scriptSystems = useConfigStore((state) => state.scriptSystems) || [];
  const scriptRules = useConfigStore((state) => state.scriptRules) || {};
  const setScriptRule = useConfigStore((state) => state.setScriptRule);
  const clearScriptRule = useConfigStore((state) => state.clearScriptRule);
  const defaultScriptId = scriptRules.defaultScriptId || "default";
  const customWordClasses =
    useConfigStore((state) => state.customWordClasses) || [];
  const customTags = useConfigStore((state) => state.customTags) || [];
  const lexicon = useLexiconStore((state) => state.lexicon) || [];

  const [newKeys, setNewKeys] = useState({});

  const scriptOptions = scriptSystems.map((s) => ({ id: s.id, name: s.name }));

  // Build dropdown options for each group
  const groupOptions = useMemo(() => {
    // Word classes: standard + custom + from lexicon
    const wordClassSet = new Set(STANDARD_WORD_CLASSES);
    customWordClasses.forEach((cls) => wordClassSet.add(normalizeRuleKey(cls)));
    lexicon.forEach((entry) => {
      if (entry.wordClass) {
        entry.wordClass.split(",").forEach((cls) => {
          const clean = normalizeRuleKey(cls);
          if (clean) wordClassSet.add(clean);
        });
      }
    });

    // Tags: custom + from lexicon
    const tagSet = new Set();
    customTags.forEach((t) => tagSet.add(normalizeRuleKey(t)));
    lexicon.forEach((entry) => {
      if (Array.isArray(entry.tags)) {
        entry.tags.forEach((t) => {
          const clean = normalizeRuleKey(t);
          if (clean) tagSet.add(clean);
        });
      }
    });

    // Person categories: from lexicon
    const personSet = new Set();
    lexicon.forEach((entry) => {
      if (entry.personCategory) {
        const clean = normalizeRuleKey(entry.personCategory);
        if (clean) personSet.add(clean);
      }
    });

    // Roles: empty for now
    const roleSet = new Set();

    return {
      wordClasses: [...wordClassSet].sort(),
      tags: [...tagSet].sort(),
      personCategories: [...personSet].sort(),
      roles: [...roleSet].sort(),
    };
  }, [customWordClasses, customTags, lexicon]);

  const handleAddRule = (group) => {
    const key = (newKeys[group] || "").trim();
    if (!key) return;
    // Don't add if rule already exists
    if (scriptRules[group]?.[key]) return;
    setScriptRule(group, key, defaultScriptId);
    setNewKeys((prev) => ({ ...prev, [group]: "" }));
  };

  const handleRemoveRule = (group, key) => {
    clearScriptRule(group, key);
  };

  const handleChangeScript = (group, key, scriptId) => {
    setScriptRule(group, key, scriptId);
  };

  const renderAddControl = (group) => {
    const options = groupOptions[group.key] || [];
    const existingRules = scriptRules[group.key] || {};
    // Filter out options that already have rules
    const availableOptions = options.filter((opt) => !existingRules[opt]);

    // Use dropdown if we have options, otherwise use text input
    if (availableOptions.length > 0) {
      return (
        <div className="script-rules-add">
          <select
            className="script-rules-add-select"
            value={newKeys[group.key] || ""}
            onChange={(e) => {
              const val = e.target.value;
              setNewKeys((prev) => ({ ...prev, [group.key]: val }));
              // Auto-add on selection
              if (val) {
                setScriptRule(group.key, val, defaultScriptId);
                setNewKeys((prev) => ({ ...prev, [group.key]: "" }));
              }
            }}
          >
            <option value="">{group.placeholder}</option>
            {availableOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="script-rules-add-or">or</span>
          <input
            className="fi script-rules-add-input"
            placeholder="type custom..."
            value={newKeys[group.key] || ""}
            onChange={(e) =>
              setNewKeys((prev) => ({ ...prev, [group.key]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRule(group.key);
            }}
          />
          <button
            className="btn-add"
            onClick={() => handleAddRule(group.key)}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      );
    }

    // Fallback: text input only
    return (
      <div className="script-rules-add">
        <input
          className="fi script-rules-add-input"
          placeholder={`e.g. ${group.key === "wordClasses" ? "Noun" : group.key === "tags" ? "loanword" : group.key === "roles" ? "subject" : "1s"}`}
          value={newKeys[group.key] || ""}
          onChange={(e) =>
            setNewKeys((prev) => ({ ...prev, [group.key]: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddRule(group.key);
          }}
        />
        <button
          className="btn-add"
          onClick={() => handleAddRule(group.key)}
          style={{ display: "flex", alignItems: "center", gap: "4px" }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    );
  };

  return (
    <div className="script-rules-editor">
      <div className="script-rules-header">
        <h3 className="sg-title">Script Assignment Rules</h3>
      </div>

      <p className="script-rules-desc">
        Assign scripts to word classes, tags, and categories. When a word
        matches a rule, it renders in that script. Resolution order:{" "}
        <b>
          word override → role → person category → tag → word class → default
          script
        </b>
        .
      </p>

      <div className="script-rules-default">
        <span className="script-rules-default-label">Default Script:</span>
        <span className="script-rules-default-value">
          {scriptSystems.find((s) => s.id === defaultScriptId)?.name ||
            defaultScriptId}
        </span>
        <span className="script-rules-default-hint">
          (used when no rule matches)
        </span>
      </div>

      {RULE_GROUPS.map((group) => {
        const rules = scriptRules[group.key] || {};
        const entries = Object.entries(rules);

        return (
          <div key={group.key} className="script-rules-group">
            <div className="script-rules-group-header">
              <h4>{group.label}</h4>
              <span className="script-rules-group-desc">{group.desc}</span>
            </div>

            <div className="script-rules-list">
              {entries.length === 0 && (
                <div className="script-rules-empty">
                  No rules yet. Add one below.
                </div>
              )}
              {entries.map(([key, scriptId]) => (
                <div key={key} className="script-rule-row">
                  <span className="script-rule-key">{key}</span>
                  <span className="script-rule-arrow">→</span>
                  <select
                    className="script-rule-select"
                    value={scriptId}
                    onChange={(e) =>
                      handleChangeScript(group.key, key, e.target.value)
                    }
                  >
                    {scriptOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="script-rule-remove"
                    onClick={() => handleRemoveRule(group.key, key)}
                    title="Remove rule"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {renderAddControl(group)}
          </div>
        );
      })}
    </div>
  );
}
