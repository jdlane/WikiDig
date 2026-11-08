import { MAX_LIVES } from './scoring';
import type { StoredResult } from './storage';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface BadgeRule extends Badge {
  earned: (result: StoredResult) => boolean;
}

const letterCount = (word: string) => word.match(/\p{L}/gu)?.length ?? 0;

const RULES: readonly BadgeRule[] = [
  {
    id: 'clean-dig',
    name: 'Clean Dig',
    emoji: '✨',
    description: 'No pickaxes broken',
    earned: (r) => (r.misses?.length ?? 0) === 0,
  },
  {
    id: 'close-call',
    name: 'Close Call',
    emoji: '🩹',
    description: 'Found it on your last pickaxe',
    earned: (r) => (r.misses?.length ?? 0) === MAX_LIVES - 1,
  },
  {
    id: 'top-answer',
    name: 'Top Answer',
    emoji: '🏆',
    description: 'The deepest possible word',
    earned: (r) => r.topAnswer === true,
  },
  {
    id: 'big-word',
    name: 'Big Word',
    emoji: '📚',
    description: 'A word of 12+ letters',
    earned: (r) => letterCount(r.guess) >= 12,
  },
  {
    id: 'small-wonder',
    name: 'Small Wonder',
    emoji: '🐜',
    description: 'A word of 4 letters or fewer that reached Gold',
    earned: (r) => letterCount(r.guess) <= 4 && r.depth >= 0.75,
  },
];

/** Every badge, in display order. */
export const BADGES: readonly Badge[] = RULES.map(({ earned: _earned, ...badge }) => badge);

/** The badges one dig earned. A dig that found no word earns none. */
export function badgesFor(result: StoredResult): Badge[] {
  if (result.index < 0) return [];
  return RULES.filter((rule) => rule.earned(result)).map(({ earned: _earned, ...badge }) => badge);
}
