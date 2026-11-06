import { useMemo } from 'react';
import type { Article } from '../lib/extractText';
import { depthPercent, depthScore, normalizeWord, topAnswers } from '../lib/scoring';

interface Props {
  article: Article;
  guess: string;
}

export function TopAnswers({ article, guess }: Props) {
  const answers = useMemo(() => topAnswers(article.words, article.originals, 10), [article]);
  const target = normalizeWord(guess);

  return (
    <section className="card top-card">
      <h3 className="top-heading">Top 10 answers</h3>
      <ol className="top-list">
        {answers.map((a, i) => {
          const isGuess = article.words[a.index] === target;
          return (
            <li key={a.index} className={isGuess ? 'top-row yours' : 'top-row'}>
              <span className="top-rank">{i + 1}</span>
              <span className="top-word">
                {a.word}
                {isGuess && <span className="top-badge">you</span>}
              </span>
              <span className="top-depth">{depthPercent(a.depth)}%</span>
              <span className="top-score">{depthScore(a.depth).toLocaleString()}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
