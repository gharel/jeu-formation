/**
 * Réponses tapées par l'animateur, comparées avec tolérance à la réponse attendue (Le Coffre-fort,
 * Top 5) : sans tenir compte des majuscules, des accents, des espaces ni de la ponctuation, d'un
 * article en tête (« le cloud » = « cloud ») ni du pluriel (« mots de passe » = « mot de passe »).
 * Une petite faute de frappe est pardonnée dans une réponse assez longue, jamais dans un nombre ou
 * un code (« 1989 » ≠ « 1998 »).
 *
 * Un seul mot de la réponse suffit aussi (« passe » pour « Mot de passe »), sauf un petit mot
 * (« de », « pour »…) ou un morceau de nombre écrit en lettres (« mille » pour « deux mille douze »).
 *
 * Une réponse peut avoir des variantes, séparées par « / » entouré d'espaces : « X / Twitter ».
 * La première est celle qu'on affiche. « TCP/IP » (sans espaces) reste une seule réponse.
 */

const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'd']);

/** Petits mots qui ne suffisent pas à reconnaître une réponse. */
const MOTS_OUTILS = new Set([
  ...ARTICLES,
  'de',
  'et',
  'ou',
  'a',
  'au',
  'aux',
  'en',
  'sur',
  'sous',
  'par',
  'pour',
  'avec',
  'sans',
  'dans',
  'ne',
  'n',
  'pas',
  'ni',
  'se',
  's',
  'sa',
  'son',
  'ses',
  'ce',
  'c',
  'qu',
  'que',
  'qui',
]);

/** Les mots d'un nombre écrit en lettres (« deux mille douze ») : aucun ne suffit seul. */
const NOMBRES_EN_LETTRES = new Set([
  'zero',
  'un',
  'une',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'vingt',
  'vingts',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'septante',
  'huitante',
  'octante',
  'nonante',
  'cent',
  'cents',
  'mille',
  'million',
  'millions',
  'milliard',
  'milliards',
  'et',
]);

/** Singulier approché : on retire un s ou un x final (« mots » → « mot », « jeux » → « jeu »). */
function singulier(mot) {
  return mot.length > 3 && /[a-z][sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

/** En minuscules, sans accents : « Cœur Été » → « coeur ete ». */
function simplifier(texte) {
  return String(texte ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Forme comparable d'une réponse : « Les mots de passe ! » → « motdepasse ». */
export function normaliserReponse(texte) {
  const mots = simplifier(texte)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  // Un article en tête, s'il reste quelque chose après : « de la », « de l' », « le », « l' »…
  if (mots.length > 2 && mots[0] === 'de' && ['la', 'l'].includes(mots[1])) mots.splice(0, 2);
  else if (mots.length > 1 && ARTICLES.has(mots[0])) mots.shift();
  return mots.map(singulier).join('');
}

/**
 * Mots qui portent le sens d'une réponse, pour la reconnaître à l'un d'eux : « Le mot de passe »
 * → ['mot', 'passe']. Sans petits mots ni lettre seule ; un mot composé reste entier
 * (« pare-feu » → ['parefeu']). Aucun pour un nombre écrit en lettres.
 */
export function motsSignificatifs(texte) {
  const simple = simplifier(texte);
  const morceaux = simple.split(/[^a-z0-9]+/).filter(Boolean);
  if (morceaux.length && morceaux.every((m) => NOMBRES_EN_LETTRES.has(m))) return [];
  return simple
    .replace(/-/g, '')
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length > 1 && !MOTS_OUTILS.has(mot))
    .map(singulier);
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

/** Chaque mot de la saisie est-il l'un des mots de la variante (à une faute de frappe près) ? */
function reprendDesMots(motsSaisie, motsVariante) {
  return (
    motsSaisie.length > 0 &&
    motsSaisie.every((mot) => motsVariante.some((attendu) => ecart(mot, attendu) !== null))
  );
}

/**
 * Réponses de `reponses` que la saisie désigne. `entiere` : l'index de la réponse dite en entier
 * (l'exacte l'emporte sur une réponse à une faute de frappe près), ou -1. Sinon, `partielles` :
 * les index des réponses dont la saisie reprend des mots (« passe » pour « Mot de passe »).
 * Plusieurs partielles : la saisie est ambiguë (« Google » pour « Google Docs » et « Google Sheets »).
 */
export function chercherReponses(saisie, reponses) {
  const resultat = { entiere: -1, partielles: [] };
  const propre = normaliserReponse(saisie);
  if (!propre) return resultat;
  let plusPetitEcart = Infinity;
  reponses.forEach((reponse, index) => {
    for (const variante of variantes(reponse)) {
      const e = ecart(propre, normaliserReponse(variante));
      if (e !== null && e < plusPetitEcart) {
        plusPetitEcart = e;
        resultat.entiere = index;
      }
    }
  });
  if (resultat.entiere !== -1) return resultat;
  const mots = motsSignificatifs(saisie);
  reponses.forEach((reponse, index) => {
    if (variantes(reponse).some((v) => reprendDesMots(mots, motsSignificatifs(v)))) {
      resultat.partielles.push(index);
    }
  });
  return resultat;
}

/**
 * Index de la réponse de `reponses` qui correspond le mieux à la saisie, ou -1 si aucune : la
 * réponse dite en entier, sinon la seule réponse dont la saisie reprend des mots.
 */
export function trouverReponse(saisie, reponses) {
  const { entiere, partielles } = chercherReponses(saisie, reponses);
  if (entiere !== -1) return entiere;
  return partielles.length === 1 ? partielles[0] : -1;
}

/** La saisie correspond-elle à l'une des variantes de la réponse ? */
export function estBonneReponse(saisie, reponse) {
  return trouverReponse(saisie, [reponse]) === 0;
}
