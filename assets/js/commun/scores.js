/**
 * Points de la partie, par prénom et par équipe, selon le mode de jeu (mode-jeu.js).
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

const sansDoublon = (liste) => [...new Set(liste)];

/**
 * `surAjout(prenoms, n)` (facultatif) : les points gagnés partent aussi dans le score du groupe,
 * gardé d'un jeu à l'autre (scores-groupe.js). `equipes` : les équipes en jeu ({ id, nom,
 * membres }), qui ont leurs propres points ; `surAjoutEquipes(ids, n)` les reporte dans le score
 * des équipes.
 *
 * `mode` (voir mode-jeu.js) dit qui marque à chaque coup :
 * - `individuel` : les personnes seulement (une équipe choisie compte comme ses membres) ;
 * - `equipes` : les équipes seulement ; une personne qui marque fait marquer son équipe ;
 * - `mixte` : les personnes, et l'équipe de chacune.
 * Une équipe marque une fois par coup, même si plusieurs de ses membres marquent.
 */
export function creerScores(
  participants = [],
  { equipes = [], mode = 'mixte', surChangement, surAjout, surAjoutEquipes } = {},
) {
  const enEquipes = mode !== 'individuel';
  const points = new Map(participants.map((p) => [p, 0]));
  const pointsEquipes = new Map(enEquipes ? equipes.map((e) => [e.id, 0]) : []);
  const noms = new Map(equipes.map((e) => [e.id, e.nom]));
  const membres = new Map(equipes.map((e) => [e.id, e.membres ?? []]));
  const equipeDe = new Map();
  for (const e of equipes) for (const m of e.membres ?? []) equipeDe.set(m, e.id);

  /** Qui marque vraiment, selon le mode : { prenoms, equipes }. */
  function repartir({ prenoms = [], equipes: ids = [] }) {
    const choisies = ids.filter((id) => membres.has(id));
    let personnes = sansDoublon(prenoms);
    if (!enEquipes) {
      personnes = sansDoublon([...personnes, ...choisies.flatMap((id) => membres.get(id))]);
      return { prenoms: personnes, equipes: [] };
    }
    const touchees = sansDoublon([
      ...choisies,
      ...personnes.map((p) => equipeDe.get(p)).filter(Boolean),
    ]).filter((id) => pointsEquipes.has(id));
    return { prenoms: mode === 'equipes' ? [] : personnes, equipes: touchees };
  }

  /** Un seul enregistrement et un seul dessin du tableau, au lieu d'un par personne. */
  function appliquer({ prenoms, equipes: ids }, n) {
    for (const prenom of prenoms) points.set(prenom, (points.get(prenom) ?? 0) + n);
    for (const id of ids) pointsEquipes.set(id, pointsEquipes.get(id) + n);
    if (prenoms.length) surAjout?.(prenoms, n);
    if (ids.length) surAjoutEquipes?.(ids, n);
    surChangement?.();
  }

  /**
   * Les gagnants d'un coup : `prenoms` (une personne, plusieurs, toute la salle) et `equipes`
   * (identifiants des équipes choisies). Renvoie le coup joué ({ prenoms, equipes, n }, à passer
   * à annuler()), ou null si personne ne marque.
   */
  function ajouterGagnants(gagnants, n = 1) {
    const coup = repartir(gagnants);
    if (!coup.prenoms.length && !coup.equipes.length) return null;
    appliquer(coup, n);
    return { ...coup, n };
  }

  return {
    mode,
    ajouter: (prenom, n = 1) => ajouterGagnants({ prenoms: [prenom] }, n),
    /** Les mêmes points à plusieurs personnes (les survivants, toute la salle…). */
    ajouterATous: (prenoms, n = 1) => ajouterGagnants({ prenoms }, n),
    ajouterGagnants,
    /** Retire les points d'un coup (une erreur de l'animateur). Renvoie true si c'est fait. */
    annuler(coup) {
      if (!coup || coup.annule) return false;
      appliquer(coup, -coup.n);
      coup.annule = true;
      return true;
    },
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
