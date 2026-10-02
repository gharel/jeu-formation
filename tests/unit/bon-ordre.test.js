import { describe, it, expect } from 'vitest';
import {
  creerCartes,
  lireOrdre,
  verifier,
  pointsPourEssai,
  validerProcedure,
} from '../../jeux/bon-ordre/logique.js';
import { schema, exemple } from '../../jeux/bon-ordre/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Le Bon Ordre', () => {
  it('mélange les cartes sans jamais donner le bon ordre d’emblée', () => {
    for (let graine = 0; graine < 50; graine++) {
      const cartes = creerCartes(3, creerHasard(graine));
      expect(cartes.map((c) => c.lettre)).toEqual(['A', 'B', 'C']);
      expect(cartes.map((c) => c.etape).sort()).toEqual([0, 1, 2]);
      expect(cartes.every((c, i) => c.etape === i)).toBe(false);
    }
    // Hasard « bloqué » qui redonnerait toujours l'ordre initial
    const cartes = creerCartes(4, () => 0.999);
    expect(cartes.every((c, i) => c.etape === i)).toBe(false);
  });

  it('lit l’ordre dicté, avec ou sans séparateurs', () => {
    expect(lireOrdre('C, a ; d b', ['A', 'B', 'C', 'D'])).toEqual({
      lettres: ['C', 'A', 'D', 'B'],
    });
    expect(lireOrdre('cadb', ['A', 'B', 'C', 'D']).lettres).toEqual(['C', 'A', 'D', 'B']);
  });

  it('signale les erreurs de saisie', () => {
    const autorisees = ['A', 'B', 'C'];
    expect(lireOrdre('', autorisees).erreur).toMatch(/Tapez les lettres/);
    expect(lireOrdre('ABZ', autorisees).erreur).toBe('La carte Z n’est pas à placer.');
    expect(lireOrdre('AAB', autorisees).erreur).toBe('La carte A est donnée deux fois.');
    expect(lireOrdre('AB', autorisees).erreur).toBe('Il faut 3 lettres (ici 2).');
  });

  it('vérifie chaque position', () => {
    const emplacements = [{ etape: 0 }, { etape: 2 }, { etape: 1 }, null];
    expect(verifier(emplacements)).toEqual([true, false, false, false]);
  });

  it('donne moins de points à chaque essai', () => {
    expect([1, 2, 3].map((e) => pointsPourEssai(e, 3))).toEqual([3, 2, 1]);
    expect(pointsPourEssai(1, 5)).toBe(5);
    expect(pointsPourEssai(9, 3)).toBe(1);
  });

  it('a un exemple valide et refuse les procédures trop courtes ou trop longues', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    const courte = nettoyerContenu(schema, { elements: [{ titre: 'X', etapes: ['a', 'b'] }] });
    expect(validerContenu(schema, courte)).toContain(
      'Procédure 1 : il faut au moins 3 « étapes, dans le bon ordre ».',
    );
    expect(validerProcedure({ etapes: Array.from({ length: 8 }, (_, i) => `e${i}`) })).toMatch(
      /7 étapes au maximum/,
    );
  });
});
