import { describe, it, expect, beforeEach, vi } from 'vitest';
import { lire, ecrire, effacer } from '../../assets/js/commun/stockage.js';
import {
  ajouter,
  retirer,
  normaliserPrenom,
  charger,
  enregistrer,
  NOMBRE_MAX,
} from '../../assets/js/commun/participants.js';

beforeEach(() => localStorage.clear());

describe('stockage', () => {
  it('écrit et relit une valeur JSON avec le préfixe', () => {
    expect(ecrire('essai', { a: 1 })).toBe(true);
    expect(localStorage.getItem('skazy-jeux:essai')).toBe('{"a":1}');
    expect(lire('essai')).toEqual({ a: 1 });
    effacer('essai');
    expect(lire('essai', 'défaut')).toBe('défaut');
  });

  it('renvoie la valeur par défaut si le JSON est abîmé', () => {
    localStorage.setItem('skazy-jeux:abime', '{pas du json');
    expect(lire('abime', 42)).toBe(42);
  });

  it('ne plante pas si le stockage refuse l’écriture', () => {
    const espion = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(ecrire('plein', 'x')).toBe(false);
    espion.mockRestore();
  });
});

describe('participants', () => {
  it('nettoie les prénoms', () => {
    expect(normaliserPrenom('  Marie   Claire  ')).toBe('Marie Claire');
    expect(normaliserPrenom('x'.repeat(50))).toHaveLength(30);
  });

  it('ajoute plusieurs prénoms séparés par des virgules, sans doublon', () => {
    let liste = ajouter([], 'Marie, Paul ; Léa');
    expect(liste).toEqual(['Marie', 'Paul', 'Léa']);
    liste = ajouter(liste, 'marie, , Hugo');
    expect(liste).toEqual(['Marie', 'Paul', 'Léa', 'Hugo']);
  });

  it('limite le nombre de participants', () => {
    const beaucoup = Array.from({ length: NOMBRE_MAX + 10 }, (_, i) => `P${i}`).join(',');
    expect(ajouter([], beaucoup)).toHaveLength(NOMBRE_MAX);
  });

  it('retire un prénom sans tenir compte des majuscules', () => {
    expect(retirer(['Marie', 'Paul'], 'marie')).toEqual(['Paul']);
  });

  it('enregistre et recharge la liste partagée', () => {
    enregistrer(['Ana', 'Bob']);
    expect(charger()).toEqual(['Ana', 'Bob']);
    localStorage.setItem('skazy-jeux:participants', '"pas une liste"');
    expect(charger()).toEqual([]);
  });
});
