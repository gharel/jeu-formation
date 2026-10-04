/**
 * Page « Les contenus » : les questions de tous les jeux au même endroit.
 * - Charger une thématique prête à jouer (contenus/thematiques/*.json) dans tous les jeux.
 * - Exporter tous les contenus en un seul fichier JSON (jeu de données), ou en importer un.
 * - Consulter le contenu de chaque jeu, ou celui d'une thématique avant de la charger. Les
 *   réponses sont masquées : l'écran est peut-être déjà projeté.
 */
import { exigerAcces } from './commun/acces.js';
import { JEUX } from './jeux.js';
import { THEMATIQUES, fichierThematique, trouverThematique } from './thematiques.js';
import { lire, ecrire, effacer } from './commun/stockage.js';
import {
  cleContenu,
  nettoyerContenu,
  validerContenu,
  resumerContenu,
  champsAffiches,
} from './commun/contenu.js';
import {
  preparerJeuDeDonnees,
  lireJeuDeDonnees,
  contenuDepuisDonnees,
  lireSources,
  noterSource,
  oublierSource,
  LONGUEUR_TITRE,
} from './commun/jeux-de-donnees.js';
import { telechargerJson, nomDeFichier } from './commun/fichiers.js';
import { adresseImage } from './commun/images.js';
import { confirmer } from './commun/dialogues.js';
import { el, remplir, icone, focaliser, annoncer } from './commun/ui.js';

await exigerAcces();

/** Racine du site : les jeux et les thématiques s'y trouvent. */
const RACINE = new URL('../../', import.meta.url);
const SLUGS = JEUX.map((jeu) => jeu.slug);
const AFFICHAGE_ACTUEL = 'actuel';
const AFFICHAGE_EXEMPLES = 'exemples';

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

/** « 1 jeu », « 9 jeux ». */
const nombreDeJeux = (n) => `${n} jeu${n > 1 ? 'x' : ''}`;

/** Contenu joué aujourd'hui par un jeu : celui enregistré, sinon son exemple. */
function contenuActuel(slug) {
  const { schema, exemple } = definitions[slug];
  const enregistre = lire(cleContenu(slug));
  return { contenu: nettoyerContenu(schema, enregistre ?? exemple), estExemple: !enregistre };
}

// ---------- Thématiques : lecture des fichiers ----------

const fichiersLus = new Map();

