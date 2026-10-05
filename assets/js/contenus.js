/**
 * Page « Les contenus » : les questions de tous les jeux au même endroit.
 * - Charger une thématique prête à jouer dans tous les jeux : celles livrées
 *   (contenus/thematiques/*.json) et celles de l'animateur, gardées dans ce navigateur
 *   (catalogue-thematiques.js). On en crée, on les modifie, on les supprime ; on les exporte
 *   une par une ou toutes ensemble, et on les réimporte.
 * - Exporter tous les contenus en un seul fichier JSON (jeu de données), ou en importer un.
 * - Consulter le contenu de chaque jeu, et le modifier sur place (même éditeur que dans le jeu),
 *   dans le jeu lui-même ou dans une thématique. Les réponses sont masquées : l'écran est
 *   peut-être déjà projeté.
 */
import { exigerAcces } from './commun/acces.js';
import { JEUX } from './jeux.js';
import { fichierThematique, trouverThematique } from './thematiques.js';
import { lire, ecrire, effacer } from './commun/stockage.js';
import {
  cleContenu,
  nettoyerContenu,
  validerContenu,
  resumerContenu,
  champsAffiches,
  compacterContenu,
} from './commun/contenu.js';
import { creerEditeur } from './commun/editeur-contenu.js';
import {
  preparerJeuDeDonnees,
  lireJeuDeDonnees,
  contenuDepuisDonnees,
  lireSources,
  noterSource,
  oublierSource,
  LONGUEUR_TITRE,
} from './commun/jeux-de-donnees.js';
import {
  lireCatalogue,
  enregistrerCatalogue,
  thematiquesAffichees,
  thematiquesSupprimees,
  avecThematique,
  sansThematique,
  avecOriginale,
  avecSupprimeesRetablies,
  nouveauSlug,
  nettoyerJeux,
  preparerExportThematique,
  preparerExportThematiques,
  lireImportsThematiques,
  associerImport,
} from './commun/catalogue-thematiques.js';
import { telechargerJson, nomDeFichier } from './commun/fichiers.js';
import { adresseImage } from './commun/images.js';
import { confirmer } from './commun/dialogues.js';
import { ouvrirFicheThematique } from './commun/fiche-thematique.js';
import { el, remplir, icone, focaliser, annoncer } from './commun/ui.js';

await exigerAcces();

/** Racine du site : les jeux et les thématiques s'y trouvent. */
const RACINE = new URL('../../', import.meta.url);
const SLUGS = JEUX.map((jeu) => jeu.slug);
const AFFICHAGE_ACTUEL = 'actuel';
const AFFICHAGE_EXEMPLES = 'exemples';
const DEPART_VIDE = 'vide';
const ERREUR_STOCKAGE = 'Impossible d’enregistrer : le stockage du navigateur est plein ou bloqué.';

// Schéma, exemple et transfert (images de Zoom mystère) de chaque jeu
const definitions = Object.fromEntries(
  await Promise.all(
    JEUX.map(async (jeu) => {
      const module = await import(new URL(`jeux/${jeu.slug}/exemple.js`, RACINE).href);
      return [
        jeu.slug,
        { jeu, schema: module.schema, exemple: module.exemple, transfert: module.transfert ?? {} },
      ];
    }),
  ),
);

/** Les jeux que remplit une thématique : ceux sans image (Zoom mystère a besoin de captures). */
const SLUGS_THEMATIQUES = SLUGS.filter(
  (slug) => !definitions[slug].schema.elements.champs.some((c) => c.type === 'image'),
);

/** « 1 jeu », « 9 jeux ». */
const nombreDeJeux = (n) => `${n} jeu${n > 1 ? 'x' : ''}`;

/** « 1 thématique », « 3 thématiques ». */
const nombreDeThematiques = (n) => `${n} thématique${n > 1 ? 's' : ''}`;

/** Contenu joué aujourd'hui par un jeu : celui enregistré, sinon son exemple. */
function contenuActuel(slug) {
  const { schema, exemple } = definitions[slug];
  const enregistre = lire(cleContenu(slug));
  return { contenu: nettoyerContenu(schema, enregistre ?? exemple), estExemple: !enregistre };
}

/** Le schéma d'un jeu sans ses réglages : une thématique ne garde que les questions. */
const schemaQuestions = (slug) => ({ ...definitions[slug].schema, reglages: [] });

/** Les questions de chaque jeu d'une thématique, nettoyées avec le schéma du jeu. */
function jeuxPropres(jeux) {
  return Object.fromEntries(
    Object.entries(nettoyerJeux(jeux, SLUGS_THEMATIQUES)).map(([slug, brut]) => [
      slug,
      { elements: nettoyerContenu(schemaQuestions(slug), brut).elements },
    ]),
  );
}

// ---------- Thématiques : catalogue et fichiers ----------

let catalogue = lireCatalogue(SLUGS_THEMATIQUES);
const affichees = () => thematiquesAffichees(catalogue);
const trouverAffichee = (slug) => affichees().find((t) => t.slug === slug) ?? null;

/** Enregistre le catalogue modifié et redessine les cartes. Renvoie false si le stockage refuse. */
function changerCatalogue(nouveau) {
  if (!enregistrerCatalogue(nouveau)) return false;
  catalogue = nouveau;
  dessinerThematiques();
  dessinerChoixAffichage();
  return true;
}

const fichiersLus = new Map();

/** Une thématique livrée, telle que dans son fichier (lu une seule fois). */
function originale(slug) {
  if (!fichiersLus.has(slug)) {
    const livree = trouverThematique(slug);
    const lecture = fetch(new URL(fichierThematique(slug), RACINE))
      .then((reponse) => {
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        return reponse.text();
      })
      .then((texte) => {
        const donnees = lireJeuDeDonnees(texte, SLUGS);
        return {
          slug,
          titre: livree.titre,
          description: donnees.description,
          icone: livree.icone,
          jeux: donnees.jeux,
        };
      })
      .catch(() => {
        fichiersLus.delete(slug);
        throw new Error(
          'Impossible de lire cette thématique. Le site doit être ouvert depuis son adresse web, pas comme un fichier.',
        );
      });
    fichiersLus.set(slug, lecture);
  }
  return fichiersLus.get(slug);
}

/** Une thématique complète : sa version gardée dans ce navigateur, sinon son fichier. */
async function thematiqueComplete(slug) {
  const locale = catalogue.locales.find((t) => t.slug === slug);
  if (locale) return locale;
  if (!trouverThematique(slug)) throw new Error('Cette thématique n’existe plus.');
  return originale(slug);
}

