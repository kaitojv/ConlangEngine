// Global state and configuration
const DEFAULT_CONFIG = {
    nomeIdioma: "ConlangEngine", 
    consoantes: "p, t, k, რ=Rr, L=ŀ, ჰ=Ks, თ=sh", 
    vogais: "a, e, i, o, u", 
    estruturaSilabica: "CV, CVC, V",
    pessoas: "1S, 2S, 3S, 1P, 2P, 3P", 
    ordemSintatica: "OVS", 
    marcaVerbo: "r", 
    cliticos: "'m, 't, 's", 
    bgColor: "#080812",
    rules: [ 
        { name: "Plural", affix: "-s", appliesTo: "noun" }, 
        { name: "Past Tense", affix: "-ed", appliesTo: "verb" } 
    ]
};

let Config = JSON.parse(localStorage.getItem('conlang_config')) || DEFAULT_CONFIG;
let D = JSON.parse(localStorage.getItem('conlang_lexicon')) || []; 

// Initializes lexicon array ensuring all entries have safe unique IDs
D = D.map(w => ({ ...w, id: w.id || w.createdAt || Date.now() + Math.random() }));

// Theme configuration toggle
function toggleTheme() {
    const root = document.documentElement;
    const isLight = root.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';
    
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('conlang_theme', newTheme);
    
    // Automatically changes bgColor based on theme
    if (newTheme === 'light') {
        Config.bgColor = "#7a7abd"; 
    } else {
        Config.bgColor = "#080812"; 
    }
    
    // Updates inline CSS, saves new color, and updates UI input
    document.documentElement.style.setProperty('--bg', Config.bgColor);
    localStorage.setItem('conlang_config', JSON.stringify(Config));
    
    const bgInput = document.getElementById('cfg-bgcolor');
    if (bgInput) bgInput.value = Config.bgColor;
    
    const icon = document.getElementById('theme-icon');
    if(icon) icon.textContent = newTheme === 'light' ? '🌙' : '☀️';
}

// Displays temporary feedback messages
function toast(msg) {
  const t = document.getElementById('toast'); 
  t.textContent = msg; 
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Switches visible tabs
function sw(t) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(e => e.classList.remove('on'));
  document.getElementById('tab-'+t).classList.add('on');
  document.getElementById('nb-'+t).classList.add('on');
}

// Returns CSS class based on word type
function typeClass(t) {
  if(t==='verb') return 'et-v'; 
  if(t==='noun') return 'et-s'; 
  if(t==='adjective') return 'et-a'; 
  return 'et-o';
}

// Updates rules UI
function renderRulesUI() {
    const container = document.getElementById('rules-container'); 
    container.innerHTML = '';
    Config.rules.forEach((rule) => { 
        container.insertAdjacentHTML('beforeend', createRuleRowHTML(rule.name, rule.affix, rule.appliesTo)); 
    });
}

// Adds a new rule row
function addRuleRow() { 
    document.getElementById('rules-container').insertAdjacentHTML('beforeend', createRuleRowHTML('', '', 'all')); 
}

// Generates HTML for rule row
function createRuleRowHTML(name, affix, type) {
    const inf = ["Diminutive", "Augmentative", "Plural", "Dual", "Nominative Case", "Accusative Case", "Genitive Case", "Dative Case", "Past Tense", "Present Tense", "Future Tense", "Perfective Aspect", "Continuous (Gerund)", "Indicative Mood", "Subjunctive Mood", "Feminine", "Masculine", "Animate", "Agent (doer)", "Abstract (concept)", "Antipassive"];
    let isC = name && !inf.includes(name);
    let opts = inf.map(i => `<option value="${i}" ${name === i ? 'selected' : ''}>${i}</option>`).join('');
    opts += `<option value="Custom" ${isC ? 'selected' : ''}>✏️ Custom Name...</option>`;
    
    return `<div class="rule-row">
      <select class="fi rule-select-name" style="flex:1.5;" onchange="this.nextElementSibling.style.display = (this.value === 'Custom') ? 'block' : 'none'"><option value="" disabled ${!name ? 'selected' : ''}>Select Inflection...</option>${opts}</select>
      <input type="text" class="fi rule-custom-name" placeholder="Type custom name" value="${isC ? name : ''}" style="flex:1; ${isC ? "display:block;" : "display:none;"}">
      <input type="text" class="fi rule-affix" placeholder="Affix (Conditional: regex:-a, -b)" value="${affix}" style="flex:1.5;">
      <select class="fi rule-type" style="flex:1;">
         <option value="all" ${type==='all'?'selected':''}>Any Class</option><option value="noun" ${type==='noun'?'selected':''}>Noun</option><option value="verb" ${type==='verb'?'selected':''}>Verb</option><option value="adjective" ${type==='adjective'?'selected':''}>Adjective</option><option value="adverb" ${type==='adverb'?'selected':''}>Adverb</option><option value="pronoun" ${type==='pronoun'?'selected':''}>Pronoun</option>
      </select>
      <button class="btn-cancel" style="padding: 10px 15px;" onclick="this.parentElement.remove()">X</button>
    </div>`;
}

// Saves configuration settings
function salvarConfiguracoes() {
    Config.nomeIdioma = document.getElementById('cfg-nome').value; 
    Config.consoantes = document.getElementById('cfg-cons').value;
    Config.vogais = document.getElementById('cfg-vogais').value; 
    Config.estruturaSilabica = document.getElementById('cfg-silabas').value;
    Config.ordemSintatica = document.getElementById('cfg-ordem').value; 
    Config.marcaVerbo = document.getElementById('cfg-verbo').value;
    Config.cliticos = document.getElementById('cfg-cliticos').value; 
    Config.bgColor = document.getElementById('cfg-bgcolor').value;
    
    // Captures grammatical persons/classes
    Config.pessoas = document.getElementById('cfg-pessoas').value;

    const newRules = [];
    document.querySelectorAll('.rule-row').forEach(row => {
        const sVal = row.querySelector('.rule-select-name').value; 
        const cVal = row.querySelector('.rule-custom-name').value.trim();
        const n = (sVal === 'Custom') ? cVal : sVal; 
        const a = row.querySelector('.rule-affix').value.trim(); 
        const t = row.querySelector('.rule-type').value;
        if(n && a) newRules.push({ name: n, affix: a, appliesTo: t });
    });
    
    Config.rules = newRules;
    localStorage.setItem('conlang_config', JSON.stringify(Config)); 
    toast("Language Matrix saved successfully!"); 
    carregarConfiguracoesNaTela();
}

