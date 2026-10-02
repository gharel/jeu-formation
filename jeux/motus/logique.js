/**
 * Règles de Motus : aucune manipulation de la page ici, tout est testé unitairement.
 */

export const NOMBRE_MOTS = 5;
export const NOMBRE_ESSAIS = 6;
export const LONGUEUR_MIN = 4;
export const LONGUEUR_MAX = 10;

/** « Réseau » → « RESEAU », « cœur » → « COEUR ». Seules les lettres A à Z sont gardées. */
export function normaliserMot(texte) {
  return String(texte ?? '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/** Vérifie un mot préparé par l'animateur. Renvoie un message ou null. */
export function validerMotSecret(texte) {
  if (!String(texte ?? '').trim()) return null;
  if (/[0-9]/.test(texte)) return 'le mot ne doit contenir que des lettres.';
  if (/[^\p{L}\s'’-]/u.test(texte)) return 'le mot ne doit contenir que des lettres.';
  const mot = normaliserMot(texte);
  if (mot.length < LONGUEUR_MIN || mot.length > LONGUEUR_MAX) {
    return `le mot doit faire entre ${LONGUEUR_MIN} et ${LONGUEUR_MAX} lettres (« ${mot} » en fait ${mot.length}).`;
  }
  return null;
}

/** Vérifie une proposition avant de l'évaluer. Renvoie un message ou null. */
export function verifierProposition(secret, proposition) {
  if (proposition.length !== secret.length) {
    return `Le mot doit faire ${secret.length} lettres (ici ${proposition.length}).`;
  }
  if (proposition[0] !== secret[0]) return `Le mot doit commencer par ${secret[0]}.`;
  return null;
}

/**
 * Couleur de chaque lettre : 'bien' (bien placée), 'mal' (présente ailleurs) ou 'absent'.
 * Les lettres en double ne sont comptées que autant de fois qu'elles existent dans le mot.
 */
export function evaluer(secret, proposition) {
  const resultat = Array.from({ length: secret.length }, () => 'absent');
  const restantes = new Map();
  for (let i = 0; i < secret.length; i++) {
    if (proposition[i] === secret[i]) resultat[i] = 'bien';
    else restantes.set(secret[i], (restantes.get(secret[i]) ?? 0) + 1);
  }
  for (let i = 0; i < secret.length; i++) {
    if (resultat[i] === 'bien') continue;
    const n = restantes.get(proposition[i]) ?? 0;
    if (n > 0) {
      resultat[i] = 'mal';
      restantes.set(proposition[i], n - 1);
    }
  }
  return resultat;
}

export function estTrouve(evaluation) {
  return evaluation.every((etat) => etat === 'bien');
}

const PRIORITE = { absent: 0, mal: 1, bien: 2 };

/** État de chaque lettre du clavier affiché, d'après les essais déjà joués. */
export function etatClavier(essais) {
  const etats = new Map();
  for (const { mot, evaluation } of essais) {
    [...mot].forEach((lettre, i) => {
      const etat = evaluation[i];
      if (!etats.has(lettre) || PRIORITE[etat] > PRIORITE[etats.get(lettre)])
        etats.set(lettre, etat);
    });
  }
  return etats;
}

/** Lettres connues (bien placées) pour aider la ligne suivante ; la première lettre est donnée. */
export function lettresConnues(secret, essais) {
  const connues = Array.from({ length: secret.length }, (_, i) => (i === 0 ? secret[0] : null));
  for (const { mot, evaluation } of essais) {
    evaluation.forEach((etat, i) => {
      if (etat === 'bien') connues[i] = mot[i];
    });
  }
  return connues;
}
