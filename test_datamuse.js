const words = ['apple', 'run', 'blue', 'democracy', 'quick', 'father', 'sword', 'idea'];

async function test() {
    const start = Date.now();
    const promises = words.map(w => fetch(`https://api.datamuse.com/words?rel_gen=${encodeURIComponent(w)}&max=5`).then(r => r.json()));
    const results = await Promise.all(promises);
    
    results.forEach((res, i) => {
        console.log(`${words[i]}:`, res.map(r => r.word));
    });
    console.log(`Took ${Date.now() - start}ms`);
}

test();