// Loads configuration settings to UI
function carregarConfiguracoesNaTela() {
    document.documentElement.style.setProperty('--bg', Config.bgColor || "#080812");
    if(!document.getElementById('cfg-nome')) return;
    
    document.getElementById('cfg-nome').value = Config.nomeIdioma || ""; 
    document.getElementById('cfg-cons').value = Config.consoantes || "";
    document.getElementById('cfg-vogais').value = Config.vogais || ""; 
    document.getElementById('cfg-silabas').value = Config.estruturaSilabica || "";
    document.getElementById('cfg-ordem').value = Config.ordemSintatica || "OVS"; 
    document.getElementById('cfg-verbo').value = Config.marcaVerbo || ""; 
    document.getElementById('cfg-cliticos').value = Config.cliticos || ""; 
    document.getElementById('cfg-bgcolor').value = Config.bgColor || "#080812";
    
    // Populates input with saved data on load
    document.getElementById('cfg-pessoas').value = Config.pessoas || "1S, 2S, 3S, 1P, 2P, 3P";
    
    document.querySelectorAll('.app-titulo-dinamico').forEach(el => el.textContent = Config.nomeIdioma);
    renderRulesUI(); 
    syncIPAMap();
}

// Exports data backup
function exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ timestamp: new Date().toISOString(), config: Config, lexicon: D }, null, 2));
    const a = document.createElement('a'); 
    a.href = dataStr; 
    a.download = `Conlang_${Config.nomeIdioma.replace(/\s+/g, '_')}_Backup.json`;
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    toast("Backup exported successfully!");
}

// Imports data backup
function importBackup(event) {
    const input = event.target;
    const file = input.files[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const c = JSON.parse(e.target.result);
            
            // Replaces data in global memory
            if (c.config) { 
                Config = c.config;
                localStorage.setItem('conlang_config', JSON.stringify(Config)); 
            }
            
            if (c.lexicon) { 
                D = c.lexicon.map(w => ({ ...w, id: w.id || w.createdAt || Date.now() + Math.random() }));
                localStorage.setItem('conlang_lexicon', JSON.stringify(D)); 
            }
            
            // Forces immediate visual update
            carregarConfiguracoesNaTela(); 
            renderDict();
            
            // Clears search bar if on dictionary tab
            const searchBar = document.getElementById('search');
            if (searchBar) searchBar.value = '';
            
            // Provides clear success feedback
            alert("Database imported and updated successfully!");
            
        } catch (err) { 
            console.error("Critical import error:", err);
            alert("Error reading JSON file. Structure might be corrupted."); 
        } finally {
            // Clears input field to allow re-importing the same file
            input.value = '';
        }
    };

    reader.onerror = function() {
        alert("Browser error when trying to read the physical file.");
    }
    
    // Starts reading the file
    reader.readAsText(file);
}

// Toggles phoneme selection
function tPh(phoneme, inputId) {
    const input = document.getElementById(inputId);
    let arr = input.value.trim() ? input.value.trim().split(',').map(s => s.trim()) : [];
    let idx = arr.findIndex(a => a === phoneme || a.startsWith(phoneme + '='));
    if (idx > -1) { arr.splice(idx, 1); } else { arr.push(phoneme); }
    input.value = arr.join(', '); 
    syncIPAMap();
}

// Synchronizes IPA map UI
function syncIPAMap() {
    const all = ((document.getElementById('cfg-cons').value || "") + ',' + (document.getElementById('cfg-vogais').value || "")).split(',').map(s => s.trim().split('=')[0]);
    document.querySelectorAll('.ph').forEach(el => { 
        if(el.onclick) { el.classList.toggle('selected', all.includes(el.textContent)); } 
    });
}

// Applies simple affixes and infixes
function applySimpleAffix(base, aff) {
    let cleanBase = base.replace(/\*/g, '');

    // Detects infix if it starts with '-' and has '-@' or ends with '-'
    if (aff.startsWith('-') && (aff.includes('-@') || aff.endsWith('-'))) {
        let parts = aff.split('@');
        let inf = parts[0].replace(/-/g, '');
        let pos = parts[1];

        // Priority 1: Manual asterisk
        if (base.includes('*')) return base.replace('*', inf).replace(/\*/g, '');

        // Priority 2: Dynamic positions
        if (pos) {
            if (pos === 'V') {
                let match = cleanBase.match(/[aeiouæøəœʌɔɑɒyɨʉɪʏʊ]/i);
                if (match) { let idx = match.index + 1; return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx); }
            } else if (pos === 'C') {
                let match = cleanBase.match(/[^aeiouæøəœʌɔɑɒyɨʉɪʏʊ]/i);
                if (match) { let idx = match.index + 1; return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx); }
            } else if (!isNaN(pos)) {
                let idx = parseInt(pos); return cleanBase.slice(0, idx) + inf + cleanBase.slice(idx);
            }
        }
        // Default: after the first letter
        return cleanBase.slice(0, 1) + inf + cleanBase.slice(1);
    }
    
    // Standard suffix
    if (aff.startsWith('-')) return cleanBase + aff.replace('-', '');
    // Standard prefix
    if (aff.endsWith('-')) return aff.replace('-', '') + cleanBase;
    
    return cleanBase + aff;
}

