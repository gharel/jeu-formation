/**
 * Règles du Juste Chiffre : « c'est plus », « c'est moins » ou « juste ».
 */
import { formaterNombre } from '../../assets/js/commun/nombres.js';

export const MESSAGES = {
  plus: 'C’est plus !',
  moins: 'C’est moins !',
  juste: 'Juste !',
};

/**
 * Compare une proposition à la bonne réponse. `margePct` permet d'accepter une réponse
 * proche (utile pour les très grands nombres) : 10 % accepte de 90 à 110 pour 100.
 */
export function comparer(cible, proposition, margePct = 0) {
  const tolerance = Math.abs(cible) * ((margePct ?? 0) / 100);
  const ecart = Math.abs(proposition - cible);
  // petite marge pour les erreurs d'arrondi des nombres décimaux (0,1 + 0,2…)
  if (ecart <= tolerance + 1e-9 * Math.max(1, Math.abs(cible))) return 'juste';
  return proposition < cible ? 'plus' : 'moins';
}

/** Bornes connues d'après les propositions : { min, max } (null si inconnue). */
export function fourchette(historique) {
  let min = null;
  let max = null;
  for (const { valeur, resultat } of historique) {
    if (resultat === 'plus' && (min === null || valeur > min)) min = valeur;
    if (resultat === 'moins' && (max === null || valeur < max)) max = valeur;
  }
  return { min, max };
}

/** « Entre 200 et 450 », « Plus de 200 », « Moins de 450 », ou '' si rien n'est connu. */
export function decrireFourchette({ min, max }, unite = '') {
  const u = unite ? ` ${unite}` : '';
  if (min !== null && max !== null)
    return `Entre ${formaterNombre(min)} et ${formaterNombre(max)}${u}`;
  if (min !== null) return `Plus de ${formaterNombre(min)}${u}`;
  if (max !== null) return `Moins de ${formaterNombre(max)}${u}`;
  return '';
}

/** Participant suivant dans le tour de rôle. */
export function suivant(participants, index) {
  if (!participants.length) return -1;
  return (index + 1) % participants.length;
}
