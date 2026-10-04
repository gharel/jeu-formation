/**
 * Réponses tapées par l'animateur, comparées avec tolérance à la réponse attendue (Le Coffre-fort,
 * Top 5) : sans tenir compte des majuscules, des accents, des espaces ni de la ponctuation, d'un
 * article en tête (« le cloud » = « cloud ») ni du pluriel (« mots de passe » = « mot de passe »).
 * Une petite faute de frappe est pardonnée dans une réponse assez longue, jamais dans un nombre ou
 * un code (« 1989 » ≠ « 1998 »).
 *
 * Une réponse peut avoir des variantes, séparées par « / » entouré d'espaces : « X / Twitter ».
 * La première est celle qu'on affiche. « TCP/IP » (sans espaces) reste une seule réponse.
 */

const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'd']);

/** Singulier approché : on retire un s ou un x final (« mots » → « mot », « jeux » → « jeu »). */
function singulier(mot) {
  return mot.length > 3 && /[a-z][sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

/** Forme comparable d'une réponse : « Les mots de passe ! » → « motdepasse ». */
export function normaliserReponse(texte) {
  const mots = String(texte ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  // Un article en tête, s'il reste quelque chose après : « de la », « de l' », « le », « l' »…
  if (mots.length > 2 && mots[0] === 'de' && ['la', 'l'].includes(mots[1])) mots.splice(0, 2);
  else if (mots.length > 1 && ARTICLES.has(mots[0])) mots.shift();
  return mots.map(singulier).join('');
}

/** Nombre minimal de lettres à ajouter, retirer ou changer pour passer de a à b (Levenshtein). */
export function distanceEdition(a, b) {
  if (a === b) return 0;
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      courante[j] = Math.min(
        precedente[j] + 1,
        courante[j - 1] + 1,
        precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    precedente = courante;
  }
  return precedente[b.length];
}

/**
 * Fautes de frappe pardonnées pour une réponse attendue (déjà normalisée) : aucune dans un nombre
 * ou un code, 1 à partir de 6 caractères, 2 à partir de 10.
 */
export function fautesPermises(attendu) {
  if (/\d/.test(attendu)) return 0;
  if (attendu.length >= 10) return 2;
  if (attendu.length >= 6) return 1;
  return 0;
}

/** Variantes d'une réponse : « X / Twitter » → ['X', 'Twitter']. */
export function variantes(reponse) {
  return String(reponse ?? '')
    .split(/\s+\/\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Ce qu'on affiche d'une réponse : sa première variante. */
export function reponseAffichee(reponse) {
  return variantes(reponse)[0] ?? '';
}

/** Écart entre une saisie et une variante (normalisées) : null si elles ne correspondent pas. */
function ecart(saisie, attendu) {
  if (!attendu) return null;
  if (saisie === attendu) return 0;
  const permises = fautesPermises(attendu);
  if (!permises || Math.abs(saisie.length - attendu.length) > permises) return null;
  const distance = distanceEdition(saisie, attendu);
  return distance <= permises ? distance : null;
}

/**
 * Index de la réponse de `reponses` qui correspond le mieux à la saisie, ou -1 si aucune.
 * Une correspondance exacte l'emporte sur une correspondance à une faute de frappe près.
 */
export function trouverReponse(saisie, reponses) {
  const propre = normaliserReponse(saisie);
  if (!propre) return -1;
  let meilleure = -1;
  let plusPetitEcart = Infinity;
  reponses.forEach((reponse, index) => {
    for (const variante of variantes(reponse)) {
      const e = ecart(propre, normaliserReponse(variante));
      if (e !== null && e < plusPetitEcart) {
        plusPetitEcart = e;
        meilleure = index;
      }
    }
  });
  return meilleure;
}

/** La saisie correspond-elle à l'une des variantes de la réponse ? */
export function estBonneReponse(saisie, reponse) {
  return trouverReponse(saisie, [reponse]) === 0;
}