// Applies regex-based phonological rules
function applyRuleToWord(baseWord, affixConfig) {
    if (affixConfig.includes(':')) {
        let conditions = affixConfig.split(',');
        for (let cond of conditions) {
            if (!cond.includes(':')) return applySimpleAffix(baseWord, cond.trim()); 
            let parts = cond.split(':');
            let regexStr = parts[0].trim();
            let aff = parts[1].trim();
            try {
                let regex = new RegExp(regexStr);
                if (regex.test(baseWord.replace(/\*/g, ''))) return applySimpleAffix(baseWord, aff);
            } catch(e) { console.error("Invalid Regex: " + regexStr); }
        }
        return baseWord.replace(/\*/g, ''); 
    }
    return applySimpleAffix(baseWord, affixConfig);
}

// Previews derived words based on rules
function previewDerivs() {
  const word = document.getElementById('f-word').value.trim(); 
  const type = document.getElementById('f-type').value; 
  const trans = document.getElementById('f-trans').value.trim();
  const panel = document.getElementById('deriv-panel'); 
  const list = document.getElementById('deriv-preview-list');
  
  if(!word || !trans) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  
  let html = '';
  Config.rules.forEach(rule => {
      if (rule.appliesTo === 'all' || rule.appliesTo === type) {
          let base = (type === 'verb' && Config.marcaVerbo && word.endsWith(Config.marcaVerbo)) ? word.slice(0, -Config.marcaVerbo.length) : word;
          html += `<div><span class="notranslate" style="color:var(--acc3); font-weight:bold;">${applyRuleToWord(base, rule.affix)}</span> <br> ${trans} (${rule.name.toLowerCase()})</div>`;
      }
  });
  list.innerHTML = html || '<i>No matching rules found for this class.</i>';
}

// Saves word to dictionary
function saveWord() {
  const word = document.getElementById('f-word').value.trim(); 
  const type = document.getElementById('f-type').value; 
  const trans = document.getElementById('f-trans').value.trim(); 
  const ipa = document.getElementById('f-ipa').value.trim();
  
  if(!word || !trans) return toast("Fill in the word and translation.");

  D.push({ id: Date.now(), word, ipa, type, trans, createdAt: Date.now() });
  localStorage.setItem('conlang_lexicon', JSON.stringify(D));
  
  document.getElementById('f-word').value = ''; 
  document.getElementById('f-trans').value = ''; 
  document.getElementById('f-ipa').value = '';
  
  previewDerivs(); 
  renderDict(); 
  toast(`Root saved successfully!`);
}

