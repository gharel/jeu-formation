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
 * `surAjout(prenoms, n)` (facultatif) : les points gagnés partent aussi dans le score du groupe,
 * gardé d'un jeu à l'autre (scores-groupe.js). `equipes` : les équipes en jeu ({ id, nom }), qui
 * ont leurs propres points ; `surAjoutEquipes(ids, n)` les reporte dans le score des équipes.
 */
export function creerScores(
  participants = [],
  { equipes = [], surChangement, surAjout, surAjoutEquipes } = {},
) {
  const points = new Map(participants.map((p) => [p, 0]));
  const pointsEquipes = new Map(equipes.map((e) => [e.id, 0]));
  const noms = new Map(equipes.map((e) => [e.id, e.nom]));

  /**
   * Les gagnants d'un coup : `prenoms` (une personne, plusieurs, toute la salle) et `equipes`
   * (identifiants des équipes choisies, dont les membres sont aussi dans `prenoms`). Un seul
   * enregistrement et un seul dessin du tableau, au lieu d'un par personne.
   */
  function ajouterGagnants({ prenoms = [], equipes: ids = [] }, n = 1) {
    const connues = ids.filter((id) => pointsEquipes.has(id));
    if (!prenoms.length && !connues.length) return;
    for (const prenom of prenoms) points.set(prenom, (points.get(prenom) ?? 0) + n);
    for (const id of connues) pointsEquipes.set(id, pointsEquipes.get(id) + n);
    if (prenoms.length) surAjout?.(prenoms, n);
    if (connues.length) surAjoutEquipes?.(connues, n);
    surChangement?.();
  }

  return {
    ajouter: (prenom, n = 1) => ajouterGagnants({ prenoms: [prenom] }, n),
    /** Les mêmes points à plusieurs personnes (les survivants, toute la salle…). */
    ajouterATous: (prenoms, n = 1) => ajouterGagnants({ prenoms }, n),
    ajouterGagnants,
    valeur(prenom) {
      return points.get(prenom) ?? 0;
    },
    valeurEquipe(id) {
      return pointsEquipes.get(id) ?? 0;
    },
    classement() {
      return classer([...points].map(([prenom, p]) => ({ prenom, points: p })));
    },
    /** Classement des équipes de la partie : [{ id, nom, points, rang }]. */
    classementEquipes() {
      return classer([...pointsEquipes].map(([id, p]) => ({ prenom: id, points: p }))).map(
        ({ prenom: id, points: p, rang }) => ({ id, nom: noms.get(id), points: p, rang }),
      );
    },
    reinitialiser() {
      for (const prenom of points.keys()) points.set(prenom, 0);
      for (const id of pointsEquipes.keys()) pointsEquipes.set(id, 0);
      surChangement?.();
    },
  };
}
