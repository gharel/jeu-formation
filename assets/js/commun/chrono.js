/**
 * Compte à rebours qu'on peut mettre en pause et reprendre.
 * `surTic(restantMs)` est appelé environ 10 fois par seconde, `surFin()` une fois à zéro.
 */
export function creerChrono({ duree, surTic, surFin, intervalle = 100, maintenant = Date.now }) {
  let restantMs = duree * 1000;
  let depart = null;
  let minuteur = null;

  function restant() {
    return depart === null ? restantMs : Math.max(0, restantMs - (maintenant() - depart));
  }

  function suspendre() {
    restantMs = restant();
    depart = null;
    clearInterval(minuteur);
    minuteur = null;
  }

  function tic() {
    const r = restant();
    surTic?.(r);
    if (r <= 0) {
      suspendre();
      surFin?.();
    }
  }

  return {
    demarrer() {
      if (minuteur !== null || restantMs <= 0) return;
      depart = maintenant();
      minuteur = setInterval(tic, intervalle);
      surTic?.(restantMs);
    },
    pause() {
      if (minuteur !== null) suspendre();
    },
    /** Arrête définitivement (aucun appel à surFin). */
    arreter() {
      suspendre();
    },
    /**
     * Ajoute du temps (ms > 0) ou en retire (ms < 0), en cours comme en pause : une pénalité,
     * par exemple. Si le temps tombe à zéro, le chrono s'arrête et appelle surFin.
     */
    ajuster(ms) {
      if (restant() <= 0) return;
      if (minuteur !== null) {
        restantMs += ms;
        tic();
        return;
      }
      restantMs = Math.max(0, restantMs + ms);
      surTic?.(restantMs);
      if (restantMs <= 0) surFin?.();
    },
    restant,
    ecoule() {
      return duree * 1000 - restant();
    },
    get enCours() {
      return minuteur !== null;
    },
  };
}

/** Texte du chrono : « 0:30 », « 1:05 ». On arrondit au-dessus pour afficher 0:00 seulement à la fin. */
export function formaterDuree(ms) {
  const secondes = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`;
}

/**
 * Minuteur prêt à afficher : chrono + affichage + bip à chacune des 5 dernières secondes.
 * `sons` vient de ctx.sons ; `sonFin: false` pour un jeu qui a son propre son de temps écoulé
 * (alarme, révélation), au lieu de jouer les deux en même temps.
 * Renvoie { element, demarrer, pause, arreter, ajuster, restant, enCours }.
 */
export function creerMinuteur({ duree, sons, surFin, sonFin = true }) {
  const affichage = creerAffichageChrono(duree);
  let derniereSeconde = null;
  const chrono = creerChrono({
    duree,
    surTic(restantMs) {
      affichage.afficher(restantMs);
      const seconde = Math.ceil(restantMs / 1000);
      if (restantMs > 0 && seconde <= 5 && seconde !== derniereSeconde) {
        derniereSeconde = seconde;
        sons?.tic();
      }
    },
    surFin() {
      affichage.afficher(0);
      if (sonFin) sons?.fin();
      surFin?.();
    },
  });
  affichage.afficher(duree * 1000);
  return {
    element: affichage.element,
    demarrer: () => chrono.demarrer(),
    pause: () => chrono.pause(),
    arreter: () => {
      chrono.arreter();
      // Arrêté dans les 5 dernières secondes (coffre ouvert à temps) : le rouge ne bat plus
      affichage.element.classList.remove('chrono--urgent');
    },
    ajuster: (ms) => chrono.ajuster(ms),
    restant: () => chrono.restant(),
    get enCours() {
      return chrono.enCours;
    },
  };
}

/** Affichage d'un chrono : grand temps + barre qui se vide. Rouge pendant les 5 dernières secondes. */
export function creerAffichageChrono(duree) {
  const temps = document.createElement('span');
  temps.className = 'chrono__temps';
  temps.setAttribute('role', 'timer');
  const progression = document.createElement('div');
  progression.className = 'chrono__progression';
  const barre = document.createElement('div');
  barre.className = 'chrono__barre';
  barre.append(progression);
  const element = document.createElement('div');
  element.className = 'chrono';
  element.append(temps, barre);
  let texte = null;
  let part = null;
  return {
    element,
    // Appelé 10 fois par seconde : on ne touche qu'à ce qui change vraiment. Le texte change une
    // fois par seconde ; la barre avance au 500e près (un chrono de 30 minutes ne la redessine
    // plus pour un déplacement de moins d'un pixel)
    afficher(restantMs) {
      const nouveau = formaterDuree(restantMs);
      if (nouveau !== texte) {
        texte = nouveau;
        temps.textContent = nouveau;
      }
      const nouvellePart =
        Math.round(Math.min(1, Math.max(0, restantMs / (duree * 1000))) * 500) / 500;
      if (nouvellePart !== part) {
        part = nouvellePart;
        progression.style.transform = `scaleX(${part})`;
      }
      element.classList.toggle('chrono--urgent', restantMs > 0 && restantMs <= 5000);
    },
  };
}
