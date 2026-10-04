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
 * })
 */
import { trouverJeu, titresDesJeux } from '../jeux.js';
import * as listeParticipants from './participants.js';
import { lire, ecrire, effacer } from './stockage.js';
import { hasardDePage } from './hasard.js';
import { creerTirage } from './roue.js';
import { creerScores } from './scores.js';
import { sons, sonActif, basculerSon } from './sons.js';
import {
  el,
  remplir,
  icone,
  annoncer,
  ecouterClavier,
  basculerPleinEcran,
  focaliser,
} from './ui.js';
import { choisirPrenoms, confirmer, designerAvecRoue, modifierInfo } from './dialogues.js';
import {
  nettoyerContenu,
  validerContenu,
  resumerContenu,
  contenuVide,
  compacterContenu,
  preparerExport,
  lireImport,
} from './contenu.js';
import { creerEditeur } from './editeur-contenu.js';
import { exigerAcces } from './acces.js';

// Chaque jeu importe ce module : aucun jeu ne démarre avant le mot de passe.
await exigerAcces();

export function monterJeu(config) {
  const { slug, schema, exemple, regles = [], demarrer } = config;
  const jeu = trouverJeu(slug);
  const cadre = document.getElementById('cadre');
  const hasard = hasardDePage();
  const cleContenu = `${slug}:contenu`;

  let participants = listeParticipants.charger();
  let infos = listeParticipants.chargerInfos();
  const tirage = creerTirage(participants, {
    equitable: lire('roue-equitable', true) !== false,
    hasard,
  });
  let contenu = nettoyerContenu(schema, lire(cleContenu) ?? exemple);
  let nettoyerPartie = null;
  let ecouteDesignation = null;
  let editeur = null;

  const estExemple = () => lire(cleContenu) === null;

  // ---------- Bandeau : désigner, son, plein écran ----------
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
    'Désigner',
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
  const boutonPleinEcran = el(
    'button',
    {
      type: 'button',
      class: 'bouton-bandeau',
      'aria-keyshortcuts': 'F',
      title: 'Plein écran (touche F)',
      onclick: () => basculerPleinEcran(),
    },
    icone('expand'),
    'Plein écran',
  );
  document.getElementById('actions')?.append(boutonDesigner, boutonSon, boutonPleinEcran);

  function mettreAJourDesigner() {
    boutonDesigner.hidden = participants.length < 2;
  }
  mettreAJourDesigner();

  ecouterClavier({
    r: () => designer(),
    f: () => basculerPleinEcran(),
  });

  const decrire = (prenom) =>
    listeParticipants.decrireInfo(listeParticipants.infoDe(infos, prenom));

  async function designer(titre) {
    if (participants.length < 2) return participants[0] ?? null;
    const prenom = await designerAvecRoue({
      prenoms: participants,
      tirage,
      hasard,
      titre,
      surEquitable: (v) => ecrire('roue-equitable', v),
      decrire: (p) => {
        const info = listeParticipants.infoDe(infos, p);
        return info ? [icone(listeParticipants.themeDe(info.theme).icone), decrire(p)] : '';
      },
    });
    if (prenom) {
      annoncer(`C’est au tour de ${prenom}. ${decrire(prenom)}`);
      ecouteDesignation?.(prenom);
    }
    return prenom;
  }

  function changerParticipants(nouveaux) {
    participants = nouveaux;
    listeParticipants.enregistrer(participants);
    changerInfos(listeParticipants.garderInfos(infos, participants));
    tirage.mettreAJour(participants);
    mettreAJourDesigner();
  }

  function changerInfos(nouvelles) {
    infos = nouvelles;
    listeParticipants.enregistrerInfos(infos);
  }

  /** Petite étiquette « (icône) tiramisu » à côté d'un prénom (rien s'il n'y a pas d'info). */
  function etiquetteInfo(prenom, classe) {
    const info = listeParticipants.infoDe(infos, prenom);
    if (!info) return null;
    return el(
      'span',
      { class: classe, title: decrire(prenom) },
      icone(listeParticipants.themeDe(info.theme).icone),
      el(
        'span',
        { class: 'visuellement-cache' },
        `${listeParticipants.themeDe(info.theme).libelle} : `,
      ),
      info.texte,
    );
  }

  function arreterPartie() {
    try {
      nettoyerPartie?.();
    } finally {
      nettoyerPartie = null;
      ecouteDesignation = null;
    }
  }

  function afficherEcran(classe, ...enfants) {
    editeur?.detruire();
    editeur = null;
    const ecran = el('section', { class: `ecran ${classe}` }, ...enfants);
    remplir(cadre, ecran);
    window.scrollTo?.(0, 0);
    return ecran;
  }

  // ---------- Écran d'accueil du jeu ----------
  function blocParticipants() {
    const bloc = el('section', {
      class: 'carte bloc-participants',
      'aria-labelledby': 'titre-participants',
    });
    const champ = el('input', {
      id: 'nouveau-prenom',
      type: 'text',
      class: 'champ__controle',
      autocomplete: 'off',
      maxlength: 200,
      placeholder: 'Ex. : Marie, Paul, Léa',
      'aria-describedby': 'aide-prenoms',
    });
    const liste = el('ul', { class: 'puces', 'aria-label': 'Participants' });
    const compteur = el('p', { class: 'bloc-participants__compte' });
    const boutonRoue = el(
      'button',
      { type: 'button', class: 'bouton', onclick: () => designer() },
      icone('arrows-spin'),
      'Désigner quelqu’un',
    );
    const boutonEffacer = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--discret',
        onclick: async () => {
          if (
            await confirmer({
              titre: 'Effacer la liste ?',
              message: 'Tous les prénoms (et leurs infos) seront retirés.',
              oui: 'Effacer',
            })
          ) {
            changerParticipants([]);
            dessiner();
            champ.focus();
          }
        },
      },
      'Effacer la liste',
    );

    function dessiner() {
      remplir(
        liste,
        participants.map((prenom) =>
          el(
            'li',
            { class: 'puce' },
            el('span', { class: 'puce__prenom' }, prenom),
            etiquetteInfo(prenom, 'puce__info'),
            el(
              'button',
              {
                type: 'button',
                class: 'puce__retirer puce__modifier',
                'aria-label': listeParticipants.infoDe(infos, prenom)
                  ? `Modifier l’info sur ${prenom}`
                  : `Ajouter une info sur ${prenom}`,
                title: 'Une info sur cette personne (passion, film, dessert…)',
                onclick: async () => {
                  const reponse = await modifierInfo({
                    prenom,
                    info: listeParticipants.infoDe(infos, prenom),
                    themes: listeParticipants.THEMES,
                  });
                  if (reponse) changerInfos(listeParticipants.definirInfo(infos, prenom, reponse));
                  dessiner();
                },
              },
              icone('pen'),
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'puce__retirer',
                'aria-label': `Retirer ${prenom}`,
                onclick: () => {
                  changerParticipants(listeParticipants.retirer(participants, prenom));
                  dessiner();
                  champ.focus();
                },
              },
              icone('xmark'),
            ),
          ),
        ),
      );
      remplir(
        compteur,
        participants.length
          ? `${participants.length} participant${participants.length > 1 ? 's' : ''}`
          : 'Aucun participant : on peut jouer sans prénoms, mais sans classement.',
      );
      boutonRoue.disabled = participants.length < 2;
      boutonEffacer.hidden = participants.length === 0;
    }

    const theme = el(
      'select',
      { id: 'nouveau-theme', class: 'champ__controle ajout-prenom__theme' },
      listeParticipants.THEMES.map((t) => el('option', { value: t.valeur }, t.libelle)),
    );
    const info = el('input', {
      id: 'nouvelle-info',
      type: 'text',
      class: 'champ__controle',
      autocomplete: 'off',
      maxlength: listeParticipants.LONGUEUR_INFO,
      placeholder: 'Ex. : la guitare, le tiramisu…',
      'aria-describedby': 'aide-info',
    });

    const formulaire = el(
      'form',
      {
        class: 'ajout-prenom',
        onsubmit: (e) => {
          e.preventDefault();
          if (!champ.value.trim()) return;
          changerParticipants(listeParticipants.ajouter(participants, champ.value));
          // L'info ne s'applique que si un seul prénom est saisi
          const saisis = champ.value
            .split(/[,;\n]/)
            .map(listeParticipants.normaliserPrenom)
            .filter(Boolean);
          if (saisis.length === 1 && info.value.trim()) {
            const cible = participants.find(
              (p) => p.toLocaleLowerCase('fr') === saisis[0].toLocaleLowerCase('fr'),
            );
            if (cible) {
              changerInfos(
                listeParticipants.definirInfo(infos, cible, {
                  theme: theme.value,
                  texte: info.value,
                }),
              );
            }
          }
          champ.value = '';
          info.value = '';
          dessiner();
          champ.focus();
        },
      },
      el('label', { for: 'nouveau-prenom', class: 'champ__libelle' }, 'Ajouter un prénom'),
      el(
        'div',
        { class: 'champ__ligne' },
        champ,
        el('button', { type: 'submit', class: 'bouton' }, 'Ajouter'),
      ),
      el(
        'p',
        { id: 'aide-prenoms', class: 'champ__aide' },
        'Plusieurs à la fois ? Séparez-les par des virgules. La liste sert pour tous les jeux.',
      ),
      el(
        'p',
        { class: 'champ__libelle ajout-prenom__info-titre', id: 'titre-info' },
        'Une info sur la personne (facultatif)',
      ),
      el(
        'div',
        {
          class: 'champ__ligne ajout-prenom__info',
          role: 'group',
          'aria-labelledby': 'titre-info',
        },
        el('label', { for: 'nouveau-theme', class: 'visuellement-cache' }, 'Thème de l’info'),
        theme,
        el('label', { for: 'nouvelle-info', class: 'visuellement-cache' }, 'Info'),
        info,
      ),
      el(
        'p',
        { id: 'aide-info', class: 'champ__aide' },
        'Sa passion, son film ou son dessert préféré… La roue l’affiche quand elle désigne la personne. Modifiable avec le crayon. Rien ne sort de ce navigateur.',
      ),
    );
    dessiner();
    bloc.append(
      el('h3', { id: 'titre-participants' }, 'Participants'),
      formulaire,
      compteur,
      liste,
      el('div', { class: 'groupe-boutons' }, boutonRoue, boutonEffacer),
    );
    return bloc;
  }

  function blocContenu(erreurs) {
    const etat = erreurs.length
      ? el('p', { class: 'etat etat--ko' }, icone('triangle-exclamation'), 'Contenu incomplet')
      : el(
          'p',
          { class: 'etat etat--ok' },
          icone('circle-check'),
          resumerContenu(schema, contenu),
          estExemple() ? el('span', { class: 'etiquette' }, 'contenu d’exemple') : null,
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
      el(
        'p',
        { class: 'champ__aide' },
        estExemple()
          ? 'Un contenu d’exemple permet de jouer tout de suite. Remplacez-le par le vôtre avant la séance.'
          : 'Votre contenu est enregistré dans ce navigateur. Exportez-le pour le garder ou le partager.',
      ),
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
        disabled: erreurs.length > 0,
        onclick: () => lancerPartie(),
      },
      'Lancer la partie',
      icone('play'),
    );
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
        el(
          'div',
          { class: 'intro__lancer' },
          lancer,
          erreurs.length
            ? el('p', { class: 'champ__aide' }, 'Complétez d’abord le contenu du jeu.')
            : null,
        ),
      ),
      el('div', { class: 'colonnes' }, blocParticipants(), blocContenu(erreurs)),
    );
    focaliser(titre);
  }

  // ---------- Préparation du contenu ----------
  const MESSAGE_LISTE_VIDE =
    'Liste vidée. Les textes grisés ne sont que des exemples : saisissez votre contenu par-dessus, puis enregistrez.';

  function telecharger(nom, texte) {
    const lien = el('a', {
      href: URL.createObjectURL(new Blob([texte], { type: 'application/json' })),
      download: nom,
    });
    document.body.append(lien);
    lien.click();
    setTimeout(() => {
      URL.revokeObjectURL(lien.href);
      lien.remove();
    }, 1000);
  }

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
            const date = new Date().toISOString().slice(0, 10);
            telecharger(
              `skazy-${slug}-${date}.json`,
              JSON.stringify(preparerExport(slug, aExporter), null, 2),
            );
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
    const tableau = el('ul', { class: 'tableau-points', 'aria-label': 'Points' });
    const scores = creerScores(participants, { surChangement: dessinerPoints });
    function dessinerPoints() {
      const classement = scores.classement();
      const meilleur = classement[0]?.points ?? 0;
      remplir(
        tableau,
        participants.map((prenom) => {
          const points = scores.valeur(prenom);
          return el(
            'li',
            {
              class: `tableau-points__entree${points > 0 && points === meilleur ? ' tableau-points__entree--tete' : ''}`,
            },
            el('span', { class: 'tableau-points__prenom' }, prenom),
            el('span', { class: 'tableau-points__valeur' }, String(points)),
          );
        }),
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
                  message: 'Les points de cette partie seront perdus.',
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
        participants.length ? tableau : null,
      ),
      zone,
    );

    const ctx = {
      zone,
      contenu: structuredClone(contenu),
      reglages: structuredClone(contenu.reglages),
      elements: structuredClone(contenu.elements),
      participants: [...participants],
      scores,
      hasard,
      sons,
      annoncer,
      confirmer,
      designer,
      quandDesigne(fonction) {
        ecouteDesignation = fonction;
      },
      choisirPrenoms: (options) => choisirPrenoms({ prenoms: participants, ...options }),
      terminer: (options) => afficherFin(scores, options),
    };
    const nettoyage = await demarrer(ctx);
    if (typeof nettoyage === 'function') nettoyerPartie = nettoyage;
  }

  // ---------- Fin ----------
  function afficherFin(scores, { message = '' } = {}) {
    arreterPartie();
    sons.fanfare(3);
    sons.applaudissements();
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
                etiquetteInfo(e.prenom, 'podium__info'),
                el('span', { class: 'podium__points' }, `${e.points} pt${e.points > 1 ? 's' : ''}`),
              ),
            ),
        )
      : null;
    const liste = participants.length
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
    afficherEcran(
      'ecran-fin',
      el(
        'div',
        { class: 'confettis', 'aria-hidden': 'true' },
        Array.from({ length: 24 }, () => el('span', {})),
      ),
      titre,
      message ? el('p', { class: 'fin__message' }, message) : null,
      podium ?? el('p', { class: 'fin__message' }, 'Bravo à toutes et à tous !'),
      liste,
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
          '↻ Rejouer',
        ),
        el(
          'button',
          { type: 'button', class: 'bouton', onclick: () => afficherAccueil() },
          'Accueil du jeu',
        ),
        el('a', { class: 'bouton', href: '../../' }, 'Tous les jeux'),
      ),
    );
    focaliser(titre);
  }

  afficherAccueil();

  return {
    /** Pour les tests : efface le contenu enregistré. */
    reinitialiser() {
      effacer(cleContenu);
      contenu = nettoyerContenu(schema, exemple);
      afficherAccueil();
    },
  };
}