/** Vrai si la thématique importée est exactement celle livrée : inutile d'en garder une copie. */
async function identiqueAOriginale(thematique) {
  try {
    const livree = await originale(thematique.slug);
    return (
      thematique.titre === livree.titre &&
      thematique.description === livree.description &&
      thematique.icone === livree.icone &&
      JSON.stringify(thematique.jeux) === JSON.stringify(jeuxPropres(livree.jeux))
    );
  } catch {
    return false;
  }
}

const titresDe = (slugs) => slugs.map((slug) => definitions[slug].jeu.titre);

/** « Zoom mystère garde son contenu. » pour les jeux absents du jeu de données. */
function phraseNonInclus(donnees) {
  const absents = titresDe(SLUGS.filter((slug) => !donnees.jeux[slug]));
  if (!absents.length) return '';
  return absents.length > 1
    ? `${absents.join(', ')} gardent leur contenu.`
    : `${absents[0]} garde son contenu.`;
}

/** « 14 jeux, sans Zoom mystère », « 3 jeux sur 15 », « Aucun jeu pour l’instant ». */
function resumerJeux(jeux) {
  const n = Object.keys(jeux).length;
  if (!n) return 'Aucun jeu pour l’instant';
  const absents = titresDe(SLUGS.filter((slug) => !jeux[slug]));
  if (!absents.length) return nombreDeJeux(n);
  return absents.length > 2
    ? `${nombreDeJeux(n)} sur ${SLUGS.length}`
    : `${nombreDeJeux(n)}, sans ${absents.join(', ')}`;
}

// ---------- Écriture des contenus ----------

/**
 * Enregistre le contenu de chaque jeu du jeu de données, avec sa source (« Google Sheets »).
 * Renvoie { charges: [titre], incomplets: ['Motus : …'] }.
 */
async function appliquer(donnees, source) {
  const charges = [];
  const incomplets = [];
  for (const [slug, brut] of Object.entries(donnees.jeux)) {
    const { jeu, schema, transfert } = definitions[slug];
    const importe = transfert.importer ? await transfert.importer(brut) : brut;
    const contenu = contenuDepuisDonnees(schema, importe, contenuActuel(slug).contenu);
    if (!ecrire(cleContenu(slug), contenu)) throw new Error(ERREUR_STOCKAGE);
    noterSource(slug, source);
    await transfert.apresEnregistrement?.(contenu);
    charges.push(jeu.titre);
    const erreurs = validerContenu(schema, contenu);
    if (erreurs.length) incomplets.push(`${jeu.titre} : ${erreurs.join(' ')}`);
  }
  return { charges, incomplets };
}

// ---------- Messages ----------

const zonesMessages = [];

function creerZoneMessages() {
  const zone = el('div', { class: 'messages' });
  zonesMessages.push(zone);
  return zone;
}

/**
 * Un seul message à la fois sur la page, dans la zone de la section concernée. `defiler` : faire
 * apparaître le message s'il est hors de l'écran (sous une grille de cartes, par exemple).
 */
function afficherMessage(
  zone,
  { texte, erreur = false, details = [], titreDetails = '', defiler = true },
) {
  for (const z of zonesMessages) remplir(z);
  remplir(
    zone,
    el(
      'div',
      {
        class: `message ${erreur ? 'message--erreur' : 'message--info'}`,
        role: erreur ? 'alert' : null,
      },
      el('p', {}, texte),
      details.length
        ? [
            titreDetails ? el('p', {}, titreDetails) : null,
            el(
              'ul',
              {},
              details.map((d) => el('li', {}, d)),
            ),
          ]
        : null,
    ),
  );
  if (defiler) zone.scrollIntoView?.({ block: 'nearest' });
  // Une erreur est lue par son role="alert" ; un succès, par la zone des annonces
  if (!erreur) annoncer(texte);
}

function messageDeChargement(texte, { charges, incomplets }, donnees, inconnus = []) {
  const details = [...incomplets];
  if (inconnus.length) details.push(`Ignoré (jeu inconnu) : ${inconnus.join(', ')}.`);
  return {
    texte: [`${texte} ${nombreDeJeux(charges.length)} mis à jour.`, phraseNonInclus(donnees)]
      .filter(Boolean)
      .join(' '),
    details,
    titreDetails: details.length ? 'À compléter dans le jeu :' : '',
  };
}

// ---------- Thématiques prêtes à jouer ----------

const messagesThematiques = creerZoneMessages();
const grilleThematiques = el('ul', { class: 'grille-thematiques' });
const barreThematiques = el('div', { class: 'groupe-boutons bloc-thematiques__outils' });

/** Après un échec de lecture ou d'enregistrement : le message dans la section des thématiques. */
const erreurThematiques = (texte) => afficherMessage(messagesThematiques, { texte, erreur: true });

async function chargerThematique(slug) {
  let thematique;
  try {
    thematique = await thematiqueComplete(slug);
  } catch (erreur) {
    erreurThematiques(erreur.message);
    return;
  }
  const n = Object.keys(thematique.jeux).length;
  if (!n) {
    erreurThematiques(
      `« ${thematique.titre} » ne contient encore aucun jeu : ajoutez-en depuis son aperçu.`,
    );
    return;
  }
  const nonInclus = phraseNonInclus(thematique);
  if (
    !(await confirmer({
      titre: `Charger « ${thematique.titre} » ?`,
      message: `Le contenu de ${nombreDeJeux(n)} sera remplacé par celui de la thématique, réglages conservés.${nonInclus ? ` ${nonInclus}` : ''} Pour garder vos contenus actuels, exportez-les d’abord.`,
      oui: 'Charger',
    }))
  ) {
    return;
  }
  try {
    const bilan = await appliquer(thematique, thematique.titre);
    afficherMessage(
      messagesThematiques,
      messageDeChargement(`Thématique « ${thematique.titre} » chargée :`, bilan, thematique),
    );
  } catch (erreur) {
    erreurThematiques(erreur.message);
  }
  dessinerThematiques();
  dessinerConsultation();
}

async function revenirAuxExemples() {
  if (
    !(await confirmer({
      titre: 'Revenir aux contenus d’exemple ?',
      message:
        'Tous les jeux, Zoom mystère compris, reprennent leur contenu d’exemple (réglages compris). Pour garder vos contenus actuels, exportez-les d’abord.',
      oui: 'Revenir aux exemples',
    }))
  ) {
    return;
  }
  for (const slug of SLUGS) {
    const { schema, exemple, transfert } = definitions[slug];
    effacer(cleContenu(slug));
    oublierSource(slug);
    await transfert.apresEnregistrement?.(nettoyerContenu(schema, exemple));
  }
  afficherMessage(messagesThematiques, {
    texte: `Contenus d’exemple remis dans les ${JEUX.length} jeux.`,
  });
  dessinerThematiques();
  dessinerConsultation();
}

/** « Dans 9 jeux » si la thématique est chargée (même en partie). */
function jeuxChargesDepuis(titre) {
  const sources = lireSources();
  return SLUGS.filter((slug) => sources[slug] === titre && lire(cleContenu(slug)) !== null).length;
}

