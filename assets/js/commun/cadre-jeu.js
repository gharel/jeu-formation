/**
 * Cadre commun à tous les jeux : écran d'accueil (participants + contenu), préparation,
 * partie et écran de fin. Chaque jeu fournit son schéma de contenu, un exemple et demarrer(ctx).
 *
 * monterJeu({
 *   slug, schema, exemple, regles: ['…'],
 *   demarrer(ctx) => fonction de nettoyage (facultatif, peut être async),
 *   exporter(contenu) => contenu sérialisable (facultatif, async),
 *   importer(contenuBrut) => contenu (facultatif, async),
 *   apresEnregistrement(contenu) (facultatif, async),
 *   aideMinuteur: 'Le temps vient de chaque défi.' (facultatif : jeu sans réglage de lancement),
 * })
 *
 * L'accueil propose aussi le mode de jeu (chacun pour soi, par équipes, équipes et joueurs) et les
 * réglages de lancement du schéma (`lancement: true`, le minuteur), gardés à part du contenu.
 */
import { trouverJeu, titresDesJeux } from '../jeux.js';
import * as listeParticipants from './participants.js';
import { lire, ecrire, effacer } from './stockage.js';
import { hasardDePage } from './hasard.js';
import { creerTirage } from './roue.js';
import { creerScores } from './scores.js';
import { sons, sonActif, basculerSon, preparerSon } from './sons.js';
import {
  el,
  remplir,
  icone,
  annoncer,
  ecouterClavier,
  basculerPleinEcran,
  pleinEcranDisponible,
  focaliser,
} from './ui.js';
import { choisirGagnants, choisirPrenoms, confirmer, designerAvecRoue } from './dialogues.js';
import { creerGroupe, etiquetteInfo } from './groupe.js';
import { membresParmi } from './equipes.js';
import { creerBlocJoueurs } from './bloc-joueurs.js';
import { creerBlocMode } from './bloc-mode.js';
import {
  lireMode,
  ecrireMode,
  modeDeLaPartie,
  avecEquipes,
  equipeDuJoueur,
  ordreDePassage,
} from './mode-jeu.js';
import { reglagesDeLancement, lireLancement, ecrireLancement } from './lancement.js';
import { creerMinuteurManche } from './minuteur-manche.js';
import { selectionParDefaut, joueursDeLaPartie } from './joueurs.js';
import { ouvrirGroupe } from './plan-salle.js';
import {
  nettoyerContenu,
  validerContenu,
  resumerContenu,
  contenuVide,
  compacterContenu,
  preparerExport,
  lireImport,
  cleContenu as cleDuContenu,
  validerReglages,
} from './contenu.js';
import { sourceDe, oublierSource } from './jeux-de-donnees.js';
import { telechargerJson, nomDeFichier } from './fichiers.js';
import { creerEditeur, construireChamp } from './editeur-contenu.js';
import { exigerAcces } from './acces.js';
import { creerHautDePage } from './haut-de-page.js';

// Chaque jeu importe ce module : aucun jeu ne démarre avant le mot de passe.
await exigerAcces();

