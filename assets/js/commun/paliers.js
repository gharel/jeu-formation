/**
 * Chiffres 5 4 3 2 1 qui s'éteignent au fil du temps (façon « Questions pour un champion »).
 * Plus on tarde à répondre, moins on marque de points.
 */
import { creerChrono } from './chrono.js';

/** Valeur en cours (5 à 1) selon le temps écoulé, 0 quand tous les paliers sont passés. */
export function valeurPalier(ecouleMs, dureePalierMs, nombre = 5) {
  if (ecouleMs >= nombre * dureePalierMs) return 0;
  return nombre - Math.floor(Math.max(0, ecouleMs) / dureePalierMs);
}

/**
 * Enchaîne les paliers. `surChangement(valeur)` est appelé à chaque chiffre perdu,
 * `surFin()` quand plus aucun point n'est en jeu. Pause et reprise figent le temps.
 */
export function creerPaliers({ nombre = 5, dureePalier, surChangement, surTic, surFin }) {
  const dureePalierMs = dureePalier * 1000;
  let valeur = nombre;
  const chrono = creerChrono({
    duree: nombre * dureePalier,
    surTic(restantMs) {
      const ecoule = nombre * dureePalierMs - restantMs;
      surTic?.(ecoule);
      const nouvelle = valeurPalier(ecoule, dureePalierMs, nombre);
      if (nouvelle !== valeur && nouvelle > 0) {
        valeur = nouvelle;
        surChangement?.(valeur);
      }
    },
    surFin() {
      valeur = 0;
      surChangement?.(0);
      surFin?.();
    },
  });
  return {
    demarrer: () => chrono.demarrer(),
    pause: () => chrono.pause(),
    reprendre: () => chrono.demarrer(),
    arreter: () => chrono.arreter(),
    get valeur() {
      return valeur;
    },
    get enCours() {
      return chrono.enCours;
    },
  };
}

/** Affichage des chiffres : renvoie { element, afficher(valeur) }. */
export function creerAffichagePaliers(nombre = 5) {
  const liste = document.createElement('ol');
  liste.className = 'paliers';
  liste.setAttribute('aria-label', 'Points en jeu');
  const chiffres = [];
  for (let v = nombre; v >= 1; v--) {
    const li = document.createElement('li');
    li.className = 'paliers__chiffre';
    li.textContent = String(v);
    chiffres.push([v, li]);
    liste.append(li);
  }
  return {
    element: liste,
    afficher(valeur) {
      for (const [v, li] of chiffres) {
        li.classList.toggle('paliers__chiffre--eteint', v > valeur);
        li.classList.toggle('paliers__chiffre--actif', v === valeur);
      }
      liste.setAttribute('aria-label', `Points en jeu : ${valeur}`);
    },
  };
}
