/**
 * Bloc « Scores » de la page « Le groupe » : le classement tous jeux confondus (des équipes, s'il
 * y en a, puis des participants), le détail par jeu, la correction d'un score (− et +, ou le
 * total tapé) et la remise à zéro. Les points viennent des jeux (cadre-jeu.js) et passent par
 * groupe.js (scores-groupe.js, equipes.js).
 */
import { JEUX } from '../jeux.js';
import {
  CLE_SCORES,
  CORRECTION,
  POINTS_MAX,
  classementGroupe,
  detailDe,
  scoresVides,
} from './scores-groupe.js';
import { CLE_SCORES_EQUIPES, classementEquipes } from './equipes.js';
import { ecouterStockage } from './stockage.js';
import { confirmer } from './dialogues.js';
import { el, remplir, icone, annoncer } from './ui.js';

const TITRES = Object.fromEntries(JEUX.map((jeu) => [jeu.slug, jeu.titre]));

/** « 3 », « −2 » (vrai signe moins) ; `plus` : « +3 » pour une correction. */
function nombreSigne(n, plus = false) {
  if (n < 0) return `−${Math.abs(n)}`;
  return plus ? `+${n}` : String(n);
}

/** Le détail, jeu par jeu : [« Motus numérique : 3 », « Correction : +1 »]. */
export function morceauxDetail(detail) {
  return detail.map(({ source, points }) =>
    source === CORRECTION
      ? `Correction :\u00a0${nombreSigne(points, true)}`
      : `${TITRES[source] ?? source} :\u00a0${nombreSigne(points)}`,
  );
}

/**
 * « Motus numérique : 3 · Correction : +1 », ou « Pas encore de point ». Chaque jeu reste d'un
 * bloc (« Le Coffre-fort : 25 » ne se coupe pas au tiret) : la ligne ne passe à la ligne
 * qu'après un « · ».
 */
function detailAffiche(detail) {
  if (!detail.length) return 'Pas encore de point';
  return morceauxDetail(detail).map((morceau, i) => [
    i ? '\u00a0· ' : null,
    el('span', { class: 'scores-groupe__morceau' }, morceau),
  ]);
}

