import { describe, it, expect } from 'vitest';
import {
  creerHasard,
  hasardDePage,
  hasardAnnexe,
  entierEntre,
  melanger,
} from '../../assets/js/commun/hasard.js';

describe('hasard', () => {
  it('donne la même suite pour la même graine', () => {
    const a = creerHasard(42);
    const b = creerHasard(42);
    const suiteA = Array.from({ length: 5 }, () => a());
    const suiteB = Array.from({ length: 5 }, () => b());
    expect(suiteA).toEqual(suiteB);
    for (const n of suiteA) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('lit la graine dans l’adresse', () => {
    const h1 = hasardDePage('?graine=7');
    const h2 = creerHasard(7);
    expect(h1()).toBe(h2());
    expect(hasardDePage('')).toBe(Math.random);
    expect(hasardDePage('?graine=abc')).toBe(Math.random);
  });

  it('tire un entier entre deux bornes incluses', () => {
    const h = creerHasard(1);
    const tirages = new Set(Array.from({ length: 200 }, () => entierEntre(1, 3, h)));
    expect([...tirages].sort()).toEqual([1, 2, 3]);
  });

  it('mélange sans perdre ni modifier l’original', () => {
    const original = [1, 2, 3, 4, 5, 6];
    const melange = melanger(original, creerHasard(3));
    expect(original).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...melange].sort()).toEqual(original);
  });

  it('donne un flux annexe qui ne touche pas à celui de la page', () => {
    const page = hasardDePage('?graine=7');
    const annexe = hasardAnnexe(page, 3);
    const suite = Array.from({ length: 4 }, () => annexe());
    // La suite de la page n'a pas bougé
    const intacte = creerHasard(7);
    expect(Array.from({ length: 4 }, () => page())).toEqual(
      Array.from({ length: 4 }, () => intacte()),
    );
    // Même clé, même suite ; autre clé, autre suite
    const encore = hasardAnnexe(hasardDePage('?graine=7'), 3);
    expect(Array.from({ length: 4 }, () => encore())).toEqual(suite);
    const autre = hasardAnnexe(hasardDePage('?graine=7'), 4);
    expect(Array.from({ length: 4 }, () => autre())).not.toEqual(suite);
    // Sans graine, c'est le hasard de la page
    expect(hasardAnnexe(Math.random, 3)).toBe(Math.random);
  });
});