// ---------- Fiche d'une thématique : titre, description, icône ----------

/** Les points de départ d'une nouvelle thématique : [{ valeur, libelle }]. */
function departsPossibles() {
  return [
    { valeur: AFFICHAGE_ACTUEL, libelle: 'Les contenus actuels de ce navigateur' },
    { valeur: AFFICHAGE_EXEMPLES, libelle: 'Les contenus d’exemple' },
    ...affichees().map((t) => ({ valeur: t.slug, libelle: `Une copie de : ${t.titre}` })),
    { valeur: DEPART_VIDE, libelle: 'Des questions vides, à écrire jeu par jeu' },
  ];
}

/** Les questions d'une nouvelle thématique, selon son point de départ. */
async function jeuxDeDepart(depart) {
  const pourChaqueJeu = (elements) =>
    Object.fromEntries(SLUGS_THEMATIQUES.map((slug) => [slug, { elements: elements(slug) }]));
  if (depart === DEPART_VIDE) return pourChaqueJeu(() => []);
  if (depart === AFFICHAGE_ACTUEL) {
    return pourChaqueJeu((slug) => contenuActuel(slug).contenu.elements);
  }
  if (depart === AFFICHAGE_EXEMPLES) {
    return pourChaqueJeu(
      (slug) => nettoyerContenu(definitions[slug].schema, definitions[slug].exemple).elements,
    );
  }
  return jeuxPropres((await thematiqueComplete(depart)).jeux);
}

async function creerThematique() {
  const fiche = await ouvrirFicheThematique({
    thematiques: affichees(),
    departs: departsPossibles(),
  });
  if (!fiche) return;
  let jeux;
  try {
    jeux = await jeuxDeDepart(fiche.depart);
  } catch (erreur) {
    erreurThematiques(erreur.message);
    return;
  }
  const pris = [...catalogue.locales, ...thematiquesSupprimees(catalogue), ...affichees()].map(
    (t) => t.slug,
  );
  const thematique = {
    slug: nouveauSlug(fiche.titre, pris),
    titre: fiche.titre,
    description: fiche.description,
    icone: fiche.icone,
    jeux,
  };
  if (!changerCatalogue(avecThematique(catalogue, thematique))) {
    erreurThematiques(ERREUR_STOCKAGE);
    return;
  }
  await voirDansConsultation(thematique.slug);
  // La page défile déjà jusqu'à la consultation
  afficherMessage(messagesConsultation, {
    texte: `Thématique « ${thematique.titre} » créée. Modifiez ses questions jeu par jeu ci-dessous, puis chargez-la.`,
    defiler: false,
  });
}

/** Le titre, la description et l'icône d'une thématique (fenêtre). */
async function modifierFiche(slug, zone = messagesThematiques) {
  let thematique;
  try {
    thematique = await thematiqueComplete(slug);
  } catch (erreur) {
    afficherMessage(zone, { texte: erreur.message, erreur: true });
    return;
  }
  const fiche = await ouvrirFicheThematique({ thematique, thematiques: affichees() });
  if (!fiche) return;
  const { titre, description, icone: nomIcone } = fiche;
  if (
    titre === thematique.titre &&
    description === thematique.description &&
    nomIcone === thematique.icone
  ) {
    return;
  }
  if (
    !changerCatalogue(
      avecThematique(catalogue, { ...thematique, titre, description, icone: nomIcone }),
    )
  ) {
    afficherMessage(zone, { texte: ERREUR_STOCKAGE, erreur: true });
    return;
  }
  await dessinerConsultation();
  afficherMessage(zone, { texte: `Thématique « ${titre} » enregistrée.` });
}

async function supprimerThematique(slug) {
  const affichee = trouverAffichee(slug);
  if (!affichee) return;
  const suite = affichee.integree
    ? `Elle disparaît de la liste : « Rétablir les thématiques supprimées » la fera revenir${affichee.modifiee ? ', sans vos modifications' : ''}.`
    : 'Elle est effacée de ce navigateur : pour la garder, exportez-la d’abord en JSON.';
  if (
    !(await confirmer({
      titre: `Supprimer « ${affichee.titre} » ?`,
      message: `${suite} Les jeux où elle est chargée gardent leurs questions.`,
      oui: 'Supprimer',
    }))
  ) {
    return;
  }
  if (!changerCatalogue(sansThematique(catalogue, slug))) {
    erreurThematiques(ERREUR_STOCKAGE);
    return;
  }
  await dessinerConsultation();
  afficherMessage(messagesThematiques, { texte: `Thématique « ${affichee.titre} » supprimée.` });
}

async function retablirOriginale(slug) {
  const livree = trouverThematique(slug);
  if (
    !(await confirmer({
      titre: `Rétablir « ${livree.titre} » d’origine ?`,
      message:
        'La thématique reprend ses questions, son titre et son icône d’origine : vos modifications seront perdues.',
      oui: 'Rétablir',
    }))
  ) {
    return;
  }
  if (!changerCatalogue(avecOriginale(catalogue, slug))) {
    erreurThematiques(ERREUR_STOCKAGE);
    return;
  }
  await dessinerConsultation();
  afficherMessage(messagesThematiques, {
    texte: `Thématique « ${livree.titre} » rétablie d’origine.`,
  });
}

function retablirSupprimees() {
  const titres = thematiquesSupprimees(catalogue).map((t) => t.titre);
  if (!changerCatalogue(avecSupprimeesRetablies(catalogue))) {
    erreurThematiques(ERREUR_STOCKAGE);
    return;
  }
  dessinerConsultation();
  afficherMessage(messagesThematiques, {
    texte: `${titres.length > 1 ? 'Thématiques rétablies' : 'Thématique rétablie'} : ${titres.join(', ')}.`,
  });
}

// ---------- Thématiques : fichiers JSON ----------

async function exporterThematique(slug) {
  let thematique;
  try {
    thematique = await thematiqueComplete(slug);
  } catch (erreur) {
    erreurThematiques(erreur.message);
    return;
  }
  telechargerJson(`skazy-thematique-${slug}.json`, preparerExportThematique(thematique));
  afficherMessage(messagesThematiques, {
    texte: `Thématique « ${thematique.titre} » exportée en JSON.`,
  });
}

async function exporterThematiques() {
  let toutes;
  try {
    toutes = await Promise.all(affichees().map((t) => thematiqueComplete(t.slug)));
  } catch (erreur) {
    erreurThematiques(erreur.message);
    return;
  }
  if (!toutes.length) {
    erreurThematiques('Aucune thématique à exporter.');
    return;
  }
  telechargerJson(nomDeFichier('skazy-thematiques'), preparerExportThematiques(toutes));
  afficherMessage(messagesThematiques, {
    texte: `${nombreDeThematiques(toutes.length)} exportée${toutes.length > 1 ? 's' : ''} dans un seul fichier.`,
  });
}

