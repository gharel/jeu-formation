import { describe, it, expect } from 'vitest';
import {
  comparer,
  fourchette,
  decrireFourchette,
  suivant,
} from '../../jeux/juste-chiffre/logique.js';
import { schema, exemple } from '../../jeux/juste-chiffre/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

const espaces = (texte) => texte.replace(/\s/g, ' ');

describe('Le Juste Chiffre', () => {
  it('répond plus, moins ou juste', () => {
    expect(comparer(1992, 1980)).toBe('plus');
    expect(comparer(1992, 2000)).toBe('moins');
    expect(comparer(1992, 1992)).toBe('juste');
    expect(comparer(0.3, 0.1 + 0.2)).toBe('juste');
    expect(comparer(-5, -10)).toBe('plus');
  });

  it('accepte une marge en pourcentage', () => {
    expect(comparer(2073600, 2000000, 10)).toBe('juste');
    expect(comparer(2073600, 1800000, 10)).toBe('plus');
    expect(comparer(100, 110, 10)).toBe('juste');
    expect(comparer(100, 111, 10)).toBe('moins');
  });

  it('resserre la fourchette au fil des propositions', () => {
    const historique = [
      { valeur: 1950, resultat: 'plus' },
      { valeur: 2010, resultat: 'moins' },
      { valeur: 1980, resultat: 'plus' },
      { valeur: 2000, resultat: 'moins' },
      { valeur: 1960, resultat: 'plus' },
    ];
    expect(fourchette(historique)).toEqual({ min: 1980, max: 2000 });
    expect(espaces(decrireFourchette(fourchette(historique)))).toBe('Entre 1980 et 2000');
    expect(espaces(decrireFourchette({ min: 1500, max: null }, 'touches'))).toBe(
      'Plus de 1500 touches',
    );
    expect(decrireFourchette({ min: null, max: 3 })).toBe('Moins de 3');
    expect(decrireFourchette({ min: null, max: null })).toBe('');
  });

  it('passe au participant suivant en boucle', () => {
    expect(suivant(['A', 'B', 'C'], 0)).toBe(1);
    expect(suivant(['A', 'B', 'C'], 2)).toBe(0);
    expect(suivant([], 0)).toBe(-1);
  });

  it('a un exemple valide et un minuteur de 30 s par défaut', () => {
    const contenu = nettoyerContenu(schema, exemple);
    expect(validerContenu(schema, contenu)).toEqual([]);
    expect(nettoyerContenu(schema, {}).reglages.duree).toBe(30);
  });

  it('refuse un minuteur trop court ou une réponse manquante', () => {
    const contenu = nettoyerContenu(schema, {
      reglages: { duree: 2 },
      elements: [{ question: 'Combien ?' }],
    });
    const erreurs = validerContenu(schema, contenu);
    expect(erreurs).toContain('Réglage « Temps par question » doit être au moins 5.');
    expect(erreurs).toContain('Question 1 : « Réponse (un nombre) » est obligatoire.');
  });
});
