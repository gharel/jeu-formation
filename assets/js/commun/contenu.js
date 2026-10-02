/**
 * Contenu préparé par l'animateur : valeurs par défaut, nettoyage, validation, import et export.
 *
 * Chaque jeu décrit son contenu par un schéma :
 * {
 *   reglages: [{ cle, libelle, type: 'nombre' | 'case' | 'choix', defaut, min, max, unite, options }],
 *   elements: {
 *     libelle: 'Mot', pluriel: 'mots', feminin: false, min: 5, max: 5,
 *     champs: [{ cle, libelle, type, requis, secret, min, max, longueurMax, options, suggestions, aide }],
 *     valider(element) => message | null,
 *   },
 * }
 * Types de champs : texte, texte-long, nombre, case, choix, liste, image.
 */
import { lireNombre } from './nombres.js';

export const FORMAT = 'skazy-jeux';
export const VERSION = 1;

const LONGUEUR_TEXTE = 200;
const LONGUEUR_TEXTE_LONG = 1000;

function longueurMax(champ) {
  return champ.longueurMax ?? (champ.type === 'texte-long' ? LONGUEUR_TEXTE_LONG : LONGUEUR_TEXTE);
}

function valeurParDefaut(champ) {
  if ('defaut' in champ) return structuredClone(champ.defaut);
  switch (champ.type) {
    case 'nombre':
      return null;
    case 'case':
      return false;
    case 'choix':
      return champ.options[0].valeur;
    case 'liste':
      return Array.from({ length: champ.min ?? 1 }, () => '');
    case 'image':
      return null;
    default:
      return '';
  }
}

export function reglagesParDefaut(schema) {
  return Object.fromEntries((schema.reglages ?? []).map((r) => [r.cle, valeurParDefaut(r)]));
}

export function elementVide(schema) {
  return Object.fromEntries(schema.elements.champs.map((c) => [c.cle, valeurParDefaut(c)]));
}

function entre0et1(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
}

function nettoyerImage(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const image = { focus: { x: entre0et1(brut.focus?.x), y: entre0et1(brut.focus?.y) } };
  if (typeof brut.id === 'string' && /^[\w-]{1,64}$/.test(brut.id)) image.id = brut.id;
  // Chemin relatif simple uniquement (pas de « javascript: » ni d'adresse externe)
  if (
    typeof brut.src === 'string' &&
    /^[\w./-]{1,200}$/.test(brut.src) &&
    !brut.src.includes('..')
  ) {
    image.src = brut.src;
  }
  if (
    typeof brut.donnees === 'string' &&
    /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(brut.donnees)
  ) {
    image.donnees = brut.donnees;
  }
  return image.id || image.src || image.donnees ? image : null;
}

function nettoyerValeur(champ, brut) {
  switch (champ.type) {
    case 'texte':
    case 'texte-long':
      return typeof brut === 'string' || typeof brut === 'number'
        ? String(brut).slice(0, longueurMax(champ))
        : valeurParDefaut(champ);
    case 'nombre': {
      const n = lireNombre(brut);
      return n === null ? valeurParDefaut(champ) : n;
    }
    case 'case':
      return typeof brut === 'boolean' ? brut : valeurParDefaut(champ);
    case 'choix':
      return champ.options.some((o) => o.valeur === brut) ? brut : valeurParDefaut(champ);
    case 'liste':
      return Array.isArray(brut)
        ? brut
            .filter((v) => typeof v === 'string' || typeof v === 'number')
            .map((v) => String(v).slice(0, longueurMax(champ)))
            .slice(0, champ.max ?? 20)
        : valeurParDefaut(champ);
    case 'image':
      return nettoyerImage(brut);
    default:
      return null;
  }
}

/** Ne garde que les clés prévues par le schéma, avec le bon type. */
export function nettoyerContenu(schema, brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  const reglages = Object.fromEntries(
    (schema.reglages ?? []).map((r) => [r.cle, nettoyerValeur(r, source.reglages?.[r.cle])]),
  );
  const elementsBruts = Array.isArray(source.elements) ? source.elements : [];
  const elements = elementsBruts
    .filter((e) => e && typeof e === 'object')
    .slice(0, schema.elements.max ?? 50)
    .map((e) =>
      Object.fromEntries(schema.elements.champs.map((c) => [c.cle, nettoyerValeur(c, e[c.cle])])),
    );
  return { reglages, elements };
}

function estVide(champ, valeur) {
  switch (champ.type) {
    case 'nombre':
      return valeur === null || valeur === undefined;
    case 'liste':
      return elementsDeListe(valeur).length === 0;
    case 'image':
      return !valeur;
    case 'case':
      return false;
    default:
      return String(valeur ?? '').trim() === '';
  }
}

