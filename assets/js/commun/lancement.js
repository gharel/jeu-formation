/**
 * Réglages de lancement : ceux du schéma marqués `lancement: true` (le minuteur d'un jeu), choisis
 * sur l'accueil du jeu juste avant de lancer la partie. Ils sont gardés à part du contenu
 * (`<slug>:lancement`) : changer le minuteur ne transforme pas le contenu d'exemple en contenu
 * enregistré, et ne fait pas oublier la thématique chargée.
 *
 * Valeur retenue : celle choisie au lancement, sinon celle du contenu (ancien réglage, fichier
 * importé), sinon la valeur par défaut du schéma.
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

export function ecrireLancement(slug, valeurs) {
  return ecrire(cleLancement(slug), valeurs);
}
