/**
 * Builds public/endless-pool.json: every level-4 and level-5 vital article whose title is playable.
 * Endless mode picks from this list at random. Word counts are checked in the game when an article
 * is picked, so this only takes about 100 requests.
 *
 *   npm run build:endless
 *
 * Set WIKI_CONTACT (an email or URL) so Wikimedia can reach you about the traffic (see ./wikiApi).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isPlayableTitle } from '../src/data/articleRules';
import type { EndlessPoolFile } from '../src/lib/randomArticle';
import { categoryMembers, warnIfAnonymous } from './wikiApi';

/** Quality classes to include. List- and Stub-Class are left out. */
const CLASSES = ['FA', 'FL', 'GA', 'A', 'B', 'C', 'Start'];
const LEVELS = [4, 5];
const OUT = path.resolve('public/endless-pool.json');

async function main() {
  warnIfAnonymous();
  const titles = new Set<string>();
  let skipped = 0;
  for (const level of LEVELS) {
    for (const cls of CLASSES) {
      const category = `Category:${cls}-Class level-${level} vital articles`;
      const talkPages = await categoryMembers(category, { cmnamespace: '1', cmtype: 'page', cmprop: 'title' });
      for (const talk of talkPages) {
        const title = talk.replace(/^Talk:/, '');
        if (isPlayableTitle(title)) titles.add(title);
        else skipped++;
      }
      console.log(`  ${category}: ${talkPages.length}`);
    }
  }
  if (titles.size === 0) throw new Error('No titles found; not overwriting the pool.');

  const file: EndlessPoolFile = {
    generatedAt: new Date().toISOString(),
    titles: [...titles].sort((a, b) => a.localeCompare(b)),
  };
  // One title per line keeps diffs readable.
  const lines = file.titles.map((t) => `    ${JSON.stringify(t)}`).join(',\n');
  await writeFile(OUT, `{\n  "generatedAt": ${JSON.stringify(file.generatedAt)},\n  "titles": [\n${lines}\n  ]\n}\n`);
  console.log(`Wrote ${file.titles.length} titles to ${OUT} (${skipped} skipped by title rules).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
