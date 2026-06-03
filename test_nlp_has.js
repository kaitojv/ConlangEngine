import nlp from 'compromise';

const words = ['apple', 'brother', 'car', 'blue', 'run', 'sad', 'dog', 'water', 'leaf', 'oven', 'sword'];
words.forEach(w => {
    let doc = nlp(w);
    let tags = {
        word: w,
        Noun: doc.has('#Noun'),
        Color: doc.has('#Color'),
        City: doc.has('#City'),
        Person: doc.has('#Person'),
        Value: doc.has('#Value'),
        Adjective: doc.has('#Adjective')
    };
    console.log(tags);
});
