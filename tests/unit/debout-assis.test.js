import { describe, it, expect } from 'vitest';
import {
  consigne,
  legende,
  appliquerEliminations,
  gagnant,
} from '../../jeux/debout-assis/logique.js';
import { schema, exemple } from '../../jeux/debout-assis/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';

describe('Debout ou assis ?', () => {
  it('donne la consigne debout ou main levée', () => {
    expect(legende('debout')).toBe('Debout = VRAI · Assis = FAUX');
    expect(legende('main')).toBe('Main levée = VRAI · Main baissée = FAUX');
    expect(consigne('inconnue')).toBe(consigne('debout'));
  });

  it('élimine ceux qui se sont trompés', () => {
    expect(appliquerEliminations(['A', 'B', 'C'], ['B'])).toEqual({
      enJeu: ['A', 'C'],
      tousElimines: false,
    });
  });

  it('n’élimine personne si tout le monde s’est trompé', () => {
    expect(appliquerEliminations(['A', 'B'], ['A', 'B'])).toEqual({
      enJeu: ['A', 'B'],
      tousElimines: true,
    });
  });

  it('désigne le dernier en jeu', () => {
    expect(gagnant(['A'])).toBe('A');
    expect(gagnant(['A', 'B'])).toBeNull();
  });

  it('a un exemple valide, 10 secondes et le mode survie désactivé par défaut', () => {
    const contenu = nettoyerContenu(schema, exemple);
    expect(validerContenu(schema, contenu)).toEqual([]);
    const defaut = nettoyerContenu(schema, {});
    expect(defaut.reglages).toEqual({ duree: 10, consigne: 'debout', survie: false });
  });
});