/** Un ou plusieurs fichiers : thématiques seules, export groupé, ou tout jeu de données. */
async function importerThematiques(fichiers) {
  let lu;
  try {
    const textes = await Promise.all(
      fichiers.map(async (fichier) => ({ nom: fichier.name, texte: await fichier.text() })),
    );
    lu = lireImportsThematiques(textes, SLUGS_THEMATIQUES);
  } catch (erreur) {
    erreurThematiques(erreur.message);
    return;
  }
  const plan = associerImport(lu.thematiques, catalogue);
  const nouvelles = plan.filter((p) => !p.remplace).map((p) => `« ${p.thematique.titre} »`);
  const remplacees = plan.filter((p) => p.remplace).map((p) => `« ${p.remplace} »`);
  if (
    !(await confirmer({
      titre:
        plan.length > 1
          ? `Importer ${nombreDeThematiques(plan.length)} ?`
          : `Importer « ${plan[0].thematique.titre} » ?`,
      message: [
        nouvelles.length
          ? `Nouvelle${nouvelles.length > 1 ? 's' : ''} : ${nouvelles.join(', ')}.`
          : '',
        remplacees.length
          ? `Remplacée${remplacees.length > 1 ? 's' : ''} par celle du fichier : ${remplacees.join(', ')}.`
          : '',
        'Les jeux ne changent pas tant que vous ne chargez pas une thématique.',
      ]
        .filter(Boolean)
        .join(' '),
      oui: 'Importer',
    }))
  ) {
    return;
  }
  let nouveau = catalogue;
  for (const { thematique, integree } of plan) {
    const propre = { ...thematique, jeux: jeuxPropres(thematique.jeux) };
    // Une thématique livrée revenue telle quelle : pas de copie, elle reste « d'origine »
    nouveau =
      integree && (await identiqueAOriginale(propre))
        ? avecOriginale(nouveau, propre.slug)
        : avecThematique(nouveau, propre);
  }
  if (!changerCatalogue(nouveau)) {
    erreurThematiques(ERREUR_STOCKAGE);
    return;
  }
  await dessinerConsultation();
  const avecImages = titresDe(lu.inconnus.filter((slug) => SLUGS.includes(slug)));
  const inconnus = lu.inconnus.filter((slug) => !SLUGS.includes(slug));
  const details = [
    avecImages.length
      ? `Ignoré : ${avecImages.join(', ')} (les images n’entrent pas dans les thématiques).`
      : '',
    inconnus.length ? `Ignoré (jeu inconnu) : ${inconnus.join(', ')}.` : '',
    lu.ignorees
      ? `${nombreDeThematiques(lu.ignorees)} illisible${lu.ignorees > 1 ? 's' : ''}, ignorée${lu.ignorees > 1 ? 's' : ''}.`
      : '',
    ...lu.refuses.map(({ nom, message }) => `Fichier ignoré, ${nom} : ${message}`),
  ].filter(Boolean);
  afficherMessage(messagesThematiques, {
    texte: `${nombreDeThematiques(plan.length)} importée${plan.length > 1 ? 's' : ''} : ${plan.map((p) => p.thematique.titre).join(', ')}.`,
    details,
  });
}

const entreeImportThematiques = el('input', {
  id: 'fichier-thematiques',
  type: 'file',
  accept: 'application/json,.json',
  // Plusieurs fichiers d'un coup : les thématiques envoyées une par une par un collègue
  multiple: true,
  class: 'visuellement-cache',
  onchange: async (e) => {
    const fichiers = [...(e.target.files ?? [])];
    e.target.value = '';
    if (fichiers.length) await importerThematiques(fichiers);
  },
});

// ---------- Thématiques : cartes ----------

/** Bouton de carte, avec le nom de la thématique pour les lecteurs d'écran. */
function boutonCarte({ classe = 'bouton bouton--discret', nomIcone, texte, cache, onclick }) {
  return el(
    'button',
    { type: 'button', class: classe, onclick },
    icone(nomIcone),
    texte,
    el('span', { class: 'visuellement-cache' }, cache),
  );
}

function carteThematique({ slug, titre, icone: nomIcone, integree, modifiee, locale }) {
  const description = el(
    'p',
    { class: 'carte-thematique__description' },
    locale ? locale.description : '…',
  );
  const jeux = el(
    'p',
    { class: 'carte-thematique__jeux' },
    locale ? resumerJeux(locale.jeux) : null,
  );
  if (!locale) {
    originale(slug)
      .then((donnees) => {
        remplir(description, donnees.description);
        remplir(jeux, resumerJeux(donnees.jeux));
      })
      .catch(() => remplir(description, 'Fichier introuvable.'));
  }
  const charges = jeuxChargesDepuis(titre);
  let statut = null;
  if (!integree) statut = 'Votre thématique';
  else if (modifiee) statut = 'Modifiée';
  return el(
    'li',
    {},
    el(
      'article',
      { class: 'carte carte-thematique', dataset: { thematique: slug } },
      el(
        'div',
        { class: 'carte-thematique__entete' },
        el('span', { class: 'carte-thematique__icone' }, icone(nomIcone)),
        el(
          'div',
          {},
          el('h4', { class: 'carte-thematique__titre' }, titre),
          statut ? el('span', { class: 'etiquette carte-thematique__statut' }, statut) : null,
        ),
      ),
      charges
        ? el(
            'p',
            { class: 'carte-thematique__chargee' },
            icone('circle-check'),
            `Chargée dans ${nombreDeJeux(charges)}`,
          )
        : null,
      locale && !locale.description ? null : description,
      jeux,
      el(
        'div',
        { class: 'groupe-boutons' },
        boutonCarte({
          classe: 'bouton bouton--principal',
          nomIcone: 'file-import',
          texte: 'Charger',
          cache: ` ${titre}`,
          onclick: () => chargerThematique(slug),
        }),
        boutonCarte({
          nomIcone: 'eye',
          texte: 'Aperçu',
          cache: ` de ${titre}`,
          onclick: () => voirDansConsultation(slug),
        }),
      ),
      el(
        'div',
        { class: 'carte-thematique__outils' },
        boutonCarte({
          nomIcone: 'pen',
          texte: 'Modifier',
          cache: ` ${titre}`,
          onclick: () => modifierFiche(slug),
        }),
        boutonCarte({
          nomIcone: 'download',
          texte: 'JSON',
          cache: ` de ${titre}`,
          onclick: () => exporterThematique(slug),
        }),
        modifiee
          ? boutonCarte({
              nomIcone: 'rotate-left',
              texte: 'Rétablir l’originale',
              cache: ` de ${titre}`,
              onclick: () => retablirOriginale(slug),
            })
          : null,
        boutonCarte({
          nomIcone: 'trash-can',
          texte: 'Supprimer',
          cache: ` ${titre}`,
          onclick: () => supprimerThematique(slug),
        }),
      ),
    ),
  );
}

