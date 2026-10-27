import { describe, it, expect } from 'vitest';
import {
  choisirElements,
  valeursEquitables,
  valeurProposee,
  valeurLaPlusProche,
  planBinomes,
  planBinomesParEquipe,
  bilanPassages,
} from '../../assets/js/commun/passages.js';
import { creerHasard } from '../../assets/js/commun/hasard.js';

const cle = ([a, b]) => [a, b].sort().join('|');

/** Combien de fois chaque joueur passe dans un plan de binômes. */
function passages(plan, joueurs) {
  const compte = Object.fromEntries(joueurs.map((j) => [j, 0]));
  for (const binome of plan) for (const j of binome) compte[j] += 1;
  return compte;
}

describe('choisirElements', () => {
  const elements = Array.from({ length: 10 }, (_, i) => ({ n: i }));

  it('tire n éléments au hasard en gardant l’ordre d’origine', () => {
    for (let graine = 1; graine <= 20; graine++) {
      const choix = choisirElements(elements, 4, creerHasard(graine));
      expect(choix).toHaveLength(4);
      expect(new Set(choix.map((e) => e.n)).size).toBe(4);
      const numeros = choix.map((e) => e.n);
      expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    }
  });

  it('rend toujours les mêmes éléments pour une même graine', () => {
    const a = choisirElements(elements, 5, creerHasard(7));
    const b = choisirElements(elements, 5, creerHasard(7));
    expect(a).toEqual(b);
    const autres = Array.from({ length: 30 }, (_, g) =>
      choisirElements(elements, 5, creerHasard(g))
        .map((e) => e.n)
        .join(),
    );
    expect(new Set(autres).size).toBeGreaterThan(1);
  });

  it('garde tous les éléments sans nombre, à zéro ou au-delà du contenu', () => {
    for (const n of [null, undefined, 0, -2, 10, 11, 99]) {
      expect(choisirElements(elements, n, creerHasard(1))).toEqual(elements);
    }
  });

  it('ne modifie pas la liste d’origine et en rend une copie', () => {
    const copie = [...elements];
    const choix = choisirElements(elements, 10, creerHasard(1));
    expect(elements).toEqual(copie);
    expect(choix).not.toBe(elements);
    expect(choisirElements([], 3, creerHasard(1))).toEqual([]);
  });
});

