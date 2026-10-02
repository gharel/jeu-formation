/**
 * Règles d'Instant défi : un début générique (« 30 secondes pour trouver… ») + une fin
 * préparée par l'animateur (« … le menu pour enregistrer un fichier »).
 */

export const DUREE_PAR_DEFAUT = 30;

export const AMORCES = [
  { valeur: 'trouver30', texte: '30 secondes pour trouver…' },
  { valeur: 'montrer60', texte: '1 minute pour montrer à tout le monde…' },
  { valeur: 'expliquer20', texte: '20 secondes pour expliquer…' },
  { valeur: 'retrouver45', texte: '45 secondes pour retrouver…' },
];

export const OPTIONS_AMORCE = [
  ...AMORCES.map((a) => ({ valeur: a.valeur, libelle: a.texte })),
  { valeur: 'surprise', libelle: 'Surprise : un début tiré au hasard' },
  { valeur: 'perso', libelle: 'Autre : j’écris mon propre début' },
];

/**
 * Durée du chrono lue dans le texte : « 30 secondes », « 45 s », « 1 minute », « 2 min »,
 * « 1 min 30 ». Sans durée lisible, on prend la valeur par défaut.
 */
export function dureeDepuisAmorce(texte, defaut = DUREE_PAR_DEFAUT) {
  const t = String(texte ?? '').toLowerCase();
  const minutes = t.match(/(\d+)\s*(?:minutes?|min|mn)\b\s*(\d+)?/);
  if (minutes) return Number(minutes[1]) * 60 + Number(minutes[2] ?? 0);
  const secondes = t.match(/(\d+)\s*(?:s|sec|secondes?)\b/);
  if (secondes) return Number(secondes[1]);
  return defaut;
}

/** Assemble le défi : « 30 secondes pour trouver » + « le menu… », sans les points de suspension. */
export function formulerDefi(amorce, fin) {
  const debut = String(amorce ?? '')
    .trim()
    .replace(/(\.\.\.|…)\s*$/, '')
    .trim();
  const suite = String(fin ?? '')
    .trim()
    .replace(/^(\.\.\.|…)\s*/, '')
    .trim();
  return `${debut} ${suite}`.trim();
}

/** Début et durée d'un défi préparé. « Surprise » tire un début au hasard. */
export function resoudreDefi(element, hasard = Math.random) {
  let texteAmorce;
  if (element.amorce === 'perso') {
    texteAmorce = element.amorcePerso;
  } else if (element.amorce === 'surprise') {
    texteAmorce = AMORCES[Math.floor(hasard() * AMORCES.length)].texte;
  } else {
    texteAmorce = (AMORCES.find((a) => a.valeur === element.amorce) ?? AMORCES[0]).texte;
  }
  return {
    texte: formulerDefi(texteAmorce, element.fin),
    duree: dureeDepuisAmorce(texteAmorce),
  };
}

/** Vérification d'un défi préparé (message ou null). */
export function validerDefi(element) {
  if (element.amorce === 'perso' && !String(element.amorcePerso ?? '').trim()) {
    return 'écrivez le début du défi, ou choisissez-en un dans la liste.';
  }
  return null;
}
