/**
 * Minuteur de manche : le temps d'un mot, d'une question ou d'un tour, choisi au lancement du jeu
 * pour que la partie ne traîne pas. À zéro, le jeu ne coupe rien : un son, un chrono rouge qui
 * clignote et compte le dépassement (« +0:12 »), et deux boutons, « +30 s » et l'action du jeu
 * (« Passer »). L'animateur décide.
 *
 * creerMinuteurManche({ duree (s), sons, annoncer, passer: { libelle, faire } })
 * → { element, demarrer, relancer, pause, reprendre, arreter, ajouter(s), restant, depasse, enCours }
 * Le chrono se place dans la barre de l'écran de jeu (cadre-jeu.js), au même endroit dans tous
 * les jeux.
 */
import { el, remplir, icone } from './ui.js';

/** Temps ajouté par le bouton « +30 s », en secondes. */
export const TEMPS_ADDITIONNEL = 30;
const SECONDES_URGENTES = 5;

/** « 1:05 » avant zéro (arrondi au-dessus), « +0:12 » après (le dépassement). */
export function formaterTemps(restantMs) {
  const depasse = restantMs < 0;
  const secondes = depasse
    ? Math.floor(-restantMs / 1000)
    : Math.ceil(Math.max(0, restantMs) / 1000);
  const texte = `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
  return depasse ? `+${texte}` : texte;
}

export function creerMinuteurManche({
  duree,
  sons = null,
  annoncer = () => {},
  passer = null,
  intervalle = 100,
  maintenant = () => Date.now(),
}) {
  const dureeMs = duree * 1000;
  let restantMs = dureeMs;
  let depart = null;
  let boucle = null;
  let alerte = false;
  let derniereSeconde = null;
  let texte = null;
  let part = null;

  const temps = el('span', { class: 'minuteur-manche__temps', role: 'timer' });
  const progression = el('span', { class: 'minuteur-manche__progression' });
  const etat = el('span', { class: 'visuellement-cache' });
  const boutonPlus = el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--discret minuteur-manche__plus',
      title: `Ajouter ${TEMPS_ADDITIONNEL} secondes`,
      onclick: () => ajouter(TEMPS_ADDITIONNEL),
    },
    `+${TEMPS_ADDITIONNEL} s`,
  );
  const boutonPasser = passer
    ? el(
        'button',
        {
          type: 'button',
          class: 'bouton minuteur-manche__passer',
          hidden: true,
          onclick: () => passer.faire(),
        },
        passer.libelle ?? 'Passer',
        icone('forward-step', { classe: 'icone--apres' }),
      )
    : null;
  const element = el(
    'div',
    { class: 'minuteur-manche', role: 'group', 'aria-label': 'Minuteur de la manche' },
    el(
      'span',
      { class: 'minuteur-manche__cadran' },
      icone('stopwatch', { classe: 'minuteur-manche__icone' }),
      temps,
      etat,
      el('span', { class: 'minuteur-manche__barre' }, progression),
    ),
    boutonPlus,
    boutonPasser,
  );

  function restant() {
    return depart === null ? restantMs : restantMs - (maintenant() - depart);
  }

  // Appelé 10 fois par seconde : on ne touche qu'à ce qui change vraiment
  function afficher(r) {
    const nouveau = formaterTemps(r);
    if (nouveau !== texte) {
      texte = nouveau;
      temps.textContent = nouveau;
    }
    const nouvellePart = Math.round(Math.min(1, Math.max(0, r / dureeMs)) * 200) / 200;
    if (nouvellePart !== part) {
      part = nouvellePart;
      progression.style.transform = `scaleX(${part})`;
    }
    element.classList.toggle('minuteur-manche--urgent', r > 0 && r <= SECONDES_URGENTES * 1000);
  }

  function passerEnAlerte(actif) {
    if (alerte === actif) return;
    alerte = actif;
    element.classList.toggle('minuteur-manche--depasse', actif);
    if (boutonPasser) boutonPasser.hidden = !actif;
    remplir(etat, actif ? ' Temps écoulé' : '');
    if (actif) {
      sons?.fin();
      annoncer('Temps écoulé ! Ajoutez du temps ou passez à la suite.');
    }
  }

  function tic() {
    const r = restant();
    afficher(r);
    const seconde = Math.ceil(r / 1000);
    if (r > 0 && seconde <= SECONDES_URGENTES && seconde !== derniereSeconde) {
      derniereSeconde = seconde;
      sons?.tic();
    }
    if (r <= 0) passerEnAlerte(true);
  }

  function suspendre() {
    restantMs = restant();
    depart = null;
    clearInterval(boucle);
    boucle = null;
  }

  function demarrer() {
    if (boucle !== null) return;
    element.classList.remove('minuteur-manche--arrete');
    depart = maintenant();
    boucle = setInterval(tic, intervalle);
    tic();
  }

  /** Ajoute (ou retire) du temps, en cours comme en pause ; revenu au-dessus de zéro, l'alerte cesse. */
  function ajouter(secondes) {
    // Après zéro, le dépassement est oublié : on repart du temps ajouté
    restantMs = Math.max(0, restant()) + secondes * 1000;
    if (depart !== null) depart = maintenant();
    derniereSeconde = null;
    const r = restant();
    afficher(r);
    passerEnAlerte(r <= 0);
  }

  afficher(dureeMs);

  return {
    element,
    demarrer,
    /** Repart du temps complet (nouveau mot, nouvelle question) et démarre. */
    relancer() {
      suspendre();
      restantMs = dureeMs;
      derniereSeconde = null;
      passerEnAlerte(false);
      demarrer();
    },
    pause() {
      if (boucle !== null) suspendre();
    },
    reprendre: demarrer,
    /** Manche finie : le chrono s'arrête et s'efface un peu, sans alerte. */
    arreter() {
      suspendre();
      passerEnAlerte(false);
      element.classList.remove('minuteur-manche--urgent');
      element.classList.add('minuteur-manche--arrete');
    },
    ajouter,
    restant,
    get depasse() {
      return alerte;
    },
    get enCours() {
      return boucle !== null;
    },
  };
}
