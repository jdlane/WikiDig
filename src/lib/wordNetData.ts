// WordNet data (~590 KB gzipped). Only imported dynamically, via loadWordForms(), so it gets its own chunk.
import lemmatizer from 'wink-lemmatizer';
import words from 'wink-lexicon/src/wn-words.js';
import senses from 'wink-lexicon/src/wn-word-senses.js';

export default { lemmatizer, words, senses };
