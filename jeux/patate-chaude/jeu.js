import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import {
  el,
  remplir,
  icone,
  animer,
  focaliser,
  ecouterClavier,
} from '../../assets/js/commun/ui.js';
import { creerChrono } from '../../assets/js/commun/chrono.js';
import { schema, exemple } from './exemple.js';
import {
  tirerDuree,
  chaleur,
  niveauDeChaleur,
  intervalleTic,
  premierPorteur,
  gagnantsDeLaManche,
  creerManche,
} from './logique.js';

/** Aide « (Espace) » d'un bouton : inutile sur téléphone, où elle est masquée (base.css). */
const aideClavier = (touche) => el('span', { class: 'aide-clavier' }, ` (${touche})`);
/** Ce qu'on lit sous la patate, selon sa chaleur (niveaux 1 à 4). */
const ETATS = [
  '',
  'La patate est tiède…',
  'Elle chauffe !',
  'Elle est très chaude !',
  'Elle brûle presque !',
];

function demarrer(ctx) {
  const consignes = ctx.elements;
  const { meche } = ctx.reglages;
  const avecPrenoms = ctx.participants.length > 0;
  let index = 0;
  let dernierBrule = null;
  let chrono = null;
  // Raccourcis du moment : Entrée (action principale), Espace (on passe), P (pause)
  let touches = {};
  const retirerClavier = ecouterClavier({
    Entrée: () => touches.entree?.(),
    Espace: () => touches.espace?.(),
    p: () => touches.pause?.(),
  });

  function afficherManche() {
    chrono?.arreter();
    const { consigne, idees } = consignes[index];
    const manche = creerManche();
    const duree = tirerDuree(meche, ctx.hasard);
    const lanceur = premierPorteur(ctx.participants, dernierBrule, ctx.hasard);
    const derniere = index === consignes.length - 1;
    let dernierTic = 0;
    let niveau = 1;
    let brule = null;

    const patate = el(
      'div',
      { class: 'patate patate--1', 'aria-hidden': 'true' },
      el(
        'span',
        { class: 'patate__flammes' },
        icone('fire-flame-curved'),
        icone('fire-flame-curved'),
        icone('fire-flame-curved'),
      ),
      el('span', { class: 'patate__corps' }),
    );
    const etat = el('p', { class: 'patate__etat' });
    const compteur = el('p', { class: 'patate__compteur' });
    const infos = el('div', { class: 'patate__infos' }, etat, compteur);
    const resultat = el('div', { class: 'patate__resultat', hidden: true });
    // Une fois brûlée : la patate à gauche, le verdict à droite (tout tient en 1280 × 720)
    const scene = el(
      'div',
      { class: 'patate__scene' },
      patate,
      el('div', { class: 'patate__textes' }, infos, resultat),
    );
    const actions = el('div', { class: 'actions-jeu' });
    const raccourci = el('p', { class: 'raccourci' });
    const panneau = el(
      'div',
      { class: 'panneau patate-chaude', tabindex: '-1' },
      el('p', { class: 'panneau__surtitre' }, `Manche ${index + 1} sur ${consignes.length}`),
      el('h3', { class: 'panneau__texte patate__consigne' }, consigne),
      scene,
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
            // Le focus quitte le bouton : Espace et Entrée gardent toujours le même sens
            panneau.focus();
          },
        },
        contenu,
      );
    }

    function dessinerChaleur(valeur) {
      const nouveau = niveauDeChaleur(valeur);
      if (nouveau === niveau) return;
      niveau = nouveau;
      patate.className = `patate patate--${niveau}`;
      remplir(etat, ETATS[niveau]);
    }

    chrono = creerChrono({
      duree: duree / 1000,
      surTic(restantMs) {
        const ecoule = duree - restantMs;
        const valeur = chaleur(ecoule, meche);
        dessinerChaleur(valeur);
        if (manche.phase === 'en-cours' && ecoule - dernierTic >= intervalleTic(valeur)) {
          dernierTic = ecoule;
          ctx.sons.patate.tic(valeur);
        }
      },
      surFin: () => bruler(),
    });

    function dessinerCompteur() {
      const n = manche.passes;
      remplir(compteur, n ? `${n} ${n > 1 ? 'réponses valables' : 'réponse valable'}` : '');
    }

    function dessiner() {
      dessinerCompteur();
      if (manche.phase === 'prete') {
        touches = { entree: lancer };
        remplir(
          etat,
          lanceur
            ? [icone('hand'), `${lanceur} prend la patate et répond en premier`]
            : [icone('hand'), 'Qui commence ? Prenez la patate en main !'],
        );
        remplir(
          actions,
          bouton(
            [icone('fire'), 'Lancer la patate', aideClavier('Entrée')],
            'bouton--principal',
            lancer,
          ),
        );
        remplir(raccourci, el('kbd', {}, 'Entrée'), ' : lancer la patate');
        return;
      }
      if (manche.phase === 'en-cours') {
        touches = { espace: passer, pause: basculerPause };
        remplir(
          actions,
          bouton(
            [icone('check'), 'Réponse valable : on passe !', aideClavier('Espace')],
            'bouton--principal',
            passer,
          ),
          bouton([icone('pause'), 'Pause', aideClavier('P')], 'bouton--discret', basculerPause),
        );
        remplir(
          raccourci,
          el('kbd', {}, 'Espace'),
          ' : réponse valable, on passe · ',
          el('kbd', {}, 'P'),
          ' : pause',
        );
        return;
      }
      if (manche.phase === 'pause') {
        touches = { pause: basculerPause, entree: basculerPause };
        remplir(etat, [icone('pause'), 'Pause : la patate attend.']);
        remplir(
          actions,
          bouton(
            [icone('play'), 'Reprendre', aideClavier('P')],
            'bouton--principal',
            basculerPause,
          ),
        );
        remplir(raccourci, el('kbd', {}, 'P'), ' : reprendre');
        return;
      }
      dessinerFin();
    }

    function lancer() {
      if (!manche.lancer()) return;
      chrono.demarrer();
      remplir(etat, ETATS[niveau]);
      dessiner();
      ctx.annoncer(`La patate chauffe ! ${lanceur ? `${lanceur} commence.` : ''}`);
    }

    function passer() {
      if (!manche.passer()) return;
      ctx.sons.patate.passe();
      dessinerCompteur();
      animer(patate, 'patate--passe');
    }

    function basculerPause() {
      if (manche.pause()) chrono.pause();
      else if (manche.reprendre()) {
        chrono.demarrer();
        remplir(etat, ETATS[niveau]);
      } else return;
      dessiner();
    }

    function bruler() {
      if (!manche.bruler()) return;
      ctx.sons.patate.brule();
      patate.className = 'patate patate--brulee';
      scene.classList.add('patate__scene--fin');
      animer(patate, 'secousse');
      dessiner();
      ctx.annoncer(
        avecPrenoms
          ? 'Brûlé ! Qui tenait la patate ? Tous les autres marquent 1 point.'
          : 'Brûlé ! La personne qui tient la patate perd la manche.',
      );
    }

    function suite() {
      touches = {};
      if (derniere) {
        ctx.terminer({ message: 'Toutes les consignes ont été jouées.' });
        return;
      }
      index += 1;
      afficherManche();
    }

    async function choisirBrule() {
      const [prenom] = await ctx.choisirPrenoms({
        titre: 'Qui tenait la patate ?',
        message: 'Tous les autres joueurs marquent 1 point.',
      });
      if (!prenom || brule) return;
      brule = prenom;
      dernierBrule = prenom;
      for (const gagnant of gagnantsDeLaManche(ctx.participants, prenom)) {
        ctx.scores.ajouter(gagnant, 1);
      }
      ctx.sons.ding();
      ctx.annoncer(`${prenom} tenait la patate : 1 point pour tous les autres.`);
      dessiner();
    }

    function dessinerFin() {
      infos.hidden = true;
      const n = manche.passes;
      const verdict = el('p', { class: 'patate__verdict' }, icone('fire'), 'Brûlé !');
      let detail = 'La personne qui tient la patate perd la manche.';
      if (avecPrenoms) {
        detail = brule
          ? `${brule} tenait la patate : 1 point pour tous les autres !`
          : 'Qui tenait la patate ? Tous les autres marquent 1 point.';
      }
      remplir(
        resultat,
        verdict,
        el('p', { class: 'patate__detail' }, detail),
        n
          ? el(
              'p',
              { class: 'patate__bilan' },
              `${n} ${n > 1 ? 'réponses valables' : 'réponse valable'} avant la brûlure.`,
            )
          : null,
        idees
          ? el(
              'div',
              { class: 'reponse-revelee' },
              el('p', { class: 'panneau__surtitre' }, 'Des idées de réponses'),
              el('p', { class: 'patate__idees' }, idees),
            )
          : null,
      );
      resultat.hidden = false;
      remplir(etat);
      const libelleSuite = derniere ? 'Voir le classement' : 'Manche suivante';
      if (avecPrenoms && !brule) {
        touches = { entree: choisirBrule };
        remplir(
          actions,
          bouton(
            [icone('user'), 'Qui tenait la patate ?', aideClavier('Entrée')],
            'bouton--principal',
            choisirBrule,
          ),
          bouton(libelleSuite, 'bouton--discret', suite),
        );
        remplir(raccourci, el('kbd', {}, 'Entrée'), ' : dire qui tenait la patate');
      } else {
        touches = { entree: suite };
        remplir(actions, bouton([libelleSuite, aideClavier('Entrée')], 'bouton--sombre', suite));
        remplir(raccourci, el('kbd', {}, 'Entrée'), ' : continuer');
      }
      focaliser(verdict);
    }

    remplir(ctx.zone, panneau);
    dessiner();
    focaliser(panneau.querySelector('.patate__consigne'));
  }

  afficherManche();
  return () => {
    chrono?.arreter();
    retirerClavier();
  };
}

monterJeu({
  slug: 'patate-chaude',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des consignes qui ont beaucoup de réponses : « Citez une fonction d’Excel ».',
    'Lancez la patate : elle chauffe pendant un temps caché, que personne ne connaît. Le tic-tac s’accélère…',
    'La personne qui tient la patate donne une réponse valable, pas encore dite, puis la passe à son voisin. Vous validez d’une touche (Espace).',
    'Quand la patate brûle, la personne qui la tient ne marque pas : tous les autres gagnent 1 point.',
  ],
  demarrer,
});
