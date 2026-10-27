/**
 * Réglages de lancement : ceux du schéma marqués `lancement: true` (le minuteur d'un jeu), choisis
 * sur l'accueil du jeu juste avant de lancer la partie. Ils sont gardés à part du contenu
 * (`<slug>:lancement`) : changer le minuteur ne transforme pas le contenu d'exemple en contenu
 * enregistré, et ne fait pas oublier la thématique chargée.
 *
 * Valeur retenue : celle choisie au lancement, sinon celle du contenu (ancien réglage, fichier
 * importé), sinon la valeur par défaut du schéma.
 *
 * Même rangement pour le nombre d'éléments joués (clé `nombre`, voir passages.js) : null ou absent,
 * c'est la valeur proposée par l'accueil du jeu, selon les joueurs.
 */
import { lire, ecrire } from './stockage.js';
import { nettoyerReglage } from './contenu.js';

export function cleLancement(slug) {
  return `${slug}:lancement`;
}

/** Les réglages du schéma qui se choisissent au lancement. */
export function reglagesDeLancement(schema) {
  return (schema.reglages ?? []).filter((r) => r.lancement);
}

/** { cle: valeur } des réglages de lancement, nettoyés. */
export function valeursDeLancement(schema, brut, reglagesDuContenu = {}) {
  const choisies = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  return Object.fromEntries(
    reglagesDeLancement(schema).map((r) => [
      r.cle,
      nettoyerReglage(r, r.cle in choisies ? choisies[r.cle] : reglagesDuContenu[r.cle]),
    ]),
  );
}

export function lireLancement(slug, schema, reglagesDuContenu) {
  return valeursDeLancement(schema, lire(cleLancement(slug), {}), reglagesDuContenu);
}

function lireBrut(slug) {
  const brut = lire(cleLancement(slug), {});
  return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
}

/** Enregistre les réglages de lancement, sans effacer le nombre d'éléments déjà choisi. */
export function ecrireLancement(slug, valeurs) {
  const { nombre } = lireBrut(slug);
  const garde = nombre === undefined ? {} : { nombre };
  return ecrire(cleLancement(slug), { ...valeurs, ...garde });
}

/** Nombre d'éléments joués choisi par l'animateur (entier ≥ 1), ou null : valeur proposée. */
export function lireNombreJoue(slug) {
  const { nombre } = lireBrut(slug);
  return Number.isInteger(nombre) && nombre >= 1 ? nombre : null;
}

/** Garde le nombre d'éléments joués (null : revenir à la valeur proposée), sans toucher aux réglages. */
export function ecrireNombreJoue(slug, nombre) {
  const reste = { ...lireBrut(slug) };
  delete reste.nombre;
  return ecrire(
    cleLancement(slug),
    Number.isInteger(nombre) && nombre >= 1 ? { ...reste, nombre } : reste,
  );
}