describe('valeursEquitables', () => {
  it('chacun pour soi : les multiples du nombre de joueurs', () => {
    expect(valeursEquitables({ tour: 'individuel', joueurs: 3, min: 1, max: 10 })).toEqual([
      3, 6, 9,
    ]);
    expect(valeursEquitables({ tour: 'individuel', joueurs: 4, min: 5, max: 5 })).toEqual([]);
    expect(valeursEquitables({ tour: 'individuel', joueurs: 5, min: 1, max: 5 })).toEqual([5]);
  });

  it('ne contraint rien avec un seul joueur, sans joueur ou plus de joueurs que d’éléments', () => {
    expect(valeursEquitables({ tour: 'individuel', joueurs: 1, min: 1, max: 10 })).toEqual([]);
    expect(valeursEquitables({ tour: 'individuel', joueurs: 0, min: 1, max: 10 })).toEqual([]);
    expect(valeursEquitables({ tour: 'individuel', joueurs: 12, min: 1, max: 10 })).toEqual([]);
  });

  it('respecte le minimum', () => {
    expect(valeursEquitables({ tour: 'individuel', joueurs: 2, min: 3, max: 9 })).toEqual([
      4, 6, 8,
    ]);
  });

  it('en équipes : chaque équipe passe autant, et chacun dans son équipe quand c’est possible', () => {
    // Deux équipes de deux : 4 éléments suffisent pour que chacun passe une fois
    expect(
      valeursEquitables({ tour: 'individuel', joueurs: 4, equipes: [2, 2], min: 1, max: 10 }),
    ).toEqual([4, 8]);
    // Équipes inégales : à défaut, autant de passages par équipe
    expect(
      valeursEquitables({ tour: 'individuel', joueurs: 5, equipes: [2, 3], min: 1, max: 10 }),
    ).toEqual([2, 4, 6, 8, 10]);
    // Des équipes données avec leurs membres
    expect(
      valeursEquitables({
        tour: 'individuel',
        joueurs: 6,
        equipes: [{ membres: ['a', 'b', 'c'] }, { membres: ['d', 'e', 'f'] }],
        min: 1,
        max: 20,
      }),
    ).toEqual([6, 12, 18]);
  });

  it('binôme : B binômes pour que chacun passe autant de fois (k pair si n impair)', () => {
    // 4 joueurs : 2 binômes, chacun passe une fois
    expect(valeursEquitables({ tour: 'binome', joueurs: 4, parTour: 1, min: 1, max: 10 })).toEqual([
      2, 4, 6, 8, 10,
    ]);
    // 7 joueurs : 7 binômes, chacun passe deux fois
    expect(valeursEquitables({ tour: 'binome', joueurs: 7, parTour: 1, min: 1, max: 20 })).toEqual([
      7, 14,
    ]);
    // 2 joueurs : un seul binôme possible
    expect(valeursEquitables({ tour: 'binome', joueurs: 2, parTour: 1, min: 1, max: 4 })).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('binôme : le nombre d’éléments avance par pas de `parTour`', () => {
    expect(valeursEquitables({ tour: 'binome', joueurs: 3, parTour: 2, min: 1, max: 40 })).toEqual([
      6, 12, 18, 24, 30, 36,
    ]);
    expect(valeursEquitables({ tour: 'binome', joueurs: 7, parTour: 2, min: 1, max: 10 })).toEqual(
      [],
    );
    expect(valeursEquitables({ tour: 'binome', joueurs: 4, parTour: 3, min: 1, max: 20 })).toEqual([
      6, 12, 18,
    ]);
  });

  it('binôme en équipes : même nombre de binômes par équipe, chacun autant dans son équipe', () => {
    // Deux équipes de 4 : 2 binômes par équipe, donc 4 binômes
    expect(
      valeursEquitables({
        tour: 'binome',
        joueurs: 8,
        equipes: [4, 4],
        parTour: 1,
        min: 1,
        max: 20,
      }),
    ).toEqual([4, 8, 12, 16, 20]);
    // Deux équipes de 3 : 3 binômes par équipe
    expect(
      valeursEquitables({
        tour: 'binome',
        joueurs: 6,
        equipes: [3, 3],
        parTour: 2,
        min: 1,
        max: 40,
      }),
    ).toEqual([12, 24, 36]);
    // Équipes de 3 et 5 : trop de binômes pour que chacun passe autant ; à défaut, même nombre
    // de binômes par équipe
    expect(
      valeursEquitables({
        tour: 'binome',
        joueurs: 8,
        equipes: [3, 5],
        parTour: 1,
        min: 1,
        max: 9,
      }),
    ).toEqual([2, 4, 6, 8]);
  });

  it('binôme en équipes : une équipe d’un seul joueur ne forme pas de binôme', () => {
    expect(
      valeursEquitables({
        tour: 'binome',
        joueurs: 5,
        equipes: [4, 1],
        parTour: 1,
        min: 1,
        max: 9,
      }),
    ).toEqual([2, 4, 6, 8]);
  });

  it('collectif : aucune contrainte', () => {
    expect(valeursEquitables({ tour: 'collectif', joueurs: 5, min: 1, max: 10 })).toEqual([]);
    expect(valeursEquitables({ joueurs: 5, min: 1, max: 10 })).toEqual([]);
  });
});

describe('valeurProposee et valeurLaPlusProche', () => {
  it('propose la plus grande valeur équitable, sinon le maximum', () => {
    expect(valeurProposee([3, 6, 9], 10)).toBe(9);
    expect(valeurProposee([3, 6, 9], 7)).toBe(6);
    expect(valeurProposee([], 10)).toBe(10);
    expect(valeurProposee([14], 10)).toBe(10);
  });

  it('trouve la valeur équitable la plus proche (la plus petite à égalité)', () => {
    expect(valeurLaPlusProche([3, 6, 9], 5)).toBe(6);
    expect(valeurLaPlusProche([3, 6, 9], 4)).toBe(3);
    expect(valeurLaPlusProche([3, 6, 9], 7)).toBe(6);
    expect(valeurLaPlusProche([4, 8], 6)).toBe(4);
    expect(valeurLaPlusProche([], 6)).toBeNull();
  });
});

describe('planBinomes', () => {
  const noms = (n) => Array.from({ length: n }, (_, i) => `J${i + 1}`);

  it('ne forme aucun binôme avec moins de deux joueurs ou sans binôme demandé', () => {
    expect(planBinomes(['Ana'], 3, creerHasard(1))).toEqual([]);
    expect(planBinomes([], 3, creerHasard(1))).toEqual([]);
    expect(planBinomes(noms(4), 0, creerHasard(1))).toEqual([]);
  });

  it('7 joueurs, 7 binômes : chacun passe deux fois, jamais le même binôme', () => {
    const joueurs = noms(7);
    for (let graine = 1; graine <= 30; graine++) {
      const plan = planBinomes(joueurs, 7, creerHasard(graine));
      expect(plan).toHaveLength(7);
      expect(Object.values(passages(plan, joueurs))).toEqual(Array(7).fill(2));
      expect(new Set(plan.map(cle)).size).toBe(7);
      for (const [a, b] of plan) expect(a).not.toBe(b);
    }
  });

  it('chacun passe autant de fois (à un près), jamais deux fois de suite le même binôme', () => {
    for (let n = 2; n <= 9; n++) {
      const joueurs = noms(n);
      for (let nombre = 1; nombre <= 20; nombre++) {
        for (let graine = 1; graine <= 4; graine++) {
          const plan = planBinomes(joueurs, nombre, creerHasard(graine * 13 + n));
          expect(plan).toHaveLength(nombre);
          const compte = Object.values(passages(plan, joueurs));
          expect(
            Math.max(...compte) - Math.min(...compte),
            `${n} joueurs, ${nombre}`,
          ).toBeLessThanOrEqual(1);
          for (const [a, b] of plan) expect(a).not.toBe(b);
          if (n >= 3) {
            for (let i = 1; i < plan.length; i++) {
              expect(cle(plan[i]), `${n} joueurs, ${nombre}, binôme ${i}`).not.toBe(
                cle(plan[i - 1]),
              );
            }
          }
        }
      }
    }
  });

  it('n’en répète aucun tant qu’on peut l’éviter', () => {
    // 4 joueurs : 6 binômes possibles, 4 binômes demandés
    for (let graine = 1; graine <= 20; graine++) {
      const plan = planBinomes(noms(4), 4, creerHasard(graine));
      expect(new Set(plan.map(cle)).size).toBe(4);
    }
    // 5 joueurs : 10 binômes possibles, 5 demandés
    for (let graine = 1; graine <= 20; graine++) {
      expect(new Set(planBinomes(noms(5), 5, creerHasard(graine)).map(cle)).size).toBe(5);
    }
    // 8 joueurs : un tour complet (4 binômes), tous différents
    for (let graine = 1; graine <= 20; graine++) {
      expect(new Set(planBinomes(noms(8), 4, creerHasard(graine)).map(cle)).size).toBe(4);
    }
  });

  it('les joueurs alternent les deux places (premier rôle, puis second)', () => {
    const joueurs = noms(7);
    for (let graine = 1; graine <= 20; graine++) {
      const plan = planBinomes(joueurs, 7, creerHasard(graine));
      const premiers = Object.fromEntries(joueurs.map((j) => [j, 0]));
      for (const [a] of plan) premiers[a] += 1;
      expect(Object.values(premiers)).toEqual(Array(7).fill(1));
    }
    // Un même binôme répété : c'est chacun son tour de commencer
    const plan = planBinomes(['Ana', 'Bob'], 4, creerHasard(3));
    const premiers = plan.map(([a]) => a);
    expect(premiers.filter((p) => p === 'Ana')).toHaveLength(2);
    expect(premiers.filter((p) => p === 'Bob')).toHaveLength(2);
  });

  it('deux joueurs : toujours le même binôme, rôles alternés', () => {
    const plan = planBinomes(['Ana', 'Bob'], 3, creerHasard(1));
    expect(plan.map(cle)).toEqual(['Ana|Bob', 'Ana|Bob', 'Ana|Bob']);
    expect(plan[0][0]).not.toBe(plan[1][0]);
  });

  it('est reproductible avec la même graine, et varie avec une autre', () => {
    const joueurs = noms(6);
    expect(planBinomes(joueurs, 5, creerHasard(9))).toEqual(
      planBinomes(joueurs, 5, creerHasard(9)),
    );
    const differents = new Set(
      Array.from({ length: 30 }, (_, g) =>
        planBinomes(joueurs, 5, creerHasard(g + 1))
          .map(cle)
          .join(),
      ),
    );
    expect(differents.size).toBeGreaterThan(1);
  });

  it('ignore un prénom en double', () => {
    const plan = planBinomes(['Ana', 'Bob', 'Ana'], 2, creerHasard(1));
    for (const [a, b] of plan) expect(a).not.toBe(b);
  });
});

describe('planBinomesParEquipe', () => {
  const bleus = { id: 'e1', nom: 'Bleus', membres: ['Ana', 'Bob', 'Cléo', 'Dan'] };
  const rouges = { id: 'e2', nom: 'Rouges', membres: ['Eva', 'Fab', 'Gil', 'Hugo'] };
  const seul = { id: 'e3', nom: 'Seul', membres: ['Zoé'] };

  it('fait jouer les équipes d’au moins deux joueurs chacune leur tour', () => {
    const plan = planBinomesParEquipe([bleus, seul, rouges], 6, creerHasard(2));
    expect(plan.map((p) => p.equipe.id)).toEqual(['e1', 'e2', 'e1', 'e2', 'e1', 'e2']);
    for (const { equipe, binome } of plan) {
      for (const prenom of binome) expect(equipe.membres).toContain(prenom);
      expect(binome[0]).not.toBe(binome[1]);
    }
  });

  it('chacun passe autant de fois dans son équipe', () => {
    // 4 binômes par équipe : 8 places pour 4 joueurs, deux fois chacun
    const plan = planBinomesParEquipe([bleus, rouges], 8, creerHasard(5));
    const compte = passages(
      plan.map((p) => p.binome),
      [...bleus.membres, ...rouges.membres],
    );
    expect(Object.values(compte)).toEqual(Array(8).fill(2));
  });

  it('une seule équipe jouable joue tous les binômes ; aucune équipe, aucun plan', () => {
    expect(planBinomesParEquipe([bleus, seul], 3, creerHasard(1)).map((p) => p.equipe.id)).toEqual([
      'e1',
      'e1',
      'e1',
    ]);
    expect(planBinomesParEquipe([seul], 3, creerHasard(1))).toEqual([]);
    expect(planBinomesParEquipe([], 3, creerHasard(1))).toEqual([]);
  });
});

describe('bilanPassages', () => {
  it('chacun pour soi : qui passe une fois de moins', () => {
    const bilan = bilanPassages({
      tour: 'individuel',
      nombre: 5,
      ordre: ['Ana', 'Bob', 'Chloé'],
    });
    expect(bilan.equitable).toBe(false);
    expect(bilan.moins).toEqual(['Chloé']);
    expect(bilan.passages).toBe(2);
    expect(bilan.unites).toBe(5);
  });

  it('chacun pour soi : équitable quand tout le monde passe autant', () => {
    const bilan = bilanPassages({ tour: 'individuel', nombre: 6, ordre: ['Ana', 'Bob', 'Chloé'] });
    expect(bilan).toMatchObject({ equitable: true, passages: 2, moins: [] });
  });

  it('chacun pour soi, plus de joueurs que d’éléments : les derniers ne passent pas', () => {
    const bilan = bilanPassages({ tour: 'individuel', nombre: 2, ordre: ['Ana', 'Bob', 'Chloé'] });
    expect(bilan.equitable).toBe(false);
    expect(bilan.moins).toEqual(['Chloé']);
    expect(bilan.passages).toBe(1);
  });

  it('en équipes, chacun pour soi : des équipes qui passent autant sans que chacun passe autant', () => {
    const equipes = [{ membres: ['A1', 'A2'] }, { membres: ['B1', 'B2', 'B3'] }];
    const bilan = bilanPassages({
      tour: 'individuel',
      nombre: 4,
      ordre: ['A1', 'B1', 'A2', 'B2', 'A1', 'B3'],
      equipes,
    });
    expect(bilan.equitable).toBe(false);
    expect(bilan.parEquipe).toBe(true);
  });

  it('binôme : 7 binômes pour 7 joueurs, chacun passe deux fois', () => {
    const bilan = bilanPassages({ tour: 'binome', nombre: 7, parTour: 1, joueurs: 7 });
    expect(bilan).toMatchObject({ equitable: true, passages: 2, unites: 7, moins: 0 });
  });

  it('binôme : le nombre de binômes vient du nombre d’éléments et de `parTour`', () => {
    const bilan = bilanPassages({ tour: 'binome', nombre: 6, parTour: 2, joueurs: 3 });
    expect(bilan.unites).toBe(3);
    expect(bilan.equitable).toBe(true);
    expect(bilan.passages).toBe(2);
    // Un dernier binôme à un seul mot compte quand même
    expect(bilan.unites).toBe(
      bilanPassages({ tour: 'binome', nombre: 5, parTour: 2, joueurs: 3 }).unites,
    );
  });

  it('binôme qui ne tombe pas juste : combien passent une fois de moins', () => {
    // 5 binômes, 7 joueurs : 10 places, trois joueurs passent deux fois, quatre une fois
    const bilan = bilanPassages({ tour: 'binome', nombre: 5, parTour: 1, joueurs: 7 });
    expect(bilan.equitable).toBe(false);
    expect(bilan.moins).toBe(4);
    expect(bilan.passages).toBe(2);
  });

  it('binôme en équipes : chacun passe autant dans son équipe', () => {
    const equipes = [{ membres: ['a', 'b', 'c', 'd'] }, { membres: ['e', 'f', 'g', 'h'] }];
    const juste = bilanPassages({ tour: 'binome', nombre: 4, parTour: 1, joueurs: 8, equipes });
    expect(juste).toMatchObject({ equitable: true, parEquipe: true, passages: 1 });
    const bancal = bilanPassages({ tour: 'binome', nombre: 3, parTour: 1, joueurs: 8, equipes });
    expect(bancal.equitable).toBe(false);
    expect(bancal.parEquipe).toBe(false);
  });

  it('collectif : rien à équilibrer', () => {
    expect(bilanPassages({ tour: 'collectif', nombre: 4 })).toMatchObject({ equitable: true });
  });
});
