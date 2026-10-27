import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
  aideTouches,
} from '../../assets/js/commun/ui.js';
import { ouvrirDialogue } from '../../assets/js/commun/dialogues.js';
import { decrireGagnants } from '../../assets/js/commun/points.js';
import { schema, exemple } from './exemple.js';
import { POINTS, cotesPossibles, trierMots, annoncePossible, creerPartie } from './logique.js';
import { creerIllustrationBingo } from './illustration.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Ce que l'on crie, ce que l'on vérifie, ce que l'on gagne. */
const ANNONCES = {
  ligne: {
    cri: '« Ligne ! »',
    verifier: 'Lisez les mots de la ligne : chacun doit être dans cette liste.',
    gagnants: 'Qui a fait une ligne ?',
  },
  bingo: {
    cri: '« Bingo ! »',
    verifier: 'Lisez tous les mots de la grille : chacun doit être dans cette liste.',
    gagnants: 'Qui a rempli sa grille ?',
  },
};

function demarrer(ctx) {
  const mots = ctx.elements;
  // Touche du moment : Espace ou → (commencer, tirer, dévoiler le mot, voir le classement)
  let touches = {};
  const retirerClavier = ecouterClavier({ suivant: () => touches.suivant?.() });

  // ---------- Chacun prépare sa grille sur papier ----------
  function afficherPreparation() {
    const cotes = cotesPossibles(mots.length);
    let cote = cotes[0];
    const titre = el('h3', { class: 'panneau__texte' }, 'Préparez vos grilles !');
    const consigne = el('p', { class: 'bingo-prep__consigne' });
    const apercu = el('div', { class: 'bingo-prep__grille', 'aria-hidden': 'true' });
    const choix =
      cotes.length > 1
        ? el(
            'div',
            {
              class: 'groupe-boutons bingo-prep__choix',
              role: 'group',
              'aria-label': 'Taille des grilles',
            },
            cotes.map((c) =>
              el(
                'button',
                {
                  type: 'button',
                  class: 'bouton',
                  'aria-pressed': String(c === cote),
                  onclick: () => {
                    cote = c;
                    dessiner();
                  },
                },
                `Grille de ${c} × ${c}`,
              ),
            ),
          )
        : null;

    function dessiner() {
      remplir(
        consigne,
        `Sur une feuille, tracez une grille de ${cote} × ${cote} cases. Recopiez-y ${cote * cote} mots de la liste : ceux que vous voulez, où vous voulez.`,
      );
      apercu.style.setProperty('--cote', cote);
      remplir(
        apercu,
        Array.from({ length: cote * cote }, () => el('span', {})),
      );
      choix?.querySelectorAll('button').forEach((b, i) => {
        b.setAttribute('aria-pressed', String(cotes[i] === cote));
        b.classList.toggle('bouton--principal', cotes[i] === cote);
      });
    }

    const commencer = () => afficherTirage(cote);
    touches = { suivant: commencer };
    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau bingo-prep' },
        el('p', { class: 'panneau__surtitre' }, `${mots.length} mots dans le sac`),
        titre,
        el('div', { class: 'bingo-prep__haut' }, apercu, el('div', {}, consigne, choix)),
        el(
          'ul',
          { class: 'bingo-prep__mots', 'aria-label': 'Les mots à recopier' },
          trierMots(mots.map((m) => m.mot)).map((m) => el('li', {}, m)),
        ),
        el(
          'div',
          { class: 'actions-jeu' },
          el(
            'button',
            { type: 'button', class: 'bouton bouton--principal bouton--grand', onclick: commencer },
            'Tout le monde est prêt : on tire !',
          ),
          // À côté du bouton : la liste des mots remplit déjà tout l'écran de 1280 × 720
          aideTouches([['suivant', 'commencer le tirage']]),
        ),
      ),
    );
    dessiner();
    focaliser(titre);
  }

  // ---------- Le tirage ----------
  function afficherTirage(cote) {
    const partie = creerPartie(mots.length, ctx.hasard);
    // Le mot du tirage en cours est-il dévoilé ? (avec une définition, on le cherche d'abord)
    let revele = true;

    const compte = el('p', { class: 'panneau__surtitre' });
    const objectif = el('p', { class: 'au-tour-de bingo__objectif' });
    const boule = el('p', { class: 'bingo__boule', 'aria-hidden': 'true' });
    // La sphère du loto tourne à chaque tirage, la boule tirée sort à côté
    const illustration = creerIllustrationBingo();
    // Temps entre deux tirages (choisi au lancement) : à zéro, une alerte ; on tire le suivant
    const minuteur = ctx.creerMinuteurManche({
      duree: ctx.reglages.tempsManche,
      passer: {
        libelle: 'On avance',
        faire: () => {
          // Une définition pas encore trouvée : on dévoile d'abord son mot (il rejoint les mots
          // tirés, la salle le coche), puis seulement on tire le suivant
          if (!revele) devoiler();
          else if (partie.restants > 0) tirer();
          if (scene.isConnected) scene.focus();
        },
      },
    });
    const definition = el('p', { class: 'bingo__definition' });
    const mot = el('p', { class: 'bingo__mot' });
    const message = el('p', { class: 'bingo__message', 'aria-live': 'polite' });
    const actions = el('div', { class: 'actions-jeu' });
    const raccourci = el('p', { class: 'raccourci' });
    const historique = el('ol', { class: 'bingo__tires' });
    const titreTires = el('h3', { class: 'bingo__titre-tires' }, 'Mots tirés (0)');
    // Avec des définitions, leur place est gardée dès avant le premier tirage (jeu.css)
    const avecDefinitions = mots.some((m) => m.definition);
    const scene = el(
      'div',
      {
        class: `panneau bingo__scene${avecDefinitions ? ' bingo__scene--definitions' : ''}`,
        tabindex: '-1',
      },
      el('div', { class: 'bingo__entete' }, compte, objectif),
      el('div', { class: 'bingo__tirage' }, illustration.element, boule),
      definition,
      mot,
      message,
      actions,
      raccourci,
    );

    function bouton(contenu, classe, action) {
      return el(
        'button',
        {
          type: 'button',
          class: `bouton bouton--grand ${classe}`,
          onclick: () => {
            action();
            // Le focus quitte le bouton : Espace garde toujours le même sens
            if (scene.isConnected) scene.focus();
          },
        },
        contenu,
      );
    }

    /** Mots tirés et dévoilés, du plus récent au plus ancien. */
    const motsDevoiles = () => {
      const tires = partie.tires.map((i) => mots[i].mot);
      return revele ? tires : tires.slice(0, -1);
    };

    function dessiner() {
      const n = partie.tires.length;
      const courant = partie.dernier === null ? null : mots[partie.dernier];
      remplir(compte, n ? `Mot ${n} sur ${mots.length}` : pluriel(mots.length, 'mot') + ' à tirer');
      remplir(
        objectif,
        partie.objectif === 'ligne'
          ? [icone('grip-lines'), 'On joue la ligne']
          : [icone('table-cells-large'), 'On joue la grille pleine'],
      );
      remplir(boule, n ? String(n) : icone('circle-question'));

      if (!courant) {
        definition.hidden = true;
        remplir(mot, 'Prêts ? Premier tirage !');
      } else {
        definition.hidden = !courant.definition;
        remplir(definition, courant.definition);
        mot.classList.toggle('bingo__mot--cache', !revele);
        remplir(mot, revele ? courant.mot : 'Quel est ce mot ?');
      }

      const dernierTirage = partie.restants === 0;
      const boutons = [];
      if (courant && !revele) {
        touches = { suivant: devoiler };
        boutons.push(bouton([icone('eye'), 'Dévoiler le mot'], 'bouton--principal', devoiler));
        aideTouches([['suivant', 'dévoiler le mot']], raccourci);
      } else if (!dernierTirage) {
        touches = { suivant: tirer };
        boutons.push(
          bouton(
            [icone('shuffle'), n ? 'Mot suivant' : 'Tirer le premier mot'],
            'bouton--principal',
            tirer,
          ),
        );
        aideTouches([['suivant', n ? 'mot suivant' : 'tirer le premier mot']], raccourci);
      } else {
        touches = { suivant: finir };
        boutons.push(bouton('Voir le classement', 'bouton--sombre', finir));
        aideTouches([['suivant', 'voir le classement']], raccourci);
      }
      // Le cri du moment : la ligne, puis la grille pleine
      const annonce = partie.objectif;
      boutons.push(
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--grand bingo__annonce',
            disabled: !revele || !annoncePossible(annonce, n, cote),
            onclick: async () => {
              await verifierAnnonce(annonce);
              // Espace tire de nouveau un mot, au lieu de rouvrir la vérification
              if (scene.isConnected) scene.focus();
            },
          },
          icone('bullhorn'),
          ANNONCES[annonce].cri,
        ),
      );
      remplir(actions, boutons);
    }

    /** Un mot dévoilé rejoint la liste des mots tirés, en tête, sans refaire toute la liste. */
    function ajouterAuxTires(texte) {
      historique.firstElementChild?.classList.remove('bingo__tire--dernier');
      historique.prepend(el('li', { class: 'bingo__tire bingo__tire--dernier' }, texte));
      remplir(titreTires, `Mots tirés (${historique.children.length})`);
    }

    function tirer() {
      const index = partie.tirer();
      if (index === null) return;
      const { mot: m, definition: d } = mots[index];
      revele = !d;
      remplir(message);
      dessiner();
      if (revele) ajouterAuxTires(m);
      // Les animations et le son une fois la page à jour
      illustration.melanger();
      animer(boule, 'bingo__boule--roule');
      animer(revele ? mot : definition, 'apparition');
      ctx.sons.bingo.tirage();
      ctx.annoncer(revele ? `Mot tiré : ${m}` : `Définition : ${d}`);
      // Le dernier mot : le temps ne compte que s'il reste sa définition à trouver
      if (partie.restants > 0 || !revele) minuteur?.relancer();
      else minuteur?.arreter();
    }

    function devoiler() {
      if (revele) return;
      revele = true;
      dessiner();
      ajouterAuxTires(mots[partie.dernier].mot);
      if (partie.restants === 0) minuteur?.arreter();
      animer(mot, 'apparition');
      ctx.sons.bingo.revele();
      ctx.annoncer(`Le mot : ${mots[partie.dernier].mot}`);
    }

    function finir() {
      touches = {};
      ctx.terminer({ message: 'Tous les mots ont été tirés.' });
    }

    async function verifierAnnonce(annonce) {
      const { cri, verifier, gagnants: question } = ANNONCES[annonce];
      const tires = trierMots(motsDevoiles());
      // Le temps s'arrête pendant la vérification
      const enCours = minuteur?.enCours;
      minuteur?.pause();
      try {
        await verifierEtAttribuer(annonce, { cri, verifier, question, tires });
      } finally {
        if (enCours && scene.isConnected) minuteur.reprendre();
      }
    }

    async function verifierEtAttribuer(annonce, { cri, verifier, question, tires }) {
      const valide = await ouvrirDialogue({
        titre: `${cri} On vérifie…`,
        valeurAnnulation: false,
        construire({ corps, pied, fermer }) {
          corps.append(
            el('p', { class: 'dialogue__message' }, verifier),
            el(
              'ul',
              { class: 'bingo-verif', 'aria-label': 'Mots tirés, par ordre alphabétique' },
              tires.map((m) => el('li', {}, m)),
            ),
          );
          pied.append(
            el(
              'button',
              { type: 'button', class: 'bouton', onclick: () => fermer(false) },
              'Fausse alerte',
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--principal',
                autofocus: true,
                onclick: () => fermer(true),
              },
              'C’est validé !',
            ),
          );
        },
      });
      if (!valide) {
        ctx.sons.erreur();
        remplir(message, icone('rotate-right'), 'Fausse alerte : on continue !');
        illustration.reagir('secousse');
        animer(message, 'secousse');
        return;
      }
      // L'annonce n'est plus celle du moment : rien à valider, aucun point à donner
      if (partie.objectif !== annonce) return;
      const gagnants = await ctx.choisirGagnants({
        titre: question,
        message: 'Cliquez sur les gagnants, puis Valider.',
        multiple: true,
      });
      const aDesGagnants = gagnants.prenoms.length > 0 || gagnants.equipes.length > 0;
      // Personne de choisi (fenêtre fermée) : l'annonce n'est pas perdue, on continue
      if (ctx.participants.length && !aDesGagnants) {
        remplir(message, icone('rotate-right'), 'Aucun gagnant choisi : on continue la partie.');
        animer(message, 'apparition');
        return;
      }
      if (!partie.valider(annonce)) return;
      ctx.scores.ajouterGagnants(gagnants, POINTS[annonce]);
      const qui = aDesGagnants ? ` pour ${decrireGagnants(ctx, gagnants)}` : '';
      const gain = aDesGagnants ? ` : +${pluriel(POINTS[annonce], 'point')}` : '';
      if (annonce === 'bingo') {
        // L'écran de fin fête la victoire (fanfare et applaudissements) : pas deux fois
        ctx.terminer({
          message: `${cri}${qui}, au bout de ${pluriel(partie.tires.length, 'mot')}.`,
        });
        return;
      }
      remplir(
        message,
        icone('trophy'),
        `${cri}${qui}${gain}. On joue maintenant la grille pleine !`,
      );
      dessiner();
      // L'illustration et le son une fois la page à jour
      illustration.reagir('fete');
      animer(message, 'apparition');
      ctx.sons.bingo.ligne();
    }

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'bingo' },
        scene,
        el('aside', { class: 'carte bingo__cote' }, titreTires, historique),
      ),
    );
    dessiner();
    scene.focus();
  }

  afficherPreparation();
  return () => retirerClavier();
}

monterJeu({
  slug: 'bingo',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez une liste de mots du thème (12 au moins), avec ou sans définition.',
    'Chacun recopie sur une feuille, dans une grille de 3 × 3 (ou 4 × 4), des mots choisis dans la liste projetée.',
    'Le jeu tire les mots un par un : sa définition d’abord, s’il en a une, puis le mot. Ceux qui l’ont le cochent.',
    'Une ligne complète (horizontale, verticale ou en diagonale) : « Ligne ! », 1 point. Puis la grille pleine : « Bingo ! », 3 points.',
  ],
  demarrer,
});