export function creerBlocScores(groupe) {
  const liste = el('ol', { class: 'scores-groupe', 'aria-label': 'Scores du groupe' });
  const listeEquipes = el('ol', {
    class: 'scores-groupe scores-groupe--equipes',
    'aria-label': 'Scores des équipes',
  });
  const titreEquipes = el('h4', { class: 'bloc-scores__sous-titre' }, 'Équipes');
  const titreParticipants = el('h4', { class: 'bloc-scores__sous-titre' }, 'Participants');
  const etat = el('p', { class: 'bloc-scores__etat' });
  const boutonZero = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret',
      onclick: async () => {
        if (
          await confirmer({
            titre: 'Remettre les scores à zéro ?',
            message:
              'Les points de tous les jeux seront effacés, pour tout le groupe et les équipes.',
            oui: 'Remettre à zéro',
          })
        ) {
          groupe.reinitialiserScores();
          annoncer('Scores remis à zéro');
        }
      },
    },
    icone('rotate-left'),
    'Remettre les scores à zéro',
  );

  /**
   * Une ligne du classement. `nom` : le prénom ou le nom de l'équipe (`qui`, pour les boutons :
   * « l’équipe Les Bleus ») ; `repere` : ce qui retrouve ses boutons après un nouveau dessin (le
   * prénom, ou « equipe:e1 ») ; `fixer(total)` corrige son score.
   */
  function ligne({ nom, qui = nom, repere, points, rang, detail, absente = false, fixer }) {
    const champ = el('input', {
      type: 'number',
      class: 'champ__controle scores-groupe__total',
      value: String(points),
      min: -POINTS_MAX,
      max: POINTS_MAX,
      step: 1,
      inputmode: 'numeric',
      'aria-label': `Score de ${qui}`,
      dataset: { score: repere },
      onchange: (e) => {
        const saisie = e.target.value.trim();
        if (saisie === '' || !Number.isFinite(Number(saisie))) {
          e.target.value = String(points);
          return;
        }
        fixer(Number(saisie));
      },
    });
    const tete = points > 0 && rang === 1;
    return el(
      'li',
      {
        class: `scores-groupe__ligne${tete ? ' scores-groupe__ligne--tete' : ''}${absente ? ' scores-groupe__ligne--absente' : ''}`,
      },
      el('span', { class: 'scores-groupe__rang' }, `${rang}.`),
      el(
        'span',
        { class: 'scores-groupe__qui' },
        el('span', { class: 'scores-groupe__prenom' }, nom),
        el('span', { class: 'scores-groupe__detail' }, detailAffiche(detail)),
      ),
      el(
        'span',
        { class: 'scores-groupe__commandes' },
        el(
          'button',
          {
            type: 'button',
            class: 'scores-groupe__bouton',
            'aria-label': `Un point de moins pour ${qui}`,
            dataset: { moins: repere },
            onclick: () => fixer(points - 1),
          },
          icone('minus'),
        ),
        champ,
        el(
          'button',
          {
            type: 'button',
            class: 'scores-groupe__bouton',
            'aria-label': `Un point de plus pour ${qui}`,
            dataset: { plus: repere },
            onclick: () => fixer(points + 1),
          },
          icone('plus'),
        ),
      ),
    );
  }

  function dessiner() {
    // Le focus reste sur le même bouton (ou le même champ) après le nouveau classement
    const actif =
      liste.contains(document.activeElement) || listeEquipes.contains(document.activeElement)
        ? document.activeElement
        : null;
    const cible = actif
      ? ['moins', 'plus', 'score'].find((cle) => actif.dataset[cle] !== undefined)
      : null;
    const qui = cible ? actif.dataset[cible] : null;

    const { participants, equipes } = groupe;
    remplir(
      liste,
      classementGroupe(groupe.scores, participants).map(({ prenom, points, rang }) =>
        ligne({
          nom: prenom,
          repere: prenom,
          points,
          rang,
          detail: detailDe(groupe.scores, prenom),
          absente: groupe.estAbsent(prenom),
          fixer: (total) => groupe.fixerTotal(prenom, total),
        }),
      ),
    );
    liste.hidden = participants.length === 0;
    remplir(
      listeEquipes,
      classementEquipes(groupe.scoresEquipes, equipes).map(({ id, nom, points, rang }) =>
        ligne({
          nom,
          qui: `l’équipe ${nom}`,
          repere: `equipe:${id}`,
          points,
          rang,
          detail: detailDe(groupe.scoresEquipes, id),
          fixer: (total) => groupe.fixerTotalEquipe(id, total),
        }),
      ),
    );
    // Avec des équipes, deux classements : celui des équipes, puis celui des participants
    const avecEquipes = equipes.length > 0 && participants.length > 0;
    listeEquipes.hidden = !avecEquipes;
    titreEquipes.hidden = !avecEquipes;
    titreParticipants.hidden = !avecEquipes;
    let texte = '';
    if (!participants.length) texte = 'Ajoutez des prénoms pour suivre leurs scores.';
    else if (scoresVides(groupe.scores) && scoresVides(groupe.scoresEquipes)) {
      texte = 'Pas encore de point : ils s’ajoutent ici à chaque partie.';
    }
    remplir(etat, texte);
    etat.hidden = !texte;
    boutonZero.hidden = scoresVides(groupe.scores) && scoresVides(groupe.scoresEquipes);

    if (cible) {
      const valeur = CSS.escape(qui);
      const zone = qui.startsWith('equipe:') ? listeEquipes : liste;
      zone.querySelector(`[data-${cible}="${valeur}"]`)?.focus();
    }
  }

  groupe.surChangement(dessiner);
  groupe.surChangementScores(dessiner);
  // Un jeu ouvert dans un autre onglet ajoute des points : le classement suit
  ecouterStockage(CLE_SCORES, () => groupe.rechargerScores());
  ecouterStockage(CLE_SCORES_EQUIPES, () => groupe.rechargerScores());
  dessiner();

  return el(
    'section',
    { id: 'bloc-scores', class: 'carte bloc-scores', 'aria-labelledby': 'titre-scores' },
    el(
      'div',
      { class: 'ecran__entete' },
      el('h3', { id: 'titre-scores' }, icone('ranking-star'), 'Scores'),
      boutonZero,
    ),
    el(
      'p',
      { class: 'champ__aide' },
      'Les points gagnés dans tous les jeux s’additionnent ici, d’un jeu à l’autre et d’un jour à l’autre, jusqu’à la remise à zéro. Corrigez un score avec − et +, ou tapez le nouveau total.',
    ),
    etat,
    titreEquipes,
    listeEquipes,
    titreParticipants,
    liste,
  );
}