function carteExemples() {
  return el(
    'li',
    {},
    el(
      'article',
      { class: 'carte carte-thematique carte-thematique--exemples' },
      el(
        'div',
        { class: 'carte-thematique__entete' },
        el('span', { class: 'carte-thematique__icone' }, icone('rotate-left')),
        el('h4', { class: 'carte-thematique__titre' }, 'Contenus d’exemple'),
      ),
      el(
        'p',
        { class: 'carte-thematique__description' },
        'Les contenus livrés avec les jeux : culture numérique générale (clavier, Internet, sécurité…), Zoom mystère compris.',
      ),
      el('p', { class: 'carte-thematique__jeux' }, `${JEUX.length} jeux`),
      el(
        'div',
        { class: 'groupe-boutons' },
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => revenirAuxExemples() },
          icone('rotate-left'),
          'Revenir aux exemples',
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            onclick: () => voirDansConsultation(AFFICHAGE_EXEMPLES),
          },
          icone('eye'),
          'Aperçu',
          el('span', { class: 'visuellement-cache' }, ' des contenus d’exemple'),
        ),
      ),
    ),
  );
}

function dessinerThematiques() {
  remplir(grilleThematiques, affichees().map(carteThematique), carteExemples());
  const supprimees = thematiquesSupprimees(catalogue).length;
  remplir(
    barreThematiques,
    el(
      'button',
      { type: 'button', class: 'bouton', onclick: () => creerThematique() },
      icone('plus'),
      'Créer une thématique',
    ),
    el(
      'button',
      { type: 'button', class: 'bouton bouton--discret', onclick: () => exporterThematiques() },
      icone('file-export'),
      'Exporter toutes les thématiques',
    ),
    el(
      'label',
      { for: 'fichier-thematiques', class: 'bouton bouton--discret' },
      icone('upload'),
      'Importer des thématiques…',
    ),
    supprimees
      ? el(
          'button',
          { type: 'button', class: 'bouton bouton--discret', onclick: () => retablirSupprimees() },
          icone('rotate-left'),
          `Rétablir les thématiques supprimées (${supprimees})`,
        )
      : null,
  );
}

// ---------- Import et export d'un jeu de données ----------

const messagesFichier = creerZoneMessages();
const champTitre = el('input', {
  id: 'titre-export',
  type: 'text',
  class: 'champ__controle',
  autocomplete: 'off',
  maxlength: LONGUEUR_TITRE,
  placeholder: 'Ex. : Excel débutant, mairie',
  'aria-describedby': 'aide-titre-export',
});

async function exporterTout() {
  const contenus = {};
  for (const slug of SLUGS) {
    const { transfert } = definitions[slug];
    const { contenu } = contenuActuel(slug);
    contenus[slug] = transfert.exporter ? await transfert.exporter(contenu) : contenu;
  }
  const titre = champTitre.value.trim() || 'Mes contenus';
  telechargerJson(
    nomDeFichier('skazy-contenus', champTitre.value),
    preparerJeuDeDonnees({ titre, contenus }),
  );
  afficherMessage(messagesFichier, {
    texte: `Contenus des ${JEUX.length} jeux exportés : « ${titre} ».`,
  });
}

async function importer(fichier) {
  let donnees;
  try {
    donnees = lireJeuDeDonnees(await fichier.text(), SLUGS);
  } catch (erreur) {
    afficherMessage(messagesFichier, { texte: erreur.message, erreur: true });
    return;
  }
  const titres = titresDe(Object.keys(donnees.jeux));
  const nom = donnees.titre || 'Fichier importé';
  if (
    !(await confirmer({
      titre: `Importer « ${nom} » ?`,
      message: `Le contenu de ${nombreDeJeux(titres.length)} sera remplacé : ${titres.join(', ')}. Pour garder vos contenus actuels, exportez-les d’abord.`,
      oui: 'Importer',
    }))
  ) {
    return;
  }
  try {
    const bilan = await appliquer(donnees, nom);
    afficherMessage(
      messagesFichier,
      messageDeChargement(`« ${nom} » importé :`, bilan, donnees, donnees.inconnus),
    );
  } catch (erreur) {
    afficherMessage(messagesFichier, { texte: erreur.message, erreur: true });
  }
  dessinerThematiques();
  dessinerConsultation();
}

const entreeImport = el('input', {
  id: 'fichier-contenus',
  type: 'file',
  accept: 'application/json,.json',
  class: 'visuellement-cache',
  onchange: async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (fichier) await importer(fichier);
  },
});

// ---------- Consultation ----------

const choixAffichage = el('select', {
  id: 'choix-affichage',
  class: 'champ__controle',
  onchange: () => dessinerConsultation(),
});

/** Les contenus actuels, chaque thématique affichée, puis les exemples (choix gardé si possible). */
function dessinerChoixAffichage() {
  const valeur = choixAffichage.value || AFFICHAGE_ACTUEL;
  remplir(
    choixAffichage,
    el('option', { value: AFFICHAGE_ACTUEL }, 'Les contenus actuels de ce navigateur'),
    affichees().map((t) => el('option', { value: t.slug }, `Thématique : ${t.titre}`)),
    el('option', { value: AFFICHAGE_EXEMPLES }, 'Les contenus d’exemple'),
  );
  const existe = [...choixAffichage.options].some((option) => option.value === valeur);
  choixAffichage.value = existe ? valeur : AFFICHAGE_ACTUEL;
}

const messagesConsultation = creerZoneMessages();
const consultation = el('div', { class: 'consultation consultation--masque' });
const enteteConsultation = el('div', { class: 'consultation__entete' });
const listeJeux = el('ul', { class: 'consultation__jeux', 'aria-label': 'Contenu des jeux' });
const boutonReponses = el(
  'button',
  {
    type: 'button',
    class: 'bouton bouton--discret',
    'aria-pressed': 'false',
    onclick: () => {
      const masque = consultation.classList.toggle('consultation--masque');
      boutonReponses.setAttribute('aria-pressed', String(!masque));
      remplir(
        boutonReponses,
        icone(masque ? 'eye' : 'eye-slash'),
        masque ? 'Afficher les réponses' : 'Masquer les réponses',
      );
    },
  },
  icone('eye'),
  'Afficher les réponses',
);
consultation.append(enteteConsultation, listeJeux);
let tourDeDessin = 0;

