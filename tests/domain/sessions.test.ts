import { describe, expect, it } from 'vitest';
import { ListeningSession } from '../../src/domain/listening';
import { MatchSession } from '../../src/domain/match';
import { PuzzleSession } from '../../src/domain/puzzle';
import { SeededRandom } from '../../src/domain/random';
import { ScrambleSession } from '../../src/domain/scramble';

describe('PuzzleSession (تركيب الحروف)', () => {
  const WORDS = ['قمر', 'شمس'];
  const make = () => new PuzzleSession(WORDS, new SeededRandom(4));

  function place(session: PuzzleSession, letters: readonly string[]) {
    let outcome;
    for (const letter of letters) {
      const piece = session.pieces.find(p => p.letter === letter && !p.used)!;
      outcome = session.pick(piece.id);
    }
    return outcome;
  }

  it('propose autant de pièces que de lettres du mot courant', () => {
    const s = make();
    expect(s.pieces.map(p => p.letter).sort()).toEqual([...s.current].sort());
  });

  it('une bonne séquence donne 20 points', () => {
    const s = make();
    expect(place(s, [...s.current])).toBe('correct');
    expect(s.score).toBe(20);
  });

  it('une mauvaise séquence verrouille jusqu’à retry()', () => {
    const s = make();
    expect(place(s, [...s.current].reverse())).toBe('wrong');
    expect(s.attempts).toBe(1);
    expect(s.pick(s.pieces[0]!.id)).toBe('ignored');
    s.retry();
    expect(s.placed).toEqual([]);
    expect(s.pieces.every(p => !p.used)).toBe(true);
  });

  it('un mot de plus de 2 échecs active l’indice sur la première lettre', () => {
    const s = make();
    place(s, [...s.current].reverse());
    s.retry();
    expect(s.hintActive).toBe(false);
    place(s, [...s.current].reverse());
    s.retry();
    expect(s.hintActive).toBe(true);
  });

  it('ignore une pièce déjà utilisée', () => {
    const s = make();
    const id = s.pieces[0]!.id;
    expect(s.pick(id)).toBe('placed');
    expect(s.pick(id)).toBe('ignored');
  });

  it('enchaîne les mots puis donne 30 points de bonus si tout est juste', () => {
    const s = make();
    for (let i = 0; i < WORDS.length; i++) {
      expect(s.finished).toBe(false);
      place(s, [...s.current]);
      s.advance();
    }
    expect(s.finished).toBe(true);
    expect(s.score).toBe(2 * 20 + 30);
    expect(s.maxScore).toBe(70);
  });

  it('ne donne pas le bonus avant la fin', () => {
    const s = make();
    place(s, [...s.current]);
    expect(s.score).toBe(20);
  });
});

describe('ScrambleSession (ترتيب الحروف)', () => {
  const WORDS = ['قمر', 'نجم', 'جبل'];
  const make = () => new ScrambleSession(WORDS, new SeededRandom(8));

  it('mélange les lettres du mot courant sans retrouver le mot', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = new ScrambleSession(WORDS, new SeededRandom(seed));
      expect([...s.scrambled].sort()).toEqual([...s.current].sort());
      expect(s.scrambled.join('')).not.toBe(s.current);
    }
  });

  it('ne boucle pas sur un mot aux lettres identiques', () => {
    const s = new ScrambleSession(['مم'], new SeededRandom(1));
    expect(s.scrambled.join('')).toBe('مم');
  });

  it('une bonne réponse (espaces ignorés) donne 15 points et passe au mot suivant', () => {
    const s = make();
    const word = s.current;
    expect(s.answer(`  ${word} `)).toEqual({ correct: true, word });
    expect(s.score).toBe(15);
    expect(s.index).toBe(1);
  });

  it('une mauvaise réponse ne fait pas avancer', () => {
    const s = make();
    const word = s.current;
    expect(s.answer('خطأ')).toEqual({ correct: false, word });
    expect(s.index).toBe(0);
    expect(s.score).toBe(0);
  });

  it('skip() passe au mot suivant sans point', () => {
    const s = make();
    s.skip();
    expect(s.index).toBe(1);
    expect(s.score).toBe(0);
  });

  it('un sans-faute rapporte 20 points de bonus, un mot passé les fait perdre', () => {
    const perfect = make();
    while (!perfect.finished) perfect.answer(perfect.current);
    expect(perfect.score).toBe(3 * 15 + 20);
    expect(perfect.maxScore).toBe(65);

    const skipped = make();
    skipped.skip();
    while (!skipped.finished) skipped.answer(skipped.current);
    expect(skipped.score).toBe(2 * 15);
  });
});

