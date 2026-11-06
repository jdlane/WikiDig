declare module 'wink-lemmatizer' {
  const lemmatizer: {
    noun(word: string): string;
    verb(word: string): string;
    adjective(word: string): string;
  };
  export default lemmatizer;
}

/** WordNet word → index into wn-word-senses. */
declare module 'wink-lexicon/src/wn-words.js' {
  const words: Record<string, number>;
  export default words;
}

/** Per word: indexes into WordNet's lexicographer categories (see wordForms.ts). */
declare module 'wink-lexicon/src/wn-word-senses.js' {
  const senses: number[][];
  export default senses;
}
