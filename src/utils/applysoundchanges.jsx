

export default function applySoundChanges(wordString, rulesString) {
  if (!wordString || !rulesString) return []
  
  //Separation of the test words
  const words = wordString.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
  //Separation of the rules
    const rules = rulesString.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('=>'))
        .map(line => {
            const [pattern, replacement] = line.split('=>').map(s => s.trim());
            return { pattern, replacement };
        });

        //Return the preview withRules
        return words.map(word => {
        let evolvedWord = word;
        let steps = [];

        rules.forEach(({ pattern, replacement }) => {
            try {
                const regex = new RegExp(pattern, 'g');
                const newWord = evolvedWord.replace(regex, replacement);
                if (newWord !== evolvedWord) {
                    evolvedWord = newWord;
                    steps.push(`${pattern} => ${evolvedWord}`);
                }
            } catch (e) {
                console.error("Invalid Regex rule:", pattern);
            }
        });

        return { original: word, evolved: evolvedWord, steps };
    });
}