describe('MatchSession (ربط الكلمة بالصورة)', () => {
  const WORDS = ['شمس', 'قمر', 'نجم', 'جبل', 'بحر', 'ماء', 'نور'];
  const make = () => new MatchSession(WORDS, new SeededRandom(6));

  it('choisit 5 mots distincts au maximum', () => {
    const s = make();
    expect(s.words).toHaveLength(5);
    expect(new Set(s.words).size).toBe(5);
    expect([...s.imageOrder].sort()).toEqual([...s.words].sort());
  });

  it('refuse moins de 3 mots distincts', () => {
    expect(() => new MatchSession(['شمس', 'قمر', 'شمس'], new SeededRandom(1))).toThrow();
  });

  it('une image sans mot sélectionné est ignorée', () => {
    expect(make().selectImage('شمس')).toBe('ignored');
  });

  it('associe correctement (+12) ou se trompe', () => {
    const s = make();
    const [a, b] = s.words as [string, string];
    s.selectWord(a);
    expect(s.selectImage(b)).toBe('wrong');
    expect(s.score).toBe(0);
    expect(s.selectImage(a)).toBe('correct');
    expect(s.score).toBe(12);
    expect(s.isMatched(a)).toBe(true);
  });

  it('ne permet pas de ré-associer un mot déjà apparié', () => {
    const s = make();
    const a = s.words[0]!;
    s.selectWord(a);
    s.selectImage(a);
    expect(s.selectWord(a)).toBe(false);
    expect(s.selectImage(a)).toBe('ignored');
  });

  it('terminer rapporte 15 points de bonus', () => {
    const s = make();
    for (const w of s.words) {
      s.selectWord(w);
      s.selectImage(w);
    }
    expect(s.isComplete).toBe(true);
    expect(s.score).toBe(5 * 12 + 15);
    expect(s.maxScore).toBe(75);
  });
});

describe('ListeningSession (الاستماع)', () => {
  const WORDS = ['شمس', 'قمر', 'نجم', 'جبل', 'بحر'];
  const make = () => new ListeningSession(WORDS, new SeededRandom(2));

  it('refuse moins de 4 mots distincts', () => {
    expect(() => new ListeningSession(['شمس', 'قمر', 'نجم'], new SeededRandom(1))).toThrow();
  });

  it('pose min(8, 2 × mots) questions', () => {
    expect(make().totalQuestions).toBe(8);
    expect(new ListeningSession(WORDS.slice(0, 4), new SeededRandom(1)).totalQuestions).toBe(8);
  });

  it('propose 4 images distinctes dont la bonne', () => {
    const q = make().question;
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.word);
  });

  it('ne répète pas le même mot deux questions de suite', () => {
    const s = make();
    let previous = s.question.word;
    while (!s.finished) {
      s.answer(s.question.word);
      s.next();
      if (!s.finished) {
        expect(s.question.word).not.toBe(previous);
        previous = s.question.word;
      }
    }
  });

  it('bonne réponse +12, mauvaise réponse 0 avec la solution', () => {
    const s = make();
    const q = s.question;
    const wrong = q.options.find(o => o !== q.word)!;
    expect(s.answer(wrong)).toEqual({ correct: false, expected: q.word });
    expect(s.score).toBe(0);
    s.next();
    expect(s.answer(s.question.word).correct).toBe(true);
    expect(s.score).toBe(12);
  });

  it('une question ne peut être répondue qu’une fois', () => {
    const s = make();
    s.answer(s.question.word);
    expect(s.answer(s.question.word).correct).toBe(false);
    expect(s.score).toBe(12);
  });

  it('un sans-faute rapporte 25 points de bonus', () => {
    const s = make();
    while (!s.finished) {
      s.answer(s.question.word);
      s.next();
    }
    expect(s.score).toBe(8 * 12 + 25);
    expect(s.maxScore).toBe(121);
    expect(s.history).toHaveLength(8);
  });
});