/** Valeur d'un champ : texte, liste numérotée ou image. */
function valeurAffichee(slug, champ) {
  const classe = champ.secret ? 'secret' : null;
  if (champ.liste) {
    return el(
      'ol',
      { class: `apercu-element__liste${classe ? ` ${classe}` : ''}` },
      champ.liste.map((ligne) => el('li', {}, ligne)),
    );
  }
  if (champ.image) {
    const image = el('img', {
      class: `apercu-element__image${classe ? ` ${classe}` : ''}`,
      alt: 'Image mystère',
    });
    // Image d'exemple : chemin relatif au dossier du jeu
    const brute = champ.image.src
      ? { src: new URL(`jeux/${slug}/${champ.image.src}`, RACINE).href }
      : champ.image;
    adresseImage(brute)
      .then((adresse) => {
        if (adresse) image.src = adresse;
      })
      .catch(() => {});
    return image;
  }
  return el('span', { class: classe }, champ.texte);
}

function elementAffiche(slug, schema, element, index) {
  return el(
    'li',
    { class: 'apercu-element' },
    el('p', { class: 'apercu-element__numero' }, `${schema.elements.libelle} ${index + 1}`),
    el(
      'dl',
      { class: 'apercu-element__champs' },
      champsAffiches(schema, element).map((champ) =>
        el(
          'div',
          { class: 'apercu-element__champ' },
          el('dt', {}, champ.libelle),
          el('dd', {}, valeurAffichee(slug, champ)),
        ),
      ),
    ),
  );
}

// ---------- Modification sur place : dans le jeu, ou dans une thématique ----------

/** Éditeurs ouverts : détruits avant chaque nouveau dessin de la consultation. */
const editeursOuverts = new Set();

/**
 * Images d'exemple (« exemples/clavier.svg ») : leur chemin part du dossier du jeu. Ici, l'éditeur
 * a besoin de l'adresse complète ; on la raccourcit de nouveau à l'enregistrement.
 */
function changerAdressesImages(slug, contenu, changer) {
  const { schema } = definitions[slug];
  const champsImage = schema.elements.champs.filter((c) => c.type === 'image');
  if (!champsImage.length) return contenu;
  return {
    ...contenu,
    elements: contenu.elements.map((element) => {
      const copie = { ...element };
      for (const { cle } of champsImage) {
        const src = copie[cle]?.src;
        if (typeof src === 'string') copie[cle] = { ...copie[cle], src: changer(src) };
      }
      return copie;
    }),
  };
}

const dossierDuJeu = (slug) => new URL(`jeux/${slug}/`, RACINE).href;

function adressesCompletes(slug, contenu) {
  return changerAdressesImages(slug, contenu, (src) =>
    /^[a-z]+:/i.test(src) ? src : new URL(src, dossierDuJeu(slug)).href,
  );
}

function adressesRelatives(slug, contenu) {
  const dossier = dossierDuJeu(slug);
  return changerAdressesImages(slug, contenu, (src) =>
    src.startsWith(dossier) ? src.slice(dossier.length) : src,
  );
}

/**
 * Modifier le contenu actuel d'un jeu. Une cible d'édition : { schema, contenu, titre, aide,
 * annonce, enregistrer(brouillon) } ; enregistrer() renvoie le contenu enregistré, ou null si le
 * stockage refuse.
 */
function cibleJeu(slug) {
  const { jeu, schema, transfert } = definitions[slug];
  let enregistre = contenuActuel(slug).contenu;
  return {
    schema,
    contenu: adressesCompletes(slug, enregistre),
    titre: `Modifier le contenu de ${jeu.titre}`,
    aide: 'Les réponses sont masquées : vous pouvez modifier le contenu même si l’écran est projeté. Il est enregistré dans ce navigateur, pour le jeu.',
    annonce: `Contenu de ${jeu.titre} enregistré`,
    async enregistrer(brouillon) {
      const nouveau = nettoyerContenu(schema, adressesRelatives(slug, brouillon));
      if (!ecrire(cleContenu(slug), nouveau)) return null;
      // Contenu retouché : ce n'est plus celui de la thématique chargée
      if (JSON.stringify(nouveau) !== JSON.stringify(enregistre)) oublierSource(slug);
      enregistre = nouveau;
      await transfert.apresEnregistrement?.(nouveau);
      return nouveau;
    },
  };
}

/** Modifier les questions d'un jeu dans une thématique (ou l'y ajouter) : le jeu ne change pas. */
function cibleThematique(slug, thematique) {
  const { jeu } = definitions[slug];
  const schema = schemaQuestions(slug);
  return {
    schema,
    contenu: nettoyerContenu(schema, thematique.jeux[slug] ?? { elements: [] }),
    titre: `Modifier ${jeu.titre} dans « ${thematique.titre} »`,
    aide: 'Ces questions sont enregistrées dans la thématique, pas dans le jeu : chargez la thématique pour les jouer. Les réglages du jeu (durées, points…) ne changent pas.',
    annonce: `${jeu.titre} enregistré dans la thématique ${thematique.titre}`,
    async enregistrer(brouillon) {
      const nouveau = nettoyerContenu(schema, brouillon);
      const actuelle = await thematiqueComplete(thematique.slug);
      const jeux = nettoyerJeux(
        { ...actuelle.jeux, [slug]: { elements: nouveau.elements } },
        SLUGS_THEMATIQUES,
      );
      return changerCatalogue(avecThematique(catalogue, { ...actuelle, jeux })) ? nouveau : null;
    },
  };
}

/** Remplace l'aperçu d'un jeu par son éditeur (le même que dans le jeu), avec Enregistrer. */
function ouvrirEdition(slug, corps, cible) {
  const { schema } = cible;
  const editeur = creerEditeur({ schema, contenu: cible.contenu });
  editeursOuverts.add(editeur);
  let reference = JSON.stringify(editeur.valeur());
  const zoneErreurs = el('div', { class: 'messages', role: 'alert' });
  const titre = el('h3', { class: 'apercu-jeu__titre-edition', tabindex: '-1' }, cible.titre);

  async function fermer(message) {
    editeur.detruire();
    editeursOuverts.delete(editeur);
    await dessinerConsultation();
    listeJeux.querySelector(`[data-modifier="${slug}"]`)?.focus();
    if (message) annoncer(message);
  }

  async function enregistrer() {
    const nouveau = await cible.enregistrer(compacterContenu(schema, editeur.valeur()));
    if (!nouveau) {
      remplir(zoneErreurs, el('p', { class: 'message message--erreur' }, ERREUR_STOCKAGE));
      return;
    }
    reference = JSON.stringify(editeur.valeur());
    const erreurs = validerContenu(schema, nouveau);
    if (erreurs.length) {
      remplir(
        zoneErreurs,
        el(
          'div',
          { class: 'message message--erreur' },
          el('p', {}, 'Enregistré, mais il reste à compléter :'),
          el(
            'ul',
            {},
            erreurs.map((m) => el('li', {}, m)),
          ),
        ),
      );
      zoneErreurs.scrollIntoView?.({ block: 'center' });
      return;
    }
    await fermer(cible.annonce);
  }

  async function annuler() {
    const modifie = JSON.stringify(editeur.valeur()) !== reference;
    if (
      !modifie ||
      (await confirmer({
        titre: 'Abandonner les modifications ?',
        message: 'Les changements non enregistrés seront perdus.',
        oui: 'Abandonner',
      }))
    ) {
      await fermer();
    }
  }

  remplir(
    corps,
    el(
      'div',
      { class: 'apercu-jeu__edition' },
      titre,
      el('p', { class: 'champ__aide' }, cible.aide),
      editeur.element,
      zoneErreurs,
      el(
        'div',
        { class: 'barre-actions' },
        el('button', { type: 'button', class: 'bouton', onclick: annuler }, 'Annuler'),
        el(
          'button',
          { type: 'button', class: 'bouton bouton--principal', onclick: enregistrer },
          'Enregistrer',
        ),
      ),
    ),
  );
  focaliser(titre);
}

