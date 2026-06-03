import nlp from 'compromise';

const words = ['apple', 'brother', 'car', 'blue', 'run', 'sad', 'dog', 'water'];
words.forEach(w => {
    let doc = nlp(w);
    let tags = doc.out('tags');
    console.log(`${w}:`, tags);
});
