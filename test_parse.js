import fs from 'fs';

const parseAffix = (affixStr) => {
    if (!affixStr) return null;
    const match = affixStr.match(/^([-=])?([^-=@]+)([-=])?(?:@(\w+))?$/);
    if (!match) return { clean: affixStr.replace(/^-|-$/g, ''), type: 'unknown' };

    const [_, hasStart, morpheme, hasEnd, position] = match;
    let type = 'suffix'; // Default
    if (hasStart && hasEnd) type = 'infix';
    else if (hasEnd) type = 'prefix';
    else if (hasStart) type = 'suffix';

    return { clean: morpheme, type, position };
};

const grammarRules = [
  { id: '1', name: 'Plural', affix: '-s', appliesTo: 'noun' },
  { id: '2', name: 'Past', affix: '-ed', appliesTo: 'verb' },
  { id: '3', name: 'Anti', affix: 'anti-', appliesTo: 'noun' },
  { id: '4', name: 'Ma', affix: '-ma', appliesTo: 'noun', dependency: '*suffix' }
];

const expandWildcardDependencies = (applicableRules, grammarRules) => {
    let expandedRules = [];
    applicableRules.forEach(rule => {
        if (!rule.dependency) {
            expandedRules.push(rule);
            return;
        }

        const depLower = rule.dependency.trim().toLowerCase();
        
        if (['*suffix', '*prefix', '*infix', '*affix'].includes(depLower)) {
            const targetRules = grammarRules.filter(r => {
                const p = parseAffix(r.affix);
                console.log(`Evaluating ${r.name} with affix ${r.affix} -> type: ${p ? p.type : 'none'}`);
                if (!p || r.id === rule.id) return false;
                
                if (depLower === '*suffix') return p.type === 'suffix';
                if (depLower === '*prefix') return p.type === 'prefix';
                if (depLower === '*infix') return p.type === 'infix';
                if (depLower === '*affix') return ['suffix', 'prefix', 'infix'].includes(p.type);
                
                return false;
            });

            console.log(`Found ${targetRules.length} target rules for ${rule.name}`);

            if (targetRules.length === 0) {
                 expandedRules.push(rule);
            } else {
                 targetRules.forEach(tr => {
                     expandedRules.push({
                         ...rule,
                         id: `${rule.id}_after_${tr.id}`,
                         name: `${rule.name} (after ${tr.name})`,
                         dependency: tr.name
                     });
                 });
            }
        } else {
            expandedRules.push(rule);
        }
    });
    return expandedRules;
};

const applicableRules = [grammarRules[0], grammarRules[3]];
const expanded = expandWildcardDependencies(applicableRules, grammarRules);
console.log(JSON.stringify(expanded, null, 2));
