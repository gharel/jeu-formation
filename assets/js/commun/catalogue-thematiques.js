/**
 * Catalogue des thématiques : celles livrées avec le site (thematiques.js, un fichier JSON chacune)
 * et celles de l'animateur, gardées dans ce navigateur. Fonctions pures, sauf lire et enregistrer.
 *
 * Stockage (clé « thematiques ») : { locales: [thématique], supprimees: [slug] }.
 * - Une thématique créée par l'animateur a un slug « perso-… ».
 * - Une thématique livrée qu'il modifie est copiée sous son propre slug : la copie la remplace,
 *   et « Rétablir l'originale » la retire.
 * - Une thématique livrée supprimée est seulement masquée (`supprimees`).
 *
 * Une thématique : { slug, titre, description, icone, jeux: { slug du jeu: { elements } } }.
 * Comme dans un fichier, le contenu des jeux est brut : la page le nettoie avec le schéma de chaque
 * jeu. Ni réglages (ceux de l'animateur sont gardés au chargement), ni images (Zoom mystère).
 */
import { THEMATIQUES } from '../thematiques.js';
import { lire, ecrire } from './stockage.js';
import { enSlug } from './fichiers.js';
import { FORMAT_DONNEES } from './contenu.js';
import {
  lireDonnees,
  preparerJeuDeDonnees,
  texteCourt,
  LONGUEUR_TITRE,
  LONGUEUR_DESCRIPTION,
} from './jeux-de-donnees.js';

/** Export groupé : toutes les thématiques dans un seul fichier. */
export const FORMAT_THEMATIQUES = 'skazy-jeux-thematiques';
export const VERSION_THEMATIQUES = 1;
export const PREFIXE_PERSO = 'perso-';
export const ICONE_PAR_DEFAUT = 'layer-group';
const CLE = 'thematiques';

/** Icônes proposées pour une thématique (Font Awesome, style solid), avec leur nom lu à l'écran. */
export const ICONES_THEMATIQUE = [
  { icone: 'layer-group', libelle: 'Général' },
  { icone: 'robot', libelle: 'Intelligence artificielle' },
  { icone: 'file-lines', libelle: 'Document' },
  { icone: 'table-cells', libelle: 'Tableur' },
  { icone: 'briefcase', libelle: 'Bureautique' },
  { icone: 'thumbs-up', libelle: 'Réseaux sociaux' },
  { icone: 'laptop', libelle: 'Ordinateur' },
  { icone: 'mobile-screen', libelle: 'Téléphone' },
  { icone: 'envelope', libelle: 'Courriel' },
  { icone: 'globe', libelle: 'Internet' },
  { icone: 'shield-halved', libelle: 'Sécurité' },
  { icone: 'lock', libelle: 'Mots de passe' },
  { icone: 'cloud', libelle: 'Cloud' },
  { icone: 'chart-line', libelle: 'Graphiques' },
  { icone: 'calendar-days', libelle: 'Agenda' },
  { icone: 'comments', libelle: 'Messagerie' },
  { icone: 'users', libelle: 'Travail en équipe' },
  { icone: 'graduation-cap', libelle: 'Formation' },
  { icone: 'lightbulb', libelle: 'Astuces' },
  { icone: 'image', libelle: 'Images' },
  { icone: 'video', libelle: 'Vidéo' },
  { icone: 'keyboard', libelle: 'Clavier' },
  { icone: 'print', libelle: 'Impression' },
  { icone: 'folder-open', libelle: 'Fichiers' },
  { icone: 'magnifying-glass', libelle: 'Recherche' },
  { icone: 'book-open', libelle: 'Lecture' },
  { icone: 'puzzle-piece', libelle: 'Jeux' },
  { icone: 'star', libelle: 'Étoile' },
];

const estObjet = (valeur) =>
  valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

/** L'icône si elle est proposée, sinon celle par défaut. */
export function iconeValide(nom) {
  return ICONES_THEMATIQUE.some((i) => i.icone === nom) ? nom : ICONE_PAR_DEFAUT;
}

