const words = ['apple', 'brother', 'sword', 'idea'];

async function test() {
    for (let w of words) {
        let trg = await fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(w)}&max=5`).then(r => r.json());
        let ml = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(w)}&max=5`).then(r => r.json());
        let gen = await fetch(`https://api.datamuse.com/words?rel_gen=${encodeURIComponent(w)}&max=5`).then(r => r.json());
        
        console.log(`\nWord: ${w}`);
        console.log(`rel_trg:`, trg.map(r=>r.word));
        console.log(`ml:`, ml.map(r=>r.word));
        console.log(`rel_gen:`, gen.map(r=>r.word));
    }
}

test();
