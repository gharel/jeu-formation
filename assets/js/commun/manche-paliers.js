/**
 * Manche à paliers (Qui suis-je ?, Zoom mystère) : les chiffres 5 4 3 2 1 s'éteignent,
 * l'animateur appuie sur Stop quand quelqu'un répond, puis valide ou reprend. S'il doute, « Voir la
 * réponse » l'affiche : il valide alors la proposition, ou la manche s'arrête sans point.
 * Espace : Démarrer → Stop → Reprendre.
 */
import { el, remplir, icone, ecouterClavier } from './ui.js';
import { creerPaliers, creerAffichagePaliers } from './paliers.js';

/**
 * `surValeur(valeur)` : appelé au départ et à chaque chiffre perdu (le jeu montre un indice,
 * dézoome…). `surFin({ trouve, gagnants, points })` : la manche est finie, le jeu révèle la réponse
 * (`gagnants` : { prenoms, equipes }, qui a trouvé : une personne, plusieurs ou une équipe). `surReponse()` : le jeu affiche la réponse
 * pendant la pause, pour que l'animateur juge la proposition.
 * `surEtat(etat)` (facultatif) : 'attente', 'enCours', 'pause', 'revele' ou 'fini', à chaque changement
 * (l'illustration du jeu s'anime pendant que les chiffres s'éteignent).
 */
export function creerMancheAPaliers({
  ctx,
  dureePalier,
  nombre = 5,
  surValeur,
  surFin,
  surReponse,
  surEtat = null,
}) {
  const affichage = creerAffichagePaliers(nombre);
  const actions = el('div', { class: 'actions-jeu' });
  let etat = 'attente';
  let derniereSeconde = 0;

  const paliers = creerPaliers({
    nombre,
    dureePalier,
    surChangement(valeur) {
      affichage.afficher(valeur);
      if (valeur > 0) {
        ctx.sons.paliers.chiffre(valeur);
        surValeur(valeur);
      }
    },
    // Tic-tac discret à chaque seconde qui passe
    surTic(ecouleMs) {
      const seconde = Math.floor(ecouleMs / 1000);
      if (seconde > 0 && seconde !== derniereSeconde) ctx.sons.paliers.tictac(seconde % 2 === 0);
      derniereSeconde = seconde;
    },
    // Les sons une fois l'écran de réponse construit
    surFin: () => {
      finir({ trouve: false });
      ctx.sons.fin();
    },
  });

  function bouton(nomIcone, texte, classe, action) {
    return el(
      'button',
      { type: 'button', class: `bouton bouton--grand ${classe}`, onclick: action },
      icone(nomIcone),
      texte,
    );
  }

  function dessiner() {
    if (etat === 'attente') {
      remplir(actions, bouton('play', 'Démarrer', 'bouton--principal', demarrer));
    } else if (etat === 'enCours') {
      remplir(actions, bouton('hand', 'Stop ! Quelqu’un répond', 'bouton--sombre', stop));
    } else if (etat === 'pause') {
      remplir(
        actions,
        bouton('check', 'Bonne réponse', 'bouton--succes', bonne),
        bouton('eye', 'Voir la réponse', 'bouton--discret', voirReponse),
        bouton('xmark', 'Mauvaise réponse, on reprend', 'bouton--danger', reprendre),
      );
    } else if (etat === 'revele') {
      remplir(
        actions,
        bouton('check', 'Bonne réponse', 'bouton--succes', bonne),
        bouton('xmark', 'Mauvaise réponse', 'bouton--danger', mauvaise),
      );
    } else {
      remplir(actions);
    }
    surEtat?.(etat);
    // En pause, le focus va sur « reprendre » : Espace reprend toujours, comme annoncé.
    // Réponse affichée : on ne peut plus reprendre, le focus va sur « Bonne réponse ».
    const boutons = actions.querySelectorAll('button');
    (etat === 'revele' ? boutons[0] : boutons[boutons.length - 1])?.focus();
  }

  function demarrer() {
    etat = 'enCours';
    paliers.demarrer();
    dessiner();
  }

  function stop() {
    paliers.pause();
    etat = 'pause';
    ctx.sons.paliers.stop();
    ctx.annoncer(`Stop ! ${paliers.valeur} points en jeu.`);
    dessiner();
  }

  // La réponse s'affiche : la proposition se juge, on ne reprend plus (tout le monde l'a vue)
  function voirReponse() {
    if (etat !== 'pause') return;
    etat = 'revele';
    surReponse();
    dessiner();
  }

  function mauvaise() {
    finir({ trouve: false });
    ctx.sons.paliers.mauvaise();
  }

  function reprendre() {
    etat = 'enCours';
    ctx.sons.paliers.mauvaise();
    paliers.reprendre();
    dessiner();
  }

  async function bonne() {
    const points = paliers.valeur;
    let gagnants = { prenoms: [], equipes: [] };
    if (ctx.participants.length) {
      gagnants = await ctx.choisirGagnants({
        titre: `Qui a trouvé ? (${points} point${points > 1 ? 's' : ''})`,
        libelleAucun: 'Annuler',
        plusieurs: true,
      });
      if (!gagnants.prenoms.length) return;
      ctx.scores.ajouterGagnants(gagnants, points);
    }
    finir({ trouve: true, gagnants, points });
    ctx.sons.paliers.bonne(points);
  }

  // Temps écoulé : les paliers ont déjà affiché 0 (surChangement)
  function finir(resultat) {
    if (etat === 'fini') return;
    etat = 'fini';
    paliers.arreter();
    dessiner();
    surFin(resultat);
  }

  const retirerClavier = ecouterClavier({
    Espace: () => {
      if (etat === 'attente') demarrer();
      else if (etat === 'enCours') stop();
      else if (etat === 'pause') reprendre();
    },
  });

  affichage.afficher(nombre);
  dessiner();
  surValeur(nombre);

  return {
    paliers: affichage.element,
    actions,
    detruire() {
      paliers.arreter();
      retirerClavier();
    },
  };
}
