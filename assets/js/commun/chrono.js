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
  return {
    element,
    afficher(restantMs) {
      temps.textContent = formaterDuree(restantMs);
      progression.style.transform = `scaleX(${Math.max(0, restantMs / (duree * 1000))})`;
      element.classList.toggle('chrono--urgent', restantMs > 0 && restantMs <= 5000);
    },
  };
}