/** Valeurs non vides d'un champ liste. */
export function elementsDeListe(valeur) {
  return (Array.isArray(valeur) ? valeur : []).map((v) => String(v).trim()).filter(Boolean);
}

function verifierNombre(champ, valeur, prefixe) {
  if (valeur === null || valeur === undefined) return null;
  if (champ.min !== undefined && valeur < champ.min) {
    return `${prefixe}« ${champ.libelle} » doit être au moins ${champ.min}.`;
  }
  if (champ.max !== undefined && valeur > champ.max) {
    return `${prefixe}« ${champ.libelle} » doit être au plus ${champ.max}.`;
  }
  return null;
}

/** Liste des problèmes (en français) ; vide si le contenu est prêt à jouer. */
export function validerContenu(schema, contenu) {
  const erreurs = [];
  const { min = 1, max = 50, libelle, pluriel } = schema.elements;
  const nombre = contenu.elements.length;
  if (min === max && nombre !== min) {
    erreurs.push(`Il faut exactement ${min} ${pluriel} (actuellement ${nombre}).`);
  } else if (nombre < min) {
    erreurs.push(`Il faut au moins ${min} ${min > 1 ? pluriel : libelle.toLowerCase()}.`);
  } else if (nombre > max) {
    erreurs.push(`Il faut au plus ${max} ${pluriel}.`);
  }

  for (const reglage of schema.reglages ?? []) {
    const valeur = contenu.reglages[reglage.cle];
    if (reglage.type === 'nombre') {
      if (valeur === null || valeur === undefined) {
        erreurs.push(`Réglage « ${reglage.libelle} » : une valeur est obligatoire.`);
      } else {
        const probleme = verifierNombre(reglage, valeur, 'Réglage ');
        if (probleme) erreurs.push(probleme);
      }
    }
  }

  contenu.elements.forEach((element, i) => {
    const prefixe = `${libelle} ${i + 1} : `;
    for (const champ of schema.elements.champs) {
      const valeur = element[champ.cle];
      if (champ.requis && estVide(champ, valeur)) {
        erreurs.push(`${prefixe}« ${champ.libelle} » est obligatoire.`);
        continue;
      }
      if (champ.type === 'nombre') {
        const probleme = verifierNombre(champ, valeur, prefixe);
        if (probleme) erreurs.push(probleme);
      }
      if (champ.type === 'liste' && !estVide(champ, valeur)) {
        const n = elementsDeListe(valeur).length;
        if (champ.min && n < champ.min) {
          erreurs.push(
            `${prefixe}il faut au moins ${champ.min} « ${champ.libelle.toLowerCase()} ».`,
          );
        }
      }
    }
    const message = schema.elements.valider?.(element);
    if (message) erreurs.push(prefixe + message);
  });
  return erreurs;
}

/** « 5 mots prêts », « 1 question prête ». */
export function resumerContenu(schema, contenu) {
  const { libelle, pluriel, feminin } = schema.elements;
  const n = contenu.elements.length;
  const nom = n > 1 ? pluriel : libelle.toLowerCase();
  const pret = `prêt${feminin ? 'e' : ''}${n > 1 ? 's' : ''}`;
  return `${n} ${nom} ${pret}`;
}

/** Retire les étapes vides des listes avant d'enregistrer. */
export function compacterContenu(schema, contenu) {
  return {
    reglages: { ...contenu.reglages },
    elements: contenu.elements.map((e) => {
      const copie = { ...e };
      for (const champ of schema.elements.champs) {
        if (champ.type === 'liste') copie[champ.cle] = elementsDeListe(e[champ.cle]);
        if (champ.type === 'texte' || champ.type === 'texte-long') {
          copie[champ.cle] = String(e[champ.cle] ?? '').trim();
        }
      }
      return copie;
    }),
  };
}

export function preparerExport(slug, contenu, maintenant = new Date()) {
  return {
    format: FORMAT,
    version: VERSION,
    jeu: slug,
    exporteLe: maintenant.toISOString(),
    contenu,
  };
}

/** Lit un fichier exporté. Lève une erreur au message lisible si le fichier ne convient pas. */
export function lireImport(texte, slug, titresJeux = {}) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    throw new Error('Ce fichier n’est pas un export valide (JSON illisible).');
  }
  if (!donnees || donnees.format !== FORMAT || !donnees.contenu) {
    throw new Error('Ce fichier n’est pas un export des mini-jeux Skazy Formation.');
  }
  if (donnees.jeu !== slug) {
    const titre = titresJeux[donnees.jeu] ?? donnees.jeu;
    throw new Error(`Ce fichier contient le contenu d’un autre jeu (« ${titre} »).`);
  }
  return donnees.contenu;
}
