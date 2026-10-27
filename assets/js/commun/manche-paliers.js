/**
 * Manche à paliers (Qui suis-je ?, Zoom mystère) : rien n'est montré avant « Démarrer », puis les
 * chiffres 5 4 3 2 1 s'éteignent. L'animateur appuie sur Stop quand quelqu'un répond, puis valide ou
 * reprend. S'il doute, « Voir la réponse » l'affiche : il valide alors la proposition, ou la manche
 * s'arrête sans point. « Cacher la réponse », au même endroit, la retire aussitôt : on peut reprendre.
 * Clavier : Espace ou → avance (Démarrer → Stop → Reprendre ; réponse affichée : la cacher ; manche
 * finie : la suite), Entrée = Bonne réponse (qui a trouvé ?), Retour arrière = Mauvaise réponse
 * (en pause, on reprend). La ligne d'aide (`aide`) suit l'état.
 */
import { el, remplir, icone, ecouterClavier, aideTouches } from './ui.js';
import { creerPaliers, creerAffichagePaliers } from './paliers.js';

/**
 * `surValeur(valeur)` : appelé au démarrage, puis à chaque chiffre perdu (le jeu montre un indice,
 * dézoome…). `surFin({ trouve, gagnants, points })` : la manche est finie, le jeu révèle la réponse
 * (`gagnants` : { prenoms, equipes }, qui a trouvé : une personne, plusieurs ou une équipe).
 * `surReponse(visible)` : le jeu affiche la réponse pendant la pause, pour que l'animateur juge la
 * proposition (`true`), ou la cache de nouveau (`false`).
 * `surEtat(etat)` (facultatif) : 'attente', 'enCours', 'pause', 'revele' ou 'fini', à chaque changement
 * (l'illustration du jeu s'anime pendant que les chiffres s'éteignent).
 * `surSuivant()` (facultatif) : Espace ou → une fois la manche finie, comme le bouton de la suite.
 */
export function creerMancheAPaliers({
  ctx,
  dureePalier,
  nombre = 5,
  surValeur,
  surFin,
  surReponse,
  surEtat = null,
  surSuivant = null,
}) {
  const affichage = creerAffichagePaliers(nombre);
  // tabindex -1 : le focus reste là après un clic, jamais sur un bouton (Entrée y activerait ce
  // bouton au lieu de valider)
  const actions = el('div', { class: 'actions-jeu', tabindex: '-1' });
  const aide = el('p', { class: 'raccourci' });
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
        bouton('eye-slash', 'Cacher la réponse', 'bouton--discret', cacherReponse),
        bouton('xmark', 'Mauvaise réponse', 'bouton--danger', mauvaise),
      );
    } else {
      remplir(actions);
    }
    dessinerAide();
    surEtat?.(etat);
    // Le focus reste sur la zone des boutons, pas sur l'un d'eux : Espace, Entrée et Retour arrière
    // gardent le même sens à chaque étape. Sans faire défiler l'écran (téléphone).
    focaliser();
  }

  function dessinerAide() {
    const bonneReponse = ['valider', 'bonne réponse'];
    if (etat === 'attente') aideTouches([['suivant', 'démarrer']], aide);
    else if (etat === 'enCours') aideTouches([['suivant', 'stop']], aide);
    else if (etat === 'pause') {
      aideTouches(
        [['suivant', 'reprendre'], bonneReponse, ['erreur', 'mauvaise réponse, on reprend']],
        aide,
      );
    } else if (etat === 'revele') {
      aideTouches(
        [['suivant', 'cacher la réponse'], bonneReponse, ['erreur', 'mauvaise réponse']],
        aide,
      );
    } else aideTouches([], aide);
  }

  function focaliser() {
    if (actions.isConnected) actions.focus({ preventScroll: true });
  }

  // Le premier indice (ou l'image zoomée) n'apparaît qu'ici : personne ne cherche avant le départ
  function demarrer() {
    etat = 'enCours';
    surValeur(nombre);
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

  // La réponse s'affiche : la proposition se juge, on ne reprend plus tant qu'elle est visible
  function voirReponse() {
    if (etat !== 'pause') return;
    etat = 'revele';
    surReponse(true);
    dessiner();
  }

  // Vue trop tôt, ou par erreur : elle disparaît, la manche reste en pause et peut reprendre
  function cacherReponse() {
    if (etat !== 'revele') return;
    etat = 'pause';
    surReponse(false);
    ctx.annoncer('Réponse cachée.');
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
    suivant: () => {
      if (etat === 'attente') demarrer();
      else if (etat === 'enCours') stop();
      else if (etat === 'pause') reprendre();
      else if (etat === 'revele') cacherReponse();
      else if (etat === 'fini') surSuivant?.();
    },
    // Entrée : la proposition est bonne (une fenêtre demande qui a trouvé)
    valider: () => {
      if (etat === 'pause' || etat === 'revele') bonne();
    },
    // Retour arrière : la proposition est fausse (en pause, la manche reprend)
    erreur: () => {
      if (etat === 'pause') reprendre();
      else if (etat === 'revele') mauvaise();
    },
  });

  // Une fenêtre ouverte (roue, « Quitter ? ») fige aussi les chiffres
  const oublierPaliers = ctx.figerPendantFenetres?.(paliers);

  affichage.afficher(nombre);
  dessiner();

  return {
    paliers: affichage.element,
    actions,
    /** La ligne d'aide des touches, à placer sous les boutons. */
    aide,
    /** Le focus sur la zone des boutons (après l'affichage de l'écran). */
    focaliser,
    detruire() {
      paliers.arreter();
      oublierPaliers?.();
      retirerClavier();
    },
  };
}