/** « perso-excel-debutant » : slug d'une thématique créée par l'animateur. */
export function estSlugPerso(slug) {
  return typeof slug === 'string' && /^perso-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/** Le contenu des jeux, réduit aux jeux de `slugsJeux` (dans leur ordre) et à leurs éléments. */
export function nettoyerJeux(brut, slugsJeux) {
  if (!estObjet(brut)) return {};
  return Object.fromEntries(
    slugsJeux
      .filter((slug) => estObjet(brut[slug]))
      .map((slug) => {
        const elements = Array.isArray(brut[slug].elements) ? brut[slug].elements : [];
        return [slug, { elements: elements.filter(estObjet) }];
      }),
  );
}

/** Une thématique propre, ou null sans slug valide (perso ou livré) ni titre. */
export function nettoyerThematique(brut, slugsJeux, integrees = THEMATIQUES) {
  if (!estObjet(brut)) return null;
  const slug = brut.slug;
  const slugValide = estSlugPerso(slug) || integrees.some((t) => t.slug === slug);
  const titre = texteCourt(brut.titre, LONGUEUR_TITRE);
  if (!slugValide || !titre) return null;
  return {
    slug,
    titre,
    description: texteCourt(brut.description, LONGUEUR_DESCRIPTION),
    icone: iconeValide(brut.icone),
    jeux: nettoyerJeux(brut.jeux, slugsJeux),
  };
}

export function nettoyerCatalogue(brut, slugsJeux, integrees = THEMATIQUES) {
  const source = estObjet(brut) ? brut : {};
  const vus = new Set();
  const locales = [];
  for (const t of Array.isArray(source.locales) ? source.locales : []) {
    const propre = nettoyerThematique(t, slugsJeux, integrees);
    if (!propre || vus.has(propre.slug)) continue;
    vus.add(propre.slug);
    locales.push(propre);
  }
  const supprimees = Array.isArray(source.supprimees) ? source.supprimees : [];
  return {
    locales,
    supprimees: integrees
      .map((t) => t.slug)
      .filter((slug) => supprimees.includes(slug) && !vus.has(slug)),
  };
}

/** Le catalogue de ce navigateur (vide si rien n'est enregistré ou si le stockage est bloqué). */
export function lireCatalogue(slugsJeux, integrees = THEMATIQUES) {
  return nettoyerCatalogue(lire(CLE), slugsJeux, integrees);
}

/** Renvoie true si l'enregistrement a réussi. */
export function enregistrerCatalogue(catalogue) {
  return ecrire(CLE, catalogue);
}

/**
 * Les thématiques à afficher : celles livrées (ou leur copie modifiée), puis celles de l'animateur.
 * [{ slug, titre, icone, integree, modifiee, locale }] ; `locale` est la thématique gardée dans
 * ce navigateur, ou null pour un fichier livré, à lire.
 */
export function thematiquesAffichees(catalogue, integrees = THEMATIQUES) {
  const locales = new Map(catalogue.locales.map((t) => [t.slug, t]));
  const livrees = integrees
    .filter((t) => !catalogue.supprimees.includes(t.slug))
    .map((t) => {
      const locale = locales.get(t.slug) ?? null;
      return {
        slug: t.slug,
        titre: locale?.titre ?? t.titre,
        icone: locale?.icone ?? t.icone,
        integree: true,
        modifiee: Boolean(locale),
        locale,
      };
    });
  const perso = catalogue.locales
    .filter((t) => !integrees.some((i) => i.slug === t.slug))
    .map((t) => ({
      slug: t.slug,
      titre: t.titre,
      icone: t.icone,
      integree: false,
      modifiee: false,
      locale: t,
    }));
  return [...livrees, ...perso];
}

/** Les thématiques livrées que l'animateur a supprimées : [{ slug, titre, icone }]. */
export function thematiquesSupprimees(catalogue, integrees = THEMATIQUES) {
  return integrees.filter((t) => catalogue.supprimees.includes(t.slug));
}

// ---------- Modifications (chacune renvoie un nouveau catalogue) ----------

/** Ajoute une thématique, ou la remplace à sa place ; une thématique livrée supprimée revient. */
export function avecThematique(catalogue, thematique) {
  const existe = catalogue.locales.some((t) => t.slug === thematique.slug);
  return {
    locales: existe
      ? catalogue.locales.map((t) => (t.slug === thematique.slug ? thematique : t))
      : [...catalogue.locales, thematique],
    supprimees: catalogue.supprimees.filter((slug) => slug !== thematique.slug),
  };
}

/** Supprime une thématique : celle de l'animateur disparaît, celle livrée est masquée. */
export function sansThematique(catalogue, slug, integrees = THEMATIQUES) {
  const integree = integrees.some((t) => t.slug === slug);
  return {
    locales: catalogue.locales.filter((t) => t.slug !== slug),
    supprimees:
      integree && !catalogue.supprimees.includes(slug)
        ? [...catalogue.supprimees, slug]
        : catalogue.supprimees,
  };
}

/** Une thématique livrée retrouve son fichier d'origine : modifications oubliées, et visible. */
export function avecOriginale(catalogue, slug) {
  return {
    locales: catalogue.locales.filter((t) => t.slug !== slug),
    supprimees: catalogue.supprimees.filter((s) => s !== slug),
  };
}

/** Les thématiques livrées supprimées reviennent (leurs modifications avaient été oubliées). */
export function avecSupprimeesRetablies(catalogue) {
  return { locales: catalogue.locales, supprimees: [] };
}

// ---------- Titres et slugs ----------

const cleTitre = (titre) => texteCourt(titre, LONGUEUR_TITRE).toLocaleLowerCase('fr');

/** La thématique de `thematiques` qui porte ce titre (majuscules ignorées), ou null. */
export function thematiqueDuTitre(thematiques, titre, saufSlug = null) {
  return (
    thematiques.find((t) => t.slug !== saufSlug && cleTitre(t.titre) === cleTitre(titre)) ?? null
  );
}

/** Slug d'une nouvelle thématique : « perso-excel-debutant », numéroté s'il est pris. */
export function nouveauSlug(titre, pris) {
  const base = `${PREFIXE_PERSO}${enSlug(titre) || 'thematique'}`;
  let slug = base;
  for (let n = 2; pris.includes(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

/** « Excel », ou « Excel (2) » si ce titre est déjà pris. */
function titreLibre(titre, pris) {
  const cles = pris.map(cleTitre);
  let libre = titre;
  for (let n = 2; cles.includes(cleTitre(libre)); n += 1) {
    libre = `${titre.slice(0, LONGUEUR_TITRE - 5)} (${n})`;
  }
  return libre;
}

// ---------- Fichiers ----------

/** Une thématique seule : un jeu de données, avec son slug et son icône. */
export function preparerExportThematique(thematique, maintenant = new Date()) {
  const { jeux, ...entete } = preparerJeuDeDonnees(
    { titre: thematique.titre, description: thematique.description, contenus: thematique.jeux },
    maintenant,
  );
  return { ...entete, slug: thematique.slug, icone: thematique.icone, jeux };
}

/** Toutes les thématiques dans un seul fichier. */
export function preparerExportThematiques(thematiques, maintenant = new Date()) {
  return {
    format: FORMAT_THEMATIQUES,
    version: VERSION_THEMATIQUES,
    exporteLe: maintenant.toISOString(),
    thematiques: thematiques.map(({ slug, titre, description, icone, jeux }) => ({
      slug,
      titre,
      description,
      icone,
      jeux,
    })),
  };
}

/**
 * Lit un fichier de thématiques : l'export groupé, une thématique seule, ou tout autre jeu de
 * données (« Exporter tous les contenus », export d'un jeu). Seuls les jeux de `slugsJeux` sont
 * gardés. Renvoie { thematiques: [{ slug, titre, description, icone, jeux }], inconnus, ignorees } :
 * `slug` vaut null si le fichier n'en donne pas, `inconnus` liste les jeux écartés, `ignorees`
 * compte les thématiques abîmées d'un export groupé. Lève une erreur au message lisible sinon.
 */
export function lireImportThematiques(texte, slugsJeux) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    throw new Error('Ce fichier n’est pas un fichier de thématiques valide (JSON illisible).');
  }
  const groupe = donnees?.format === FORMAT_THEMATIQUES;
  const entrees = groupe
    ? Array.isArray(donnees.thematiques)
      ? donnees.thematiques
      : []
    : [donnees];
  const inconnus = new Set();
  const thematiques = [];
  for (const entree of entrees) {
    let lu;
    try {
      lu = lireDonnees(groupe ? { ...entree, format: FORMAT_DONNEES } : entree, slugsJeux);
    } catch (erreur) {
      // Un fichier seul : son erreur est la plus claire. Un export groupé : on passe à la suivante.
      if (!groupe) throw erreur;
      continue;
    }
    for (const slug of lu.inconnus) inconnus.add(slug);
    thematiques.push({
      slug: typeof entree.slug === 'string' ? entree.slug : null,
      titre: lu.titre,
      description: lu.description,
      icone: iconeValide(entree.icone),
      jeux: nettoyerJeux(lu.jeux, slugsJeux),
    });
  }
  if (!thematiques.length) {
    throw new Error('Ce fichier ne contient aucune thématique utilisable.');
  }
  return { thematiques, inconnus: [...inconnus], ignorees: entrees.length - thematiques.length };
}

/**
 * Lit plusieurs fichiers de thématiques d'un coup ([{ nom, texte }]) : leurs thématiques à la suite.
 * Un fichier inutilisable est noté dans `refuses` ([{ nom, message }]) sans bloquer les autres ;
 * s'ils le sont tous, l'erreur est levée (celle du fichier, s'il est seul).
 */
export function lireImportsThematiques(fichiers, slugsJeux) {
  const thematiques = [];
  const inconnus = new Set();
  const refuses = [];
  let ignorees = 0;
  for (const { nom, texte } of fichiers) {
    try {
      const lu = lireImportThematiques(texte, slugsJeux);
      thematiques.push(...lu.thematiques);
      for (const slug of lu.inconnus) inconnus.add(slug);
      ignorees += lu.ignorees;
    } catch (erreur) {
      refuses.push({ nom, message: erreur.message });
    }
  }
  if (!thematiques.length) {
    throw new Error(
      refuses.length === 1
        ? refuses[0].message
        : 'Aucun de ces fichiers ne contient de thématique utilisable.',
    );
  }
  return { thematiques, inconnus: [...inconnus], ignorees, refuses };
}

/**
 * Où ranger chaque thématique importée : à la place de la même thématique (même slug, sinon même
 * titre), y compris une thématique livrée supprimée ; sinon, une nouvelle thématique de
 * l'animateur. Renvoie [{ thematique (slug et titre définitifs), remplace: titre | null, integree }].
 */
export function associerImport(importees, catalogue, integrees = THEMATIQUES) {
  const connues = [
    ...thematiquesAffichees(catalogue, integrees),
    ...thematiquesSupprimees(catalogue, integrees),
  ];
  const prises = new Set();
  const resultat = [];
  for (const importee of importees) {
    const titreDuFichier = importee.titre || 'Thématique importée';
    const libre = (t) => !prises.has(t.slug);
    const cible =
      connues.find((t) => libre(t) && t.slug === importee.slug) ??
      connues.find((t) => libre(t) && cleTitre(t.titre) === cleTitre(titreDuFichier)) ??
      null;
    const occupes = [...connues.map((t) => t.slug), ...prises];
    let slug = cible?.slug;
    if (!slug) {
      slug =
        estSlugPerso(importee.slug) && !occupes.includes(importee.slug)
          ? importee.slug
          : nouveauSlug(titreDuFichier, occupes);
    }
    // Pas deux thématiques du même titre (deux fois le même dans le fichier, par exemple)
    const titresPris = [
      ...connues.filter((t) => t.slug !== slug).map((t) => t.titre),
      ...resultat.map((r) => r.thematique.titre),
    ];
    const titre = titreLibre(titreDuFichier, titresPris);
    prises.add(slug);
    resultat.push({
      thematique: { ...importee, slug, titre },
      remplace: cible ? cible.titre : null,
      integree: integrees.some((t) => t.slug === slug),
    });
  }
  return resultat;
}
