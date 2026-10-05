/**
 * Jeux de données : le contenu de plusieurs jeux dans un seul fichier JSON (une thématique
 * prête à jouer, ou tous les contenus de l'animateur exportés d'un coup).
 *
 * {
 *   format: 'skazy-jeux-donnees', version: 1,
 *   titre: 'Google Sheets', description: '…', exporteLe: '…' (export seulement),
 *   jeux: { motus: { elements: […] }, 'duel-buzzer': { reglages: {…}, elements: […] }, … }
 * }
 * Sans `reglages`, un jeu garde ceux de l'animateur. Chaque contenu passe ensuite par
 * nettoyerContenu() avec le schéma du jeu.
 *
 * On retient aussi d'où vient le contenu de chaque jeu (« Google Sheets ») pour l'afficher :
 * la source est oubliée dès que l'animateur enregistre son propre contenu.
 */
import { FORMAT, FORMAT_DONNEES, nettoyerContenu } from './contenu.js';
import { lire, ecrire } from './stockage.js';

export const VERSION_DONNEES = 1;
export const LONGUEUR_TITRE = 80;
export const LONGUEUR_DESCRIPTION = 300;
const CLE_SOURCES = 'sources-contenus';

/** Texte d'une ligne : espaces resserrés, longueur limitée ('' si ce n'est pas un texte). */
export const texteCourt = (valeur, longueur) =>
  typeof valeur === 'string' ? valeur.replace(/\s+/g, ' ').trim().slice(0, longueur) : '';

/** Fichier exporté : `contenus` = { slug: { reglages, elements } }. */
export function preparerJeuDeDonnees(
  { titre, description = '', contenus },
  maintenant = new Date(),
) {
  return {
    format: FORMAT_DONNEES,
    version: VERSION_DONNEES,
    titre: texteCourt(titre, LONGUEUR_TITRE) || 'Mes contenus',
    description: texteCourt(description, LONGUEUR_DESCRIPTION),
    exporteLe: maintenant.toISOString(),
    jeux: contenus,
  };
}

/**
 * Lit un jeu de données, ou l'export d'un seul jeu (bouton « Exporter » d'un jeu).
 * Renvoie { titre, description, jeux: { slug: contenu brut }, inconnus: [slug] } avec les seuls
 * jeux de `slugsConnus`, dans leur ordre. Lève une erreur au message lisible sinon.
 */
export function lireJeuDeDonnees(contenuFichier, slugsConnus) {
  let donnees;
  try {
    donnees = JSON.parse(contenuFichier);
  } catch {
    throw new Error('Ce fichier n’est pas un jeu de données valide (JSON illisible).');
  }
  return lireDonnees(donnees, slugsConnus);
}

/** Comme lireJeuDeDonnees(), pour un JSON déjà lu (une thématique d'un fichier groupé). */
export function lireDonnees(donnees, slugsConnus) {
  let jeuxBruts;
  if (donnees?.format === FORMAT_DONNEES) {
    jeuxBruts = donnees.jeux;
  } else if (donnees?.format === FORMAT && typeof donnees.jeu === 'string') {
    jeuxBruts = { [donnees.jeu]: donnees.contenu };
  } else {
    throw new Error('Ce fichier n’est pas un jeu de données des mini-jeux Skazy Formation.');
  }
  if (!jeuxBruts || typeof jeuxBruts !== 'object' || Array.isArray(jeuxBruts)) {
    throw new Error('Ce jeu de données ne contient aucun jeu.');
  }
  const valide = (brut) => brut && typeof brut === 'object' && !Array.isArray(brut);
  const jeux = Object.fromEntries(
    slugsConnus.filter((slug) => valide(jeuxBruts[slug])).map((slug) => [slug, jeuxBruts[slug]]),
  );
  const inconnus = Object.keys(jeuxBruts).filter((slug) => !slugsConnus.includes(slug));
  if (!Object.keys(jeux).length) {
    throw new Error('Ce jeu de données ne contient le contenu d’aucun des mini-jeux.');
  }
  return {
    titre: texteCourt(donnees.titre, LONGUEUR_TITRE),
    description: texteCourt(donnees.description, LONGUEUR_DESCRIPTION),
    jeux,
    inconnus,
  };
}

/**
 * Contenu d'un jeu tiré d'un jeu de données. Les réglages absents du fichier restent ceux de
 * l'animateur (`actuel`), sinon ceux par défaut.
 */
export function contenuDepuisDonnees(schema, brut, actuel = null) {
  const reglages = { ...(actuel?.reglages ?? {}), ...(brut?.reglages ?? {}) };
  return nettoyerContenu(schema, { ...brut, reglages });
}

// ---------- Source du contenu de chaque jeu ----------

export function lireSources() {
  const brut = lire(CLE_SOURCES, {});
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
  return Object.fromEntries(
    Object.entries(brut)
      .map(([slug, titre]) => [slug, texteCourt(titre, LONGUEUR_TITRE)])
      .filter(([, titre]) => titre),
  );
}

/** « Google Sheets » si le contenu du jeu vient de cette thématique, sinon null. */
export function sourceDe(slug) {
  return lireSources()[slug] ?? null;
}

export function noterSource(slug, titre) {
  const propre = texteCourt(titre, LONGUEUR_TITRE);
  const sources = lireSources();
  if (propre) sources[slug] = propre;
  else delete sources[slug];
  return ecrire(CLE_SOURCES, sources);
}

export function oublierSource(slug) {
  return noterSource(slug, '');
}
