import { describe, it, expect } from 'vitest';
import {
  COTES,
  POINTS,
  MOTS_MIN,
  motsNecessaires,
  cotesPossibles,
  trierMots,
  annoncePossible,
  creerPartie,
} from '../../jeux/bingo/logique.js';
import { schema, exemple } from '../../jeux/bingo/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Bingo', () => {
  it('propose une grille de 3 × 3 ou de 4 × 4 selon le nombre de mots', () => {
    expect(COTES).toEqual([3, 4]);
    expect(POINTS).toEqual({ ligne: 1, bingo: 3 });
    expect(motsNecessaires(3)).toBe(12);
    expect(motsNecessaires(4)).toBe(19);
    expect(MOTS_MIN).toBe(12);
    expect(cotesPossibles(11)).toEqual([]);
    expect(cotesPossibles(12)).toEqual([3]);
    expect(cotesPossibles(20)).toEqual([3, 4]);
  });

  it('trie les mots par ordre alphabétique, sans tenir compte des accents ni des majuscules', () => {
    expect(trierMots(['souris', 'Écran', 'clavier', 'Arobase', 'écouteur'])).toEqual([
      'Arobase',
      'clavier',
      'écouteur',
      'Écran',
      'souris',
    ]);
  });

  it('n’accepte une annonce qu’avec assez de mots tirés', () => {
    expect(annoncePossible('ligne', 2, 3)).toBe(false);
    expect(annoncePossible('ligne', 3, 3)).toBe(true);
    expect(annoncePossible('bingo', 8, 3)).toBe(false);
    expect(annoncePossible('bingo', 9, 3)).toBe(true);
    expect(annoncePossible('ligne', 3, 4)).toBe(false);
  });

  it('tire chaque mot une seule fois, dans un ordre reproductible', () => {
    const partie = creerPartie(12, creerHasard(4));
    const tires = [];
    for (let i = 0; i < 12; i++) tires.push(partie.tirer());
    expect([...tires].sort((a, b) => a - b)).toEqual([...Array(12).keys()]);
    expect(partie.tirer()).toBeNull();
    expect(partie.restants).toBe(0);
    expect(partie.tires).toEqual(tires);
    expect(partie.dernier).toBe(tires[11]);

    const memeGraine = creerPartie(12, creerHasard(4));
    expect(memeGraine.dernier).toBeNull();
    expect(memeGraine.tirer()).toBe(tires[0]);
  });

  it('joue la ligne, puis la grille pleine, puis s’arrête', () => {
    const partie = creerPartie(12, creerHasard(1));
    partie.tirer();
    expect(partie.objectif).toBe('ligne');
    expect(partie.valider('bingo')).toBe(false);
    expect(partie.valider('ligne')).toBe(true);
    expect(partie.objectif).toBe('bingo');
    expect(partie.valider('ligne')).toBe(false);
    expect(partie.valider('bingo')).toBe(true);
    expect(partie.objectif).toBe('fini');
    expect(partie.tirer()).toBeNull();
  });

  it('a un exemple valide, assez long pour une grille de 4 × 4', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, exemple).elements).toEqual(exemple.elements);
    expect(cotesPossibles(exemple.elements.length)).toEqual([3, 4]);
    const mots = exemple.elements.map((e) => e.mot.toLowerCase());
    expect(new Set(mots).size).toBe(mots.length);
  });
});