/** Jeu de données d'une thématique (lu une seule fois). */
function lireThematique(slug) {
  if (!fichiersLus.has(slug)) {
    const lecture = fetch(new URL(fichierThematique(slug), RACINE))
      .then((reponse) => {
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        return reponse.text();
      })
      .then((texte) => lireJeuDeDonnees(texte, SLUGS))
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

const titresDe = (slugs) => slugs.map((slug) => definitions[slug].jeu.titre);

/** « Zoom mystère garde son contenu. » pour les jeux absents du jeu de données. */
function phraseNonInclus(donnees) {
  const absents = titresDe(SLUGS.filter((slug) => !donnees.jeux[slug]));
  if (!absents.length) return '';
  return absents.length > 1
    ? `${absents.join(', ')} gardent leur contenu.`
    : `${absents[0]} garde son contenu.`;
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
    if (!ecrire(cleContenu(slug), contenu)) {
      throw new Error('Impossible d’enregistrer : le stockage du navigateur est plein ou bloqué.');
    }
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

/** Un seul message à la fois sur la page, dans la zone de la section concernée. */
function afficherMessage(zone, { texte, erreur = false, details = [], titreDetails = '' }) {
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

async function chargerThematique(thematique) {
  let donnees;
  try {
    donnees = await lireThematique(thematique.slug);
  } catch (erreur) {
    afficherMessage(messagesThematiques, { texte: erreur.message, erreur: true });
    return;
  }
  const n = Object.keys(donnees.jeux).length;
  const nonInclus = phraseNonInclus(donnees);
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
    const bilan = await appliquer(donnees, thematique.titre);
    afficherMessage(
      messagesThematiques,
      messageDeChargement(`Thématique « ${thematique.titre} » chargée :`, bilan, donnees),
    );
  } catch (erreur) {
    afficherMessage(messagesThematiques, { texte: erreur.message, erreur: true });
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

function carteThematique(thematique) {
  const description = el('p', { class: 'carte-thematique__description' }, '…');
  const jeux = el('p', { class: 'carte-thematique__jeux' });
  lireThematique(thematique.slug)
    .then((donnees) => {
      remplir(description, donnees.description);
      const absents = titresDe(SLUGS.filter((slug) => !donnees.jeux[slug]));
      remplir(
        jeux,
        `${nombreDeJeux(Object.keys(donnees.jeux).length)}${absents.length ? `, sans ${absents.join(', ')}` : ''}`,
      );
    })
    .catch(() => remplir(description, 'Fichier introuvable.'));
  const charges = jeuxChargesDepuis(thematique.titre);
  return el(
    'li',
    {},
    el(
      'article',
      { class: 'carte carte-thematique', dataset: { thematique: thematique.slug } },
      el(
        'div',
        { class: 'carte-thematique__entete' },
        el('span', { class: 'carte-thematique__icone' }, icone(thematique.icone)),
        el('h4', { class: 'carte-thematique__titre' }, thematique.titre),
      ),
      charges
        ? el(
            'p',
            { class: 'carte-thematique__chargee' },
            icone('circle-check'),
            `Chargée dans ${nombreDeJeux(charges)}`,
          )
        : null,
      description,
      jeux,
      el(
        'div',
        { class: 'groupe-boutons' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--principal',
            onclick: () => chargerThematique(thematique),
          },
          icone('file-import'),
          'Charger',
          el('span', { class: 'visuellement-cache' }, ` ${thematique.titre}`),
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            onclick: () => voirDansConsultation(thematique.slug),
          },
          icone('eye'),
          'Aperçu',
          el('span', { class: 'visuellement-cache' }, ` de ${thematique.titre}`),
        ),
        el(
          'a',
          {
            class: 'bouton bouton--discret',
            href: new URL(fichierThematique(thematique.slug), RACINE).href,
            download: `skazy-thematique-${thematique.slug}.json`,
          },
          icone('download'),
          'JSON',
          el('span', { class: 'visuellement-cache' }, ` de ${thematique.titre}`),
        ),
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
  remplir(grilleThematiques, THEMATIQUES.map(carteThematique), carteExemples());
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

const choixAffichage = el(
  'select',
  {
    id: 'choix-affichage',
    class: 'champ__controle',
    onchange: () => dessinerConsultation(),
  },
  el('option', { value: AFFICHAGE_ACTUEL }, 'Les contenus actuels de ce navigateur'),
  THEMATIQUES.map((t) => el('option', { value: t.slug }, `Thématique : ${t.titre}`)),
  el('option', { value: AFFICHAGE_EXEMPLES }, 'Les contenus d’exemple'),
);
const consultation = el('div', { class: 'consultation consultation--masque' });
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
consultation.append(listeJeux);
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

/** Un jeu de la consultation : `contenu` null si le jeu n'est pas dans la thématique. */
function jeuAffiche(slug, contenu, etiquette) {
  const { jeu, schema } = definitions[slug];
  const erreurs = contenu ? validerContenu(schema, contenu) : [];
  let etat = 'Pas dans cette thématique : le jeu garde son contenu.';
  if (contenu) etat = erreurs.length ? 'Contenu incomplet' : resumerContenu(schema, contenu);
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
      contenu
        ? el(
            'div',
            { class: 'apercu-jeu__corps' },
            erreurs.length
              ? el(
                  'ul',
                  { class: 'erreurs' },
                  erreurs.map((m) => el('li', {}, m)),
                )
              : null,
            el(
              'ol',
              { class: 'apercu-jeu__elements' },
              contenu.elements.map((element, i) => elementAffiche(slug, schema, element, i)),
            ),
            el(
              'p',
              {},
              el(
                'a',
                { class: 'bouton bouton--discret', href: new URL(`jeux/${slug}/`, RACINE).href },
                icone('pen-to-square'),
                `Préparer dans ${jeu.titre}`,
              ),
            ),
          )
        : null,
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
  if (choix === AFFICHAGE_ACTUEL) {
    const sources = lireSources();
    elements = SLUGS.map((slug) => {
      const { contenu, estExemple } = contenuActuel(slug);
      return jeuAffiche(slug, contenu, estExemple ? 'contenu d’exemple' : (sources[slug] ?? null));
    });
  } else if (choix === AFFICHAGE_EXEMPLES) {
    elements = SLUGS.map((slug) => {
      const { schema, exemple } = definitions[slug];
      return jeuAffiche(slug, nettoyerContenu(schema, exemple), null);
    });
  } else {
    let donnees;
    try {
      donnees = await lireThematique(choix);
    } catch (erreur) {
      if (tour === tourDeDessin) remplir(listeJeux, el('li', { class: 'erreurs' }, erreur.message));
      return;
    }
    if (tour !== tourDeDessin) return;
    elements = SLUGS.map((slug) => {
      const brut = donnees.jeux[slug];
      return jeuAffiche(
        slug,
        brut ? contenuDepuisDonnees(definitions[slug].schema, brut) : null,
        brut ? null : 'non inclus',
      );
    });
  }
  remplir(listeJeux, elements);
  for (const details of listeJeux.querySelectorAll('details')) {
    if (ouverts.has(details.dataset.jeu)) details.open = true;
  }
}

function voirDansConsultation(valeur) {
  choixAffichage.value = valeur;
  dessinerConsultation();
  const titre = document.getElementById('titre-consultation');
  titre?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  focaliser(titre);
  const thematique = trouverThematique(valeur);
  annoncer(
    thematique ? `Aperçu de la thématique ${thematique.titre}` : 'Aperçu des contenus d’exemple',
  );
}

// ---------- Page ----------

dessinerThematiques();
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
          'Chargez une thématique prête à jouer dans tous les jeux, ou gardez vos propres questions dans un seul fichier JSON.',
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
        'Une thématique remplace les questions de tous les jeux d’un coup. Vos réglages (durées, points…) sont conservés.',
      ),
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
        'Un seul fichier JSON pour les questions de tous les jeux : pour garder votre préparation, la partager avec un collègue ou créer votre propre thématique. Le fichier exporté d’un seul jeu s’importe aussi ici.',
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
        'Ouvrez un jeu pour lire ses questions. Les réponses sont floutées : vous pouvez consulter même si l’écran est projeté.',
      ),
      consultation,
    ),
  ),
);
focaliser(titre);
