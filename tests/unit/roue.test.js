import { describe, it, expect } from 'vitest';
import {
  creerTirage,
  angleFinal,
  segmentSousPointeur,
  couleursRoue,
} from '../../assets/js/commun/roue.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

describe('tirage équitable', () => {
  it('fait passer chacun une fois avant de recommencer', () => {
    const prenoms = ['Ana', 'Bob', 'Chloé', 'Dan'];
    const tirage = creerTirage(prenoms, { hasard: creerHasard(5) });
    const premierTour = Array.from({ length: 4 }, () => prenoms[tirage.tirer()]);
    expect([...premierTour].sort()).toEqual([...prenoms].sort());
    const deuxiemeTour = Array.from({ length: 4 }, () => prenoms[tirage.tirer()]);
    expect([...deuxiemeTour].sort()).toEqual([...prenoms].sort());
    // pas deux fois de suite la même personne au changement de tour
    expect(deuxiemeTour[0]).not.toBe(premierTour[3]);
  });

  it('en mode libre, évite seulement de retirer la même personne deux fois de suite', () => {
    const tirage = creerTirage(['A', 'B'], { equitable: false, hasard: creerHasard(9) });
    let precedent = tirage.tirer();
    for (let i = 0; i < 20; i++) {
      const suivant = tirage.tirer();
      expect(suivant).not.toBe(precedent);
      precedent = suivant;
    }
  });

  it('renvoie -1 sans participants et suit les changements de liste', () => {
    const tirage = creerTirage([]);
    expect(tirage.tirer()).toBe(-1);
    tirage.mettreAJour(['Zoé']);
    expect(tirage.tirer()).toBe(0);
  });

  it('ajoute les nouveaux prénoms au tour en cours', () => {
    const tirage = creerTirage(['A', 'B'], { hasard: creerHasard(2) });
    tirage.tirer();
    tirage.mettreAJour(['A', 'B', 'C']);
    expect(tirage.restants()).toContain('C');
    expect(tirage.restants()).toHaveLength(2);
  });
});

describe('angle de la roue', () => {
  it('arrête le pointeur sur le segment demandé', () => {
    const hasard = creerHasard(11);
    for (const nombre of [2, 3, 5, 8, 13]) {
      let angle = 0;
      for (let index = 0; index < nombre; index++) {
        angle = angleFinal(index, nombre, { angleActuel: angle, hasard });
        expect(segmentSousPointeur(angle, nombre)).toBe(index);
      }
    }
  });

  it('tourne toujours vers l’avant', () => {
    const angle1 = angleFinal(3, 6, { angleActuel: 0 });
    const angle2 = angleFinal(1, 6, { angleActuel: angle1 });
    expect(angle2).toBeGreaterThan(angle1 + 360 * 5);
  });
});

describe('couleurs de la roue', () => {
  it('ne met jamais la même couleur côte à côte, y compris entre le dernier et le premier', () => {
    for (let n = 2; n <= 30; n++) {
      const couleurs = couleursRoue(n);
      for (let i = 0; i < n; i++) {
        expect(couleurs[i]).not.toBe(couleurs[(i + 1) % n]);
      }
    }
  });
});