async function retirerDeThematique(slug, thematique) {
  const { jeu } = definitions[slug];
  if (
    !(await confirmer({
      titre: `Retirer ${jeu.titre} de « ${thematique.titre} » ?`,
      message:
        'Ses questions sont effacées de la thématique. Au chargement de la thématique, le jeu gardera son contenu.',
      oui: 'Retirer',
    }))
  ) {
    return;
  }
  const actuelle = await thematiqueComplete(thematique.slug);
  const jeux = Object.fromEntries(Object.entries(actuelle.jeux).filter(([s]) => s !== slug));
  if (!changerCatalogue(avecThematique(catalogue, { ...actuelle, jeux }))) {
    afficherMessage(messagesConsultation, { texte: ERREUR_STOCKAGE, erreur: true });
    return;
  }
  await dessinerConsultation();
  listeJeux.querySelector(`[data-modifier="${slug}"]`)?.focus();
  annoncer(`${jeu.titre} retiré de la thématique ${thematique.titre}`);
}

/** Bouton « Modifier » (ou « Ajouter ») d'un jeu de la consultation : il ouvre l'éditeur. */
function boutonEdition(slug, { texte, nomIcone, libelle, cible }) {
  return el(
    'button',
    {
      type: 'button',
      class: 'bouton bouton--principal',
      dataset: { modifier: slug },
      'aria-label': libelle,
      onclick: (e) => ouvrirEdition(slug, e.currentTarget.closest('.apercu-jeu__corps'), cible()),
    },
    icone(nomIcone),
    texte,
  );
}

/**
 * Un jeu de la consultation : `contenu` null si le jeu n'est pas dans la thématique (`absent`
 * dit pourquoi). `actions` : boutons placés avant le lien vers le jeu.
 */
function jeuAffiche(slug, contenu, etiquette, { actions = [], absent = '' } = {}) {
  const { jeu, schema } = definitions[slug];
  const erreurs = contenu ? validerContenu(schema, contenu) : [];
  let etat = absent;
  if (contenu) etat = erreurs.length ? 'Contenu incomplet' : resumerContenu(schema, contenu);
  const barre = el(
    'p',
    { class: 'apercu-jeu__actions' },
    actions,
    contenu
      ? el(
          'a',
          { class: 'bouton bouton--discret', href: dossierDuJeu(slug) },
          icone('play'),
          `Ouvrir ${jeu.titre}`,
        )
      : null,
  );
  let corps = null;
  if (contenu) {
    corps = el(
      'div',
      { class: 'apercu-jeu__corps' },
      erreurs.length
        ? el(
            'ul',
            { class: 'erreurs' },
            erreurs.map((m) => el('li', {}, m)),
          )
        : null,
      barre,
      el(
        'ol',
        { class: 'apercu-jeu__elements' },
        contenu.elements.map((element, i) => elementAffiche(slug, schema, element, i)),
      ),
    );
  } else if (actions.length) {
    corps = el('div', { class: 'apercu-jeu__corps' }, barre);
  }
  return el(
    'li',
    {},
    el(
      'details',
      { class: 'apercu-jeu', dataset: { couleur: jeu.couleur, jeu: slug } },
      el(
        'summary',
        { class: 'apercu-jeu__resume' },
        el('span', { class: 'apercu-jeu__icone' }, icone(jeu.icone)),
        el(
          'span',
          { class: 'apercu-jeu__textes' },
          el('span', { class: 'apercu-jeu__titre' }, jeu.titre),
          el(
            'span',
            { class: `apercu-jeu__etat${erreurs.length ? ' apercu-jeu__etat--ko' : ''}` },
            etat,
            etiquette ? el('span', { class: 'etiquette' }, etiquette) : null,
          ),
        ),
        icone('chevron-down', { classe: 'apercu-jeu__chevron' }),
      ),
      corps,
    ),
  );
}

/** Les jeux d'une thématique, chacun modifiable dans la thématique. */
function jeuxDeThematique(thematique) {
  return SLUGS.map((slug) => {
    const { jeu, schema } = definitions[slug];
    const brut = thematique.jeux[slug];
    if (!SLUGS_THEMATIQUES.includes(slug)) {
      return jeuAffiche(slug, null, 'non inclus', {
        absent: 'Pas dans les thématiques : il lui faut des captures d’écran.',
      });
    }
    const cible = () => cibleThematique(slug, thematique);
    if (!brut) {
      return jeuAffiche(slug, null, 'non inclus', {
        absent: 'Pas dans cette thématique : le jeu garde son contenu.',
        actions: [
          boutonEdition(slug, {
            texte: 'Ajouter à la thématique',
            nomIcone: 'plus',
            libelle: `Ajouter ${jeu.titre} à la thématique`,
            cible,
          }),
        ],
      });
    }
    return jeuAffiche(slug, contenuDepuisDonnees(schema, brut), null, {
      actions: [
        boutonEdition(slug, {
          texte: 'Modifier',
          nomIcone: 'pen',
          libelle: `Modifier le contenu de ${jeu.titre} dans la thématique`,
          cible,
        }),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            'aria-label': `Retirer ${jeu.titre} de la thématique`,
            onclick: () => retirerDeThematique(slug, thematique),
          },
          icone('xmark'),
          'Retirer',
        ),
      ],
    });
  });
}

/** En tête de la consultation d'une thématique : son nom, ses infos, la charger. */
function enteteDeThematique(thematique) {
  return el(
    'div',
    { class: 'consultation__thematique' },
    el('span', { class: 'carte-thematique__icone' }, icone(thematique.icone)),
    el(
      'div',
      { class: 'consultation__thematique-textes' },
      el('p', { class: 'consultation__thematique-titre' }, thematique.titre),
      el(
        'p',
        { class: 'champ__aide' },
        'Vos modifications sont gardées dans la thématique, pas dans les jeux : chargez-la pour les jouer.',
      ),
    ),
    el(
      'div',
      { class: 'groupe-boutons' },
      el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--discret',
          onclick: () => modifierFiche(thematique.slug, messagesConsultation),
        },
        icone('pen'),
        'Titre, description, icône',
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--principal',
          onclick: () => chargerThematique(thematique.slug),
        },
        icone('file-import'),
        'Charger cette thématique',
      ),
    ),
  );
}

