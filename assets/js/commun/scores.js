/**
 * Points de la partie, par prénom.
 */

/** Classement : points décroissants, ex æquo au même rang (1, 1, 3…), ordre de saisie conservé. */
export function classer(entrees) {
  const tries = entrees
    .map((e, ordre) => ({ ...e, ordre }))
    .sort((a, b) => b.points - a.points || a.ordre - b.ordre);
  let rang = 0;
  let precedent = null;
  return tries.map((e, i) => {
    if (e.points !== precedent) {
      rang = i + 1;
      precedent = e.points;
    }
    return { prenom: e.prenom, points: e.points, rang };
  });
}

/**
 * `surAjout(prenom, n)` (facultatif) : chaque point gagné part aussi dans le score du groupe,
 * gardé d'un jeu à l'autre (scores-groupe.js).
 */
export function creerScores(participants = [], { surChangement, surAjout } = {}) {
  const points = new Map(participants.map((p) => [p, 0]));
  return {
    ajouter(prenom, n = 1) {
      if (!points.has(prenom)) points.set(prenom, 0);
      points.set(prenom, points.get(prenom) + n);
      surAjout?.(prenom, n);
      surChangement?.();
    },
    valeur(prenom) {
      return points.get(prenom) ?? 0;
    },
    classement() {
      return classer([...points].map(([prenom, p]) => ({ prenom, points: p })));
    },
    get vide() {
      return points.size === 0;
    },
    reinitialiser() {
      for (const prenom of points.keys()) points.set(prenom, 0);
      surChangement?.();
    },
  };
}