export function monterJeu(config) {
  const { slug, schema, exemple, regles = [], demarrer, aideMinuteur = '' } = config;
  const jeu = trouverJeu(slug);
  const cadre = document.getElementById('cadre');
  const hasard = hasardDePage();
  const cleContenu = cleDuContenu(slug);

  // Participants, infos et plan de salle, partagés avec la page « Le groupe »
  const groupe = creerGroupe();
  // Joueurs de la partie, choisis parmi les présents du groupe (bloc « Qui joue ? »). La
  // sélection n'est pas mémorisée : chaque ouverture du jeu repart de « Tout le groupe ».
  let selection = selectionParDefaut();
  const joueurs = () => joueursDeLaPartie(groupe.presents, selection);
  let mettreAJourLancer = () => {};
  let actualiserMode = () => {};
  let joueursEnJeu = [];
  let equipesEnJeu = [];
  let modePartie = 'individuel';
  // Pendant la partie, la roue ne tire que parmi les joueurs de la partie
  let enPartie = false;
  const joueursDeLaRoue = () => (enPartie ? joueursEnJeu : joueurs());
  // Mode de jeu : gardé pour la séance, d'un jeu à l'autre. Tant que l'animateur n'en a choisi
  // aucun, un groupe qui a déjà des équipes joue en équipes et joueurs (comme avant ce choix)
  let modeChoisi = lireMode(groupe.equipes.some((e) => e.membres.length) ? 'mixte' : 'individuel');
  // Minuteurs de manche de la partie : arrêtés à la fin, quoi que fasse le jeu
  const minuteursManche = new Set();
  const emplacementChrono = el('div', { class: 'ecran-jeu__chrono' });
  const tirage = creerTirage(joueurs(), {
    equitable: lire('roue-equitable', true) !== false,
    hasard,
  });
  let contenu = nettoyerContenu(schema, lire(cleContenu) ?? exemple);
  // Réglages choisis au lancement (minuteur) : voir lancement.js
  const reglagesLancement = reglagesDeLancement(schema);
  let lancement = lireLancement(slug, schema, contenu.reglages);
  let nettoyerPartie = null;
  let ecouteDesignation = null;
  let editeur = null;
  // « Remonter en haut » : sur l'accueil du jeu et la préparation, jamais pendant la partie
  const hautDePage = creerHautDePage();

  const estExemple = () => lire(cleContenu) === null;

  // ---------- Bandeau : désigner, groupe, son, plein écran (pas sur téléphone, voir base.css) ----------
  // Dans une fenêtre très étroite avec le plein écran, « Désigner » se réduit à sa roue (base.css) :
  // son libellé reste lu par les lecteurs d'écran
  const boutonDesigner = el(
    'button',
    {
      type: 'button',
      class: 'bouton-bandeau',
      'aria-keyshortcuts': 'R',
      title: 'Désigner quelqu’un avec la roue (touche R)',
      onclick: () => designer(),
    },
    icone('arrows-spin'),
    el('span', { class: 'bouton-bandeau__texte' }, 'Désigner'),
  );
  const boutonGroupe = el(
    'button',
    {
      type: 'button',
      class: 'bouton-bandeau',
      title: 'Revoir les prénoms, les infos et le plan de salle',
      // À la fermeture, le focus revient au jeu (pas au bouton) : Entrée et Espace gardent leur
      // sens en partie
      onclick: () => ouvrirGroupe(groupe, { focusApres: cadre }),
    },
    icone('users'),
    'Groupe',
  );
  const boutonSon = el('button', {
    type: 'button',
    class: 'bouton-bandeau',
    'aria-pressed': String(sonActif()),
    title: 'Activer ou couper le son',
    onclick: () => {
      const actif = basculerSon();
      dessinerBoutonSon(actif);
      if (actif) sons.tic();
    },
  });
  function dessinerBoutonSon(actif) {
    boutonSon.setAttribute('aria-pressed', String(actif));
    remplir(boutonSon, icone(actif ? 'volume-high' : 'volume-xmark'), 'Son');
  }
  dessinerBoutonSon(sonActif());
  const boutonPleinEcran = pleinEcranDisponible()
    ? el(
        'button',
        {
          type: 'button',
          class: 'bouton-bandeau bouton-plein-ecran',
          'aria-keyshortcuts': 'F',
          title: 'Plein écran (touche F)',
          onclick: () => basculerPleinEcran(),
        },
        icone('expand'),
        'Plein écran',
      )
    : null;
  document
    .getElementById('actions')
    ?.append(...[boutonDesigner, boutonGroupe, boutonSon, boutonPleinEcran].filter(Boolean));

  function mettreAJourDesigner() {
    boutonDesigner.hidden = joueursDeLaRoue().length < 2;
  }
  mettreAJourDesigner();

  /** Le groupe ou la sélection a changé : la roue et les boutons suivent. */
  function actualiserJoueurs() {
    tirage.mettreAJour(joueursDeLaRoue());
    mettreAJourDesigner();
    mettreAJourLancer();
    actualiserMode();
  }
  groupe.surChangement(actualiserJoueurs);

  ecouterClavier({
    r: () => designer(),
    f: () => basculerPleinEcran(),
  });

  async function designer(titre) {
    const participants = joueursDeLaRoue();
    if (participants.length < 2) return participants[0] ?? null;
    const prenom = await designerAvecRoue({
      prenoms: participants,
      tirage,
      hasard,
      titre,
      surEquitable: (v) => ecrire('roue-equitable', v),
      // Sous le prénom tiré : son info et sa place (« Place 4, îlot 2 »)
      decrire: (p) => {
        const info = groupe.infoDe(p);
        const place = groupe.placeDe(p);
        return [
          info ? [icone(listeParticipants.themeDe(info.theme).icone), groupe.decrire(p)] : '',
          info && place ? ' · ' : '',
          place,
        ];
      },
    });
    if (prenom) {
      annoncer(`C’est au tour de ${prenom}. ${groupe.decrire(prenom)} ${groupe.placeDe(prenom)}`);
      ecouteDesignation?.(prenom);
    }
    return prenom;
  }

  function arreterPartie() {
    try {
      nettoyerPartie?.();
    } finally {
      nettoyerPartie = null;
      ecouteDesignation = null;
      for (const minuteur of minuteursManche) minuteur.arreter();
      minuteursManche.clear();
      remplir(emplacementChrono);
      if (enPartie) {
        enPartie = false;
        tirage.mettreAJour(joueurs());
      }
    }
  }

  /** Les équipes du groupe réduites à des joueurs ; une équipe sans joueur disparaît. */
  function equipesParmi(liste) {
    return groupe.equipes
      .map((e) => ({ id: e.id, nom: e.nom, membres: membresParmi(e, liste) }))
      .filter((e) => e.membres.length);
  }

  function afficherEcran(classe, ...enfants) {
    editeur?.detruire();
    editeur = null;
    const ecran = el('section', { class: `ecran ${classe}` }, ...enfants);
    remplir(cadre, ecran);
    window.scrollTo?.(0, 0);
    // Écrans projetés (partie, fin) : pas de bouton « Remonter en haut »
    hautDePage.permettre(classe === 'ecran-accueil' || classe === 'ecran-preparation');
    return ecran;
  }

  // ---------- Écran d'accueil du jeu ----------

  function blocContenu(erreurs) {
    // Contenu venu d'une thématique ou d'un jeu de données (page « Les contenus »)
    const source = estExemple() ? null : sourceDe(slug);
    let etiquette = null;
    if (estExemple()) etiquette = 'contenu d’exemple';
    else if (source) etiquette = source;
    let aide =
      'Votre contenu est enregistré dans ce navigateur. Exportez-le pour le garder ou le partager.';
    if (estExemple()) {
      aide =
        'Un contenu d’exemple permet de jouer tout de suite. Remplacez-le par le vôtre, ou chargez une thématique prête à jouer, avant la séance.';
    } else if (source) {
      aide = `Contenu chargé depuis « ${source} ». Vous pouvez le retoucher : il reste enregistré dans ce navigateur.`;
    }
    const etat = erreurs.length
      ? el('p', { class: 'etat etat--ko' }, icone('triangle-exclamation'), 'Contenu incomplet')
      : el(
          'p',
          { class: 'etat etat--ok' },
          icone('circle-check'),
          resumerContenu(schema, contenu),
          etiquette ? el('span', { class: 'etiquette' }, etiquette) : null,
        );
    return el(
      'section',
      { class: 'carte bloc-contenu', 'aria-labelledby': 'titre-contenu' },
      el('h3', { id: 'titre-contenu' }, 'Contenu du jeu'),
      etat,
      erreurs.length
        ? el(
            'ul',
            { class: 'erreurs' },
            erreurs.map((m) => el('li', {}, m)),
          )
        : null,
      el('p', { class: 'champ__aide' }, aide),
      el(
        'div',
        { class: 'groupe-boutons' },
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => afficherPreparation() },
          icone('pen-to-square'),
          'Préparer le contenu',
        ),
        estExemple()
          ? el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--discret',
                onclick: () =>
                  afficherPreparation(contenuVide(schema, contenu), MESSAGE_LISTE_VIDE),
              },
              icone('eraser'),
              'Partir d’une liste vide',
            )
          : null,
        el(
          'a',
          { class: 'bouton bouton--discret', href: '../../contenus/' },
          icone('layer-group'),
          'Charger une thématique',
        ),
      ),
    );
  }

  /**
   * Le minuteur, à côté de « Lancer la partie » : les réglages de lancement du jeu (temps par
   * mot, par question…), gardés dès qu'ils changent.
   */
  function blocMinuteur() {
    if (!reglagesLancement.length) {
      return aideMinuteur
        ? el('p', { class: 'intro__minuteur champ__aide' }, icone('stopwatch'), aideMinuteur)
        : null;
    }
    return el(
      'fieldset',
      { class: 'intro__minuteur' },
      el('legend', { class: 'visuellement-cache' }, 'Minuteur'),
      ...reglagesLancement.map((r) =>
        construireChamp(
          r,
          () => lancement[r.cle],
          (valeur) => {
            lancement = { ...lancement, [r.cle]: valeur };
            ecrireLancement(slug, lancement);
            mettreAJourLancer();
          },
        ),
      ),
    );
  }

  function afficherAccueil() {
    arreterPartie();
    const erreurs = validerContenu(schema, contenu);
    const titre = el('h2', {}, 'Comment on joue ?');
    const lancer = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--principal bouton--grand',
        onclick: () => lancerPartie(),
      },
      'Lancer la partie',
      icone('play'),
    );
    const aideLancer = el('p', { class: 'champ__aide' });
    // Mode de jeu et qui joue contre qui : suit « Qui joue ? » et les équipes du groupe
    const blocMode = creerBlocMode(groupe, {
      mode: modeChoisi,
      surMode: (nouveau) => {
        modeChoisi = nouveau;
        ecrireMode(nouveau);
      },
      joueurs,
      equipesEnJeu: () => equipesParmi(joueurs()),
      hasard,
      cooperatif: Boolean(jeu.cooperatif),
    });
    actualiserMode = blocMode.actualiser;
    // Sans joueur choisi (mode « Choisir » ou « Au hasard »), pas de partie. Un jeu à deux (duel,
    // binôme) ne se lance pas avec un seul joueur ; sans aucun prénom, on joue sans classement.
    mettreAJourLancer = () => {
      const n = joueurs().length;
      const sansJoueur = selection.mode !== 'tous' && n === 0;
      const tropPeu = n > 0 && n < (jeu.joueursMin ?? 1);
      const problemes = validerReglages(reglagesLancement, lancement);
      lancer.disabled = erreurs.length > 0 || sansJoueur || tropPeu || problemes.length > 0;
      let aide = '';
      if (erreurs.length) aide = 'Complétez d’abord le contenu du jeu.';
      else if (sansJoueur) aide = 'Choisissez au moins un joueur.';
      else if (tropPeu) aide = `Il faut au moins ${jeu.joueursMin} joueurs pour ce jeu.`;
      else if (problemes.length) aide = problemes[0];
      remplir(aideLancer, aide);
      aideLancer.hidden = !aide;
    };
    mettreAJourLancer();
    afficherEcran(
      'ecran-accueil',
      el(
        'div',
        { class: 'intro carte' },
        el('p', { class: 'intro__icone' }, icone(jeu.icone)),
        el(
          'div',
          {},
          titre,
          el('p', { class: 'intro__accroche' }, jeu.accroche),
          el(
            'ol',
            { class: 'regles' },
            regles.map((r) => el('li', {}, r)),
          ),
          el(
            'p',
            { class: 'intro__duree' },
            icone('clock', { style: 'regular' }),
            `Durée : ${jeu.duree}`,
          ),
        ),
        el('div', { class: 'intro__lancer' }, blocMinuteur(), lancer, aideLancer),
      ),
      el(
        'div',
        { class: 'colonnes' },
        creerBlocJoueurs(groupe, {
          selection,
          surSelection: (nouvelle) => {
            selection = nouvelle;
            actualiserJoueurs();
          },
          hasard,
          designer: () => designer(),
        }),
        blocMode.element,
        blocContenu(erreurs),
      ),
    );
    focaliser(titre);
  }

  // ---------- Préparation du contenu ----------
  const MESSAGE_LISTE_VIDE =
    'Liste vidée. Les textes grisés ne sont que des exemples : saisissez votre contenu par-dessus, puis enregistrez.';

  function afficherPreparation(brouillon = contenu, messageInitial = '') {
    const titre = el('h2', {}, 'Préparer le contenu');
    const zoneMessages = el('div', { class: 'messages', role: 'status' });
    const zoneErreurs = el('div', { class: 'messages', role: 'alert' });
    let editeurCourant = creerEditeur({ schema, contenu: brouillon });
    const emplacement = el('div', {}, editeurCourant.element);
    // Version enregistrée : sert à savoir s'il y a des modifications à abandonner
    let reference = JSON.stringify(editeurCourant.valeur());

    function remplacerEditeur(nouveau, message) {
      editeurCourant.detruire();
      editeurCourant = creerEditeur({ schema, contenu: nouveau });
      editeur = editeurCourant;
      remplir(emplacement, editeurCourant.element);
      remplir(zoneErreurs);
      remplir(zoneMessages, el('p', { class: 'message message--info' }, message));
    }

    const lireBrouillon = () =>
      nettoyerContenu(schema, compacterContenu(schema, editeurCourant.valeur()));

    const entreeImport = el('input', {
      id: 'fichier-import',
      type: 'file',
      accept: 'application/json,.json',
      class: 'visuellement-cache',
      onchange: async (e) => {
        const fichier = e.target.files?.[0];
        e.target.value = '';
        if (!fichier) return;
        try {
          const brut = lireImport(await fichier.text(), slug, titresDesJeux());
          const importe = nettoyerContenu(
            schema,
            config.importer ? await config.importer(brut) : brut,
          );
          remplacerEditeur(importe, 'Fichier importé. Vérifiez puis enregistrez.');
        } catch (erreur) {
          remplir(zoneErreurs, el('p', { class: 'message message--erreur' }, erreur.message));
        }
      },
    });

    const outils = el(
      'div',
      { class: 'groupe-boutons preparation__outils' },
      el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--discret',
          onclick: async () => {
            const aExporter = config.exporter
              ? await config.exporter(lireBrouillon())
              : lireBrouillon();
            telechargerJson(nomDeFichier(`skazy-${slug}`), preparerExport(slug, aExporter));
          },
        },
        icone('download'),
        'Exporter',
      ),
      el(
        'label',
        { for: 'fichier-import', class: 'bouton bouton--discret' },
        icone('upload'),
        'Importer…',
      ),
      entreeImport,
      el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--discret',
          onclick: async () => {
            if (
              await confirmer({
                titre: 'Revenir au contenu d’exemple ?',
                message:
                  'Le contenu affiché sera remplacé par l’exemple (rien n’est perdu tant que vous n’enregistrez pas).',
                oui: 'Remplacer',
              })
            ) {
              remplacerEditeur(
                nettoyerContenu(schema, exemple),
                'Contenu d’exemple chargé. Enregistrez pour le garder.',
              );
            }
          },
        },
        icone('rotate-left'),
        'Contenu d’exemple',
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'bouton bouton--discret',
          onclick: async () => {
            if (
              await confirmer({
                titre: 'Vider la liste ?',
                message:
                  'Vous repartez d’une liste vide pour saisir votre propre contenu. Les réglages sont conservés, et rien n’est perdu tant que vous n’enregistrez pas.',
                oui: 'Vider',
              })
            ) {
              remplacerEditeur(contenuVide(schema, editeurCourant.valeur()), MESSAGE_LISTE_VIDE);
            }
          },
        },
        icone('eraser'),
        'Vider la liste',
      ),
    );

    async function enregistrer() {
      const nouveau = lireBrouillon();
      if (!ecrire(cleContenu, nouveau)) {
        remplir(
          zoneErreurs,
          el(
            'p',
            { class: 'message message--erreur' },
            'Impossible d’enregistrer : le stockage du navigateur est plein ou bloqué.',
          ),
        );
        return;
      }
      // Contenu retouché : ce n'est plus celui de la thématique chargée
      if (JSON.stringify(nouveau) !== JSON.stringify(contenu)) oublierSource(slug);
      contenu = nouveau;
      reference = JSON.stringify(editeurCourant.valeur());
      await config.apresEnregistrement?.(contenu);
      const erreurs = validerContenu(schema, contenu);
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
      annoncer('Contenu enregistré');
      afficherAccueil();
    }

    afficherEcran(
      'ecran-preparation',
      el('div', { class: 'ecran__entete' }, titre, outils),
      el(
        'p',
        { class: 'champ__aide' },
        'Les réponses sont masquées : vous pouvez préparer le jeu même si l’écran est déjà projeté.',
      ),
      zoneMessages,
      emplacement,
      zoneErreurs,
      el(
        'div',
        { class: 'barre-actions' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton',
            onclick: async () => {
              const modifie = JSON.stringify(editeurCourant.valeur()) !== reference;
              if (
                !modifie ||
                (await confirmer({
                  titre: 'Abandonner les modifications ?',
                  message: 'Les changements non enregistrés seront perdus.',
                  oui: 'Abandonner',
                }))
              ) {
                afficherAccueil();
              }
            },
          },
          'Annuler',
        ),
        el(
          'button',
          { type: 'button', class: 'bouton bouton--principal', onclick: enregistrer },
          'Enregistrer',
        ),
      ),
    );
    editeur = editeurCourant;
    if (messageInitial)
      remplir(zoneMessages, el('p', { class: 'message message--info' }, messageInitial));
    focaliser(titre);
  }

  // ---------- Partie ----------
  async function lancerPartie() {
    arreterPartie();
    // Les joueurs du moment : ceux choisis dans « Qui joue ? », présents aujourd'hui
    joueursEnJeu = joueurs();
    enPartie = true;
    tirage.mettreAJour(joueursEnJeu);
    // Les équipes du groupe (composées peut-être dans un autre onglet), réduites aux joueurs ;
    // elles ne jouent que dans un mode à équipes, et s'il y en a au moins deux
    groupe.rechargerEquipes();
    const equipesDuGroupe = equipesParmi(joueursEnJeu);
    modePartie = modeDeLaPartie(modeChoisi, equipesDuGroupe);
    equipesEnJeu = avecEquipes(modePartie) ? equipesDuGroupe : [];
    const tableau = el('ul', { class: 'tableau-points', 'aria-label': 'Points' });
    const tableauEquipes = el('ul', {
      class: 'tableau-points tableau-points--equipes',
      'aria-label': 'Points des équipes',
    });
    // Chaque point gagné part aussi dans le score du groupe, gardé d'un jeu à l'autre
    const scores = creerScores(joueursEnJeu, {
      equipes: equipesEnJeu,
      mode: modePartie,
      surChangement: dessinerPoints,
      surAjout: (prenoms, n) => groupe.ajouterPoints(prenoms, slug, n),
      surAjoutEquipes: (ids, n) => groupe.ajouterPointsEquipes(ids, slug, n),
    });
    /** Une pastille du tableau : nom et points, en jaune pour qui mène. */
    function pastille(nom, points, meilleur, equipe = false) {
      return el(
        'li',
        {
          class: `tableau-points__entree${equipe ? ' tableau-points__entree--equipe' : ''}${points > 0 && points === meilleur ? ' tableau-points__entree--tete' : ''}`,
        },
        equipe ? icone('people-group') : null,
        el('span', { class: 'tableau-points__prenom' }, nom),
        el('span', { class: 'tableau-points__valeur' }, String(points)),
      );
    }
    function dessinerPoints() {
      const meilleur = scores.classement()[0]?.points ?? 0;
      remplir(
        tableau,
        joueursEnJeu.map((prenom) => pastille(prenom, scores.valeur(prenom), meilleur)),
      );
      const meilleureEquipe = scores.classementEquipes()[0]?.points ?? 0;
      remplir(
        tableauEquipes,
        equipesEnJeu.map((e) => pastille(e.nom, scores.valeurEquipe(e.id), meilleureEquipe, true)),
      );
    }
    dessinerPoints();

    const zone = el('div', { class: 'zone-jeu' });
    afficherEcran(
      'ecran-jeu',
      el('h2', { class: 'visuellement-cache' }, `Partie de ${jeu.titre} en cours`),
      el(
        'div',
        { class: 'ecran-jeu__barre' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--discret',
            onclick: async () => {
              if (
                await confirmer({
                  titre: 'Quitter la partie ?',
                  message:
                    'La partie s’arrête. Les points déjà gagnés restent dans les scores du groupe.',
                  oui: 'Quitter',
                })
              ) {
                afficherAccueil();
              }
            },
          },
          icone('arrow-left'),
          'Quitter la partie',
        ),
        // Le minuteur de manche, au même endroit dans tous les jeux (rempli par le jeu)
        emplacementChrono,
        joueursEnJeu.length
          ? el(
              'div',
              { class: 'ecran-jeu__points' },
              equipesEnJeu.length ? tableauEquipes : null,
              // Par équipes, seules les équipes marquent : pas de points par personne
              modePartie === 'equipes' ? null : tableau,
            )
          : null,
      ),
      zone,
    );
    // La sortie audio s'ouvre juste après l'affichage de l'écran de jeu, pas au premier son
    // (ouvrir la sortie peut figer la page : mieux vaut maintenant qu'à l'écran de réussite)
    requestAnimationFrame(() => setTimeout(preparerSon, 0));

    /** Pendant une fenêtre (qui a trouvé ?), le minuteur de manche s'arrête, puis repart. */
    async function pendantDialogue(ouvrir) {
      const actifs = [...minuteursManche].filter((m) => m.enCours);
      for (const minuteur of actifs) minuteur.pause();
      try {
        return await ouvrir();
      } finally {
        for (const minuteur of actifs) if (minuteursManche.has(minuteur)) minuteur.reprendre();
      }
    }

    const ctx = {
      zone,
      // Réglages du contenu, et ceux choisis au lancement (minuteur)
      reglages: { ...structuredClone(contenu.reglages), ...structuredClone(lancement) },
      elements: structuredClone(contenu.elements),
      participants: [...joueursEnJeu],
      // Mode de jeu : 'individuel', 'equipes' ou 'mixte' (voir mode-jeu.js)
      mode: modePartie,
      // Les équipes en jeu : [{ id, nom, membres }] (membres parmi les joueurs), vide chacun pour soi
      equipes: structuredClone(equipesEnJeu),
      /** L'équipe en jeu d'un joueur ({ id, nom, membres }), ou null. */
      equipeDe: (prenom) => equipeDuJoueur(equipesEnJeu, prenom),
      /** Tour de rôle : les joueurs, ou les équipes chacune leur tour (leurs membres tournent). */
      ordreDePassage: () => ordreDePassage(joueursEnJeu, equipesEnJeu, modePartie),
      scores,
      hasard,
      sons,
      annoncer,
      confirmer: (options) => pendantDialogue(() => confirmer(options)),
      designer,
      quandDesigne(fonction) {
        ecouteDesignation = fonction;
      },
      /**
       * Minuteur de manche (minuteur-manche.js), affiché dans la barre du jeu ; null sans limite
       * (`duree` 0). `passer` : { libelle, faire }, l'action proposée une fois le temps écoulé.
       */
      creerMinuteurManche({ duree, passer = null } = {}) {
        if (!duree) return null;
        const minuteur = creerMinuteurManche({ duree, sons, annoncer, passer });
        minuteursManche.add(minuteur);
        remplir(emplacementChrono, minuteur.element);
        return minuteur;
      },
      choisirPrenoms: (options) =>
        pendantDialogue(() => choisirPrenoms({ prenoms: joueursEnJeu, ...options })),
      // Pour attribuer des points : une personne, plusieurs, tout le monde ou une équipe
      choisirGagnants: (options) =>
        pendantDialogue(() =>
          choisirGagnants({
            prenoms: joueursEnJeu,
            equipes: equipesEnJeu,
            mode: modePartie,
            ...options,
          }),
        ),
      terminer: (options) => afficherFin(scores, options),
    };
    const nettoyage = await demarrer(ctx);
    if (typeof nettoyage === 'function') nettoyerPartie = nettoyage;
  }

  // ---------- Fin ----------
  /** Par équipes : le podium et le classement des équipes, avec leurs joueurs. */
  function resultatsEquipes(scores) {
    const classement = scores.classementEquipes();
    const membresDe = (id) => equipesEnJeu.find((e) => e.id === id)?.membres ?? [];
    const podium = classement.some((e) => e.points > 0)
      ? el(
          'ol',
          { class: 'podium', 'aria-label': 'Podium des équipes' },
          classement
            .filter((e) => e.rang <= 3 && e.points > 0)
            .map((e) =>
              el(
                'li',
                { class: `podium__marche podium__marche--${e.rang}` },
                el('span', { class: 'podium__medaille' }, icone('medal')),
                el('span', { class: 'podium__prenom' }, e.nom),
                el('span', { class: 'podium__info' }, membresDe(e.id).join(', ')),
                el('span', { class: 'podium__points' }, `${e.points} pt${e.points > 1 ? 's' : ''}`),
              ),
            ),
        )
      : null;
    const liste = el(
      'ol',
      { class: 'classement', 'aria-label': 'Classement des équipes' },
      classement.map((e) =>
        el(
          'li',
          { class: 'classement__ligne' },
          el('span', { class: 'classement__rang' }, `${e.rang}.`),
          el('span', { class: 'classement__prenom' }, e.nom),
          el('span', { class: 'classement__points' }, `${e.points} pt${e.points > 1 ? 's' : ''}`),
        ),
      ),
    );
    return el(
      'div',
      { class: `fin__resultats${podium ? ' fin__resultats--deux' : ''}` },
      podium ?? el('p', { class: 'fin__message' }, 'Bravo à toutes les équipes !'),
      liste,
    );
  }

  /**
   * Écran de fin. `cooperatif` : tout le groupe a joué ensemble (Coffre-fort) ; pas de podium
   * d'ex æquo, le message du jeu dit ce que le groupe a gagné.
   */
  function afficherFin(scores, { message = '', cooperatif = false } = {}) {
    arreterPartie();
    const titre = el('h2', { class: 'fin__titre' }, icone('trophy'), 'Partie terminée !');
    const classement = scores.classement();
    const aDesPoints = classement.some((e) => e.points > 0);
    const podium = aDesPoints
      ? el(
          'ol',
          { class: 'podium', 'aria-label': 'Podium' },
          classement
            .filter((e) => e.rang <= 3 && e.points > 0)
            .map((e) =>
              el(
                'li',
                { class: `podium__marche podium__marche--${e.rang}` },
                el('span', { class: 'podium__medaille' }, icone('medal')),
                el('span', { class: 'podium__prenom' }, e.prenom),
                etiquetteInfo(groupe, e.prenom, 'podium__info'),
                el('span', { class: 'podium__points' }, `${e.points} pt${e.points > 1 ? 's' : ''}`),
              ),
            ),
        )
      : null;
    const liste = joueursEnJeu.length
      ? el(
          'ol',
          { class: 'classement', 'aria-label': 'Classement complet' },
          classement.map((e) =>
            el(
              'li',
              { class: 'classement__ligne' },
              el('span', { class: 'classement__rang' }, `${e.rang}.`),
              el('span', { class: 'classement__prenom' }, e.prenom),
              el(
                'span',
                { class: 'classement__points' },
                `${e.points} pt${e.points > 1 ? 's' : ''}`,
              ),
            ),
          ),
        )
      : null;
    const classementEquipes = scores.classementEquipes();
    const equipes = classementEquipes.some((e) => e.points > 0)
      ? el(
          'ol',
          { class: 'fin__equipes', 'aria-label': 'Classement des équipes' },
          classementEquipes.map((e) =>
            el(
              'li',
              { class: `fin__equipe${e.rang === 1 ? ' fin__equipe--tete' : ''}` },
              icone(e.rang === 1 ? 'trophy' : 'people-group'),
              el('span', { class: 'fin__equipe-nom' }, e.nom),
              el(
                'span',
                { class: 'fin__equipe-points' },
                `${e.points} pt${e.points > 1 ? 's' : ''}`,
              ),
            ),
          ),
        )
      : null;
    function resultats() {
      if (cooperatif) return el('p', { class: 'fin__message' }, 'Bravo à toutes et à tous !');
      if (modePartie === 'equipes') return resultatsEquipes(scores);
      return [
        equipes,
        el(
          'div',
          { class: `fin__resultats${podium && liste ? ' fin__resultats--deux' : ''}` },
          podium ?? el('p', { class: 'fin__message' }, 'Bravo à toutes et à tous !'),
          liste,
        ),
      ];
    }
    afficherEcran(
      'ecran-fin',
      el(
        'div',
        { class: 'confettis', 'aria-hidden': 'true' },
        Array.from({ length: 24 }, () => el('span', {})),
      ),
      titre,
      message ? el('p', { class: 'fin__message' }, message) : null,
      // Podium et classement : côte à côte sur grand écran (tout tient en 1280 × 720)
      resultats(),
      el(
        'div',
        { class: 'groupe-boutons groupe-boutons--centre' },
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--principal bouton--grand',
            onclick: () => lancerPartie(),
          },
          icone('rotate-right'),
          'Rejouer',
        ),
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => afficherAccueil() },
          'Accueil du jeu',
        ),
        el('a', { class: 'bouton', href: '../../' }, 'Tous les jeux'),
      ),
      joueursEnJeu.length
        ? el(
            'p',
            { class: 'fin__scores' },
            el(
              'a',
              { href: '../../groupe/#scores' },
              icone('ranking-star'),
              'Voir les scores du groupe, tous jeux confondus',
            ),
          )
        : null,
    );
    // Les sons une fois l'écran construit
    sons.fanfare(3);
    sons.applaudissements();
    focaliser(titre);
  }

  afficherAccueil();

  return {
    /** Pour les tests : efface le contenu enregistré. */
    reinitialiser() {
      effacer(cleContenu);
      oublierSource(slug);
      contenu = nettoyerContenu(schema, exemple);
      afficherAccueil();
    },
  };
}