async function dessinerConsultation() {
  const tour = ++tourDeDessin;
  const choix = choixAffichage.value;
  const ouverts = new Set(
    [...listeJeux.querySelectorAll('details[open]')].map((d) => d.dataset.jeu),
  );
  let elements;
  let entete = null;
  if (choix === AFFICHAGE_ACTUEL) {
    const sources = lireSources();
    elements = SLUGS.map((slug) => {
      const { contenu, estExemple } = contenuActuel(slug);
      const { jeu } = definitions[slug];
      return jeuAffiche(slug, contenu, estExemple ? 'contenu d’exemple' : (sources[slug] ?? null), {
        actions: [
          boutonEdition(slug, {
            texte: 'Modifier',
            nomIcone: 'pen',
            libelle: `Modifier le contenu de ${jeu.titre}`,
            cible: () => cibleJeu(slug),
          }),
        ],
      });
    });
  } else if (choix === AFFICHAGE_EXEMPLES) {
    elements = SLUGS.map((slug) => {
      const { schema, exemple } = definitions[slug];
      return jeuAffiche(slug, nettoyerContenu(schema, exemple), null);
    });
  } else {
    let thematique;
    try {
      thematique = await thematiqueComplete(choix);
    } catch (erreur) {
      if (tour === tourDeDessin) {
        remplir(enteteConsultation);
        remplir(listeJeux, el('li', { class: 'erreurs' }, erreur.message));
      }
      return;
    }
    if (tour !== tourDeDessin) return;
    entete = enteteDeThematique(thematique);
    elements = jeuxDeThematique(thematique);
  }
  // Un éditeur encore ouvert disparaît avec l'ancien dessin
  for (const editeur of editeursOuverts) editeur.detruire();
  editeursOuverts.clear();
  remplir(enteteConsultation, entete);
  remplir(listeJeux, elements);
  for (const details of listeJeux.querySelectorAll('details')) {
    if (ouverts.has(details.dataset.jeu)) details.open = true;
  }
}

async function voirDansConsultation(valeur) {
  choixAffichage.value = valeur;
  const dessin = dessinerConsultation();
  const titre = document.getElementById('titre-consultation');
  titre?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  focaliser(titre);
  const thematique = trouverAffichee(valeur);
  annoncer(
    thematique ? `Aperçu de la thématique ${thematique.titre}` : 'Aperçu des contenus d’exemple',
  );
  await dessin;
}

// ---------- Page ----------

dessinerThematiques();
dessinerChoixAffichage();
dessinerConsultation();

const titre = el('h2', {}, 'Quelles questions pour cette séance ?');
remplir(
  document.getElementById('cadre'),
  el(
    'section',
    { class: 'ecran ecran-contenus' },
    el(
      'div',
      { class: 'intro carte' },
      el('p', { class: 'intro__icone' }, icone('layer-group')),
      el(
        'div',
        {},
        titre,
        el(
          'p',
          { class: 'intro__accroche' },
          'Chargez une thématique prête à jouer dans tous les jeux, créez la vôtre, ou gardez vos propres questions dans un seul fichier JSON.',
        ),
        el(
          'p',
          { class: 'champ__aide' },
          'Chaque jeu se retouche ensuite avec « Préparer le contenu ». Tout reste dans ce navigateur.',
        ),
      ),
    ),
    el(
      'section',
      { class: 'bloc-thematiques', 'aria-labelledby': 'titre-thematiques' },
      el('h3', { id: 'titre-thematiques' }, 'Thématiques prêtes à jouer'),
      el(
        'p',
        { class: 'champ__aide' },
        'Une thématique remplace les questions de tous les jeux d’un coup. Vos réglages (durées, points…) sont conservés. Créez les vôtres, modifiez ou supprimez celles-ci : tout est gardé dans ce navigateur, et s’échange en JSON : une thématique par fichier, ou toutes dans un seul (l’import accepte plusieurs fichiers d’un coup).',
      ),
      barreThematiques,
      entreeImportThematiques,
      grilleThematiques,
      messagesThematiques,
    ),
    el(
      'section',
      { class: 'carte bloc-fichier-contenus', 'aria-labelledby': 'titre-fichier-contenus' },
      el('h3', { id: 'titre-fichier-contenus' }, 'Importer ou exporter un jeu de données'),
      el(
        'p',
        { class: 'champ__aide' },
        'Un seul fichier JSON pour les questions de tous les jeux : pour garder votre préparation ou la partager avec un collègue. Le fichier exporté d’un seul jeu s’importe aussi ici.',
      ),
      el(
        'div',
        { class: 'bloc-fichier-contenus__ligne' },
        el(
          'div',
          { class: 'champ bloc-fichier-contenus__titre' },
          el(
            'label',
            { for: 'titre-export', class: 'champ__libelle' },
            'Titre du fichier exporté (facultatif)',
          ),
          champTitre,
          el(
            'p',
            { id: 'aide-titre-export', class: 'champ__aide' },
            'Il s’affichera dans chaque jeu à l’import.',
          ),
        ),
        el(
          'div',
          { class: 'groupe-boutons' },
          el(
            'button',
            { type: 'button', class: 'bouton', onclick: () => exporterTout() },
            icone('download'),
            'Exporter tous les contenus',
          ),
          el(
            'label',
            { for: 'fichier-contenus', class: 'bouton bouton--discret' },
            icone('upload'),
            'Importer un jeu de données…',
          ),
          entreeImport,
        ),
      ),
      messagesFichier,
    ),
    el(
      'section',
      { class: 'carte bloc-consultation', 'aria-labelledby': 'titre-consultation' },
      el(
        'div',
        { class: 'ecran__entete' },
        el('h3', { id: 'titre-consultation' }, 'Consulter les questions'),
        boutonReponses,
      ),
      el(
        'div',
        { class: 'champ bloc-consultation__choix' },
        el('label', { for: 'choix-affichage', class: 'champ__libelle' }, 'Afficher'),
        choixAffichage,
      ),
      el(
        'p',
        { class: 'champ__aide' },
        'Ouvrez un jeu pour lire ses questions, puis « Modifier » pour les changer ici même : dans le jeu (contenus actuels) ou dans la thématique affichée. Les réponses sont floutées : vous pouvez consulter même si l’écran est projeté.',
      ),
      messagesConsultation,
      consultation,
    ),
  ),
);
focaliser(titre);