// Renders the dictionary list
function renderDict() {
  const q = document.getElementById('search').value.toLowerCase(); 
  const list = document.getElementById('dict-list');
  
  let filtrado = D.sort((a,b) => b.createdAt - a.createdAt);
  if (q) filtrado = filtrado.filter(e => e.word.replace(/\*/g, '').toLowerCase().includes(q) || e.trans.toLowerCase().includes(q));
  
  document.getElementById('word-count').textContent = D.length;
  
  list.innerHTML = filtrado.map((e, index) => {
    // Escapes apostrophes to prevent onClick errors
    let safeWord = e.word.replace(/\*/g, '').replace(/'/g, "\\'");
    
    // Scopes isVerb to the current element
    const isVerb = e.type === 'verb';

    // Adds dynamic animation-delay for cascade effect
    return `
    <div class="dict-card" style="animation-delay: ${index * 0.05}s" onclick="toggleParadigm(${e.id})">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div>
          <span class="notranslate" style="font-size:1.4rem; font-weight:bold; color:var(--acc3);">${e.word.replace(/\*/g, '')}</span>
          ${e.ipa ? `<span class="notranslate" style="color:var(--tx2); margin-left: 8px; font-family: monospace;">/${e.ipa}/</span>` : ''}
        </div>
        <span class="et ${typeClass(e.type)}">${e.type}</span>
      </div>
      <div style="color:var(--tx); font-size:1rem;">${e.trans}</div>
      <div class="dict-actions">
         <button class="btn-sm" style="background:var(--s3); color:var(--ok); font-size: 0.85rem;" onclick="event.stopPropagation(); falarPalavra('${safeWord}')" title="Listen to pronunciation">🔊 Listen</button>
         <button class="btn-sm" style="background:var(--acc); color:#fff;" onclick="event.stopPropagation(); abrirModal(${e.id})">✏️ Edit</button>
         <button class="btn-sm" style="background:var(--s3); color:var(--er);" onclick="event.stopPropagation(); deletarPalavra(${e.id})">🗑️ Delete</button>
         <button class="btn-sm" style="background:var(--acc); color:#fff;" onclick="event.stopPropagation(); renderUniversalMatrix(${e.id})">📊 Matrix</button>
         </div>
      <div id="paradigm-${e.id}" class="paradigm-panel"></div>
    </div>`
  }).join('');
}

// Deletes word from dictionary
function deletarPalavra(id) {
    if(!confirm("Are you sure you want to delete this root?")) return;
    D = D.filter(w => w.id !== id); 
    localStorage.setItem('conlang_lexicon', JSON.stringify(D)); 
    renderDict(); 
    toast("Root deleted.");
}

// Opens edit modal
function abrirModal(id) {
    const wordObj = D.find(w => w.id === id); 
    if(!wordObj) return;
    
    document.getElementById('edit-id').value = wordObj.id; 
    document.getElementById('edit-word').value = wordObj.word;
    document.getElementById('edit-ipa').value = wordObj.ipa || ""; 
    document.getElementById('edit-type').value = wordObj.type; 
    document.getElementById('edit-trans').value = wordObj.trans;
    
    // Loads new fields
    document.getElementById('edit-group').value = wordObj.group || "";
    document.getElementById('edit-irregular').value = wordObj.irregular || "";
    
    updateEditDerivOptions(); 
    document.getElementById('edit-modal').style.display = 'flex';
}

// Saves edits from modal
function salvarEdicao() {
    const id = parseFloat(document.getElementById('edit-id').value); 
    const wordObj = D.find(w => w.id === id);
    
    if(wordObj) {
        wordObj.word = document.getElementById('edit-word').value.trim(); 
        wordObj.ipa = document.getElementById('edit-ipa').value.trim();
        wordObj.type = document.getElementById('edit-type').value; 
        wordObj.trans = document.getElementById('edit-trans').value.trim();
        
        // Saves new fields to the object
        wordObj.group = document.getElementById('edit-group').value.trim();
        wordObj.irregular = document.getElementById('edit-irregular').value.trim();
        
        document.querySelectorAll('.edit-deriv-cb').forEach(cb => {
            const existingId = cb.getAttribute('data-existing-id'); 
            const isChecked = cb.checked;
            if (isChecked && !existingId) { 
                D.push({ id: Date.now() + Math.random(), word: cb.dataset.w, ipa: "", type: cb.dataset.t, trans: cb.dataset.tr, createdAt: Date.now() }); 
            } else if (!isChecked && existingId) { 
                D = D.filter(w => w.id !== parseFloat(existingId)); 
            }
        });
        
        localStorage.setItem('conlang_lexicon', JSON.stringify(D)); 
        renderDict(); 
        fecharModal(true); 
        toast("Word updated with matrix data!");
    }
}

// Closes modal
function fecharModal(forcar = false) {
    if(forcar === true || event.target.id === 'edit-modal') {
        document.getElementById('edit-modal').style.display = 'none'; 
        document.getElementById('ipa-map-modal').style.display = 'none';
    }
}

// Updates derivation options in edit modal
function updateEditDerivOptions() {
    const idInput = document.getElementById('edit-id').value; 
    if(!idInput) return;
    
    const id = parseFloat(idInput); 
    const word = document.getElementById('edit-word').value.trim(); 
    const type = document.getElementById('edit-type').value;
    const trans = document.getElementById('edit-trans').value.trim(); 
    const opts = document.getElementById('edit-deriv-options');
    
    if(!word || !trans) { opts.innerHTML = ''; return; }
    
    let html = '';
    Config.rules.forEach(rule => {
        if (rule.appliesTo === 'all' || rule.appliesTo === type) {
            let base = (type === 'verb' && Config.marcaVerbo && word.endsWith(Config.marcaVerbo)) ? word.slice(0, -Config.marcaVerbo.length) : word;
            let newWord = applyRuleToWord(base, rule.affix); 
            let tr = `${trans} (${rule.name.toLowerCase()})`;
            let existingDerived = D.find(w => w.word === newWord && w.type === type && w.trans === tr && w.id !== id);
            let isChecked = existingDerived ? 'checked' : ''; 
            let existingId = existingDerived ? existingDerived.id : '';
            
            html += `<label class="cb-wrap"><input type="checkbox" class="edit-deriv-cb" data-w="${newWord}" data-t="${type}" data-tr="${tr}" data-existing-id="${existingId}" ${isChecked}><span><span class="cb-hl notranslate">${newWord}</span> (${rule.name})</span></label>`;
        }
    });
    opts.innerHTML = html || '<i style="color:var(--tx2);">No matching rules found.</i>';
}

// Generates a random phonotactically valid word
function gerarPalavraConfiguravel() {
  const parseP = str => str.split(',').map(s => s.trim()).filter(Boolean).map(item => item.includes('=') ? { ipa: item.split('=')[0].trim(), orth: item.split('=')[1].trim() } : { ipa: item, orth: item });
  const sortear = arr => arr[Math.floor(Math.random() * arr.length)];
  
  const consList = parseP(Config.consoantes); 
  const vogsList = parseP(Config.vogais); 
  const pads = Config.estruturaSilabica.split(',').map(s=>s.trim());
  const numSilabas = parseInt(document.getElementById('qtd-silabas').value || "2"); 
  const classe = document.getElementById('gerador-classe').value;
  
  let classFinal = classe === 'random' ? ['noun','verb','adjective'][Math.floor(Math.random()*3)] : classe;

  let padraoStr = ''; 
  for(let i=0; i<numSilabas; i++) padraoStr += sortear(pads);
  
  let orthResult = ''; let ipaResult = '';
  for(let i=0; i<padraoStr.length; i++) {
    if(padraoStr[i] === 'C') { const c = sortear(consList); orthResult += c.orth; ipaResult += c.ipa; }
    else if(padraoStr[i] === 'V') { const v = sortear(vogsList); orthResult += v.orth; ipaResult += v.ipa; }
  }
  
  if(classFinal === 'verb' && Config.marcaVerbo && !orthResult.endsWith(Config.marcaVerbo)) { 
      orthResult += Config.marcaVerbo; 
      ipaResult += Config.marcaVerbo; 
  }

  window.palavraGeradaAtual = orthResult; 
  window.ipaGeradaAtual = ipaResult;
  
  document.getElementById('resultado-gerador').textContent = orthResult; 
  document.getElementById('resultado-gerador').title = `IPA: /${ipaResult}/`;
  document.getElementById('etiqueta-classe').textContent = classFinal; 
  document.getElementById('btn-enviar-criacao').style.display = 'inline-block';
}

// Sends generated word to input fields
function enviarPalavraGerada() {
  document.getElementById('f-word').value = window.palavraGeradaAtual; 
  document.getElementById('f-ipa').value = window.ipaGeradaAtual;
  document.getElementById('f-type').value = document.getElementById('etiqueta-classe').textContent;
  sw('criar'); 
  previewDerivs(); 
  document.getElementById('f-trans').focus();
}

// Syntax analyzer data object
window.analisadorData = { words: [] };

// Tries to strip affixes from a word
function tryStrip(w, aff) {
    if (aff.startsWith('-') && aff.endsWith('-')) { 
        let inf = aff.split('@')[0].replace(/-/g, ''); 
        let idx = w.indexOf(inf);
        if (idx !== -1) return w.slice(0, idx) + w.slice(idx + inf.length);
    } else if (aff.endsWith('-')) { 
        let pref = aff.replace('-', ''); 
        if (w.startsWith(pref)) return w.slice(pref.length);
    } else if (aff.startsWith('-')) { 
        let suf = aff.replace('-', ''); 
        if (w.endsWith(suf)) return w.slice(0, -suf.length);
    }
    return null;
}

// Strips affixes considering regex configurations
function stripAffix(word, affixConfig) {
    let affixesToTry = [];
    if (affixConfig.includes(':')) {
        affixConfig.split(',').forEach(c => {
            if (c.includes(':')) affixesToTry.push(c.split(':')[1].trim());
            else affixesToTry.push(c.trim());
        });
    } else {
        affixesToTry.push(affixConfig.trim());
    }

    for (let aff of affixesToTry) {
        let stripped = tryStrip(word, aff);
        if (stripped) return stripped; 
    }
    return null;
}

// Dynamically converts Person & Class configurations into pseudo-rules
function getPersonRules() {
    if (!Config.pessoas) return [];
    
    const rawGroups = Config.pessoas.split(',').map(p => p.trim()).filter(Boolean);
    let pRules = [];

    rawGroups.forEach(g => {
        if (g.includes(':')) {
            let parts = g.split(':');
            let label = parts[0].trim();
            let markers = parts[1].split('/').map(m => m.trim());

            let activeMarker = markers.find(m => m.includes('-') || m.includes("'"));

            if (activeMarker) {
                let ruleAffix = activeMarker;
                if (activeMarker.startsWith("'") && !activeMarker.startsWith("-")) {
                    ruleAffix = "-" + activeMarker; 
                } else if (activeMarker.endsWith("'") && !activeMarker.endsWith("-")) {
                    ruleAffix = activeMarker + "-";
                }

                pRules.push({
                    name: label, 
                    affix: ruleAffix, 
                    appliesTo: 'verb' 
                });
            }
        }
    });
    return pRules;
}

// Finds all possible root parsings for a surface form
function findAllParsings(surface, depth = 0) {
    if (depth > 3) return []; 
    let parsings = [];
    
    D.filter(e => e.word.replace(/\*/g, '').toLowerCase() === surface).forEach(m => parsings.push({ root: m, rules: [] }));
    if (Config.marcaVerbo) D.filter(e => e.word.replace(/\*/g, '').toLowerCase() === surface + Config.marcaVerbo && e.type === 'verb').forEach(m => parsings.push({ root: m, rules: [] }));
    
    // INJECTS Person/Class pseudo-rules into the analyzer
    let allRules = [...Config.rules, ...getPersonRules()];

    allRules.forEach(rule => {
        let stripped = stripAffix(surface, rule.affix);
        if (stripped) {
            findAllParsings(stripped, depth + 1).forEach(sp => {
                if (rule.appliesTo === 'all' || rule.appliesTo === sp.root.type) parsings.push({ root: sp.root, rules: [rule, ...sp.rules] });
            });
        }
    });
    return parsings;
}

// Gets unique parsings
function getUniqueParsings(surface) {
    let parsings = findAllParsings(surface.toLowerCase());
    let unique = []; let sigs = new Set();
    parsings.forEach(p => {
        let sig = p.root.word + '|' + p.root.trans + '|' + p.rules.map(r=>r.name).join('|');
        if (!sigs.has(sig)) { sigs.add(sig); unique.push(p); }
    });
    return unique; 
}

// Executes syntax analysis
function executarAnalise() {
    const texto = document.getElementById('input-analisador').value.trim();
    if (!texto) { document.getElementById('resultado-analisador').innerHTML = ''; document.getElementById('status-sintaxe').innerHTML = ''; return; }
    
    window.analisadorData.words = texto.split(/\s+/).map(p => ({ 
        original: p, 
        parsings: getUniqueParsings(p), 
        selectedIdx: 0,
        manualRole: null
    }));
    renderAnalisadorUI();
}

// Changes selected parsing
function changeParsing(wordIdx, parseIdx) {
    window.analisadorData.words[wordIdx].selectedIdx = parseInt(parseIdx);
    renderAnalisadorUI();
}

// Changes word role
function changeRole(wordIdx, newRole) {
    window.analisadorData.words[wordIdx].manualRole = newRole;
    renderAnalisadorUI();
}

// Renders the syntax analyzer UI
function renderAnalisadorUI() {
    const cont = document.getElementById('resultado-analisador'); 
    const statusBox = document.getElementById('status-sintaxe');
    let html = ''; let padrao = [];

    window.analisadorData.words.forEach((wData, index) => {
        if (wData.parsings.length === 0) {
            html += `<div class="gloss-word" style="border-color:var(--er)"><div class="gloss-orig notranslate">${wData.original}</div><div style="color:var(--er); font-size:0.8rem;">? Unknown Root</div></div>`;
        } else {
            let p = wData.parsings[wData.selectedIdx]; 
            let isAmbig = wData.parsings.length > 1;
            
            let transLower = p.root.trans.toLowerCase();
            let isObjTrans = transLower.includes('acc') || transLower.includes('acu') || transLower.includes('obj') || transLower.includes('dat') || transLower.includes('patient');
            
            let isObjRule = p.rules.some(r => {
                let n = r.name.toLowerCase();
                return n.includes('acc') || n.includes('acu') || n.includes('obj') || n.includes('dat') || n.includes('patient');
            });

            let isObj = isObjTrans || isObjRule;
            let isSubj = (p.root.type === 'noun' || p.root.type === 'pronoun') && !isObj;
            let defaultRole = (p.root.type === 'verb') ? 'V' : (isObj ? 'O' : (isSubj ? 'S' : ''));
            
            let finalRole = wData.manualRole !== null ? wData.manualRole : defaultRole;
            if(finalRole) padrao.push(finalRole);

            let roleSelectHTML = `<select class="role-select" onchange="changeRole(${index}, this.value)">
                <option value="" ${finalRole === '' ? 'selected' : ''}>- No Role -</option>
                <option value="S" ${finalRole === 'S' ? 'selected' : ''}>S (Subject)</option>
                <option value="V" ${finalRole === 'V' ? 'selected' : ''}>V (Verb)</option>
                <option value="O" ${finalRole === 'O' ? 'selected' : ''}>O (Object)</option>
            </select>`;

            let selectHTML = '';
            if (isAmbig) {
                let opts = wData.parsings.map((pOpt, i) => `<option value="${i}" ${i === wData.selectedIdx ? 'selected' : ''}>[${pOpt.root.type}] ${pOpt.root.trans} ${pOpt.rules.length ? '+ '+pOpt.rules.map(r=>r.name).join('+') : ''}</option>`).join('');
                selectHTML = `<select class="fi" style="padding:4px; font-size:0.7rem; margin-bottom:8px; background:rgba(232, 184, 128, 0.1); border-color:#e8b880; color:#e8b880; outline:none;" onchange="changeParsing(${index}, this.value)">${opts}</select>`;
            }

            html += `<div class="gloss-word" style="${isAmbig ? 'border-color:#e8b880;' : ''}">
                ${isAmbig ? `<div style="font-size: 0.65rem; font-weight: bold; background: #e8b880; color: #10101e; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">⚠️ Ambiguous Parse</div>` : ''}
                ${selectHTML}
                <div>${roleSelectHTML}</div>
                <div class="gloss-orig notranslate">${wData.original}</div>
                <div class="gloss-morph notranslate">${p.root.word.replace(/\*/g, '')}</div>
                <div class="gloss-trans">${p.root.trans}</div>
                <div style="margin-top:5px">${p.rules.map(r => `<span class="gloss-tag">${r.name}</span>`).join('')}</div>
            </div>`;
        }
    });
    cont.innerHTML = html;

    if (padrao.length > 0) {
        let limpo = padrao.filter((v, i, a) => v !== a[i - 1]).join('');
        if (limpo === Config.ordemSintatica || limpo.includes(Config.ordemSintatica)) {
            statusBox.innerHTML = `<div style="display:inline-block; background:rgba(58,122,90,.2); border:1px solid rgba(58,122,90,.4); color:#80d4a8; padding: 10px 15px; border-radius: 8px;">✅ <b>Valid Syntax!</b> Sentence matches <b>${Config.ordemSintatica}</b> order.</div>`;
        } else {
            statusBox.innerHTML = `<div style="display:inline-block; background:rgba(154,100,58,.2); border:1px solid rgba(154,100,58,.4); color:#e8b880; padding: 10px 15px; border-radius: 8px;">⚠️ <b>Warning:</b> Detected <b>${limpo}</b> instead of <b>${Config.ordemSintatica}</b>.</div>`;
        }
    } else statusBox.innerHTML = '';
}

// Draws etymology map
function desenharMapa() {
  const input = document.getElementById('input-mapa-raiz').value.trim().toLowerCase();
  const cont = document.getElementById('mapa-render-area');
  
  if(!input) return;

  const rWord = D.find(e => e.word.replace(/\*/g, '').toLowerCase() === input);
  
  if(!rWord) { 
      cont.innerHTML = '<div style="color:var(--er); padding: 20px; font-weight: bold;">Root not found in dictionary. Make sure you typed the exact base word.</div>'; 
      return; 
  }

  let base = rWord.word; 
  if (rWord.type === 'verb' && Config.marcaVerbo && base.endsWith(Config.marcaVerbo)) {
      base = base.slice(0, -Config.marcaVerbo.length);
  }

  let html = `<div style="display:flex; flex-direction:column; align-items:center; animation: fadeIn 0.4s;">
      <div style="background:var(--s2); border:3px solid var(--acc); padding:20px 50px; border-radius:12px; z-index:2; box-shadow: 0 10px 20px rgba(0,0,0,0.4);">
          <div class="notranslate" style="font-size:2.8rem; font-weight:900; color:var(--acc3); letter-spacing: 1px;">${rWord.word.replace(/\*/g, '')}</div>
          <div style="font-size:0.85rem; color:var(--acc2); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; font-weight:bold;">${rWord.type}</div>
          <div style="font-size:1.1rem; color:var(--tx);">${rWord.trans}</div>
      </div>`;

  let derivations = [];
  Config.rules.forEach(rule => {
      if (rule.appliesTo === 'all' || rule.appliesTo === rWord.type) {
          derivations.push({ word: applyRuleToWord(base, rule.affix), ruleName: rule.name });
      }
  });

  if(derivations.length > 0) {
      html += `<div style="width:4px; height:50px; background:var(--acc2); opacity:0.5;"></div>
      <div style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center; padding:35px; border:2px dashed var(--bd2); border-radius:16px; background: rgba(0,0,0,0.2); width: 100%;">`;
      derivations.forEach(d => { 
          html += `<div style="background:var(--s1); border:1px solid var(--bd); border-top:4px solid var(--acc); padding:15px 20px; border-radius:8px; min-width:150px; box-shadow: 0 6px 12px rgba(0,0,0,0.2); transition: 0.2s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
              <div class="notranslate" style="font-size:1.5rem; font-weight:bold; color:var(--tx); margin-bottom:5px;">${d.word}</div>
              <div style="font-size:0.75rem; color:var(--tx2); font-weight:bold; text-transform:uppercase; letter-spacing:1px;">${d.ruleName}</div>
          </div>`; 
      });
      html += `</div>`;
  } else {
      html += `<div style="margin-top:30px; color:var(--tx3); font-style:italic;">No grammatical rules apply to this root yet. Go to Settings to add inflections!</div>`;
  }
  html += `</div>`; 
  cont.innerHTML = html;
}

// Speaks the word using TTS API
function falarPalavra(texto) {
    window.speechSynthesis.cancel();
    
    // Deep Mapping: Converts complex allographies back to base phonemes for correct TTS
    let textoMapeado = texto;
    const mapeamentos = (Config.consoantes + ',' + Config.vogais)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.includes('='));
    
    mapeamentos.forEach(map => {
        let [ipa, orth] = map.split('=').map(s => s.trim());
        let regex = new RegExp(orth.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g');
        textoMapeado = textoMapeado.replace(regex, ipa);
    });

    let fala = new SpeechSynthesisUtterance(textoMapeado);
    
    // Forces voice with direct phonetic reading
    let vozes = window.speechSynthesis.getVoices();
    let vozFonetica = vozes.find(v => v.lang.includes('es-') || v.lang.includes('it-') || v.lang.includes('fi-') || v.lang.includes('pt-'));
    
    if (vozFonetica) fala.voice = vozFonetica;
    fala.rate = 0.85; 
    
    window.speechSynthesis.speak(fala);
}

// Renders universal matrix
function renderUniversalMatrix(id) {
    const pnl = document.getElementById('paradigm-' + id);
    if (pnl.style.display === 'block') { pnl.style.display = 'none'; return; }

    const wordObj = D.find(w => w.id === id);
    const groups = Config.pessoas ? Config.pessoas.split(',').map(p => p.trim()).filter(Boolean) : ["Base"];
    
    let exceptions = {};
    if (wordObj.irregular) {
        try { exceptions = JSON.parse(wordObj.irregular); } 
        catch(e) { console.warn("Bad JSON format."); }
    }

    let base = (wordObj.type === 'verb' && Config.marcaVerbo && wordObj.word.endsWith(Config.marcaVerbo)) 
               ? wordObj.word.slice(0, -Config.marcaVerbo.length) : wordObj.word;
               
    const activeRules = Config.rules.filter(r => r.appliesTo === wordObj.type || r.appliesTo === 'all');

    if (activeRules.length === 0) {
        pnl.innerHTML = '<div style="padding:15px; text-align:center; color:var(--tx3); font-style:italic;">No rules created for this class yet.</div>';
        pnl.style.display = 'block';
        return;
    }

    let html = `
    <div style="margin-top:15px; overflow-x:auto; border-radius:8px; border:1px solid var(--bd); box-shadow:var(--shadow);">
        <table style="width:100%; border-collapse: collapse; background: var(--bg); text-align: left; font-size: 0.9rem;">
            <thead style="background: var(--s3); border-bottom: 2px solid var(--bd2);">
                <tr>
                    <th style="padding:12px; color:var(--tx2); text-transform:uppercase;">${wordObj.type === 'verb' ? 'Person/Class' : 'Category'}</th>
                    ${activeRules.map(r => `<th style="padding:12px; color:var(--acc2); text-transform:uppercase;">${r.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    groups.forEach((group, idx) => {
        let rowBg = idx % 2 === 0 ? 'background: var(--bg);' : 'background: var(--s1);';
        html += `<tr style="${rowBg} border-bottom: 1px solid var(--bd);">
            <td style="padding:12px; font-weight:bold; color:var(--acc); border-right: 1px dashed var(--bd);">${group}</td>`;
            
        activeRules.forEach(rule => {
            const exactMatch = exceptions[`${rule.name} ${group}`.trim()];
            const generalMatch = exceptions[rule.name];
            
            let belongsToOtherGroup = groups.some(g => g !== group && rule.name.includes(g));
            let belongsToThisGroup = rule.name.includes(group);

            let finalForm = "";
            
            if (belongsToOtherGroup && !belongsToThisGroup) {
                finalForm = `<span style="color:var(--tx3); font-style:italic; opacity: 0.5;">-</span>`;
            } else if (exactMatch) {
                finalForm = `<span class="notranslate" style="color:var(--er); font-weight:800; text-decoration:underline;" title="Irregular Exception">${exactMatch}</span>`;
            } else if (generalMatch) {
                finalForm = `<span class="notranslate" style="color:var(--er); font-weight:800; text-decoration:underline;" title="Irregular Exception">${generalMatch}</span>`;
            } else {
                finalForm = `<span class="notranslate" style="color:var(--tx); font-weight:600;">${applyRuleToWord(base, rule.affix)}</span>`;
            }

            html += `<td style="padding:12px;">${finalForm}</td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    pnl.innerHTML = html;
    pnl.style.display = 'block';
}

// Resets the entire database
function resetDatabase() {
    const confirmacao = confirm("WARNING: This will erase all your content! \n\n Do you want to proceed?");
    
    if (confirmacao) {
        localStorage.clear(); 
        alert("Database deleted! Refresh the page please.");
        location.reload(); 
    }
}

// ==========================================
// INTERACTIVE READER & CORPUS MANAGER (DUAL MODE)
// ==========================================

// Global state for Reader mode
window.currentReaderMode = 'read';

// Handles mode switching between Read and Gloss
window.setReaderMode = function(mode) {
    window.currentReaderMode = mode;
    
    const btnRead = document.getElementById('btn-mode-read');
    const btnGloss = document.getElementById('btn-mode-gloss');
    
    // Updates UI button states
    if (btnRead) {
        if (mode === 'read') btnRead.classList.add('on');
        else btnRead.classList.remove('on');
    }
    
    if (btnGloss) {
        if (mode === 'gloss') btnGloss.classList.add('on');
        else btnGloss.classList.remove('on');
    }
    
    // Re-renders output if there's already text in the input
    const inputEl = document.getElementById('reader-input');
    if (inputEl && inputEl.value.trim()) {
        renderReader();
    }
};

// Main entry point for processing the text
window.renderReader = function() {
    const text = document.getElementById('reader-input').value;
    const output = document.getElementById('reader-output');
    
    if (!text.trim()) { 
        output.innerHTML = '<i style="color:var(--tx3); font-size: 1rem;">No text to process...</i>'; 
        return; 
    }

    if (window.currentReaderMode === 'read') {
        output.innerHTML = renderReadingMode(text);
    } else {
        output.innerHTML = renderGlossingMode(text);
    }
};

// Mode 1: Clean Reading with Tooltips
window.renderReadingMode = function(text) {
    const words = text.split(/(\s+|[.,!?;:"()]+)/).filter(Boolean);
    
    let html = words.map(token => {
        if (/^[\s.,!?;:"()]+$/.test(token)) {
            return `<span>${token}</span>`; 
        }

        let cleanToken = token.toLowerCase();
        let parsings = getUniqueParsings(cleanToken);

        if (parsings.length > 0) {
            let p = parsings[0]; 
            let baseWord = p.root.word.replace(/\*/g, '');
            let ipa = p.root.ipa ? `/${p.root.ipa}/` : '';
            let tags = p.rules.length ? p.rules.map(r => r.name).join(' + ') : 'Root';

            return `<span class="reader-word tooltip-trigger">
                        ${token}
                        <div class="reader-tooltip">
                            <div class="tt-title">${baseWord} <span class="tt-ipa">${ipa}</span></div>
                            <div class="tt-type">${p.root.type}</div>
                            <div class="tt-trans">${p.root.trans}</div>
                            <div class="tt-morph">${tags}</div>
                        </div>
                    </span>`;
        }
        
        return `<span style="color: var(--er); border-bottom: 2px wavy var(--er); cursor: help;" title="Unknown root">${token}</span>`;
    }).join('');

    return html;
};

// Mode 2: Interlinear Glossed Text (IGT) using Leipzig.js
window.renderGlossingMode = function(text) {
    const tokens = text.trim().split(/\s+/); 
    
    let lineOriginal = [];
    let lineGloss = [];
    
    tokens.forEach(token => {
        let cleanToken = token.replace(/[.,!?;:"()]/g, "").toLowerCase();
        let parsings = getUniqueParsings(cleanToken);

        if (parsings.length > 0) {
            let p = parsings[0];
            let baseWord = p.root.word.replace(/\*/g, '');
            
            let lexicalGloss = p.root.trans.toLowerCase().trim().replace(/\s+/g, '.');
            
            let segmentedWord = baseWord;
            let glossParts = [lexicalGloss];
            
        
            p.rules.slice().reverse().forEach(r => {
                let cleanAffix = r.affix.replace(/^-|-$/g, '');
                let tag = r.name.toUpperCase().replace(/\s+/g, '.'); 
                
                if (r.affix.endsWith('-') && !r.affix.startsWith('-')) {
                    segmentedWord = cleanAffix + '-' + segmentedWord;
                    glossParts.unshift(tag);
                } else {
                    segmentedWord = segmentedWord + '-' + cleanAffix;
                    glossParts.push(tag);
                }
            });

            lineOriginal.push(segmentedWord);
            lineGloss.push(glossParts.join('-'));
        } else {
            lineOriginal.push(token);
            lineGloss.push('???');
        }
    });


    let html = `
        <div style="background: var(--bg); padding: 25px; border-radius: var(--rad-sm); border: 1px solid var(--bd); margin-top: 15px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
            <div data-gloss class="leipzig-container">
                <p>${lineOriginal.join(' ')}</p>
                <p>${lineGloss.join(' ')}</p>
            </div>
            <div style="border-top: 1px dashed var(--bd); padding-top: 15px; margin-top: 15px;">
                <input type="text" class="fi" placeholder="Tradução livre..." style="font-style: italic; background: var(--s1); width: 100%;">
            </div>
        </div>
    `;

    setTimeout(() => {
        if (typeof Leipzig !== 'undefined') {
            const leipzig = Leipzig();
            leipzig.gloss(); 
        }
    }, 100);

    return html;
};

// Initial mock data for Wiki Pages
const wikiPagesData = {
  phonology: "<h1>Phonology</h1><p>Describe the sound system here.</p>",
  morphology: "<h1>Morphology</h1><p>Word formation rules, prefixes, and suffixes.</p>",
  syntax: "<h1>Syntax</h1><p>Define your sentence structure and word order here.</p>"
};

let currentPageId = 'phonology';
const editor = document.getElementById('wiki-editor');

// Loads clicked page content
function loadPage(pageId) {
  saveCurrentPage(); 
  currentPageId = pageId;
  editor.innerHTML = wikiPagesData[pageId] || "<h1>New Page</h1><p>Start writing...</p>";
}

// Saves typed content to the object
function saveCurrentPage() {
  if (currentPageId && editor) {
    wikiPagesData[currentPageId] = editor.innerHTML;
  }
}

// Executes native browser formatting
function formatText(command, value = null) {
  document.execCommand(command, false, value);
  editor.focus();
}

// Inserts links
function addLink() {
  const url = prompt("Insert link URL (e.g. https://...):");
  if (url) {
    formatText('createLink', url);
  }
}

// Creates a new page
function createNewPage() {
  const pageName = prompt("New topic name:");
  if (pageName) {
    const pageId = pageName.toLowerCase().replace(/\s+/g, '-');
    wikiPagesData[pageId] = `<h1>${pageName}</h1><p>Page content...</p>`;
    
    const li = document.createElement('li');
    li.id = `li-${pageId}`;
    
    const btnLoad = document.createElement('button');
    btnLoad.className = 'menu-btn';
    btnLoad.textContent = pageName;
    btnLoad.onclick = () => loadPage(pageId);
    
    const btnDelete = document.createElement('button');
    btnDelete.className = 'delete-btn';
    btnDelete.textContent = '✖';
    btnDelete.title = 'Delete';
    btnDelete.onclick = (event) => deletePage(pageId, event);
    
    li.appendChild(btnLoad);
    li.appendChild(btnDelete);
    document.getElementById('page-list').appendChild(li);
    
    loadPage(pageId);
  }
}

// Deletes a page
function deletePage(pageId, event) {
  event.stopPropagation(); 
  
  if (confirm("Are you sure you want to delete this page?")) {
    delete wikiPagesData[pageId];
    
    const li = document.getElementById(`li-${pageId}`);
    if (li) li.remove();
    
    if (currentPageId === pageId) {
      const remainingPages = Object.keys(wikiPagesData);
      
      if (remainingPages.length > 0) {
        loadPage(remainingPages[0]); 
      } else {
        currentPageId = null;
        editor.innerHTML = ""; 
      }
    }
  }
}

// Application bootstrap
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting Conlang Engine...");

    carregarConfiguracoesNaTela();
    renderDict();
    loadPage(currentPageId);
    
    const savedTheme = localStorage.getItem('conlang_theme');
    const osPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const finalTheme = savedTheme ? savedTheme : (osPrefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', finalTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = finalTheme === 'light' ? '🌙' : '☀️';
    }
});