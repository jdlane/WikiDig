# Wiki Dig

A daily word game played on Wikipedia articles. You see an article's title and opening sentence, then guess a single word you think first appears as far down the article as possible. The deeper the word's first appearance, the higher your score. Guess a word that isn't in the article and you lose one of your pickaxes.

- **Daily**: everyone gets the same article each day, picked from Wikipedia's level-4 vital articles.
- **Endless**: random vital articles, as many rounds as you like.

## Development

```sh
npm install
npm run dev       # start the Vite dev server
npm test          # run the tests (Vitest)
npm run build     # type-check and build to dist/
```

## Deployment

Pushing to `master` runs the tests, builds the site, and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).
