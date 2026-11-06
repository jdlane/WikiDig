import { createElement, memo, useEffect, useRef } from 'react';
import type { Article } from '../lib/extractText';
import { normalizeWord } from '../lib/scoring';
import { articleUrl } from '../lib/wikipedia';

interface Props {
  article: Article;
  title: string;
  revisionId: number;
  guess: string;
  /** Word index of the first occurrence, or -1. */
  firstIndex: number;
}

export const ArticleReveal = memo(function ArticleReveal({ article, title, revisionId, guess, firstIndex }: Props) {
  const firstRef = useRef<HTMLElement>(null);
  const target = normalizeWord(guess);

  useEffect(() => {
    firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [firstIndex]);

  return (
    <section className="card article-card">
      <div className="article-header">
        <h2>{title}</h2>
        <a href={articleUrl(title, revisionId)} target="_blank" rel="noreferrer">
          View on Wikipedia ↗
        </a>
      </div>
      <div className="article-body">
        {article.blocks.map((block, i) =>
          createElement(
            block.type === 'li' ? 'p' : block.type,
            { key: i, className: block.type === 'li' ? 'article-li' : undefined },
            block.segments.map((seg, j) => {
              if (seg.wordIndex === undefined || article.words[seg.wordIndex] !== target) return seg.text;
              const isFirst = seg.wordIndex === firstIndex;
              return (
                <mark key={j} ref={isFirst ? firstRef : undefined} className={isFirst ? 'hit first' : 'hit'}>
                  {seg.text}
                </mark>
              );
            }),
          ),
        )}
      </div>
    </section>
  );
});
