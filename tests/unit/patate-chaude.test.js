import { describe, it, expect } from 'vitest';
import {
  MECHES,
  OPTIONS_MECHE,
  meche,
  tirerDuree,
  chaleur,
  niveauDeChaleur,
  intervalleTic,
  premierPorteur,
  gagnantsDeLaManche,
  creerManche,
} from '../../jeux/patate-chaude/logique.js';
import { schema, exemple } from '../../jeux/patate-chaude/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('Patate chaude', () => {
  it('propose trois mèches, moyenne par défaut', () => {
    expect(OPTIONS_MECHE.map((o) => o.valeur)).toEqual(['courte', 'moyenne', 'longue']);
    expect(meche('inconnue')).toBe(MECHES.moyenne);
  });

  it('tire une durée cachée dans l’intervalle de la mèche', () => {
    const hasard = creerHasard(7);
    for (const valeur of Object.keys(MECHES)) {
      const { min, max } = MECHES[valeur];
      for (let i = 0; i < 50; i++) {
        const duree = tirerDuree(valeur, hasard);
        expect(duree).toBeGreaterThanOrEqual(min * 1000);
        expect(duree).toBeLessThanOrEqual(max * 1000);
        expect(duree % 100).toBe(0);
      }
    }
    expect(tirerDuree('courte', () => 0)).toBe(10000);
    expect(tirerDuree('courte', () => 0.9999)).toBe(25000);
  });

  it('chauffe d’après la mèche la plus longue, sans dépasser 1', () => {
    expect(chaleur(0, 'moyenne')).toBe(0);
    expect(chaleur(22500, 'moyenne')).toBe(0.5);
    expect(chaleur(90000, 'moyenne')).toBe(1);
    expect(chaleur(-5, 'courte')).toBe(0);
    expect([0, 0.24, 0.25, 0.5, 0.99, 1].map(niveauDeChaleur)).toEqual([1, 1, 2, 3, 4, 4]);
  });

  it('accélère le tic-tac quand la patate chauffe', () => {
    expect(intervalleTic(0)).toBe(700);
    expect(intervalleTic(1)).toBe(200);
    expect(intervalleTic(0.5)).toBeLessThan(intervalleTic(0.2));
    expect(intervalleTic(3)).toBe(200);
  });

  it('fait lancer la patate par la personne brûlée, sinon au hasard', () => {
    const joueurs = ['Ana', 'Bob', 'Chloé'];
    expect(premierPorteur(joueurs, 'Bob')).toBe('Bob');
    expect(premierPorteur(joueurs, null, () => 0.99)).toBe('Chloé');
    expect(premierPorteur(joueurs, 'Absent', () => 0)).toBe('Ana');
    expect(premierPorteur([], 'Bob')).toBeNull();
  });

  it('donne le point à tous les autres quand la patate brûle', () => {
    const joueurs = ['Ana', 'Bob', 'Chloé'];
    expect(gagnantsDeLaManche(joueurs, 'Bob')).toEqual(['Ana', 'Chloé']);
    expect(gagnantsDeLaManche(joueurs, null)).toEqual([]);
  });

  it('enchaîne les phases d’une manche et compte les passes', () => {
    const manche = creerManche();
    expect(manche.phase).toBe('prete');
    expect(manche.passer()).toBe(false);
    expect(manche.bruler()).toBe(false);
    expect(manche.lancer()).toBe(true);
    expect(manche.lancer()).toBe(false);
    expect(manche.passer()).toBe(true);
    expect(manche.passer()).toBe(true);
    expect(manche.pause()).toBe(true);
    // En pause, la patate ne passe pas et ne brûle pas
    expect(manche.passer()).toBe(false);
    expect(manche.bruler()).toBe(false);
    expect(manche.reprendre()).toBe(true);
    expect(manche.bruler()).toBe(true);
    expect(manche.phase).toBe('brulee');
    expect(manche.passes).toBe(2);
    expect(manche.passer()).toBe(false);
  });

  it('a un exemple valide', () => {
    expect(validerContenu(schema, nettoyerContenu(schema, exemple))).toEqual([]);
    expect(nettoyerContenu(schema, exemple)).toEqual(exemple);
  });
});
